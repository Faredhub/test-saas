"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { DocFormat, EmailFolder, ChannelType, MsgType } from "@/generated/prisma/enums";

// ============================================================================
// Helpers
// ============================================================================

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function getDocuments(filters?: {
  search?: string;
  isTemplate?: boolean;
  sharedWithMe?: boolean;
}) {
  const { tenantId, userId } = await getSessionOrThrow();

  const where: Record<string, unknown> = { ...tenantScope(tenantId) };

  if (filters?.search) {
    where.title = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.isTemplate) {
    where.isTemplate = true;
  }

  const docs = await prisma.officeDocument.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  if (filters?.sharedWithMe) {
    return docs.filter((d) => {
      const shared = d.sharedWith as Array<{ userId: string }>;
      return Array.isArray(shared) && shared.some((s) => s.userId === userId);
    });
  }

  return docs;
}

export async function getDocumentById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.officeDocument.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
}

export async function createDocument(data: {
  title: string;
  format: DocFormat;
  content?: string;
  isTemplate?: boolean;
  projectName?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const doc = await prisma.officeDocument.create({
    data: {
      tenantId,
      title: data.title,
      format: data.format,
      content: data.content ?? "",
      isTemplate: data.isTemplate ?? false,
      projectName: data.projectName,
      createdById: userId,
      lastEditedById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "document.create",
    entity: "OfficeDocument",
    entityId: doc.id,
  });

  revalidatePath("/office/documents");
  return doc;
}

export async function updateDocument(
  id: string,
  data: {
    title?: string;
    content?: string;
    format?: DocFormat;
    isTemplate?: boolean;
    sharedWith?: Array<{ userId: string; permission: string }>;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.officeDocument.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Document not found");

  const doc = await prisma.officeDocument.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.format !== undefined && { format: data.format }),
      ...(data.isTemplate !== undefined && { isTemplate: data.isTemplate }),
      ...(data.sharedWith !== undefined && { sharedWith: data.sharedWith }),
      lastEditedById: userId,
      version: { increment: 1 },
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "document.update",
    entity: "OfficeDocument",
    entityId: id,
  });

  revalidatePath("/office/documents");
  return doc;
}

export async function deleteDocument(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.officeDocument.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Document not found");

  await prisma.officeDocument.delete({ where: { id } });

  await logAudit({
    tenantId,
    userId,
    action: "document.delete",
    entity: "OfficeDocument",
    entityId: id,
  });

  revalidatePath("/office/documents");
}

// ============================================================================
// SPREADSHEETS
// ============================================================================

export async function getSpreadsheets(filters?: { search?: string }) {
  const { tenantId } = await getSessionOrThrow();

  const where: Record<string, unknown> = { ...tenantScope(tenantId) };
  if (filters?.search) {
    where.title = { contains: filters.search, mode: "insensitive" };
  }

  const sheets = await prisma.spreadsheet.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const now = Date.now();
  const expiredIds: string[] = [];
  const activeSheets = sheets.filter((sheet) => {
    if (sheet.projectName?.startsWith("TEMP_DELETE_AT:")) {
      const expireTime = parseInt(sheet.projectName.replace("TEMP_DELETE_AT:", ""), 10);
      if (!isNaN(expireTime) && now >= expireTime) {
        expiredIds.push(sheet.id);
        return false;
      }
    }
    return true;
  });

  if (expiredIds.length > 0) {
    prisma.spreadsheet.deleteMany({
      where: { id: { in: expiredIds } }
    }).catch((err) => console.error("Failed to delete expired spreadsheets:", err));
  }

  return activeSheets;
}

export async function markSpreadsheetAsTemporary(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const existing = await prisma.spreadsheet.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) return;

  const deleteAt = Date.now() + 3000; // 3 seconds from now
  await prisma.spreadsheet.update({
    where: { id },
    data: { projectName: `TEMP_DELETE_AT:${deleteAt}` },
  });
  revalidatePath("/office/spreadsheets");
}

export async function getSpreadsheetById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.spreadsheet.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
}

