import { NextResponse } from "next/server";
import { prisma, tenantScope } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { syncImapMailbox, type IMAPConnection, type SyncCursor, type ParsedMessage } from "@/lib/mail/imap-client";

// Scheduled mail sync. Protected by a shared secret in the X-Cron-Secret
// header (configured as CRON_SECRET on the deployment). Coolify can hit this
// every N minutes; the endpoint walks every connected mailbox and applies an
// incremental fetch.

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

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const accounts = await prisma.emailAccount.findMany({
    where: { provider: "imap" },
    select: { id: true, tenantId: true, config: true },
  });

  let success = 0;
  let failed = 0;
  let inserted = 0;
  const errors: { accountId: string; reason: string }[] = [];

  for (const account of accounts) {
    const cfg = account.config as unknown as StoredConfig | null;
    if (!cfg?.imapHost || !cfg?.encryptedPassword) continue;
    try {
      const conn: IMAPConnection = {
        host: cfg.imapHost,
        port: cfg.imapPort,
        secure: cfg.imapSecure,
        username: cfg.username,
        password: decryptSecret(cfg.encryptedPassword),
      };
      const cursor: SyncCursor = cfg.syncCursor ?? { cursors: {} };
      const { messages, cursor: nextCursor } = await syncImapMailbox(conn, cursor, { maxPerFolder: 50 });

      let added = 0;
      for (const m of messages) {
        const created = await persistOnce(account.tenantId, account.id, m);
        if (created) added++;
      }
      inserted += added;

      const updated: StoredConfig = { ...cfg, syncCursor: nextCursor, lastSyncedAt: new Date().toISOString() };
      await prisma.emailAccount.update({
        where: { id: account.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { config: updated as any },
      });
      success++;
    } catch (e) {
      failed++;
      errors.push({ accountId: account.id, reason: e instanceof Error ? e.message : "unknown" });
    }
  }

  return NextResponse.json({ ok: true, success, failed, inserted, total: accounts.length, errors });
}

async function persistOnce(tenantId: string, accountId: string, msg: ParsedMessage) {
  const existing = await prisma.emailMessage.findFirst({
    where: {
      ...tenantScope(tenantId),
      accountId,
      folder: msg.folder,
      subject: msg.subject,
      receivedAt: msg.receivedAt,
      fromEmail: msg.fromEmail,
    },
    select: { id: true },
  });
  if (existing) return false;
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
