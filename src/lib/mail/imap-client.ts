import { ImapFlow, type ImapFlowOptions, type ListResponse } from "imapflow";
import { simpleParser } from "mailparser";
import type { EmailFolder } from "@/generated/prisma/enums";

// MIT-licensed wrappers around imapflow + mailparser. We keep all real IMAP
// access inside this module so the server-action layer can talk in terms of
// EmailAccount rows without knowing protocol details.

export type IMAPConnection = {
  host: string;
  port: number;
  secure: boolean; // true = implicit TLS, false = STARTTLS upgrade
  username: string;
  password: string;
};

function clientOptions(c: IMAPConnection): ImapFlowOptions {
  return {
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.username, pass: c.password },
    logger: false,
    // Mail-in-a-Box uses Lets Encrypt; trust the system cert store. Allowing
    // self-signed deliberately omitted here so we fail loud on mis-issued
    // certificates.
  };
}

// Quick IMAP login round trip. Returns ok=true on auth success, ok=false +
// reason on failure. Used by the "Test connection" button in the UI.
export async function testImapConnection(conn: IMAPConnection): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = new ImapFlow(clientOptions(conn));
  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, reason };
  }
}

// Mail-in-a-Box uses RFC 6154 SPECIAL-USE attributes for folder roles. We
// honour those first and fall back to common name matches so the same code
// also works against vanilla Dovecot or other IMAP servers.
function classifyFolder(folder: ListResponse): EmailFolder | null {
  const flags = (folder.specialUse ?? "").toLowerCase();
  if (flags.includes("inbox")) return "INBOX";
  if (flags.includes("sent")) return "SENT";
  if (flags.includes("drafts")) return "DRAFTS";
  if (flags.includes("trash")) return "TRASH";
  if (flags.includes("archive")) return "ARCHIVE";
  if (flags.includes("junk") || flags.includes("spam")) return "SPAM";

  const name = folder.path.toLowerCase();
  if (folder.path.toUpperCase() === "INBOX") return "INBOX";
  if (/sent/.test(name)) return "SENT";
  if (/draft/.test(name)) return "DRAFTS";
  if (/trash|deleted/.test(name)) return "TRASH";
  if (/archive/.test(name)) return "ARCHIVE";
  if (/junk|spam/.test(name)) return "SPAM";
  return null;
}

export type SyncCursor = {
  // Per server-side folder path: the highest UID we've already mirrored and
  // the UIDVALIDITY at that point. If UIDVALIDITY changes the cursor must
  // be discarded — the folder has been re-created and UIDs no longer match.
  cursors: Record<string, { uidNext: number; uidValidity: number }>;
};

export type ParsedMessage = {
  uid: number;
  imapFolder: string;
  folder: EmailFolder;
  messageId: string | null;
  subject: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  body: string;        // HTML if available, else plaintext
  bodyText: string;
  receivedAt: Date;
  isRead: boolean;
  attachments: { filename: string; contentType: string; size: number }[];
};

// Fetches new messages from every classifiable folder since the last
// recorded UID. Returns the parsed message rows + an updated SyncCursor the
// caller should persist back onto the EmailAccount config.
export async function syncImapMailbox(
  conn: IMAPConnection,
  cursor: SyncCursor,
  opts: { maxPerFolder?: number } = {},
): Promise<{ messages: ParsedMessage[]; cursor: SyncCursor }> {
  const maxPerFolder = opts.maxPerFolder ?? 100;
  const client = new ImapFlow(clientOptions(conn));
  const nextCursor: SyncCursor = { cursors: { ...cursor.cursors } };
  const messages: ParsedMessage[] = [];

  await client.connect();
  try {
    const folders = await client.list();
    for (const folder of folders) {
      const role = classifyFolder(folder);
      if (!role) continue;

      const lock = await client.getMailboxLock(folder.path);
      try {
        const status = await client.status(folder.path, { uidNext: true, uidValidity: true });
        const last = nextCursor.cursors[folder.path];
        const currentValidity = Number(status.uidValidity ?? 0);
        const nextUid = Number(status.uidNext ?? 1);

        // Discard the cursor if UIDVALIDITY rolled (folder rebuilt).
        const validCursor = last && last.uidValidity === currentValidity ? last : null;
        const sinceUid = validCursor ? validCursor.uidNext : Math.max(1, nextUid - maxPerFolder);
        if (sinceUid >= nextUid) {
          nextCursor.cursors[folder.path] = { uidNext: nextUid, uidValidity: currentValidity };
          continue;
        }

        const range = `${sinceUid}:*`;
        for await (const msg of client.fetch(range, { uid: true, flags: true, envelope: true, source: true })) {
          if (!msg.uid || !msg.source) continue;
          let parsed;
          try {
            parsed = await simpleParser(msg.source as Buffer);
          } catch {
            continue;
          }
          const fromAddr = parsed.from?.value?.[0]?.address ?? "";
          const toAddrs = parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap((g) => g.value.map((v) => v.address ?? ""))
            : [];
          const ccAddrs = parsed.cc
            ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]).flatMap((g) => g.value.map((v) => v.address ?? ""))
            : [];
          const html = parsed.html || (parsed.textAsHtml ?? "");
          const text = parsed.text ?? "";
          const flags = msg.flags ?? new Set<string>();
          const seen = flags instanceof Set
            ? flags.has("\\Seen")
            : Array.from(flags as Iterable<string>).includes("\\Seen");

          messages.push({
            uid: msg.uid,
            imapFolder: folder.path,
            folder: role,
            messageId: parsed.messageId ?? null,
            subject: parsed.subject ?? "(no subject)",
            fromEmail: fromAddr,
            toEmails: toAddrs.filter(Boolean),
            ccEmails: ccAddrs.filter(Boolean),
            body: typeof html === "string" ? html : text,
            bodyText: text,
            receivedAt: parsed.date ?? new Date(),
            isRead: seen,
            attachments: (parsed.attachments ?? []).map((a) => ({
              filename: a.filename ?? "attachment",
              contentType: a.contentType ?? "application/octet-stream",
              size: a.size ?? 0,
            })),
          });
        }

        nextCursor.cursors[folder.path] = { uidNext: nextUid, uidValidity: currentValidity };
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return { messages, cursor: nextCursor };
}