export async function createSpreadsheet(data: { title: string; sheets?: unknown; projectName?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();

  const defaultSheets = [
    {
      name: "Sheet1",
      data: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => "")),
      columns: Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i)),
    },
  ];

  const sheet = await prisma.spreadsheet.create({
    data: {
      tenantId,
      title: data.title,
      projectName: data.projectName,
      sheets: (data.sheets ?? defaultSheets) as object,
      createdById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "spreadsheet.create",
    entity: "Spreadsheet",
    entityId: sheet.id,
  });

  revalidatePath("/office/spreadsheets");
  return sheet;
}

/**
 * Atomic find-or-create for bulk-upload import spreadsheets.
 * Checks the DB for an existing spreadsheet whose title starts with
 * `titleKeyword` before creating a new one — prevents duplicate cards
 * even under React StrictMode's double-effect invocation.
 * Returns `{ sheet, isNew }` so the client knows whether to show a
 * "created" or "reopened" toast.
 */
export async function findOrCreateImportSpreadsheet(data: {
  titleKeyword: string;
  title: string;
  sheets: unknown;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Check DB first — catches duplicates that client-side state misses
  const existing = await prisma.spreadsheet.findFirst({
    where: {
      ...tenantScope(tenantId),
      title: { startsWith: data.titleKeyword, mode: "insensitive" },
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  const deleteAt = Date.now() + 3000; // 3 seconds from now

  if (existing) {
    // Refresh the deletion timer so they have a fresh 10 minutes to work
    const updated = await prisma.spreadsheet.update({
      where: { id: existing.id },
      data: { projectName: `TEMP_DELETE_AT:${deleteAt}` },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    revalidatePath("/office/spreadsheets");
    return { sheet: updated, isNew: false };
  }

  const sheet = await prisma.spreadsheet.create({
    data: {
      tenantId,
      title: data.title,
      projectName: `TEMP_DELETE_AT:${deleteAt}`,
      sheets: data.sheets as object,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  await logAudit({
    tenantId,
    userId,
    action: "spreadsheet.create",
    entity: "Spreadsheet",
    entityId: sheet.id,
  });

  revalidatePath("/office/spreadsheets");
  return { sheet, isNew: true };
}

export async function updateSpreadsheet(
  id: string,
  data: { title?: string; sheets?: unknown; sharedWith?: unknown }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.spreadsheet.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Spreadsheet not found");

  // If this is a temporary spreadsheet, extend its deletion timer by another 10 minutes on save
  let updatedProjectName = undefined;
  if (existing.projectName?.startsWith("TEMP_DELETE_AT:")) {
    const deleteAt = Date.now() + 3000;
    updatedProjectName = `TEMP_DELETE_AT:${deleteAt}`;
  }

  const sheet = await prisma.spreadsheet.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.sheets !== undefined && { sheets: data.sheets as object }),
      ...(data.sharedWith !== undefined && { sharedWith: data.sharedWith as object }),
      ...(updatedProjectName !== undefined && { projectName: updatedProjectName }),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "spreadsheet.update",
    entity: "Spreadsheet",
    entityId: id,
  });

  revalidatePath("/office/spreadsheets");
  return sheet;
}

export async function deleteSpreadsheet(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.spreadsheet.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Spreadsheet not found");

  await prisma.spreadsheet.delete({ where: { id } });

  await logAudit({
    tenantId,
    userId,
    action: "spreadsheet.delete",
    entity: "Spreadsheet",
    entityId: id,
  });

  revalidatePath("/office/spreadsheets");
}

/**
 * Delete all bulk-upload import spreadsheets for the current tenant.
 * These are temporary spreadsheets created by the Bulk Upload flow.
 */
export async function deleteImportSpreadsheets() {
  const { userId, tenantId } = await getSessionOrThrow();

  // Match all spreadsheets with "Import" or "Import –" in the title
  const importSheets = await prisma.spreadsheet.findMany({
    where: {
      ...tenantScope(tenantId),
      title: { contains: "Import", mode: "insensitive" },
    },
    select: { id: true },
  });

  if (importSheets.length === 0) return { count: 0 };

  await prisma.spreadsheet.deleteMany({
    where: {
      id: { in: importSheets.map((s) => s.id) },
      ...tenantScope(tenantId),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "spreadsheet.bulk_delete_imports",
    entity: "Spreadsheet",
    entityId: "bulk",
  });

  revalidatePath("/office/spreadsheets");
  return { count: importSheets.length };
}

// ============================================================================
// PRESENTATIONS
// ============================================================================

export async function getPresentations(filters?: { search?: string }) {
  const { tenantId } = await getSessionOrThrow();

  const where: Record<string, unknown> = { ...tenantScope(tenantId) };
  if (filters?.search) {
    where.title = { contains: filters.search, mode: "insensitive" };
  }

  return prisma.presentation.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function createPresentation(data: { title: string; theme?: string; projectName?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();

  const pres = await prisma.presentation.create({
    data: {
      tenantId,
      title: data.title,
      projectName: data.projectName,
      theme: data.theme ?? "default",
      slides: [
        { layout: "title", content: { title: data.title, subtitle: "" } },
      ],
      createdById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "presentation.create",
    entity: "Presentation",
    entityId: pres.id,
  });

  revalidatePath("/office/presentations");
  return pres;
}

export async function updatePresentation(
  id: string,
  data: { title?: string; slides?: unknown; theme?: string; sharedWith?: unknown }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.presentation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Presentation not found");

  const pres = await prisma.presentation.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slides !== undefined && { slides: data.slides as object }),
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.sharedWith !== undefined && { sharedWith: data.sharedWith as object }),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "presentation.update",
    entity: "Presentation",
    entityId: id,
  });

  revalidatePath("/office/presentations");
  return pres;
}

export async function deletePresentation(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.presentation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Presentation not found");

  await prisma.presentation.delete({ where: { id } });

  await logAudit({
    tenantId,
    userId,
    action: "presentation.delete",
    entity: "Presentation",
    entityId: id,
  });

  revalidatePath("/office/presentations");
}

// ============================================================================
// EMAIL ACCOUNTS
// ============================================================================

export async function getEmailAccounts() {
  const { userId, tenantId } = await getSessionOrThrow();

  return prisma.emailAccount.findMany({
    where: { ...tenantScope(tenantId), userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createEmailAccount(data: {
  email: string;
  displayName?: string;
  provider?: string;
  config?: Record<string, unknown>;
  isDefault?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  if (data.isDefault) {
    await prisma.emailAccount.updateMany({
      where: { ...tenantScope(tenantId), userId },
      data: { isDefault: false },
    });
  }

  const account = await prisma.emailAccount.create({
    data: {
      tenantId,
      userId,
      email: data.email,
      displayName: data.displayName,
      provider: data.provider ?? "smtp",
      config: (data.config ?? {}) as Record<string, string>,
      isDefault: data.isDefault ?? false,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "email_account.create",
    entity: "EmailAccount",
    entityId: account.id,
  });

  revalidatePath("/office/email");
  return account;
}

export async function deleteEmailAccount(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.emailAccount.findFirst({
    where: { id, ...tenantScope(tenantId), userId },
  });
  if (!existing) throw new Error("Email account not found");

  await prisma.emailAccount.delete({ where: { id } });

  await logAudit({
    tenantId,
    userId,
    action: "email_account.delete",
    entity: "EmailAccount",
    entityId: id,
  });

  revalidatePath("/office/email");
}

// ============================================================================
// EMAIL MESSAGES
// ============================================================================

export async function getEmails(accountId: string, folder: EmailFolder) {
  const { tenantId } = await getSessionOrThrow();

  return prisma.emailMessage.findMany({
    where: { ...tenantScope(tenantId), accountId, folder },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createEmail(data: {
  accountId: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  isDraft?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const account = await prisma.emailAccount.findFirst({
    where: { id: data.accountId, ...tenantScope(tenantId) },
  });
  if (!account) throw new Error("Email account not found");

  const email = await prisma.emailMessage.create({
    data: {
      tenantId,
      accountId: data.accountId,
      subject: data.subject,
      body: data.body,
      fromEmail: data.fromEmail,
      toEmails: data.toEmails,
      ccEmails: data.ccEmails ?? [],
      bccEmails: data.bccEmails ?? [],
      folder: data.isDraft ? "DRAFTS" : "SENT",
      isDraft: data.isDraft ?? false,
      sentAt: data.isDraft ? null : new Date(),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: data.isDraft ? "email.draft" : "email.send",
    entity: "EmailMessage",
    entityId: email.id,
  });

  revalidatePath("/office/email");
  return email;
}

export async function sendEmail(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const email = await prisma.emailMessage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!email) throw new Error("Email not found");

  const updated = await prisma.emailMessage.update({
    where: { id },
    data: { folder: "SENT", isDraft: false, sentAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "email.send",
    entity: "EmailMessage",
    entityId: id,
  });

  revalidatePath("/office/email");
  return updated;
}

export async function deleteEmail(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const email = await prisma.emailMessage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!email) throw new Error("Email not found");

  if (email.folder === "TRASH") {
    await prisma.emailMessage.delete({ where: { id } });
  } else {
    await prisma.emailMessage.update({
      where: { id },
      data: { folder: "TRASH" },
    });
  }

  await logAudit({
    tenantId,
    userId,
    action: "email.delete",
    entity: "EmailMessage",
    entityId: id,
  });

  revalidatePath("/office/email");
}

export async function toggleStar(id: string) {
  const { tenantId } = await getSessionOrThrow();

  const email = await prisma.emailMessage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!email) throw new Error("Email not found");

  await prisma.emailMessage.update({
    where: { id },
    data: { isStarred: !email.isStarred },
  });

  revalidatePath("/office/email");
}

export async function toggleRead(id: string) {
  const { tenantId } = await getSessionOrThrow();

  const email = await prisma.emailMessage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!email) throw new Error("Email not found");

  await prisma.emailMessage.update({
    where: { id },
    data: { isRead: !email.isRead },
  });

  revalidatePath("/office/email");
}

// ============================================================================
// MESSAGING - CHANNELS
// ============================================================================

export async function getChannels() {
  const { tenantId, userId } = await getSessionOrThrow();

  const channels = await prisma.chatChannel.findMany({
    where: { ...tenantScope(tenantId) },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Return all public channels + private ones the user is a member of
  return channels.filter((ch) => {
    if (!ch.isPrivate) return true;
    const members = ch.members as Array<{ userId: string }>;
    return Array.isArray(members) && members.some((m) => m.userId === userId);
  });
}

export async function createChannel(data: {
  name: string;
  description?: string;
  type: ChannelType;
  isPrivate?: boolean;
  memberIds?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const members = [
    { userId, role: "admin" },
    ...(data.memberIds ?? [])
      .filter((id) => id !== userId)
      .map((id) => ({ userId: id, role: "member" })),
  ];

  const channel = await prisma.chatChannel.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      isPrivate: data.isPrivate ?? false,
      members,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "channel.create",
    entity: "ChatChannel",
    entityId: channel.id,
  });

  revalidatePath("/office/messaging");
  return channel;
}

// ============================================================================
// MESSAGING - MESSAGES
// ============================================================================

export async function getChannelMessages(
  channelId: string,
  opts?: { parentId?: string | null; take?: number; sinceCreatedAt?: Date | string | null }
) {
  const { tenantId } = await getSessionOrThrow();

  // Optional incremental fetch: when `sinceCreatedAt` is passed, return only
  // messages newer than that timestamp. The polling loop in the messaging
  // client uses this to avoid re-downloading the whole thread every tick.
  const sinceDate = opts?.sinceCreatedAt ? new Date(opts.sinceCreatedAt) : null;

  return prisma.chatMessage.findMany({
    where: {
      ...tenantScope(tenantId),
      channelId,
      isDeleted: false,
      ...(opts?.parentId !== undefined ? { parentId: opts.parentId } : { parentId: null }),
      ...(sinceDate ? { createdAt: { gt: sinceDate } } : {}),
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
    take: opts?.take ?? 100,
  });
}

export async function sendMessage(data: {
  channelId: string;
  content: string;
  type?: MsgType;
  parentId?: string;
  mentions?: string[];
  attachments?: unknown[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const msg = await prisma.chatMessage.create({
    data: {
      tenantId,
      channelId: data.channelId,
      senderId: userId,
      content: data.content,
      type: data.type ?? "TEXT",
      parentId: data.parentId ?? null,
      mentions: data.mentions ?? [],
      attachments: (data.attachments as object[]) ?? [],
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  // Touch channel updatedAt
  const channel = await prisma.chatChannel.update({
    where: { id: data.channelId },
    data: { updatedAt: new Date() },
    select: { id: true, name: true, type: true, members: true },
  });

  // Notify recipients. For DM channels, notify the counterpart. For other
  // channels, notify users explicitly @mentioned. Never notify the sender.
  // Type uses INFO since the schema's NotificationType enum has no MESSAGE
  // variant yet — safe to swap in a future migration.
  const senderName = msg.sender?.name ?? msg.sender?.email ?? "Someone";
  const preview = data.content.length > 80 ? data.content.slice(0, 77) + "..." : data.content;
  const link = `/office/messaging?channelId=${data.channelId}`;

  const recipients = new Set<string>();
  if (channel.type === "DIRECT") {
    const members = (channel.members as Array<{ userId: string }>) || [];
    for (const m of members) if (m.userId && m.userId !== userId) recipients.add(m.userId);
  }
  for (const mentionedId of data.mentions ?? []) {
    if (mentionedId && mentionedId !== userId) recipients.add(mentionedId);
  }

  if (recipients.size > 0) {
    await prisma.notification.createMany({
      data: [...recipients].map((rid) => ({
        tenantId,
        userId: rid,
        type: "INFO" as const,
        title: channel.type === "DIRECT" ? `New message from ${senderName}` : `${senderName} mentioned you`,
        message: preview,
        link,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/office/messaging");
  return msg;
}

export async function editMessage(id: string, content: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const msg = await prisma.chatMessage.findFirst({
    where: { id, ...tenantScope(tenantId), senderId: userId },
  });
  if (!msg) throw new Error("Message not found or not yours");

  const updated = await prisma.chatMessage.update({
    where: { id },
    data: { content, isEdited: true },
  });

  revalidatePath("/office/messaging");
  return updated;
}

export async function deleteMessage(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const msg = await prisma.chatMessage.findFirst({
    where: { id, ...tenantScope(tenantId), senderId: userId },
  });
  if (!msg) throw new Error("Message not found or not yours");

  await prisma.chatMessage.update({
    where: { id },
    data: { isDeleted: true, content: "This message was deleted" },
  });

  revalidatePath("/office/messaging");
}

export async function addReaction(messageId: string, emoji: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const msg = await prisma.chatMessage.findFirst({
    where: { id: messageId, ...tenantScope(tenantId) },
  });
  if (!msg) throw new Error("Message not found");

  const reactions = (msg.reactions as Record<string, string[]>) ?? {};
  const users = reactions[emoji] ?? [];

  if (users.includes(userId)) {
    reactions[emoji] = users.filter((u) => u !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, userId];
  }

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { reactions },
  });

  revalidatePath("/office/messaging");
}

// Return the DM channel between current user and `otherUserId`, creating it
// on the fly if it doesn't exist yet. The messaging UI calls this when the
// user picks someone from the "+ New direct message" picker so chats can be
// initiated without the generic create-channel dialog.
export async function getOrCreateDirectChannel(otherUserId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (otherUserId === userId) {
    throw new Error("Cannot start a direct message with yourself");
  }

  // Confirm the other user is in the same tenant.
  const other = await prisma.user.findFirst({
    where: { id: otherUserId, tenantId },
    select: { id: true, name: true, email: true },
  });
  if (!other) throw new Error("User not found in this workspace");

  const existing = await prisma.chatChannel.findMany({
    where: { ...tenantScope(tenantId), type: "DIRECT" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });
  const match = existing.find((ch) => {
    const members = ch.members as Array<{ userId: string }>;
    return (
      Array.isArray(members) &&
      members.length === 2 &&
      members.some((m) => m.userId === userId) &&
      members.some((m) => m.userId === otherUserId)
    );
  });
  if (match) return match;

  // Self-resolve a label so the DM shows the other person's name in both
  // members' sidebars without extra client logic.
  const self = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const channel = await prisma.chatChannel.create({
    data: {
      tenantId,
      // Channel name is shown in the sidebar. We keep it generic — the client
      // already replaces it with the counterpart's name for DM channels.
      name: other.name ?? other.email ?? "Direct Message",
      type: "DIRECT",
      isPrivate: true,
      members: [
        { userId, role: "member", label: self?.name ?? self?.email ?? null },
        { userId: otherUserId, role: "member", label: other.name ?? other.email ?? null },
      ],
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "channel.create",
    entity: "ChatChannel",
    entityId: channel.id,
    metadata: { kind: "direct", peerId: otherUserId },
  });

  revalidatePath("/office/messaging");
  return channel;
}

export async function getDirectMessages(otherUserId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Find existing DM channel between these two users
  const channels = await prisma.chatChannel.findMany({
    where: { ...tenantScope(tenantId), type: "DIRECT" },
  });

  const dmChannel = channels.find((ch) => {
    const members = ch.members as Array<{ userId: string }>;
    return (
      Array.isArray(members) &&
      members.length === 2 &&
      members.some((m) => m.userId === userId) &&
      members.some((m) => m.userId === otherUserId)
    );
  });

  if (!dmChannel) return { channel: null, messages: [] };

  const messages = await prisma.chatMessage.findMany({
    where: { ...tenantScope(tenantId), channelId: dmChannel.id, isDeleted: false },
    include: {
      sender: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return { channel: dmChannel, messages };
}

// ============================================================================
// OFFICE STATS (for overview page)
// ============================================================================

export async function getOfficeStats() {
  const { tenantId, userId } = await getSessionOrThrow();

  const [docCount, sheetCount, presCount, unreadEmails, channelCount, recentMessages] =
    await Promise.all([
      prisma.officeDocument.count({ where: tenantScope(tenantId) }),
      prisma.spreadsheet.count({ where: tenantScope(tenantId) }),
      prisma.presentation.count({ where: tenantScope(tenantId) }),
      prisma.emailMessage.count({
        where: { ...tenantScope(tenantId), isRead: false, folder: "INBOX" },
      }),
      prisma.chatChannel.count({ where: tenantScope(tenantId) }),
      prisma.chatMessage.findMany({
        where: { ...tenantScope(tenantId), isDeleted: false },
        include: {
          sender: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return {
    docCount,
    sheetCount,
    presCount,
    unreadEmails,
    channelCount,
    recentMessages,
  };
}

// ============================================================================
// TENANT USERS (for sharing, mentions, DMs)
// ============================================================================

export async function getTenantUsers() {
  const { tenantId } = await getSessionOrThrow();

  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: "asc" },
    take: 200,
  });
}

// ============================================================================
// MESSAGE SEARCH (OFFICE-E-004)
// ============================================================================

// ============================================================================
// CALLS & VIDEO MEETINGS
// ============================================================================

export async function initiateCall(data: {
  calleeId: string;
  type: "AUDIO" | "VIDEO";
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  if (data.calleeId === userId) throw new Error("Cannot call yourself");

  const session = await prisma.callSession.create({
    data: {
      tenantId,
      callerId: userId,
      calleeId: data.calleeId,
      type: data.type,
      status: "RINGING",
    },
    include: {
      caller: { select: { id: true, name: true, email: true, avatar: true } },
      callee: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "call.initiate",
    entity: "CallSession",
    entityId: session.id,
  });

  revalidatePath("/office/calls");
  return session;
}

export async function getIncomingCalls() {
  const { userId, tenantId } = await getSessionOrThrow();

  return prisma.callSession.findMany({
    where: {
      ...tenantScope(tenantId),
      calleeId: userId,
      status: "RINGING",
    },
    include: {
      caller: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function answerCall(callId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const call = await prisma.callSession.findFirst({
    where: { id: callId, ...tenantScope(tenantId), calleeId: userId, status: "RINGING" },
  });
  if (!call) throw new Error("Call not found or already handled");

  const updated = await prisma.callSession.update({
    where: { id: callId },
    data: { status: "CONNECTED", startedAt: new Date() },
    include: {
      caller: { select: { id: true, name: true, email: true, avatar: true } },
      callee: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  revalidatePath("/office/calls");
  return updated;
}

export async function declineCall(callId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const call = await prisma.callSession.findFirst({
    where: { id: callId, ...tenantScope(tenantId), calleeId: userId, status: "RINGING" },
  });
  if (!call) throw new Error("Call not found or already handled");

  const updated = await prisma.callSession.update({
    where: { id: callId },
    data: { status: "DECLINED", endedAt: new Date() },
  });

  revalidatePath("/office/calls");
  return updated;
}

export async function endCall(callId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const call = await prisma.callSession.findFirst({
    where: {
      id: callId,
      ...tenantScope(tenantId),
      OR: [{ callerId: userId }, { calleeId: userId }],
      status: { in: ["RINGING", "CONNECTED"] },
    },
  });
  if (!call) throw new Error("Call not found or already ended");

  const now = new Date();
  let duration: number | null = null;
  if (call.startedAt) {
    duration = Math.round((now.getTime() - call.startedAt.getTime()) / 1000);
  }

  const finalStatus = call.status === "RINGING" ? "MISSED" : "ENDED";

  const updated = await prisma.callSession.update({
    where: { id: callId },
    data: { status: finalStatus, endedAt: now, duration },
  });

  await logAudit({
    tenantId,
    userId,
    action: "call.end",
    entity: "CallSession",
    entityId: callId,
  });

  revalidatePath("/office/calls");
  return updated;
}

export async function addSignaling(
  callId: string,
  signal: { type: string; data: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const call = await prisma.callSession.findFirst({
    where: {
      id: callId,
      ...tenantScope(tenantId),
      OR: [{ callerId: userId }, { calleeId: userId }],
    },
  });
  if (!call) throw new Error("Call not found");

  const existing = (call.signaling as Array<Record<string, unknown>>) ?? [];
  const updated = [
    ...existing,
    { from: userId, type: signal.type, data: signal.data, timestamp: Date.now() },
  ];

  await prisma.callSession.update({
    where: { id: callId },
    data: { signaling: updated as unknown as object },
  });

  return { ok: true };
}

export async function getSignaling(callId: string, since?: number) {
  const { userId, tenantId } = await getSessionOrThrow();

  const call = await prisma.callSession.findFirst({
    where: {
      id: callId,
      ...tenantScope(tenantId),
      OR: [{ callerId: userId }, { calleeId: userId }],
    },
    select: { signaling: true, status: true },
  });
  if (!call) throw new Error("Call not found");

  let signals = (call.signaling as Array<Record<string, unknown>>) ?? [];

  // Filter out messages from self and only return those after `since`
  signals = signals.filter(
    (s) =>
      s.from !== userId && (since == null || (s.timestamp as number) > since)
  );

  return { signals, status: call.status };
}

export async function getCallHistory(filters?: { page?: number }) {
  const { userId, tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = 20;

  const where = {
    ...tenantScope(tenantId),
    OR: [{ callerId: userId }, { calleeId: userId }],
  };

  const [data, total] = await Promise.all([
    prisma.callSession.findMany({
      where,
      include: {
        caller: { select: { id: true, name: true, email: true, avatar: true } },
        callee: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.callSession.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function searchMessages(filters: {
  query: string;
  channelId?: string;
  senderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters.page ?? 1;
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 50);

  if (!filters.query || filters.query.trim().length === 0) {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const where: Record<string, unknown> = {
    ...tenantScope(tenantId),
    isDeleted: false,
    content: { contains: filters.query, mode: "insensitive" },
  };

  if (filters.channelId) {
    where.channelId = filters.channelId;
  }
  if (filters.senderId) {
    where.senderId = filters.senderId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        channel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chatMessage.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
