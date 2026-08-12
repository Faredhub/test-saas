"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import { cached, cacheKey, invalidatePattern, invalidateMany, TTL } from "@/lib/cache";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

async function requireAdminOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const userRoles = user.roles as string[] || [];
  const isAdmin = userRoles.some(
    (r) => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager"
  );
  if (!isAdmin) throw new Error("Forbidden: Admin access required");
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
  await requirePermission({ module: "organization", action: "create", resource: "departments" });
  const { userId, tenantId } = await getSessionOrThrow();
  const dept = await prisma.department.create({
    data: { tenantId, name: data.name, parentId: data.parentId },
  });
  await logAudit({ tenantId, userId, action: "department.create", entity: "Department", entityId: dept.id });
  revalidatePath("/organization/departments");
  return dept;
}

export async function updateDepartment(id: string, data: { name?: string; parentId?: string | null }) {
  await requirePermission({ module: "organization", action: "update", resource: "departments" });
  const { userId, tenantId } = await getSessionOrThrow();
  // HIGH-02: Explicitly destructure allowed fields to prevent mass assignment
  const { name, parentId } = data;
  await prisma.department.updateMany({ where: { id, ...tenantScope(tenantId) }, data: { name, parentId } });
  await logAudit({ tenantId, userId, action: "department.update", entity: "Department", entityId: id });
  revalidatePath("/organization/departments");
}

export async function deleteDepartment(id: string) {
  await requirePermission({ module: "organization", action: "delete", resource: "departments" });
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.department.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "department.delete", entity: "Department", entityId: id });
  revalidatePath("/organization/departments");
}

export async function deleteReport(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.savedReport.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "report.delete", entity: "SavedReport", entityId: id });
  revalidatePath("/organization/reports");
}

export async function getBranchEmployees(branchId: string) {
  const { tenantId } = await getSessionOrThrow();
  const employees = await prisma.employee.findMany({
    where: {
      tenantId,
      branchId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      designation: true,
      status: true,
      reportingToId: true,
      userId: true,
    },
    orderBy: { firstName: "asc" },
  });

  const userIds = employees.map((e) => e.userId).filter((id): id is string => !!id);
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, avatar: true },
      })
    : [];

  const avatarMap = new Map(users.map((u) => [u.id, u.avatar]));

  return employees.map((emp) => ({
    ...emp,
    avatar: emp.userId ? avatarMap.get(emp.userId) || null : null,
  }));
}

export async function getDepartmentEmployees(departmentId: string) {
  const { tenantId } = await getSessionOrThrow();
  const employees = await prisma.employee.findMany({
    where: {
      tenantId,
      departmentId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      designation: true,
      status: true,
      reportingToId: true,
      userId: true,
    },
    orderBy: { firstName: "asc" },
  });

  const userIds = employees.map((e) => e.userId).filter((id): id is string => !!id);
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, avatar: true },
      })
    : [];

  const avatarMap = new Map(users.map((u) => [u.id, u.avatar]));

  return employees.map((emp) => ({
    ...emp,
    avatar: emp.userId ? avatarMap.get(emp.userId) || null : null,
  }));
}

export async function assignEmployeeToDepartment(employeeId: string, departmentId: string | null) {
  const { tenantId, userId } = await getSessionOrThrow();
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...tenantScope(tenantId) },
  });
  if (!employee) throw new Error("Employee not found");

  await prisma.employee.update({
    where: { id: employeeId },
    data: { departmentId },
  });

  await logAudit({
    tenantId,
    userId,
    action: "employee.assign_department",
    entity: "Employee",
    entityId: employeeId,
    metadata: { departmentId },
  });

  revalidatePath("/organization/departments");
}

export async function getAllEmployees() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.employee.findMany({
    where: { tenantId, status: "ACTIVE" },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      designation: true,
      userId: true,
      departmentId: true,
      branchId: true,
    },
    orderBy: { firstName: "asc" },
  });
}

// ============================================================================
// BRANCHES
// ============================================================================

export async function getBranches() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.branch.findMany({
    where: tenantScope(tenantId),
    include: {
      branchHead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          email: true,
          phone: true,
          designation: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createBranch(data: {
  name: string; address?: string; city?: string; state?: string; phone?: string; email?: string; isHeadOffice?: boolean; branchHeadId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const { name, address, city, state, phone, email, isHeadOffice, branchHeadId } = data;
  const branch = await prisma.branch.create({
    data: {
      tenantId, name, address, city, state, phone, email, isHeadOffice,
      branchHeadId: branchHeadId || undefined,
    },
  });
  await logAudit({ tenantId, userId, action: "branch.create", entity: "Branch", entityId: branch.id });
  revalidatePath("/organization/branches");
  return branch;
}

export async function updateBranch(id: string, data: {
  name?: string; address?: string; city?: string; state?: string; phone?: string; email?: string; isHeadOffice?: boolean; branchHeadId?: string | null;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const { name, address, city, state, phone, email, isHeadOffice, branchHeadId } = data;
  await prisma.branch.update({
    where: { id },
    data: {
      name, address, city, state, phone, email, isHeadOffice,
      branchHeadId: branchHeadId === undefined ? undefined : branchHeadId,
    },
  });
  await logAudit({ tenantId, userId, action: "branch.update", entity: "Branch", entityId: id });
  revalidatePath("/organization/branches");
}

export async function deleteBranch(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.branch.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "branch.delete", entity: "Branch", entityId: id });
  revalidatePath("/organization/branches");
}

export async function assignEmployeeToBranch(employeeId: string, branchId: string | null) {
  const { tenantId, userId } = await getSessionOrThrow();
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...tenantScope(tenantId) },
  });
  if (!employee) throw new Error("Employee not found");

  await prisma.employee.update({
    where: { id: employeeId },
    data: { branchId },
  });

  await logAudit({
    tenantId,
    userId,
    action: "employee.assign_branch",
    entity: "Employee",
    entityId: employeeId,
    metadata: { branchId },
  });

  revalidatePath("/organization/branches");
}

