"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// DEPARTMENTS (ORG-B-001)
// ============================================================================

export async function getDepartments() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.department.findMany({
    where: tenantScope(tenantId),
    include: { parent: { select: { id: true, name: true } }, children: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(data: { name: string; parentId?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();
  const dept = await prisma.department.create({
    data: { tenantId, name: data.name, parentId: data.parentId },
  });
  await logAudit({ tenantId, userId, action: "department.create", entity: "Department", entityId: dept.id });
  revalidatePath("/organization/departments");
  return dept;
}

export async function updateDepartment(id: string, data: { name?: string; parentId?: string | null }) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.department.updateMany({ where: { id, ...tenantScope(tenantId) }, data });
  await logAudit({ tenantId, userId, action: "department.update", entity: "Department", entityId: id });
  revalidatePath("/organization/departments");
}

export async function deleteDepartment(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.department.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "department.delete", entity: "Department", entityId: id });
  revalidatePath("/organization/departments");
}

// ============================================================================
// BRANCHES
// ============================================================================

export async function getBranches() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.branch.findMany({ where: tenantScope(tenantId), orderBy: { name: "asc" } });
}

export async function createBranch(data: {
  name: string; address?: string; city?: string; state?: string; phone?: string; email?: string; isHeadOffice?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const branch = await prisma.branch.create({ data: { tenantId, ...data } });
  await logAudit({ tenantId, userId, action: "branch.create", entity: "Branch", entityId: branch.id });
  revalidatePath("/organization/branches");
  return branch;
}

export async function updateBranch(id: string, data: {
  name?: string; address?: string; city?: string; state?: string; phone?: string; email?: string; isHeadOffice?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.branch.updateMany({ where: { id, ...tenantScope(tenantId) }, data });
  await logAudit({ tenantId, userId, action: "branch.update", entity: "Branch", entityId: id });
  revalidatePath("/organization/branches");
}

export async function deleteBranch(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.branch.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "branch.delete", entity: "Branch", entityId: id });
  revalidatePath("/organization/branches");
}

// ============================================================================
// ANNOUNCEMENTS (ORG-C)
// ============================================================================

export async function getAnnouncements() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.announcement.findMany({
    where: tenantScope(tenantId),
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAnnouncement(data: {
  title: string; content: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  audience?: "ALL" | "DEPARTMENT" | "TEAM" | "BRANCH"; isPinned?: boolean; expiresAt?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const ann = await prisma.announcement.create({
    data: {
      tenantId,
      authorId: userId,
      title: data.title,
      content: data.content,
      priority: data.priority ?? "NORMAL",
      audience: data.audience ?? "ALL",
      isPinned: data.isPinned ?? false,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
  await logAudit({ tenantId, userId, action: "announcement.create", entity: "Announcement", entityId: ann.id });
  revalidatePath("/organization/notices");
  return ann;
}

export async function deleteAnnouncement(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.announcement.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "announcement.delete", entity: "Announcement", entityId: id });
  revalidatePath("/organization/notices");
}

// ============================================================================
// CALENDAR EVENTS (ORG-D)
// ============================================================================

export async function getCalendarEvents(month?: number, year?: number) {
  const { tenantId, userId } = await getSessionOrThrow();
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59);

  return prisma.calendarEvent.findMany({
    where: {
      ...tenantScope(tenantId),
      startTime: { gte: start, lte: end },
    },
    orderBy: { startTime: "asc" },
  });
}

export async function createCalendarEvent(data: {
  title: string; description?: string; startTime: string; endTime: string;
  location?: string; type?: "MEETING" | "APPOINTMENT" | "REMINDER" | "TASK_DEADLINE" | "OTHER";
  isAllDay?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const event = await prisma.calendarEvent.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      location: data.location,
      type: data.type ?? "MEETING",
      isAllDay: data.isAllDay ?? false,
    },
  });
  await logAudit({ tenantId, userId, action: "event.create", entity: "CalendarEvent", entityId: event.id });
  revalidatePath("/organization/calendar");
  return event;
}

export async function deleteCalendarEvent(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.calendarEvent.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "event.delete", entity: "CalendarEvent", entityId: id });
  revalidatePath("/organization/calendar");
}

// ============================================================================
// NOTES & TODO (ORG-E)
// ============================================================================

export async function getNotes() {
  const { userId, tenantId } = await getSessionOrThrow();
  return prisma.note.findMany({
    where: { ...tenantScope(tenantId), OR: [{ userId }, { isShared: true }] },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createNote(data: {
  title: string; content?: string; type?: "NOTE" | "TODO"; isShared?: boolean; dueDate?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const note = await prisma.note.create({
    data: {
      tenantId,
      userId,
      title: data.title,
      content: data.content,
      type: data.type ?? "NOTE",
      isShared: data.isShared ?? false,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  revalidatePath("/organization/notes");
  return note;
}

export async function toggleNoteComplete(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const note = await prisma.note.findFirst({ where: { id, ...tenantScope(tenantId), userId } });
  if (!note) throw new Error("Note not found");
  await prisma.note.update({ where: { id }, data: { isCompleted: !note.isCompleted } });
  revalidatePath("/organization/notes");
}

export async function deleteNote(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.note.deleteMany({ where: { id, ...tenantScope(tenantId), userId } });
  revalidatePath("/organization/notes");
}

// ============================================================================
// SETTINGS (ORG-A)
// ============================================================================

export async function getOrgSettings() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

export async function updateOrgSettings(data: {
  name?: string; phone?: string; email?: string; website?: string;
  address?: string; city?: string; state?: string; pincode?: string;
  pan?: string; gst?: string; cin?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.tenant.update({ where: { id: tenantId }, data });
  await logAudit({ tenantId, userId, action: "org.settings.update", entity: "Tenant", entityId: tenantId });
  revalidatePath("/organization/settings");
}
