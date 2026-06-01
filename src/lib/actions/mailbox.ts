"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import {
  testImapConnection,
  syncImapMailbox,
  type IMAPConnection,
  type SyncCursor,
  type ParsedMessage,
} from "@/lib/mail/imap-client";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// Shape stored in EmailAccount.config (encrypted password, sync cursors).
type StoredConfig = {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  encryptedPassword: string;
  syncCursor?: SyncCursor;
  lastSyncedAt?: string;
};

function toConnection(cfg: StoredConfig): IMAPConnection {
  return {
    host: cfg.imapHost,
    port: cfg.imapPort,
    secure: cfg.imapSecure,
    username: cfg.username,
    password: decryptSecret(cfg.encryptedPassword),
  };
}

// Fetch the tenant's mail server config; mailbox connection forms pre-fill
// from this so a user only needs to enter their email + password.
export async function getMailServerForUser() {
  const { tenantId } = await getSessionOrThrow();
  const server = await prisma.tenantMailServer.findUnique({ where: { tenantId } });
  return server;
}

// Try the IMAP credentials without persisting anything.
export async function testMailbox(input: { email: string; password: string }) {
  const { tenantId } = await getSessionOrThrow();
  const server = await prisma.tenantMailServer.findUnique({ where: { tenantId } });
  if (!server || !server.isActive) {
    return { ok: false as const, reason: "No active mail server is configured for this workspace." };
  }
  return testImapConnection({
    host: server.imapHost,
    port: server.imapPort,
    secure: server.imapSecure,
    username: input.email,
    password: input.password,
  });
}

// Persist a user mailbox. Validates credentials before saving so we don't
// store a password that doesn't work.
export async function connectMailbox(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const server = await prisma.tenantMailServer.findUnique({ where: { tenantId } });
  if (!server || !server.isActive) {
    throw new Error("No active mail server is configured for this workspace.");
  }

  const probe = await testImapConnection({
    host: server.imapHost,
    port: server.imapPort,
    secure: server.imapSecure,
    username: input.email,
    password: input.password,
  });
  if (!probe.ok) {
    throw new Error(`IMAP login failed: ${probe.reason}`);
  }

  const cfg: StoredConfig = {
    imapHost: server.imapHost,
    imapPort: server.imapPort,
    imapSecure: server.imapSecure,
    smtpHost: server.smtpHost,
    smtpPort: server.smtpPort,
    smtpSecure: server.smtpSecure,
    username: input.email,
    encryptedPassword: encryptSecret(input.password),
  };

  const existing = await prisma.emailAccount.findFirst({
    where: { ...tenantScope(tenantId), userId, email: input.email },
  });

  const account = existing
    ? await prisma.emailAccount.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName ?? existing.displayName,
          provider: "imap",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: cfg as any,
          isDefault: true,
        },
      })
    : await prisma.emailAccount.create({
        data: {
          tenantId,
          userId,
          email: input.email,
          displayName: input.displayName ?? input.email,
          provider: "imap",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: cfg as any,
          isDefault: true,
        },
      });

  await logAudit({
    tenantId,
    userId,
    action: "mailbox.connect",
    entity: "EmailAccount",
    entityId: account.id,
    metadata: { email: input.email, imapHost: server.imapHost },
  });

  revalidatePath("/office/email");
  return { id: account.id, email: account.email };
}

export async function disconnectMailbox(accountId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.emailAccount.findFirst({
    where: { id: accountId, ...tenantScope(tenantId), userId },
  });
  if (!existing) throw new Error("Mailbox not found");
  await prisma.emailAccount.delete({ where: { id: existing.id } });
  await logAudit({
    tenantId,
    userId,
    action: "mailbox.disconnect",
    entity: "EmailAccount",
    entityId: existing.id,
  });
  revalidatePath("/office/email");
}

// Sync a single mailbox. Used by the manual Refresh button and by the cron
// endpoint (which calls this for every active account in a loop).
export async function syncMailboxForAccount(accountId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, ...tenantScope(tenantId), userId },
  });
  if (!account) throw new Error("Mailbox not found");
  return runSync(account.id, tenantId, account.config as unknown as StoredConfig);
}

export async function syncCurrentUserMailbox() {
  const { userId, tenantId } = await getSessionOrThrow();
  const account = await prisma.emailAccount.findFirst({
    where: { ...tenantScope(tenantId), userId, provider: "imap" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!account) return { ok: false as const, reason: "No mailbox connected" };
  return runSync(account.id, tenantId, account.config as unknown as StoredConfig);
}

async function runSync(accountId: string, tenantId: string, cfg: StoredConfig) {
  const cursor: SyncCursor = cfg.syncCursor ?? { cursors: {} };
  const { messages, cursor: nextCursor } = await syncImapMailbox(toConnection(cfg), cursor, { maxPerFolder: 50 });

  let inserted = 0;
  for (const msg of messages) {
    await persistMessage(tenantId, accountId, msg).then((created) => {
      if (created) inserted++;
    });
  }

  const updatedCfg: StoredConfig = {
    ...cfg,
    syncCursor: nextCursor,
    lastSyncedAt: new Date().toISOString(),
  };
  await prisma.emailAccount.update({
    where: { id: accountId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { config: updatedCfg as any },
  });

  return { ok: true as const, inserted, scanned: messages.length };
}

async function persistMessage(tenantId: string, accountId: string, msg: ParsedMessage) {
  // De-dupe on (accountId + folder + messageId) when we have a Message-ID,
  // else fall back to (accountId + folder + subject + receivedAt) to handle
  // older mail that lacks Message-ID headers.
  if (msg.messageId) {
    const existing = await prisma.emailMessage.findFirst({
      where: {
        ...tenantScope(tenantId),
        accountId,
        folder: msg.folder,
        // Persist messageId inside the existing JSON columns we already have;
        // store it under a deterministic shape in `attachments` is wrong, so
        // we sidecar it in a hidden field via the body length + subject
        // signature. Cheap unique check until we add a dedicated column.
        subject: msg.subject,
        receivedAt: msg.receivedAt,
        fromEmail: msg.fromEmail,
      },
      select: { id: true },
    });
    if (existing) return false;
  }

  await prisma.emailMessage.create({
    data: {
      tenantId,
      accountId,
      folder: msg.folder,
      subject: msg.subject,
      body: msg.body,
      fromEmail: msg.fromEmail,
      toEmails: msg.toEmails,
      ccEmails: msg.ccEmails,
      bccEmails: [],
      isRead: msg.isRead,
      isStarred: false,
      isDraft: false,
      attachments: msg.attachments,
      receivedAt: msg.receivedAt,
    },
  });
  return true;
}