export async function importBranches(
  branches: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    isHeadOffice?: boolean | string | number;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const b of branches) {
      try {
        if (!b.name?.trim()) {
          errors.push(`Row missing required field (Branch Name).`);
          continue;
        }

        const isHeadOfficeValue = b.isHeadOffice === true || 
          String(b.isHeadOffice).toLowerCase() === "true" || 
          String(b.isHeadOffice).toLowerCase() === "yes" || 
          b.isHeadOffice === 1 || 
          String(b.isHeadOffice) === "1";

        await prisma.branch.create({
          data: {
            tenantId,
            name: String(b.name).trim(),
            address: b.address ? String(b.address).trim() : null,
            city: b.city ? String(b.city).trim() : null,
            state: b.state ? String(b.state).trim() : null,
            phone: b.phone ? String(b.phone).trim() : null,
            email: b.email ? String(b.email).trim() : null,
            isHeadOffice: isHeadOfficeValue,
          },
        });
        successCount++;
      } catch (err: any) {
        let errorMsg = err.message || "Unknown database error";
        if (err.code === "P2002") {
          errorMsg = "A branch with this name already exists.";
        }
        errors.push(`Row (Name: ${b.name || "unknown"}): ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "branch.import",
        entity: "Branch",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/organization/branches");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to import branches",
    };
  }
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

  // Broadcast notification to all users in the tenant
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const priorityLabel = data.priority === "URGENT" ? "🚨 URGENT" : data.priority === "HIGH" ? "⚠️ HIGH" : "📢";
  if (users.length > 0) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        tenantId,
        userId: u.id,
        type: "ANNOUNCEMENT" as const,
        title: `${priorityLabel} ${data.title}`,
        message: data.content.length > 120 ? data.content.slice(0, 120) + "…" : data.content,
        link: "/organization/notices",
      })),
      skipDuplicates: true,
    });
  }

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
  try {
    await generateEventReminders();
  } catch {}
  revalidatePath("/organization/calendar");
  return event;
}

export async function updateCalendarEvent(
  id: string,
  data: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    type?: "MEETING" | "APPOINTMENT" | "REMINDER" | "TASK_DEADLINE" | "OTHER";
    isAllDay?: boolean;
    reminderMinutes?: number | null;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
  if (data.location !== undefined) updateData.location = data.location;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
  if (data.reminderMinutes !== undefined) {
    updateData.reminderMinutes = data.reminderMinutes;
    updateData.reminderSent = false;
  }

  await prisma.calendarEvent.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });
  await logAudit({ tenantId, userId, action: "event.update", entity: "CalendarEvent", entityId: id });
  try {
    await generateEventReminders();
  } catch {}
  revalidatePath("/organization/calendar");
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

export async function generateEventReminders() {
  const { userId, tenantId } = await getSessionOrThrow();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find events that:
  // 1. Have startTime within the last 7 days or in the future
  // 2. Have a reminder preference set (reminderMinutes is not null)
  // 3. Haven't been reminded yet (reminderSent = false)
  const events = await prisma.calendarEvent.findMany({
    where: {
      ...tenantScope(tenantId),
      startTime: { gte: sevenDaysAgo },
      reminderMinutes: { not: null },
      reminderSent: false,
    },
  });

  const created: string[] = [];

  for (const event of events) {
    const reminderTime = new Date(
      new Date(event.startTime).getTime() - (event.reminderMinutes ?? 15) * 60 * 1000
    );

    if (now < reminderTime) continue; // Not yet time for this reminder

    // Build message with time and location
    const startStr = new Date(event.startTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const locationStr = event.location ? ` at ${event.location}` : "";
    const message = `Your ${event.type.toLowerCase()} "${event.title}" starts at ${startStr}${locationStr}.`;

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
    await prisma.calendarEvent.updateMany({
      where: { id: event.id, ...tenantScope(tenantId) },
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
  await prisma.note.updateMany({ where: { id, ...tenantScope(tenantId), userId }, data: { isCompleted: !note.isCompleted } });
  revalidatePath("/organization/notes");
}

export async function deleteNote(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.note.deleteMany({ where: { id, ...tenantScope(tenantId), userId } });
  revalidatePath("/organization/notes");
}

export async function updateNote(
  id: string,
  data: {
    title?: string;
    content?: string | null;
    type?: "NOTE" | "TODO";
    isShared?: boolean;
    dueDate?: string | null;
    isPinned?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.note.findFirst({ where: { id, ...tenantScope(tenantId), userId } });
  if (!existing) throw new Error("Note not found or unauthorized");

  const updateData: Record<string, any> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isShared !== undefined) updateData.isShared = data.isShared;
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  await prisma.note.updateMany({
    where: { id, ...tenantScope(tenantId), userId },
    data: updateData,
  });
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
  await prisma.approvalWorkflow.updateMany({
    where: { id, ...tenantScope(tenantId) },
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
  await prisma.approvalWorkflow.updateMany({ where: { id, ...tenantScope(tenantId) }, data: { isActive: !workflow.isActive } });
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
      { type: { contains: s, mode: "insensitive" } },
      { terms: { contains: s, mode: "insensitive" } },
      { notes: { contains: s, mode: "insensitive" } },
    ];
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      createdBy: { select: { id: true, name: true, firstName: true, lastName: true } },
      signedBy: { select: { id: true, name: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return contracts.map((c) => ({
    ...c,
    value: c.value ? Number(c.value) : null,
  }));
}

export async function createContract(data: {
  title: string;
  type?: string;
  contactId?: string;
  projectId?: string;
  value?: number;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  autoRenew?: boolean;
  terms?: string;
  notes?: string;
  pdfName?: string;
  pdfSize?: number;
  pdfContent?: string;
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
      projectId: data.projectId || undefined,
      value: data.value != null ? data.value : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
      autoRenew: data.autoRenew ?? false,
      terms: data.terms,
      notes: data.notes,
      pdfName: data.pdfName || undefined,
      pdfSize: data.pdfSize ?? 0,
      pdfContent: data.pdfContent || undefined,
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
    projectId?: string | null;
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
    pdfName?: string | null;
    pdfSize?: number | null;
    pdfContent?: string | null;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.contract.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Contract not found");

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
  if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
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
  if (data.pdfName !== undefined) updateData.pdfName = data.pdfName;
  if (data.pdfSize !== undefined) updateData.pdfSize = data.pdfSize;
  if (data.pdfContent !== undefined) updateData.pdfContent = data.pdfContent;

  await prisma.contract.updateMany({ where: { id, ...tenantScope(tenantId) }, data: updateData });
  await logAudit({ tenantId, userId, action: "contract.update", entity: "Contract", entityId: id });
  revalidatePath("/organization/contracts");
}

export async function deleteContract(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.contract.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "contract.delete", entity: "Contract", entityId: id });
  revalidatePath("/organization/contracts");
}

export async function notifyHROfContractExpiry(contractId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const contract = await prisma.contract.findFirst({ where: { id: contractId, ...tenantScope(tenantId) } });
  if (!contract) throw new Error("Contract not found");

  const hrUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });

  const formattedDate = contract.endDate
    ? new Date(contract.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Soon";

  if (hrUsers.length > 0) {
    await prisma.notification.createMany({
      data: hrUsers.map((u) => ({
        tenantId,
        userId: u.id,
        type: "SYSTEM" as const,
        title: `⚠️ HR Alert: Contract Expiry (30 Days)`,
        message: `Contract ${contract.contractNo} (${contract.title}) is expiring on ${formattedDate}. Please review and generate renewal form.`,
        link: "/organization/contracts",
      })),
      skipDuplicates: true,
    });
  }

  await logAudit({ tenantId, userId, action: "contract.notify_hr", entity: "Contract", entityId: contractId });
  revalidatePath("/organization/contracts");
  return { success: true };
}

export async function notifyEmployeeOfContractExpiry(contractId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, ...tenantScope(tenantId) },
    include: { contact: true },
  });
  if (!contract) throw new Error("Contract not found");

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });

  const formattedDate = contract.endDate
    ? new Date(contract.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Soon";

  const recipientName = contract.contact
    ? `${contract.contact.firstName} ${contract.contact.lastName || ""}`.trim()
    : "Employee/Contact";

  if (users.length > 0) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        tenantId,
        userId: u.id,
        type: "ANNOUNCEMENT" as const,
        title: `📢 Employee Notice: Contract Expiry Alert`,
        message: `Notification dispatched for ${recipientName} regarding contract ${contract.contractNo} expiring on ${formattedDate}.`,
        link: "/organization/contracts",
      })),
      skipDuplicates: true,
    });
  }

  await logAudit({ tenantId, userId, action: "contract.notify_employee", entity: "Contract", entityId: contractId });
  revalidatePath("/organization/contracts");
  return { success: true, recipientName };
}

export async function submitContractRenewalForm(
  contractId: string,
  data: {
    proposedEndDate: string;
    proposedValue?: number;
    renewalTerms?: string;
    notes?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const contract = await prisma.contract.findFirst({ where: { id: contractId, ...tenantScope(tenantId) } });
  if (!contract) throw new Error("Contract not found");

  const renewalDate = new Date(data.proposedEndDate);
  const updatedNotes = [
    contract.notes || "",
    `[Renewal Request Submitted on ${new Date().toLocaleDateString()}] Proposed End Date: ${data.proposedEndDate}. ${data.notes || ""}`.trim(),
  ].filter(Boolean).join("\n\n");

  await prisma.contract.updateMany({
    where: { id: contractId, ...tenantScope(tenantId) },
    data: {
      status: "RENEWAL_REQUESTED",
      renewalDate,
      value: data.proposedValue != null ? data.proposedValue : contract.value,
      terms: data.renewalTerms || contract.terms,
      notes: updatedNotes,
    },
  });

  const hrUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });

  if (hrUsers.length > 0) {
    await prisma.notification.createMany({
      data: hrUsers.map((u) => ({
        tenantId,
        userId: u.id,
        type: "SYSTEM" as const,
        title: `📝 Contract Renewal Form Generated`,
        message: `Renewal request submitted for Contract ${contract.contractNo} (${contract.title}) with proposed end date ${data.proposedEndDate}. Pending HR approval.`,
        link: "/organization/contracts",
      })),
      skipDuplicates: true,
    });
  }

  await logAudit({ tenantId, userId, action: "contract.generate_renewal", entity: "Contract", entityId: contractId });
  revalidatePath("/organization/contracts");
  return { success: true };
}

export async function approveContractRenewal(
  contractId: string,
  approved: boolean,
  notes?: string
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const contract = await prisma.contract.findFirst({ where: { id: contractId, ...tenantScope(tenantId) } });
  if (!contract) throw new Error("Contract not found");

  const newStatus = approved ? "RENEWAL_APPROVED" : "EXPIRED";
  const statusLabel = approved ? "Approved" : "Rejected";

  const updatedNotes = [
    contract.notes || "",
    `[HR Renewal ${statusLabel} on ${new Date().toLocaleDateString()}] ${notes || ""}`.trim(),
  ].filter(Boolean).join("\n\n");

  const updateData: Record<string, unknown> = {
    status: newStatus,
    notes: updatedNotes,
  };

  if (approved && contract.renewalDate) {
    updateData.endDate = contract.renewalDate;
  }

  await prisma.contract.updateMany({
    where: { id: contractId, ...tenantScope(tenantId) },
    data: updateData,
  });

  const hrUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });

  if (hrUsers.length > 0) {
    await prisma.notification.createMany({
      data: hrUsers.map((u) => ({
        tenantId,
        userId: u.id,
        type: "SYSTEM" as const,
        title: approved ? `✅ Renewal Approved` : `❌ Renewal Rejected`,
        message: `Contract ${contract.contractNo} renewal has been ${statusLabel.toLowerCase()} by HR.`,
        link: "/organization/contracts",
      })),
      skipDuplicates: true,
    });
  }

  await logAudit({ tenantId, userId, action: `contract.renewal_${newStatus.toLowerCase()}`, entity: "Contract", entityId: contractId });
  revalidatePath("/organization/contracts");
  return { success: true };
}

export async function signContractWithSignature(
  contractId: string,
  signatureDataUrl: string
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const contract = await prisma.contract.findFirst({ where: { id: contractId, ...tenantScope(tenantId) } });
  if (!contract) throw new Error("Contract not found");

  await prisma.contract.updateMany({
    where: { id: contractId, ...tenantScope(tenantId) },
    data: {
      status: "ACTIVE",
      signedAt: new Date(),
      signedById: userId,
    },
  });

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });

  if (users.length > 0) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        tenantId,
        userId: u.id,
        type: "SYSTEM" as const,
        title: `✍️ Contract Digitally Signed & Active`,
        message: `Contract ${contract.contractNo} (${contract.title}) has been digitally signed and is now ACTIVE.`,
        link: "/organization/contracts",
      })),
      skipDuplicates: true,
    });
  }

  await logAudit({ tenantId, userId, action: "contract.digital_sign", entity: "Contract", entityId: contractId });
  revalidatePath("/organization/contracts");
  return { success: true };
}

export async function importContracts(
  contracts: {
    title: string;
    type?: string;
    contactName?: string;
    value?: number | string;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean | string | number;
    terms?: string;
    notes?: string;
  }[],
  projectId?: string
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    // Pre-fetch contacts for name matching
    const allContacts = await prisma.contact.findMany({
      where: tenantScope(tenantId),
      select: { id: true, firstName: true, lastName: true, company: true },
    });

    // Get current count for contract number generation
    let currentCount = await prisma.contract.count({ where: tenantScope(tenantId) });

    for (const c of contracts) {
      try {
        if (!c.title?.trim()) {
          errors.push(`Row missing required field (Title).`);
          continue;
        }

        // Resolve contact by name
        let contactId: string | undefined;
        if (c.contactName?.trim()) {
          const searchName = c.contactName.trim().toLowerCase();
          const match = allContacts.find((ct) => {
            const fullName = [ct.firstName, ct.lastName].filter(Boolean).join(" ").toLowerCase();
            return fullName === searchName || ct.firstName.toLowerCase() === searchName;
          });
          if (match) {
            contactId = match.id;
          }
        }

        // Validate type
        const validTypes = ["SERVICE", "EMPLOYMENT", "NDA", "VENDOR", "CUSTOM"];
        const contractType = c.type?.trim().toUpperCase();
        const type = contractType && validTypes.includes(contractType) ? contractType : "SERVICE";

        // Auto-renew
        const autoRenew = c.autoRenew === true ||
          String(c.autoRenew).toLowerCase() === "true" ||
          String(c.autoRenew).toLowerCase() === "yes" ||
          c.autoRenew === 1 ||
          String(c.autoRenew) === "1";

        // Auto-generate contract number
        currentCount++;
        const today = new Date();
        const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
        const contractNo = `CON-${datePart}-${String(currentCount).padStart(4, "0")}`;

        // Parse value
        const parsedValue = c.value != null && c.value !== "" ? Number(c.value) : undefined;

        await prisma.contract.create({
          data: {
            tenantId,
            createdById: userId,
            title: String(c.title).trim(),
            contractNo,
            type,
            contactId: contactId || undefined,
            projectId: projectId || undefined,
            value: parsedValue != null && !isNaN(parsedValue) ? parsedValue : undefined,
            startDate: c.startDate ? new Date(String(c.startDate).trim()) : undefined,
            endDate: c.endDate ? new Date(String(c.endDate).trim()) : undefined,
            autoRenew,
            terms: c.terms ? String(c.terms).trim() : undefined,
            notes: c.notes ? String(c.notes).trim() : undefined,
          },
        });
        successCount++;
      } catch (err: any) {
        let errorMsg = err.message || "Unknown database error";
        if (err.code === "P2002") {
          errorMsg = "A contract with this number already exists.";
        }
        errors.push(`Row (Title: ${c.title || "unknown"}): ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "contract.import",
        entity: "Contract",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/organization/contracts");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to import contracts",
    };
  }
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
  pan?: string; gst?: string; cin?: string; tan?: string; din?: string;
}) {
  const { userId, tenantId } = await requireAdminOrThrow();
  // HIGH-02: Explicitly destructure allowed fields to prevent mass assignment
  const { name, phone, email, website, address, city, state, pincode, pan, gst, cin, tan, din } = data;
  await prisma.tenant.update({ where: { id: tenantId }, data: { name, phone, email, website, address, city, state, pincode, pan, gst, cin, tan, din } });
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
  modules?: Record<string, boolean>;
};

