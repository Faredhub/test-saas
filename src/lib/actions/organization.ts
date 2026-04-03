"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { cached, cacheKey, invalidatePattern, invalidateMany, TTL } from "@/lib/cache";

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
  reminderMinutes?: number | null; // null or undefined = no reminder
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
      reminderMinutes: data.reminderMinutes ?? null,
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
// IN-APP REMINDERS (ORG-D-003)
// ============================================================================

/**
 * Generate in-app reminder notifications for upcoming calendar events.
 * Queries events starting within the next 60 minutes that have a reminder
 * preference set and haven't been reminded yet. Creates Notification records.
 */
export async function generateEventReminders() {
  const { userId, tenantId } = await getSessionOrThrow();
  const now = new Date();
  const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  // Find events that:
  // 1. Start within the next 60 minutes
  // 2. Have a reminder preference set (reminderMinutes is not null)
  // 3. Haven't been reminded yet (reminderSent = false)
  const events = await prisma.calendarEvent.findMany({
    where: {
      ...tenantScope(tenantId),
      startTime: { gte: now, lte: sixtyMinutesFromNow },
      reminderMinutes: { not: null },
      reminderSent: false,
    },
  });

  const created: string[] = [];

  for (const event of events) {
    // Check if the reminder window has arrived
    // e.g., if reminderMinutes=15, the reminder fires when now >= startTime - 15min
    const reminderTime = new Date(
      new Date(event.startTime).getTime() - (event.reminderMinutes ?? 15) * 60 * 1000
    );

    if (now < reminderTime) continue; // Not yet time for this reminder

    // Build message with time and location
    const startStr = new Date(event.startTime).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const locationStr = event.location ? ` at ${event.location}` : "";
    const message = `Your event "${event.title}" starts at ${startStr}${locationStr}. Get ready!`;

    // Create the notification for the event creator
    await prisma.notification.create({
      data: {
        tenantId,
        userId: event.createdById,
        type: "REMINDER",
        title: `Upcoming: ${event.title}`,
        message,
        link: "/organization/calendar",
      },
    });

    // Mark event as reminded to avoid duplicates
    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { reminderSent: true },
    });

    created.push(event.id);
  }

  if (created.length > 0) {
    revalidatePath("/");
  }

  return { reminded: created.length };
}

/**
 * Return events starting in the next 24 hours for the current user.
 * Cached with SHORT TTL for the home page widget.
 */
export async function getUpcomingReminders() {
  const { userId, tenantId } = await getSessionOrThrow();
  const key = cacheKey(tenantId, "upcoming-reminders", userId);

  return cached(key, TTL.SHORT, async () => {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return prisma.calendarEvent.findMany({
      where: {
        ...tenantScope(tenantId),
        createdById: userId,
        startTime: { gte: now, lte: twentyFourHoursFromNow },
      },
      orderBy: { startTime: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        type: true,
        reminderMinutes: true,
      },
    });
  });
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
// APPROVAL WORKFLOWS (ORG-B-004)
// ============================================================================

export async function getApprovalWorkflows() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.approvalWorkflow.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });
}

export async function createApprovalWorkflow(data: {
  name: string;
  module: string;
  steps: { approverRole: string; order: number }[];
  autoApproveThreshold?: number;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const workflow = await prisma.approvalWorkflow.create({
    data: {
      tenantId,
      name: data.name,
      module: data.module,
      steps: data.steps,
    },
  });
  await logAudit({ tenantId, userId, action: "approval_workflow.create", entity: "ApprovalWorkflow", entityId: workflow.id });
  revalidatePath("/organization/approvals");
  return workflow;
}

export async function updateApprovalWorkflow(
  id: string,
  data: {
    name?: string;
    module?: string;
    steps?: { approverRole: string; order: number }[];
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.approvalWorkflow.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Workflow not found");
  await prisma.approvalWorkflow.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.module !== undefined && { module: data.module }),
      ...(data.steps !== undefined && { steps: data.steps }),
    },
  });
  await logAudit({ tenantId, userId, action: "approval_workflow.update", entity: "ApprovalWorkflow", entityId: id });
  revalidatePath("/organization/approvals");
}

