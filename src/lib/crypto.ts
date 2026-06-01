import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function getKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "fallback-dev-key-change-in-production";
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

// ----------------------------------------------------------------------------
// Mailbox secret encryption (mail integration). Uses a dedicated key so the
// mailbox passwords can be rotated independently of MFA without breaking 2FA.
// Token format: "v1:<iv>:<authTag>:<ciphertext>" all base64, so the format
// version can be advanced later without bouncing old rows.
// ----------------------------------------------------------------------------
const MAILBOX_TOKEN_VERSION = "v1";
const MAILBOX_KEY_BYTES = 32;
const MAILBOX_IV_BYTES = 12;

function getMailboxKey(): Buffer {
  const raw = process.env.MAILBOX_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MAILBOX_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to the environment.",
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== MAILBOX_KEY_BYTES) {
    throw new Error(
      `MAILBOX_ENCRYPTION_KEY must decode to ${MAILBOX_KEY_BYTES} bytes (got ${buf.length}). Use a fresh \`openssl rand -base64 32\` value.`,
    );
  }
  return buf;
}

export function encryptSecret(plaintext: string): string {
  if (plaintext === "") return "";
  const key = getMailboxKey();
  const iv = randomBytes(MAILBOX_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [MAILBOX_TOKEN_VERSION, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(token: string): string {
  if (!token) return "";
  const parts = token.split(":");
  if (parts.length !== 4 || parts[0] !== MAILBOX_TOKEN_VERSION) {
    throw new Error("Invalid mailbox secret token");
  }
  const key = getMailboxKey();
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(`${MAILBOX_TOKEN_VERSION}:`);
}