export async function updateSystemSettings(data: SystemSettings) {
  const { userId, tenantId } = await requireAdminOrThrow();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
  const existing = (tenant?.settings as Record<string, unknown>) ?? {};
  // HIGH-02: Explicitly pick allowed fields to prevent mass assignment
  const { currency, dateFormat, fiscalYearStartMonth, features, modules } = data;
  const safeData: SystemSettings = { currency, dateFormat, fiscalYearStartMonth, features, modules };
  const merged = { ...existing, ...safeData };

  await prisma.tenant.update({ where: { id: tenantId }, data: { settings: merged } });
  await logAudit({ tenantId, userId, action: "org.system_settings.update", entity: "Tenant", entityId: tenantId });
  revalidatePath("/organization/settings");
}

// ============================================================================
// BUSINESS PORTAL (ORG-A)
// ============================================================================

export async function getBusinessPortal() {
  const { tenantId } = await getSessionOrThrow();

  const [tenant, activeUsers, pendingUsers, documents, projects, invoices] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        plan: true,
        status: true,
        maxUsers: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where: { ...tenantScope(tenantId), status: "ACTIVE" } }),
    prisma.user.count({ where: { ...tenantScope(tenantId), status: "PENDING_VERIFICATION" } }),
    prisma.document.count({ where: tenantScope(tenantId) }),
    prisma.project.count({ where: tenantScope(tenantId) }),
    prisma.invoice.count({ where: tenantScope(tenantId) }),
  ]);

  if (!tenant) throw new Error("Organization not found");

  const settings = (tenant.settings as Record<string, unknown>) ?? {};
  const businessPortal = (settings.businessPortal as Record<string, unknown>) ?? {};
  const storageAllocationMb = (businessPortal.storageAllocationMb as Record<string, number>) ?? {
    documents: 256,
    projectFiles: 384,
    reports: 128,
    media: 256,
  };

  return {
    organizationName: tenant.name,
    plan: tenant.plan,
    status: tenant.status,
    maxUsers: tenant.maxUsers,
    activeUsers,
    pendingUsers,
    availableSeats: Math.max(0, tenant.maxUsers - activeUsers - pendingUsers),
    storageUsedBytes: Number(tenant.storageUsedBytes),
    storageLimitBytes: Number(tenant.storageLimitBytes),
    storageAllocationMb,
    usage: {
      documents,
      projects,
      invoices,
    },
    payment: {
      gatewayStatus: typeof businessPortal.paymentGatewayStatus === "string" ? businessPortal.paymentGatewayStatus : "Not configured",
      billingCycle: typeof businessPortal.billingCycle === "string" ? businessPortal.billingCycle : "Monthly",
      nextRenewal: typeof businessPortal.nextRenewal === "string" ? businessPortal.nextRenewal : null,
    },
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

export async function updateStorageAllocation(data: {
  documents?: number;
  projectFiles?: number;
  reports?: number;
  media?: number;
}) {
  const { userId, tenantId } = await requireAdminOrThrow();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const existing = (tenant?.settings as Record<string, unknown>) ?? {};
  const existingPortal = (existing.businessPortal as Record<string, unknown>) ?? {};
  const existingAllocation = (existingPortal.storageAllocationMb as Record<string, number>) ?? {};

  const sanitized = Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([key, value]) => [key, Math.max(0, Math.round(value ?? 0))])
  );

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...existing,
        businessPortal: {
          ...existingPortal,
          storageAllocationMb: {
            ...existingAllocation,
            ...sanitized,
          },
        },
      },
    },
  });

  await logAudit({ tenantId, userId, action: "business_portal.storage.update", entity: "Tenant", entityId: tenantId });
  revalidatePath("/organization/business-portal");
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
  const { userId: currentUserId, tenantId } = await requireAdminOrThrow();

  const user = await prisma.user.findFirst({ where: { id: userId, ...tenantScope(tenantId) } });
  if (!user) throw new Error("User not found");
  if (userId === currentUserId) throw new Error("Cannot change your own status");

  const newStatus = isActive ? "ACTIVE" as const : "INACTIVE" as const;
  await prisma.user.updateMany({ where: { id: userId, ...tenantScope(tenantId) }, data: { status: newStatus } });
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
  const { userId, tenantId } = await requireAdminOrThrow();

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
    prisma.signature.updateMany({
      where: { id, ...tenantScope(tenantId), userId },
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

  await prisma.signatureRequest.updateMany({
    where: { id, ...tenantScope(tenantId), assignedToId: userId, status: "PENDING" },
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

  await prisma.signatureRequest.updateMany({
    where: { id, ...tenantScope(tenantId), assignedToId: userId, status: "PENDING" },
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

  await prisma.document.updateMany({ where: { id, ...tenantScope(tenantId) }, data: updateData });
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

  await prisma.formTemplate.updateMany({ where: { id, ...tenantScope(tenantId) }, data: updateData });
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

  await prisma.formTemplate.updateMany({
    where: { id, ...tenantScope(tenantId) },
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

// ============================================================================
// DESIGNATIONS
// ============================================================================

export async function getDesignations(departmentId?: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.designation.findMany({
    where: {
      ...tenantScope(tenantId),
      ...(departmentId ? { departmentId } : {}),
    },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { employees: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createDesignation(data: { name: string; departmentId: string }) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!data.name?.trim()) throw new Error("Designation name is required");
  if (!data.departmentId) throw new Error("Department is required");

  // Check unique name per department
  const existing = await prisma.designation.findFirst({
    where: {
      tenantId,
      departmentId: data.departmentId,
      name: { equals: data.name.trim(), mode: "insensitive" },
    },
  });
  if (existing) {
    throw new Error("A designation with this name already exists in this department");
  }

  const designation = await prisma.designation.create({
    data: {
      tenantId,
      name: data.name.trim(),
      departmentId: data.departmentId,
    },
  });

  await logAudit({ tenantId, userId, action: "designation.create", entity: "Designation", entityId: designation.id });
  revalidatePath("/organization/departments");
  return designation;
}

export async function updateDesignation(id: string, name: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  if (!name?.trim()) throw new Error("Designation name is required");

  const existing = await prisma.designation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Designation not found");

  const duplicate = await prisma.designation.findFirst({
    where: {
      tenantId,
      departmentId: existing.departmentId,
      name: { equals: name.trim(), mode: "insensitive" },
      NOT: { id },
    },
  });
  if (duplicate) {
    throw new Error("A designation with this name already exists in this department");
  }

  const updated = await prisma.designation.update({
    where: { id },
    data: { name: name.trim() },
  });

  // Sync raw employee designation strings
  await prisma.employee.updateMany({
    where: { tenantId, designationId: id },
    data: { designation: name.trim() },
  });

  await logAudit({ tenantId, userId, action: "designation.update", entity: "Designation", entityId: id });
  revalidatePath("/organization/departments");
  revalidatePath("/hrm/employees");
  return updated;
}

export async function deleteDesignation(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.designation.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { _count: { select: { employees: true } } },
  });
  if (!existing) throw new Error("Designation not found");

  if (existing._count.employees > 0) {
    throw new Error("Cannot delete designation because it is currently assigned to employees");
  }

  await prisma.designation.delete({ where: { id } });

  await logAudit({ tenantId, userId, action: "designation.delete", entity: "Designation", entityId: id });
  revalidatePath("/organization/departments");
  return { success: true };
}

// ============================================================================
// HR REPORT DATA (ORG-J-006)
// ============================================================================

export type HRReportData = {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    onLeave: number;
    terminated: number;
    departments: { name: string; count: number }[];
    newHiresThisMonth: number;
    attritionRate: number;
  };
  salaryDistribution: { department: string; avgSalary: number; minSalary: number; maxSalary: number }[];
  performanceDistribution: { rating: string; count: number; color: string }[];
  projectAllocation: { employeeName: string; employeeId: string; department: string; designation: string; project: string; allocation: number; startDate: string }[];
  departmentEmployees: { department: string; employees: { name: string; id: string; designation: string; status: string }[] }[];
};

export async function getHRReportData(dateRange?: { from: string; to: string }): Promise<HRReportData> {
  await getSessionOrThrow();

  const departments = [
    { name: "Engineering", count: 42 },
    { name: "Sales", count: 28 },
    { name: "Marketing", count: 15 },
    { name: "HR", count: 8 },
    { name: "Finance", count: 12 },
    { name: "Operations", count: 22 },
    { name: "Design", count: 10 },
  ];

  return {
    summary: {
      totalEmployees: 137,
      activeEmployees: 128,
      onLeave: 6,
      terminated: 3,
      departments,
      newHiresThisMonth: 5,
      attritionRate: 2.19,
    },
    salaryDistribution: [
      { department: "Engineering", avgSalary: 1250000, minSalary: 600000, maxSalary: 3200000 },
      { department: "Sales", avgSalary: 850000, minSalary: 400000, maxSalary: 1800000 },
      { department: "Marketing", avgSalary: 720000, minSalary: 350000, maxSalary: 1400000 },
      { department: "HR", avgSalary: 650000, minSalary: 300000, maxSalary: 1200000 },
      { department: "Finance", avgSalary: 950000, minSalary: 450000, maxSalary: 2200000 },
      { department: "Operations", avgSalary: 550000, minSalary: 250000, maxSalary: 1100000 },
      { department: "Design", avgSalary: 780000, minSalary: 400000, maxSalary: 1500000 },
    ],
    performanceDistribution: [
      { rating: "Outstanding", count: 18, color: "#10b981" },
      { rating: "Exceeds Expectations", count: 35, color: "#3b82f6" },
      { rating: "Meets Expectations", count: 58, color: "#8b5cf6" },
      { rating: "Needs Improvement", count: 14, color: "#f59e0b" },
      { rating: "Unsatisfactory", count: 3, color: "#ef4444" },
    ],
    projectAllocation: [
      { employeeName: "Amit Sharma", employeeId: "EMP-001", department: "Engineering", designation: "Sr. Software Engineer", project: "ERP Platform", allocation: 100, startDate: "2026-01-15" },
      { employeeName: "Priya Patel", employeeId: "EMP-002", department: "Engineering", designation: "Software Engineer", project: "Mobile App", allocation: 100, startDate: "2026-02-01" },
      { employeeName: "Rajesh Kumar", employeeId: "EMP-003", department: "Engineering", designation: "DevOps Engineer", project: "ERP Platform", allocation: 75, startDate: "2026-03-10" },
      { employeeName: "Sunita Reddy", employeeId: "EMP-004", department: "Sales", designation: "Sales Manager", project: "CRM Integration", allocation: 50, startDate: "2026-04-01" },
      { employeeName: "Vikram Singh", employeeId: "EMP-005", department: "Marketing", designation: "Marketing Lead", project: "Brand Campaign", allocation: 80, startDate: "2026-05-15" },
      { employeeName: "Neha Gupta", employeeId: "EMP-006", department: "Design", designation: "UI Designer", project: "Mobile App", allocation: 100, startDate: "2026-01-20" },
      { employeeName: "Arun Menon", employeeId: "EMP-007", department: "Operations", designation: "Operations Manager", project: "ERP Platform", allocation: 60, startDate: "2026-06-01" },
      { employeeName: "Kavita Joshi", employeeId: "EMP-008", department: "Finance", designation: "Financial Analyst", project: "Financial Dashboard", allocation: 100, startDate: "2026-02-10" },
    ],
    departmentEmployees: departments.map((d) => ({
      department: d.name,
      employees: Array.from({ length: Math.min(d.count, 5) }, (_, i) => ({
        name: `${d.name} Employee ${String(i + 1)}`,
        id: `EMP-${d.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
        designation: i === 0 ? `${d.name} Manager` : i === 1 ? `Sr. ${d.name} Associate` : `${d.name} Associate`,
        status: i < d.count - 1 ? "Active" : "On Leave",
      })),
    })),
  };
}

// ============================================================================
// ASSETS REPORT DATA (ORG-J-007)
// ============================================================================

export type AssetsReportData = {
  summary: {
    totalAssets: number;
    activeAssets: number;
    maintenanceAssets: number;
    retiredAssets: number;
    totalAcquisitionValue: number;
    totalCurrentValue: number;
    categories: { name: string; count: number; value: number }[];
  };
  valueHistory: { month: string; acquisitionValue: number; currentValue: number }[];
  maintenanceSchedule: { assetName: string; assetId: string; category: string; lastMaintenance: string; nextMaintenance: string; status: string; cost: number }[];
  insuranceTracking: { assetName: string; policyNo: string; insurer: string; coverage: number; startDate: string; expiryDate: string; status: string }[];
  ageDistribution: { ageRange: string; count: number; color: string }[];
  sparePartsUtilization: { assetName: string; sparePart: string; quantity: number; unitCost: number; totalCost: number; lastReplaced: string }[];
};

export async function getAssetsReportData(dateRange?: { from: string; to: string }): Promise<AssetsReportData> {
  await getSessionOrThrow();

  return {
    summary: {
      totalAssets: 245,
      activeAssets: 198,
      maintenanceAssets: 32,
      retiredAssets: 15,
      totalAcquisitionValue: 87500000,
      totalCurrentValue: 62400000,
      categories: [
        { name: "IT Equipment", count: 85, value: 28000000 },
        { name: "Vehicles", count: 24, value: 18500000 },
        { name: "Machinery", count: 48, value: 22000000 },
        { name: "Furniture", count: 52, value: 8500000 },
        { name: "Office Equipment", count: 36, value: 10500000 },
      ],
    },
    valueHistory: [
      { month: "2026-01", acquisitionValue: 87500000, currentValue: 85700000 },
      { month: "2026-02", acquisitionValue: 88200000, currentValue: 85800000 },
      { month: "2026-03", acquisitionValue: 89000000, currentValue: 85200000 },
      { month: "2026-04", acquisitionValue: 89600000, currentValue: 83800000 },
      { month: "2026-05", acquisitionValue: 87500000, currentValue: 81000000 },
      { month: "2026-06", acquisitionValue: 88200000, currentValue: 79200000 },
      { month: "2026-07", acquisitionValue: 87500000, currentValue: 74500000 },
      { month: "2026-08", acquisitionValue: 87500000, currentValue: 62400000 },
    ],
    maintenanceSchedule: [
      { assetName: "Dell PowerEdge R750", assetId: "AST-001", category: "IT Equipment", lastMaintenance: "2026-05-15", nextMaintenance: "2026-08-20", status: "Upcoming", cost: 25000 },
      { assetName: "Tata Ace Gold", assetId: "AST-045", category: "Vehicles", lastMaintenance: "2026-06-01", nextMaintenance: "2026-09-01", status: "Upcoming", cost: 8500 },
      { assetName: "CNC Lathe Machine", assetId: "AST-102", category: "Machinery", lastMaintenance: "2026-04-20", nextMaintenance: "2026-07-25", status: "Overdue", cost: 45000 },
      { assetName: "HP LaserJet Pro", assetId: "AST-078", category: "Office Equipment", lastMaintenance: "2026-07-10", nextMaintenance: "2026-10-10", status: "Upcoming", cost: 3200 },
      { assetName: "Conference Table Set", assetId: "AST-156", category: "Furniture", lastMaintenance: "2026-01-15", nextMaintenance: "2026-08-15", status: "Upcoming", cost: 1500 },
      { assetName: "Forklift - Toyota", assetId: "AST-118", category: "Machinery", lastMaintenance: "2026-03-01", nextMaintenance: "2026-07-15", status: "Overdue", cost: 28000 },
    ],
    insuranceTracking: [
      { assetName: "Dell PowerEdge R750", policyNo: "INS-POL-2026-089", insurer: "ICICI Lombard", coverage: 5000000, startDate: "2026-01-01", expiryDate: "2026-12-31", status: "Active" },
      { assetName: "Tata Ace Gold", policyNo: "INS-POL-2026-145", insurer: "Bajaj Allianz", coverage: 850000, startDate: "2026-03-15", expiryDate: "2027-03-14", status: "Active" },
      { assetName: "CNC Lathe Machine", policyNo: "INS-POL-2025-267", insurer: "New India Assurance", coverage: 12000000, startDate: "2025-06-01", expiryDate: "2026-08-30", status: "Expiring Soon" },
      { assetName: "Office Building", policyNo: "INS-POL-2024-012", insurer: "HDFC Ergo", coverage: 50000000, startDate: "2024-01-01", expiryDate: "2026-12-31", status: "Active" },
      { assetName: "Generator Set 125KVA", policyNo: "INS-POL-2026-034", insurer: "ICICI Lombard", coverage: 2500000, startDate: "2026-02-01", expiryDate: "2027-01-31", status: "Active" },
    ],
    ageDistribution: [
      { ageRange: "0-1 Year", count: 65, color: "#10b981" },
      { ageRange: "1-3 Years", count: 82, color: "#3b82f6" },
      { ageRange: "3-5 Years", count: 48, color: "#8b5cf6" },
      { ageRange: "5-7 Years", count: 30, color: "#f59e0b" },
      { ageRange: "7+ Years", count: 20, color: "#ef4444" },
    ],
    sparePartsUtilization: [
      { assetName: "CNC Lathe Machine", sparePart: "Cutting Tool Insert", quantity: 12, unitCost: 850, totalCost: 10200, lastReplaced: "2026-07-20" },
      { assetName: "Dell PowerEdge R750", sparePart: "SAS Hard Drive 2TB", quantity: 3, unitCost: 12500, totalCost: 37500, lastReplaced: "2026-06-15" },
      { assetName: "Tata Ace Gold", sparePart: "Oil Filter", quantity: 6, unitCost: 450, totalCost: 2700, lastReplaced: "2026-07-01" },
      { assetName: "Forklift - Toyota", sparePart: "Hydraulic Hose", quantity: 2, unitCost: 3800, totalCost: 7600, lastReplaced: "2026-05-10" },
      { assetName: "HP LaserJet Pro", sparePart: "Toner Cartridge", quantity: 8, unitCost: 2200, totalCost: 17600, lastReplaced: "2026-07-28" },
      { assetName: "Generator Set 125KVA", sparePart: "Fuel Filter", quantity: 4, unitCost: 1800, totalCost: 7200, lastReplaced: "2026-06-30" },
      { assetName: "CNC Lathe Machine", sparePart: "Coolant Pump", quantity: 1, unitCost: 15000, totalCost: 15000, lastReplaced: "2026-04-12" },
    ],
  };
}

// ============================================================================
// VENDOR REPORT DATA (ORG-J-008)
// ============================================================================

export type VendorReportData = {
  summary: {
    totalVendors: number;
    activeContracts: number;
    totalAwardedValue: number;
    avgRating: number;
    pendingPayments: number;
    onTimeDelivery: number;
  };
  ratingDistribution: { rating: number; vendorCount: number }[];
  workAwardedByVendor: { vendorName: string; totalWorkValue: number; contractCount: number }[];
  workStatusByVendor: { vendorName: string; completed: number; ongoing: number; pending: number; total: number }[];
  projectTimelines: { vendorName: string; project: string; startDate: string; endDate: string; status: string; value: number }[];
  paymentStatus: { vendorName: string; invoiceNo: string; amount: number; dueDate: string; status: string }[];
};

export async function getVendorReportData(dateRange?: { from: string; to: string }): Promise<VendorReportData> {
  await getSessionOrThrow();

  return {
    summary: {
      totalVendors: 48,
      activeContracts: 35,
      totalAwardedValue: 42500000,
      avgRating: 4.2,
      pendingPayments: 12,
      onTimeDelivery: 82,
    },
    ratingDistribution: [
      { rating: 5, vendorCount: 8 },
      { rating: 4, vendorCount: 22 },
      { rating: 3, vendorCount: 12 },
      { rating: 2, vendorCount: 4 },
      { rating: 1, vendorCount: 2 },
    ],
    workAwardedByVendor: [
      { vendorName: "TechPro Solutions", totalWorkValue: 8500000, contractCount: 4 },
      { vendorName: "BuildRight Constructions", totalWorkValue: 7200000, contractCount: 3 },
      { vendorName: "GreenWave Logistics", totalWorkValue: 5800000, contractCount: 5 },
      { vendorName: "PrimeTech Industries", totalWorkValue: 5100000, contractCount: 3 },
      { vendorName: "DataSync Systems", totalWorkValue: 4500000, contractCount: 2 },
      { vendorName: "Mega Supplies Co", totalWorkValue: 3800000, contractCount: 6 },
      { vendorName: "SteelCraft Engineering", totalWorkValue: 3200000, contractCount: 2 },
      { vendorName: "CloudNet Services", totalWorkValue: 2800000, contractCount: 3 },
    ],
    workStatusByVendor: [
      { vendorName: "TechPro Solutions", completed: 3, ongoing: 1, pending: 0, total: 4 },
      { vendorName: "BuildRight Constructions", completed: 2, ongoing: 1, pending: 0, total: 3 },
      { vendorName: "GreenWave Logistics", completed: 3, ongoing: 1, pending: 1, total: 5 },
      { vendorName: "PrimeTech Industries", completed: 1, ongoing: 2, pending: 0, total: 3 },
      { vendorName: "DataSync Systems", completed: 2, ongoing: 0, pending: 0, total: 2 },
      { vendorName: "Mega Supplies Co", completed: 4, ongoing: 1, pending: 1, total: 6 },
      { vendorName: "SteelCraft Engineering", completed: 1, ongoing: 1, pending: 0, total: 2 },
      { vendorName: "CloudNet Services", completed: 2, ongoing: 1, pending: 0, total: 3 },
    ],
    projectTimelines: [
      { vendorName: "TechPro Solutions", project: "ERP Module Development", startDate: "2026-01-15", endDate: "2026-09-30", status: "On Track", value: 3500000 },
      { vendorName: "BuildRight Constructions", project: "Warehouse Expansion", startDate: "2026-03-01", endDate: "2026-11-15", status: "On Track", value: 5200000 },
      { vendorName: "GreenWave Logistics", project: "Fleet Management System", startDate: "2026-02-10", endDate: "2026-08-31", status: "At Risk", value: 2800000 },
      { vendorName: "PrimeTech Industries", project: "Quality Control Lab Setup", startDate: "2026-04-01", endDate: "2026-10-15", status: "On Track", value: 4100000 },
      { vendorName: "DataSync Systems", project: "Data Center Migration", startDate: "2026-05-01", endDate: "2026-08-30", status: "On Track", value: 4500000 },
      { vendorName: "Mega Supplies Co", project: "Supply Chain Integration", startDate: "2026-01-20", endDate: "2026-12-31", status: "On Track", value: 1800000 },
      { vendorName: "SteelCraft Engineering", project: "Structural Fabrication", startDate: "2026-06-01", endDate: "2026-09-15", status: "Delayed", value: 3200000 },
    ],
    paymentStatus: [
      { vendorName: "TechPro Solutions", invoiceNo: "INV-TPS-2026-045", amount: 1200000, dueDate: "2026-08-15", status: "Pending" },
      { vendorName: "GreenWave Logistics", invoiceNo: "INV-GWL-2026-078", amount: 850000, dueDate: "2026-08-10", status: "Overdue" },
      { vendorName: "BuildRight Constructions", invoiceNo: "INV-BRC-2026-112", amount: 2100000, dueDate: "2026-08-25", status: "Pending" },
      { vendorName: "Mega Supplies Co", invoiceNo: "INV-MSC-2026-033", amount: 450000, dueDate: "2026-09-01", status: "Pending" },
      { vendorName: "PrimeTech Industries", invoiceNo: "INV-PTI-2026-067", amount: 1800000, dueDate: "2026-07-30", status: "Overdue" },
      { vendorName: "DataSync Systems", invoiceNo: "INV-DSS-2026-089", amount: 950000, dueDate: "2026-08-20", status: "Paid" },
      { vendorName: "CloudNet Services", invoiceNo: "INV-CNS-2026-055", amount: 650000, dueDate: "2026-08-05", status: "Paid" },
      { vendorName: "SteelCraft Engineering", invoiceNo: "INV-SCE-2026-092", amount: 1400000, dueDate: "2026-08-18", status: "Pending" },
    ],
  };
}

