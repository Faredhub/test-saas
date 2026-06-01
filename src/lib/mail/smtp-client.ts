import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

// SMTP send + IMAP APPEND wrappers. The send path lives here so the server
// action layer can stay protocol-free. Outgoing mail is also appended to the
// user's IMAP Sent folder so Mail-in-a-Box's webmail (or any other client)
// shows the same outbox the ERP does.

export type SMTPConnection = {
  host: string;
  port: number;
  secure: boolean; // true=SMTPS (465), false=STARTTLS (587)
  username: string;
  password: string;
  fromAddress: string;
  fromName?: string | null;
};

export type SendInput = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
};

export type SendResult = { messageId: string; raw: Buffer; appendedToSent: boolean };

export async function sendViaSmtp(conn: SMTPConnection, input: SendInput): Promise<SendResult> {
  const transporter = nodemailer.createTransport({
    host: conn.host,
    port: conn.port,
    secure: conn.secure,
    auth: { user: conn.username, pass: conn.password },
  });
  const mail = {
    from: conn.fromName ? `${conn.fromName} <${conn.fromAddress}>` : conn.fromAddress,
    to: input.to.join(", "),
    cc: input.cc?.length ? input.cc.join(", ") : undefined,
    bcc: input.bcc?.length ? input.bcc.join(", ") : undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
  };

  // Build the RFC822 bytes with a buffered streamTransport so we can hand
  // the same payload to APPEND-to-Sent without re-serialising.
  let raw: Buffer = Buffer.alloc(0);
  try {
    const composer = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const built = await composer.sendMail(mail);
    if (built.message && Buffer.isBuffer(built.message)) {
      raw = Buffer.from(built.message);
    }
  } catch {
    // If MIME composition fails we still try the real send below.
  }

  const info = await transporter.sendMail(mail);
  return {
    messageId: info.messageId ?? "",
    raw,
    appendedToSent: false,
  };
}

export async function appendToSent(
  conn: { host: string; port: number; secure: boolean; username: string; password: string },
  raw: Buffer,
): Promise<boolean> {
  if (raw.length === 0) return false;
  const client = new ImapFlow({
    host: conn.host,
    port: conn.port,
    secure: conn.secure,
    auth: { user: conn.username, pass: conn.password },
    logger: false,
  });
  try {
    await client.connect();
    const folders = await client.list();
    const sent = folders.find(
      (f) => (f.specialUse ?? "").toLowerCase().includes("sent") || /sent/i.test(f.path),
    );
    if (!sent) return false;
    await client.append(sent.path, raw, ["\\Seen"]);
    return true;
  } finally {
    await client.logout().catch(() => {});
  }
}