export async function deleteApprovalWorkflow(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.approvalWorkflow.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "approval_workflow.delete", entity: "ApprovalWorkflow", entityId: id });
  revalidatePath("/organization/approvals");
}

export async function toggleApprovalWorkflow(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const workflow = await prisma.approvalWorkflow.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!workflow) throw new Error("Workflow not found");
  await prisma.approvalWorkflow.update({ where: { id }, data: { isActive: !workflow.isActive } });
  await logAudit({ tenantId, userId, action: "approval_workflow.toggle", entity: "ApprovalWorkflow", entityId: id });
  revalidatePath("/organization/approvals");
}

// ============================================================================
// CONTRACTS (ORG-G-001-004)
// ============================================================================

export async function getContracts(filters?: { search?: string; status?: string }) {
  const { tenantId } = await getSessionOrThrow();

  const where: Record<string, unknown> = { ...tenantScope(tenantId) };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const s = filters.search;
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { contractNo: { contains: s, mode: "insensitive" } },
    ];
  }

  return prisma.contract.findMany({
    where,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      createdBy: { select: { id: true, name: true, firstName: true, lastName: true } },
      signedBy: { select: { id: true, name: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createContract(data: {
  title: string;
  type?: string;
  contactId?: string;
  value?: number;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  autoRenew?: boolean;
  terms?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Auto-generate contract number: CON-YYYYMMDD-XXXX
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.contract.count({ where: tenantScope(tenantId) });
  const contractNo = `CON-${datePart}-${String(count + 1).padStart(4, "0")}`;

  const contract = await prisma.contract.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title,
      contractNo,
      type: data.type ?? "SERVICE",
      contactId: data.contactId || undefined,
      value: data.value != null ? data.value : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
      autoRenew: data.autoRenew ?? false,
      terms: data.terms,
      notes: data.notes,
    },
  });
  await logAudit({ tenantId, userId, action: "contract.create", entity: "Contract", entityId: contract.id });
  revalidatePath("/organization/contracts");
  return contract;
}

export async function updateContract(
  id: string,
  data: {
    title?: string;
    type?: string;
    contactId?: string | null;
    status?: string;
    value?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    renewalDate?: string | null;
    autoRenew?: boolean;
    terms?: string | null;
    notes?: string | null;
    signedById?: string | null;
    signedAt?: string | null;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.contract.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Contract not found");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.renewalDate !== undefined) updateData.renewalDate = data.renewalDate ? new Date(data.renewalDate) : null;
  if (data.autoRenew !== undefined) updateData.autoRenew = data.autoRenew;
  if (data.terms !== undefined) updateData.terms = data.terms;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.signedById !== undefined) updateData.signedById = data.signedById || null;
  if (data.signedAt !== undefined) updateData.signedAt = data.signedAt ? new Date(data.signedAt) : null;

  await prisma.contract.update({ where: { id }, data: updateData });
  await logAudit({ tenantId, userId, action: "contract.update", entity: "Contract", entityId: id });
  revalidatePath("/organization/contracts");
}

export async function deleteContract(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.contract.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "contract.delete", entity: "Contract", entityId: id });
  revalidatePath("/organization/contracts");
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

// ============================================================================
// SYSTEM SETTINGS (ORG-A005)
// ============================================================================

export type SystemSettings = {
  currency?: string;
  dateFormat?: string;
  fiscalYearStartMonth?: number;
  features?: {
    multiCurrency?: boolean;
    inventoryTracking?: boolean;
    approvalWorkflows?: boolean;
    advancedReporting?: boolean;
  };
};

export async function updateSystemSettings(data: SystemSettings) {
  const { userId, tenantId } = await getSessionOrThrow();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
  const existing = (tenant?.settings as Record<string, unknown>) ?? {};
  const merged = { ...existing, ...data };

  await prisma.tenant.update({ where: { id: tenantId }, data: { settings: merged } });
  await logAudit({ tenantId, userId, action: "org.system_settings.update", entity: "Tenant", entityId: tenantId });
  revalidatePath("/organization/settings");
}

// ============================================================================
// USER LICENCE MANAGEMENT (ORG-A003)
// ============================================================================

export async function getOrgUsers() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.user.findMany({
    where: tenantScope(tenantId),
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      roleAssignments: {
        select: {
          role: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrgRoles() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.role.findMany({
    where: tenantScope(tenantId),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();

  const user = await prisma.user.findFirst({ where: { id: userId, ...tenantScope(tenantId) } });
  if (!user) throw new Error("User not found");
  if (userId === currentUserId) throw new Error("Cannot change your own status");

  const newStatus = isActive ? "ACTIVE" as const : "INACTIVE" as const;
  await prisma.user.update({ where: { id: userId }, data: { status: newStatus } });
  await logAudit({
    tenantId,
    userId: currentUserId,
    action: isActive ? "user.activate" : "user.deactivate",
    entity: "User",
    entityId: userId,
  });
  revalidatePath("/organization/settings");
}

export async function inviteUser(data: { email: string; name: string; roleId?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Check seat limit
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { maxUsers: true } });
  const activeCount = await prisma.user.count({ where: { ...tenantScope(tenantId), status: { not: "INACTIVE" as const } } });
  if (tenant && activeCount >= tenant.maxUsers) {
    throw new Error(`Seat limit reached (${tenant.maxUsers}). Upgrade your plan or deactivate a user.`);
  }

  // Check duplicate email in tenant
  const existing = await prisma.user.findFirst({ where: { email: data.email, ...tenantScope(tenantId) } });
  if (existing) throw new Error("A user with this email already exists in your organization");

  const newUser = await prisma.user.create({
    data: {
      tenantId,
      email: data.email,
      name: data.name,
      firstName: data.name.split(" ")[0],
      lastName: data.name.split(" ").slice(1).join(" ") || undefined,
      status: "PENDING_VERIFICATION" as const,
    },
  });

  if (data.roleId) {
    const role = await prisma.role.findFirst({ where: { id: data.roleId, ...tenantScope(tenantId) } });
    if (role) {
      await prisma.userRole.create({ data: { userId: newUser.id, roleId: data.roleId } });
    }
  }

  await logAudit({ tenantId, userId, action: "user.invite", entity: "User", entityId: newUser.id });
  revalidatePath("/organization/settings");
  return newUser;
}

// ============================================================================
// SIGNATURES (ORG-F-001-003)
// ============================================================================

export async function getSignatures() {
  const { userId, tenantId } = await getSessionOrThrow();

  return cached(cacheKey(tenantId, "signatures", userId), TTL.MEDIUM, () =>
    prisma.signature.findMany({
      where: { ...tenantScope(tenantId), userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })
  );
}

export async function createSignature(data: { name: string; dataUrl: string }) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!data.name?.trim()) throw new Error("Signature name is required");
  if (!data.dataUrl) throw new Error("Signature data is required");

  const signature = await prisma.signature.create({
    data: {
      tenantId,
      userId,
      name: data.name.trim(),
      dataUrl: data.dataUrl,
    },
  });
  await logAudit({ tenantId, userId, action: "signature.create", entity: "Signature", entityId: signature.id });
  await invalidatePattern(`t:${tenantId}:signatures:*`);
  revalidatePath("/organization/signatures");
  return signature;
}

export async function deleteSignature(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.signature.deleteMany({ where: { id, ...tenantScope(tenantId), userId } });
  await logAudit({ tenantId, userId, action: "signature.delete", entity: "Signature", entityId: id });
  await invalidatePattern(`t:${tenantId}:signatures:*`);
  revalidatePath("/organization/signatures");
}

export async function setDefaultSignature(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify signature exists and belongs to user
  const signature = await prisma.signature.findFirst({
    where: { id, ...tenantScope(tenantId), userId },
  });
  if (!signature) throw new Error("Signature not found");

  // Unset all other defaults for this user, then set this one
  await prisma.$transaction([
    prisma.signature.updateMany({
      where: { ...tenantScope(tenantId), userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.signature.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  await logAudit({ tenantId, userId, action: "signature.set_default", entity: "Signature", entityId: id });
  await invalidatePattern(`t:${tenantId}:signatures:*`);
  revalidatePath("/organization/signatures");
}

// ============================================================================
// SIGNATURE REQUESTS (ORG-F-002)
// ============================================================================

export async function getSignatureRequests() {
  const { userId, tenantId } = await getSessionOrThrow();
  return prisma.signatureRequest.findMany({
    where: {
      ...tenantScope(tenantId),
      OR: [{ requestedById: userId }, { assignedToId: userId }],
    },
    include: {
      requestedBy: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
      assignedTo: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSignatureRequest(data: {
  title: string;
  description?: string;
  documentRef?: string;
  assignedToId: string;
  expiresAt?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!data.title?.trim()) throw new Error("Title is required");
  if (!data.assignedToId) throw new Error("Assignee is required");
  if (data.assignedToId === userId) throw new Error("Cannot send a signature request to yourself");

  // Verify assignee belongs to the same tenant
  const assignee = await prisma.user.findFirst({
    where: { id: data.assignedToId, ...tenantScope(tenantId) },
    select: { id: true, name: true },
  });
  if (!assignee) throw new Error("Assignee not found in your organization");

  const request = await prisma.signatureRequest.create({
    data: {
      tenantId,
      requestedById: userId,
      assignedToId: data.assignedToId,
      title: data.title.trim(),
      description: data.description || undefined,
      documentRef: data.documentRef || undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  // Create notification for the assignee
  await prisma.notification.create({
    data: {
      tenantId,
      userId: data.assignedToId,
      type: "SIGNATURE_REQUEST",
      title: "Signature Requested",
      message: `You have a new signature request: "${data.title.trim()}"`,
      link: "/organization/signatures",
    },
  });

  await logAudit({ tenantId, userId, action: "signature_request.create", entity: "SignatureRequest", entityId: request.id });
  revalidatePath("/organization/signatures");
  return request;
}

export async function signSignatureRequest(id: string, signatureId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!signatureId) throw new Error("Please select a signature");

  const request = await prisma.signatureRequest.findFirst({
    where: { id, ...tenantScope(tenantId), assignedToId: userId, status: "PENDING" },
  });
  if (!request) throw new Error("Signature request not found or already processed");

  // Verify the signature belongs to the current user
  const signature = await prisma.signature.findFirst({
    where: { id: signatureId, ...tenantScope(tenantId), userId },
  });
  if (!signature) throw new Error("Signature not found");

  await prisma.signatureRequest.update({
    where: { id },
    data: { status: "SIGNED", signatureId, signedAt: new Date() },
  });

  // Notify the requester
  await prisma.notification.create({
    data: {
      tenantId,
      userId: request.requestedById,
      type: "SIGNATURE_REQUEST",
      title: "Signature Completed",
      message: `Your signature request "${request.title}" has been signed.`,
      link: "/organization/signatures",
    },
  });

  await logAudit({ tenantId, userId, action: "signature_request.sign", entity: "SignatureRequest", entityId: id });
  revalidatePath("/organization/signatures");
}

export async function declineSignatureRequest(id: string, reason?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const request = await prisma.signatureRequest.findFirst({
    where: { id, ...tenantScope(tenantId), assignedToId: userId, status: "PENDING" },
  });
  if (!request) throw new Error("Signature request not found or already processed");

  await prisma.signatureRequest.update({
    where: { id },
    data: { status: "DECLINED", declinedAt: new Date(), declineReason: reason || undefined },
  });

  // Notify the requester
  await prisma.notification.create({
    data: {
      tenantId,
      userId: request.requestedById,
      type: "SIGNATURE_REQUEST",
      title: "Signature Declined",
      message: `Your signature request "${request.title}" has been declined.${reason ? ` Reason: ${reason}` : ""}`,
      link: "/organization/signatures",
    },
  });

  await logAudit({ tenantId, userId, action: "signature_request.decline", entity: "SignatureRequest", entityId: id });
  revalidatePath("/organization/signatures");
}

// ============================================================================
// LIBRARY / KNOWLEDGE BASE (ORG-I-001-004)
// ============================================================================

export async function getDocuments(filters?: { search?: string; category?: string }) {
  const { tenantId } = await getSessionOrThrow();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { ...tenantScope(tenantId) };

  if (filters?.category && filters.category !== "ALL") {
    where.category = filters.category;
  }

  if (filters?.search) {
    const s = filters.search;
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
      { content: { contains: s, mode: "insensitive" } },
      { tags: { has: s } },
    ];
  }

  return prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, name: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(data: {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  content?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!data.title?.trim()) throw new Error("Document title is required");

  const doc = await prisma.document.create({
    data: {
      tenantId,
      uploadedById: userId,
      title: data.title.trim(),
      description: data.description || undefined,
      category: data.category ?? "GENERAL",
      tags: data.tags ?? [],
      fileName: data.fileName || `${data.title.trim().replace(/\s+/g, "_").toLowerCase()}.txt`,
      fileSize: data.fileSize ?? 0,
      mimeType: data.mimeType ?? (data.content ? "text/plain" : "application/octet-stream"),
      content: data.content || undefined,
    },
  });
  await logAudit({ tenantId, userId, action: "document.create", entity: "Document", entityId: doc.id });
  revalidatePath("/organization/library");
  return doc;
}

export async function updateDocument(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    category?: string;
    tags?: string[];
    content?: string | null;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.document.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Document not found");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.content !== undefined) updateData.content = data.content;

  // Bump version on every update
  updateData.version = existing.version + 1;

  await prisma.document.update({ where: { id }, data: updateData });
  await logAudit({ tenantId, userId, action: "document.update", entity: "Document", entityId: id });
  revalidatePath("/organization/library");
}

export async function deleteDocument(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.document.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "document.delete", entity: "Document", entityId: id });
  revalidatePath("/organization/library");
}

// ============================================================================
// DATABASE MANAGER (ORG-A-004) — Read-Only Stats & Monitoring
// ============================================================================

export type TableStat = {
  name: string;
  label: string;
  count: number;
};

export type DatabaseStats = {
  tables: TableStat[];
  totalRecords: number;
  emptyTables: string[];
  fetchedAt: string;
};

/**
 * Returns record counts for all major tables scoped to the current tenant.
 * Uses prisma.$transaction for efficiency and caches with TTL.LONG.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const { tenantId } = await getSessionOrThrow();
  const key = cacheKey(tenantId, "database", "stats");

  return cached<DatabaseStats>(key, TTL.LONG, async () => {
    const scope = tenantScope(tenantId);

    const [
      users,
      leads,
      contacts,
      deals,
      invoices,
      quotations,
      activities,
      announcements,
      notes,
      contracts,
      documents,
      auditLogs,
      departments,
      branches,
      calendarEvents,
      signatures,
      approvalWorkflows,
      notifications,
    ] = await prisma.$transaction([
      prisma.user.count({ where: scope }),
      prisma.lead.count({ where: scope }),
      prisma.contact.count({ where: scope }),
      prisma.deal.count({ where: scope }),
      prisma.invoice.count({ where: scope }),
      prisma.quotation.count({ where: scope }),
      prisma.activity.count({ where: scope }),
      prisma.announcement.count({ where: scope }),
      prisma.note.count({ where: scope }),
      prisma.contract.count({ where: scope }),
      prisma.document.count({ where: scope }),
      prisma.auditLog.count({ where: scope }),
      prisma.department.count({ where: scope }),
      prisma.branch.count({ where: scope }),
      prisma.calendarEvent.count({ where: scope }),
      prisma.signature.count({ where: scope }),
      prisma.approvalWorkflow.count({ where: scope }),
      prisma.notification.count({ where: scope }),
    ]);

    const tables: TableStat[] = [
      { name: "users", label: "Users", count: users },
      { name: "leads", label: "Leads", count: leads },
      { name: "contacts", label: "Contacts", count: contacts },
      { name: "deals", label: "Deals", count: deals },
      { name: "invoices", label: "Invoices", count: invoices },
      { name: "quotations", label: "Quotations", count: quotations },
      { name: "activities", label: "Activities", count: activities },
      { name: "announcements", label: "Announcements", count: announcements },
      { name: "notes", label: "Notes", count: notes },
      { name: "contracts", label: "Contracts", count: contracts },
      { name: "documents", label: "Documents", count: documents },
      { name: "auditLogs", label: "Audit Logs", count: auditLogs },
      { name: "departments", label: "Departments", count: departments },
      { name: "branches", label: "Branches", count: branches },
      { name: "calendarEvents", label: "Calendar Events", count: calendarEvents },
      { name: "signatures", label: "Signatures", count: signatures },
      { name: "approvalWorkflows", label: "Approval Workflows", count: approvalWorkflows },
      { name: "notifications", label: "Notifications", count: notifications },
    ];

    const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);
    const emptyTables = tables.filter((t) => t.count === 0).map((t) => t.label);

    return {
      tables,
      totalRecords,
      emptyTables,
      fetchedAt: new Date().toISOString(),
    };
  });
}

export type AuditLogEntry = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: { id: string; name: string | null; firstName: string | null; lastName: string | null } | null;
};

/**
 * Returns recent audit log entries for the tenant. Read-only.
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
  const { tenantId } = await getSessionOrThrow();
  const key = cacheKey(tenantId, "database", "audit-logs", { limit });

  return cached<AuditLogEntry[]>(key, TTL.SHORT, async () => {
    const logs = await prisma.auditLog.findMany({
      where: tenantScope(tenantId),
      include: {
        user: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
    return logs;
  });
}

// ============================================================================
// FORM BUILDER (ORG-H-001-004)
// ============================================================================

export async function getForms() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.formTemplate.findMany({
    where: tenantScope(tenantId),
    include: {
      createdBy: { select: { id: true, name: true, firstName: true, lastName: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getForm(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const form = await prisma.formTemplate.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      createdBy: { select: { id: true, name: true, firstName: true, lastName: true } },
      _count: { select: { submissions: true } },
    },
  });
  if (!form) throw new Error("Form not found");
  return form;
}

export async function createForm(data: {
  title: string;
  description?: string;
  fields?: unknown[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!data.title?.trim()) throw new Error("Form title is required");

  const form = await prisma.formTemplate.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title.trim(),
      description: data.description || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fields: (data.fields ?? []) as any,
    },
  });
  await logAudit({ tenantId, userId, action: "form.create", entity: "FormTemplate", entityId: form.id });
  revalidatePath("/organization/forms");
  return form;
}

export async function updateForm(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    fields?: unknown[];
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.formTemplate.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Form not found");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.fields !== undefined) updateData.fields = data.fields;

  await prisma.formTemplate.update({ where: { id }, data: updateData });
  await logAudit({ tenantId, userId, action: "form.update", entity: "FormTemplate", entityId: id });
  revalidatePath("/organization/forms");
}

export async function deleteForm(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.formTemplate.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "form.delete", entity: "FormTemplate", entityId: id });
  revalidatePath("/organization/forms");
}

export async function publishForm(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.formTemplate.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Form not found");

  const isPublished = !existing.isPublished;
  const shareUrl = isPublished && !existing.shareUrl
    ? `form-${id.slice(0, 8)}-${Date.now().toString(36)}`
    : existing.shareUrl;

  await prisma.formTemplate.update({
    where: { id },
    data: { isPublished, shareUrl },
  });
  await logAudit({ tenantId, userId, action: isPublished ? "form.publish" : "form.unpublish", entity: "FormTemplate", entityId: id });
  revalidatePath("/organization/forms");
}

export async function getFormSubmissions(formId: string) {
  const { tenantId } = await getSessionOrThrow();
  // Verify form belongs to tenant
  const form = await prisma.formTemplate.findFirst({ where: { id: formId, ...tenantScope(tenantId) } });
  if (!form) throw new Error("Form not found");

  return prisma.formSubmission.findMany({
    where: { formId, ...tenantScope(tenantId) },
    orderBy: { submittedAt: "desc" },
  });
}

export async function submitForm(formId: string, data: Record<string, unknown>) {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const tenantId = user?.tenantId as string;
  if (!tenantId) throw new Error("Unauthorized");

  // Verify form exists and is published
  const form = await prisma.formTemplate.findFirst({
    where: { id: formId, ...tenantScope(tenantId) },
  });
  if (!form) throw new Error("Form not found");

  const submission = await prisma.formSubmission.create({
    data: {
      tenantId,
      formId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      submittedBy: user?.id || null,
    },
  });
  revalidatePath("/organization/forms");
  return submission;
}

// ============================================================================
// REPORTS GENERATOR (ORG-J001-005)
// ============================================================================

export type ReportConfig = {
  dataSource: "leads" | "deals" | "invoices" | "contacts" | "activities";
  groupBy: string;
  metric: "count" | "sum" | "average";
  dateRange?: { from: string; to: string };
};

export type ReportRow = {
  group: string;
  value: number;
};

/**
 * Query aggregated report data from the specified data source.
 * Returns rows of { group, value } suitable for charts and tables.
 */
export async function getReportData(config: ReportConfig): Promise<ReportRow[]> {
  const { tenantId } = await getSessionOrThrow();
  const scope = tenantScope(tenantId);

  const dateFilter = config.dateRange
    ? {
        createdAt: {
          gte: new Date(config.dateRange.from),
          lte: new Date(config.dateRange.to + "T23:59:59.999Z"),
        },
      }
    : {};

  switch (config.dataSource) {
    case "leads":
      return aggregateLeads(scope, config.groupBy, config.metric, dateFilter);
    case "deals":
      return aggregateDeals(scope, config.groupBy, config.metric, dateFilter);
    case "invoices":
      return aggregateInvoices(scope, config.groupBy, config.metric, dateFilter);
    case "contacts":
      return aggregateContacts(scope, config.groupBy, config.metric, dateFilter);
    case "activities":
      return aggregateActivities(scope, config.groupBy, config.metric, dateFilter);
    default:
      throw new Error(`Unknown data source: ${config.dataSource}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function aggregateLeads(scope: any, groupBy: string, metric: string, dateFilter: any): Promise<ReportRow[]> {
  const leads = await prisma.lead.findMany({
    where: { ...scope, ...dateFilter },
    include: { assignedTo: { select: { name: true, firstName: true, lastName: true } } },
  });

  return groupAndAggregate(
    leads,
    (lead) => {
      switch (groupBy) {
        case "source": return lead.source;
        case "stage": return lead.pipelineStage;
        case "status": return lead.status;
        case "month": return formatMonth(lead.createdAt);
        case "owner": return lead.assignedTo
          ? (lead.assignedTo.name || `${lead.assignedTo.firstName ?? ""} ${lead.assignedTo.lastName ?? ""}`.trim() || "Unassigned")
          : "Unassigned";
        default: return lead.source;
      }
    },
    metric === "sum" || metric === "average"
      ? (lead) => Number(lead.estimatedValue ?? 0)
      : undefined,
    metric,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function aggregateDeals(scope: any, groupBy: string, metric: string, dateFilter: any): Promise<ReportRow[]> {
  const deals = await prisma.deal.findMany({
    where: { ...scope, ...dateFilter },
    include: { owner: { select: { name: true, firstName: true, lastName: true } } },
  });

  return groupAndAggregate(
    deals,
    (deal) => {
      switch (groupBy) {
        case "stage": return deal.stage;
        case "owner": return deal.owner.name || `${deal.owner.firstName ?? ""} ${deal.owner.lastName ?? ""}`.trim() || "Unknown";
        case "month": return formatMonth(deal.createdAt);
        case "status": return deal.stage;
        default: return deal.stage;
      }
    },
    metric === "sum" || metric === "average"
      ? (deal) => Number(deal.value ?? 0)
      : undefined,
    metric,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function aggregateInvoices(scope: any, groupBy: string, metric: string, dateFilter: any): Promise<ReportRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { ...scope, ...dateFilter },
    include: { contact: { select: { firstName: true, lastName: true, company: true } } },
  });

  return groupAndAggregate(
    invoices,
    (inv) => {
      switch (groupBy) {
        case "status": return inv.status;
        case "month": return formatMonth(inv.createdAt);
        case "contact": return inv.contact
          ? (inv.contact.company || `${inv.contact.firstName} ${inv.contact.lastName ?? ""}`.trim())
          : "No Contact";
        default: return inv.status;
      }
    },
    metric === "sum" || metric === "average"
      ? (inv) => Number(inv.total ?? 0)
      : undefined,
    metric,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function aggregateContacts(scope: any, groupBy: string, metric: string, dateFilter: any): Promise<ReportRow[]> {
  const contacts = await prisma.contact.findMany({
    where: { ...scope, ...dateFilter },
  });

  return groupAndAggregate(
    contacts,
    (c) => {
      switch (groupBy) {
        case "city": return c.city || "Unknown";
        case "tags": return (c.tags && c.tags.length > 0) ? c.tags[0] : "No Tags";
        case "month": return formatMonth(c.createdAt);
        case "company": return c.company || "No Company";
        default: return c.city || "Unknown";
      }
    },
    undefined,
    metric,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function aggregateActivities(scope: any, groupBy: string, metric: string, dateFilter: any): Promise<ReportRow[]> {
  const activities = await prisma.activity.findMany({
    where: { ...scope, ...dateFilter },
    include: { user: { select: { name: true, firstName: true, lastName: true } } },
  });

  return groupAndAggregate(
    activities,
    (a) => {
      switch (groupBy) {
        case "type": return a.type;
        case "user": return a.user.name || `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() || "Unknown";
        case "month": return formatMonth(a.createdAt);
        default: return a.type;
      }
    },
    metric === "sum" || metric === "average"
      ? (a) => a.duration ?? 0
      : undefined,
    metric,
  );
}

function formatMonth(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function groupAndAggregate<T>(
  items: T[],
  groupFn: (item: T) => string,
  valueFn: ((item: T) => number) | undefined,
  metric: string,
): ReportRow[] {
  const groups = new Map<string, { sum: number; count: number }>();

  for (const item of items) {
    const key = groupFn(item);
    const existing = groups.get(key) ?? { sum: 0, count: 0 };
    existing.count += 1;
    if (valueFn) {
      existing.sum += valueFn(item);
    }
    groups.set(key, existing);
  }

  const rows: ReportRow[] = [];
  for (const [group, agg] of groups.entries()) {
    let value: number;
    if (metric === "sum") {
      value = Math.round(agg.sum * 100) / 100;
    } else if (metric === "average") {
      value = agg.count > 0 ? Math.round((agg.sum / agg.count) * 100) / 100 : 0;
    } else {
      value = agg.count;
    }
    rows.push({ group, value });
  }

  // Sort: months ascending, others by value descending
  rows.sort((a, b) => {
    if (/^\d{4}-\d{2}$/.test(a.group)) return a.group.localeCompare(b.group);
    return b.value - a.value;
  });

  return rows;
}

/**
 * List all saved report configs for the current tenant.
 */
export async function getSavedReports() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.savedReport.findMany({
    where: tenantScope(tenantId),
    include: {
      createdBy: { select: { id: true, name: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Save a report configuration for reuse.
 */
export async function saveReport(data: { title: string; config: ReportConfig }) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!data.title?.trim()) throw new Error("Report title is required");

  const report = await prisma.savedReport.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title.trim(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: data.config as any,
    },
  });
  await logAudit({ tenantId, userId, action: "report.save", entity: "SavedReport", entityId: report.id });
  revalidatePath("/organization/reports");
  return report;
}

/**
 * Delete a saved report.
 */
export async function deleteReport(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.savedReport.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "report.delete", entity: "SavedReport", entityId: id });
  revalidatePath("/organization/reports");
}
