"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import type {
  ProjectStatus,
  TaskStatus,
  TimesheetStatus,
  TicketStatus,
  TicketPriority,
} from "@/generated/prisma/enums";

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
// PROJECTS (PM-A)
// ============================================================================

export async function getProjects(filters?: {
  status?: ProjectStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 50, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { code: { contains: filters.search, mode: "insensitive" as const } },
          { clientName: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects: projects.map((p) => ({
      ...p,
      budget: p.budget ? Number(p.budget) : null,
      spent: p.spent ? Number(p.spent) : 0,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getProject(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const project = await prisma.project.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      milestones: { orderBy: { sortOrder: "asc" } },
      timesheets: { orderBy: { date: "desc" }, take: 50 },
      tickets: { orderBy: { createdAt: "desc" }, take: 20 },
      projectFiles: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) return null;

  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
    spent: project.spent ? Number(project.spent) : 0,
    tasks: project.tasks.map((task) => ({
      ...task,
      actualHours: task.actualHours ? Number(task.actualHours) : 0,
      estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
    })),
    timesheets: project.timesheets.map((ts) => ({
      ...ts,
      hours: Number(ts.hours),
    })),
  };
}

export async function createProject(data: {
  name: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  managerId?: string;
  clientName?: string;
}) {
  await requirePermission({ module: "projects", action: "create", resource: "projects" });
  const { userId, tenantId } = await getSessionOrThrow();

  const project = await prisma.project.create({
    data: {
      tenantId,
      name: data.name,
      code: data.code || undefined,
      description: data.description || undefined,
      status: data.status || "PLANNING",
      priority: data.priority || "MEDIUM",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      budget: data.budget ?? undefined,
      managerId: data.managerId || undefined,
      clientName: data.clientName || undefined,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "project.create",
    entity: "Project",
    entityId: project.id,
    metadata: { name: data.name },
  });

  revalidatePath("/projects");
  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
    spent: project.spent ? Number(project.spent) : 0,
  };
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    code?: string;
    description?: string;
    status?: ProjectStatus;
    priority?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    spent?: number;
    progress?: number;
    managerId?: string;
    clientName?: string;
  }
) {
  await requirePermission({ module: "projects", action: "update", resource: "projects" });
  const { userId, tenantId } = await getSessionOrThrow();

  const project = await prisma.project.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: new Date(data.endDate) } : {}),
      ...(data.budget !== undefined ? { budget: data.budget } : {}),
      ...(data.spent !== undefined ? { spent: data.spent } : {}),
      ...(data.progress !== undefined ? { progress: data.progress } : {}),
      ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
      ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "project.update",
    entity: "Project",
    entityId: id,
    metadata: data,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return project;
}

export async function deleteProject(id: string) {
  await requirePermission({ module: "projects", action: "delete", resource: "projects" });
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.project.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "project.delete",
    entity: "Project",
    entityId: id,
  });

  revalidatePath("/projects");
}

export async function importProjects(
  projects: {
    name: string;
    code?: string;
    description?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    budget?: number | string;
    clientName?: string;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const p of projects) {
      try {
        if (!p.name?.trim()) {
          errors.push(`Row missing required field (Project Name).`);
          continue;
        }

        const project = await prisma.project.create({
          data: {
            tenantId,
            name: String(p.name).trim(),
            code: p.code ? String(p.code).trim() : null,
            description: p.description ? String(p.description).trim() : null,
            priority: p.priority ? String(p.priority).trim().toUpperCase() : "MEDIUM",
            startDate: p.startDate ? new Date(p.startDate) : null,
            endDate: p.endDate ? new Date(p.endDate) : null,
            budget: p.budget ? Number(p.budget) : null,
            clientName: p.clientName ? String(p.clientName).trim() : null,
          },
        });
        successCount++;
      } catch (err: any) {
        let errorMsg = err.message || "Unknown database error";
        if (err.code === "P2002") {
          errorMsg = "A project with this code already exists.";
        }
        errors.push(`Row (Name: ${p.name || "unknown"}): ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "project.import",
        entity: "Project",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/projects");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to import projects",
    };
  }
}

// ============================================================================
// TASKS (PM-A-002/004)
// ============================================================================

export async function getTasks(
  projectId: string,
  filters?: { status?: TaskStatus; assigneeId?: string; search?: string }
) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    projectId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters?.search
      ? { title: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  return prisma.task.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  parentId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Get next sort order
  const lastTask = await prisma.task.findFirst({
    where: { ...tenantScope(tenantId), projectId: data.projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      tenantId,
      projectId: data.projectId,
      title: data.title,
      description: data.description || undefined,
      status: data.status || "TODO",
      priority: data.priority || "MEDIUM",
      assigneeId: data.assigneeId || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours ?? undefined,
      parentId: data.parentId || undefined,
      sortOrder: (lastTask?.sortOrder ?? 0) + 1,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "task.create",
    entity: "Task",
    entityId: task.id,
    metadata: { title: data.title, projectId: data.projectId },
  });

  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    sortOrder?: number;
    parentId?: string | null;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const task = await prisma.task.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { projectId: true },
  });
  if (!task) throw new Error("Task not found");

  await prisma.task.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
      ...(data.estimatedHours !== undefined ? { estimatedHours: data.estimatedHours } : {}),
      ...(data.actualHours !== undefined ? { actualHours: data.actualHours } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
    },
  });

  // Auto-calculate project progress
  await recalculateProjectProgress(tenantId, task.projectId);

  await logAudit({
    tenantId,
    userId,
    action: "task.update",
    entity: "Task",
    entityId: id,
    metadata: data,
  });

  revalidatePath(`/projects/${task.projectId}`);
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  return updateTask(id, { status });
}

export async function deleteTask(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const task = await prisma.task.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { projectId: true },
  });
  if (!task) throw new Error("Task not found");

  await prisma.task.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await recalculateProjectProgress(tenantId, task.projectId);

  await logAudit({
    tenantId,
    userId,
    action: "task.delete",
    entity: "Task",
    entityId: id,
  });

  revalidatePath(`/projects/${task.projectId}`);
}

async function recalculateProjectProgress(tenantId: string, projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { ...tenantScope(tenantId), projectId, parentId: null },
    select: { status: true },
  });

  if (tasks.length === 0) return;

  const done = tasks.filter((t) => t.status === "DONE").length;
  const progress = Math.round((done / tasks.length) * 100);

  await prisma.project.updateMany({
    where: { id: projectId, ...tenantScope(tenantId) },
    data: { progress },
  });
}

// ============================================================================
// MILESTONES (PM-A-005)
// ============================================================================

export async function getMilestones(projectId: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.milestone.findMany({
    where: { ...tenantScope(tenantId), projectId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createMilestone(data: {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const last = await prisma.milestone.findFirst({
    where: { ...tenantScope(tenantId), projectId: data.projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const milestone = await prisma.milestone.create({
    data: {
      tenantId,
      projectId: data.projectId,
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "milestone.create",
    entity: "Milestone",
    entityId: milestone.id,
    metadata: { title: data.title, projectId: data.projectId },
  });

  revalidatePath(`/projects/${data.projectId}`);
  return milestone;
}

export async function updateMilestone(
  id: string,
  data: { title?: string; description?: string; dueDate?: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const milestone = await prisma.milestone.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { projectId: true },
  });
  if (!milestone) throw new Error("Milestone not found");

  await prisma.milestone.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "milestone.update",
    entity: "Milestone",
    entityId: id,
    metadata: data,
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}

export async function completeMilestone(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const milestone = await prisma.milestone.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { projectId: true, isCompleted: true },
  });
  if (!milestone) throw new Error("Milestone not found");

  const nowCompleted = !milestone.isCompleted;

  await prisma.milestone.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      isCompleted: nowCompleted,
      completedAt: nowCompleted ? new Date() : null,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: nowCompleted ? "milestone.complete" : "milestone.reopen",
    entity: "Milestone",
    entityId: id,
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}

// ============================================================================
// TIMESHEETS (PM-B)
// ============================================================================

export async function getTimesheets(filters?: {
  employeeId?: string;
  projectId?: string;
  status?: TimesheetStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 50, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.projectId ? { projectId: filters.projectId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.dateFrom || filters?.dateTo
      ? {
        date: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        },
      }
      : {}),
  };

  const [timesheets, total] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.timesheet.count({ where }),
  ]);

  return {
    timesheets: timesheets.map((ts) => ({
      ...ts,
      hours: Number(ts.hours),
    })),
    total,
    page,
    pageSize,
  };
}

export async function createTimesheet(data: {
  employeeId: string;
  projectId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  description?: string;
  isBillable?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const timesheet = await prisma.timesheet.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      projectId: data.projectId || undefined,
      date: new Date(data.date),
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      hours: data.hours,
      description: data.description || undefined,
      isBillable: data.isBillable ?? true,
      status: "PENDING_SENIOR",
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "timesheet.create",
    entity: "Timesheet",
    entityId: timesheet.id,
    metadata: { hours: data.hours, date: data.date, startTime: data.startTime, endTime: data.endTime },
  });

  revalidatePath("/projects/timesheets");
  return {
    ...timesheet,
    hours: Number(timesheet.hours),
  };
}

export async function approveTimesheetBySenior(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.timesheet.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      status: "PENDING_MANAGER",
      seniorApprovedById: userId,
      seniorApprovedAt: new Date(),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "timesheet.approve_senior",
    entity: "Timesheet",
    entityId: id,
  });

  revalidatePath("/projects/timesheets");
}

export async function approveTimesheetByManager(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.timesheet.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      status: "APPROVED",
      managerApprovedById: userId,
      managerApprovedAt: new Date(),
      approvedById: userId,
      approvedAt: new Date(),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "timesheet.approve_manager",
    entity: "Timesheet",
    entityId: id,
  });

  revalidatePath("/projects/timesheets");
}

export async function approveTimesheet(id: string) {
  return approveTimesheetByManager(id);
}

export async function rejectTimesheet(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.timesheet.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "REJECTED" },
  });

  await logAudit({
    tenantId,
    userId,
    action: "timesheet.reject",
    entity: "Timesheet",
    entityId: id,
  });

  revalidatePath("/projects/timesheets");
}

export async function deleteTimesheet(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.timesheet.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "timesheet.delete",
    entity: "Timesheet",
    entityId: id,
  });

  revalidatePath("/projects/timesheets");
}

export async function getTimesheetReport(filters: {
  dateFrom: string;
  dateTo: string;
  employeeId?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    status: "APPROVED" as TimesheetStatus,
    date: {
      gte: new Date(filters.dateFrom),
      lte: new Date(filters.dateTo),
    },
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
  };

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Group by project
  const byProject: Record<
    string,
    { projectId: string; projectName: string; totalHours: number; billableHours: number }
  > = {};

  for (const ts of timesheets) {
    const pid = ts.projectId || "unassigned";
    const pname = ts.project?.name || "Unassigned";
    if (!byProject[pid]) {
      byProject[pid] = { projectId: pid, projectName: pname, totalHours: 0, billableHours: 0 };
    }
    const h = Number(ts.hours);
    byProject[pid].totalHours += h;
    if (ts.isBillable) byProject[pid].billableHours += h;
  }

  const totalHours = timesheets.reduce((sum, ts) => sum + Number(ts.hours), 0);
  const billableHours = timesheets
    .filter((ts) => ts.isBillable)
    .reduce((sum, ts) => sum + Number(ts.hours), 0);

  return {
    totalHours,
    billableHours,
    nonBillableHours: totalHours - billableHours,
    byProject: Object.values(byProject),
  };
}

// ============================================================================
// TICKETS (PM-D)
// ============================================================================

export async function getTickets(filters?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  projectId?: string;
  assignedToId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 50, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.priority ? { priority: filters.priority } : {}),
    ...(filters?.projectId ? { projectId: filters.projectId } : {}),
    ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
    ...(filters?.search
      ? {
          OR: [
            { subject: { contains: filters.search, mode: "insensitive" as const } },
            { ticketNo: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  return { tickets, total, page, pageSize };
}

export async function getTicket(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.ticket.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      project: { select: { id: true, name: true } },
    },
  });
}

async function generateTicketNo(tenantId: string): Promise<string> {
  const count = await prisma.ticket.count({ where: { tenantId } });
  return `TKT-${String(count + 1).padStart(5, "0")}`;
}

export async function createTicket(data: {
  subject: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  projectId?: string;
  assignedToId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const ticketNo = await generateTicketNo(tenantId);

  const ticket = await prisma.ticket.create({
    data: {
      tenantId,
      ticketNo,
      subject: data.subject,
      description: data.description || undefined,
      priority: data.priority || "MEDIUM",
      category: data.category || undefined,
      projectId: data.projectId || undefined,
      reportedById: userId,
      assignedToId: data.assignedToId || undefined,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "ticket.create",
    entity: "Ticket",
    entityId: ticket.id,
    metadata: { ticketNo, subject: data.subject },
  });

  revalidatePath("/projects/tickets");
  return ticket;
}

export async function updateTicket(
  id: string,
  data: {
    subject?: string;
    description?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: string;
    projectId?: string | null;
    assignedToId?: string | null;
    slaDeadline?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.ticket.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId } : {}),
      ...(data.slaDeadline !== undefined ? { slaDeadline: new Date(data.slaDeadline) } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "ticket.update",
    entity: "Ticket",
    entityId: id,
    metadata: data,
  });

  revalidatePath("/projects/tickets");
  revalidatePath(`/projects/tickets/${id}`);
}

export async function assignTicket(id: string, assignedToId: string) {
  return updateTicket(id, { assignedToId, status: "IN_PROGRESS" });
}

export async function resolveTicket(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.ticket.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "ticket.resolve",
    entity: "Ticket",
    entityId: id,
  });

  revalidatePath("/projects/tickets");
  revalidatePath(`/projects/tickets/${id}`);
}

export async function closeTicket(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.ticket.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "ticket.close",
    entity: "Ticket",
    entityId: id,
  });

  revalidatePath("/projects/tickets");
  revalidatePath(`/projects/tickets/${id}`);
}

// ============================================================================
// TICKET COMMENTS
// ============================================================================

export async function getTicketComments(ticketId: string) {
  const { tenantId } = await getSessionOrThrow();

  // Verify ticket belongs to tenant
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...tenantScope(tenantId) },
    select: { id: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  return prisma.ticketComment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
}

export async function addTicketComment(
  ticketId: string,
  content: string,
  isInternal: boolean = false
) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify ticket belongs to tenant
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...tenantScope(tenantId) },
    select: { id: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: userId,
      content,
      isInternal,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "ticket.comment",
    entity: "TicketComment",
    entityId: comment.id,
    metadata: { ticketId, isInternal },
  });

  revalidatePath(`/projects/tickets/${ticketId}`);
  return comment;
}

// ============================================================================
// PROJECT FILES (PM-F)
// ============================================================================

export async function getProjectFiles(projectId: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.projectFile.findMany({
    where: { ...tenantScope(tenantId), projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProjectFile(data: {
  projectId: string;
  name: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const file = await prisma.projectFile.create({
    data: {
      tenantId,
      projectId: data.projectId,
      name: data.name,
      fileName: data.fileName,
      fileSize: data.fileSize ?? 0,
      mimeType: data.mimeType || "application/octet-stream",
      tags: data.tags || [],
      uploadedById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "projectFile.create",
    entity: "ProjectFile",
    entityId: file.id,
    metadata: { name: data.name, projectId: data.projectId },
  });

  revalidatePath(`/projects/${data.projectId}`);
  return file;
}

export async function deleteProjectFile(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const file = await prisma.projectFile.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { projectId: true },
  });
  if (!file) throw new Error("File not found");

  await prisma.projectFile.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "projectFile.delete",
    entity: "ProjectFile",
    entityId: id,
  });

  revalidatePath(`/projects/${file.projectId}`);
}

// ============================================================================
// PROJECT TEMPLATES (PM-A-006)
// ============================================================================

export async function getProjectTemplates() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.projectTemplate.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });
}

export async function createProjectTemplate(data: {
  name: string;
  description?: string;
  category?: string;
  tasks?: Array<{ title: string; description?: string; priority?: string; durationDays?: number; dependencies?: string[] }>;
  milestones?: Array<{ title: string; dayOffset: number }>;
  fromProjectId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  let tasks = data.tasks ?? [];
  let milestones = data.milestones ?? [];

  // If creating from an existing project, pull its tasks and milestones
  if (data.fromProjectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.fromProjectId, ...tenantScope(tenantId) },
      include: {
        tasks: { where: { parentId: null }, orderBy: { sortOrder: "asc" } },
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!project) throw new Error("Project not found");

    tasks = project.tasks.map((t) => ({
      title: t.title,
      description: t.description || undefined,
      priority: t.priority || "MEDIUM",
      durationDays: t.estimatedHours ? Math.ceil(Number(t.estimatedHours) / 8) : undefined,
    }));
    milestones = project.milestones.map((m, i) => ({
      title: m.title,
      dayOffset: (i + 1) * 14, // space milestones 2 weeks apart
    }));
  }

  const template = await prisma.projectTemplate.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      tasks,
      milestones,
      createdById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "template.create",
    entity: "ProjectTemplate",
    entityId: template.id,
    metadata: { name: data.name },
  });

  revalidatePath("/projects/templates");
  return template;
}

export async function applyProjectTemplate(
  templateId: string,
  projectData: {
    name: string;
    code?: string;
    description?: string;
    startDate?: string;
    clientName?: string;
    managerId?: string;
    budget?: number;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const template = await prisma.projectTemplate.findFirst({
    where: { id: templateId, ...tenantScope(tenantId) },
  });
  if (!template) throw new Error("Template not found");

  const startDate = projectData.startDate ? new Date(projectData.startDate) : new Date();

  // Create the project
  const project = await prisma.project.create({
    data: {
      tenantId,
      name: projectData.name,
      code: projectData.code || undefined,
      description: projectData.description || template.description || undefined,
      startDate,
      clientName: projectData.clientName || undefined,
      managerId: projectData.managerId || undefined,
      budget: projectData.budget,
      status: "PLANNING",
      priority: "MEDIUM",
    },
  });

  // Create tasks from template
  const templateTasks = template.tasks as Array<{
    title: string;
    description?: string;
    priority?: string;
    durationDays?: number;
  }>;
  for (let i = 0; i < templateTasks.length; i++) {
    const t = templateTasks[i];
    await prisma.task.create({
      data: {
        tenantId,
        projectId: project.id,
        title: t.title,
        description: t.description || undefined,
        priority: t.priority || "MEDIUM",
        status: "TODO",
        sortOrder: i + 1,
      },
    });
  }

  // Create milestones from template
  const templateMilestones = template.milestones as Array<{
    title: string;
    dayOffset: number;
  }>;
  for (let i = 0; i < templateMilestones.length; i++) {
    const m = templateMilestones[i];
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + m.dayOffset);
    await prisma.milestone.create({
      data: {
        tenantId,
        projectId: project.id,
        title: m.title,
        dueDate,
        sortOrder: i + 1,
      },
    });
  }

  await logAudit({
    tenantId,
    userId,
    action: "template.apply",
    entity: "ProjectTemplate",
    entityId: templateId,
    metadata: { projectId: project.id, projectName: projectData.name },
  });

  revalidatePath("/projects");
  revalidatePath("/projects/templates");
  return project;
}

export async function deleteProjectTemplate(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.projectTemplate.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "template.delete",
    entity: "ProjectTemplate",
    entityId: id,
  });

  revalidatePath("/projects/templates");
}

// ============================================================================
// CUSTOMER PORTAL / PUBLIC TICKET VIEW (PM-D-006)
// ============================================================================

export async function getPublicTicket(ticketId: string) {
  // No auth required - public access by ticket ID
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId },
    select: {
      id: true,
      ticketNo: true,
      subject: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      closedAt: true,
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          isInternal: true,
        },
      },
    },
  });

  return ticket;
}

export async function addPublicComment(ticketId: string, data: { content: string; authorName?: string }) {
  // No auth required - customer can comment with ticket ID
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId },
    select: { id: true, tenantId: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId: "customer",
      content: `[${data.authorName || "Customer"}]: ${data.content}`,
      isInternal: false,
    },
  });

  revalidatePath(`/portal/tickets/${ticketId}`);
  return comment;
}

// ============================================================================
// GANTT CHART DATA (PM-A-003)
// ============================================================================

export async function getGanttData(projectId: string) {
  const { tenantId } = await getSessionOrThrow();

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...tenantScope(tenantId) },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!project) throw new Error("Project not found");

  const tasks = await prisma.task.findMany({
    where: { ...tenantScope(tenantId), projectId },
    orderBy: { sortOrder: "asc" },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });

  const milestones = await prisma.milestone.findMany({
    where: { ...tenantScope(tenantId), projectId },
    orderBy: { sortOrder: "asc" },
  });

  // Compute project date range from tasks/milestones if project dates are missing
  const allDates: Date[] = [];
  if (project.startDate) allDates.push(project.startDate);
  if (project.endDate) allDates.push(project.endDate);

  for (const t of tasks) {
    allDates.push(t.createdAt);
    if (t.dueDate) allDates.push(t.dueDate);
    for (const st of t.subtasks) {
      allDates.push(st.createdAt);
      if (st.dueDate) allDates.push(st.dueDate);
    }
  }
  for (const m of milestones) {
    if (m.dueDate) allDates.push(m.dueDate);
  }

  // Fallback: use today if no dates exist at all
  if (allDates.length === 0) allDates.push(new Date());

  const timestamps = allDates.map((d) => d.getTime());
  const projectStart = new Date(Math.min(...timestamps));
  const projectEnd = new Date(Math.max(...timestamps));

  // Add 1-week padding on each side
  projectStart.setDate(projectStart.getDate() - 7);
  projectEnd.setDate(projectEnd.getDate() + 7);

  return {
    project: {
      id: project.id,
      name: project.name,
    },
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      startDate: t.createdAt.toISOString(),
      endDate: t.dueDate?.toISOString() ?? null,
      parentId: t.parentId,
      subtasks: t.subtasks.map((st) => ({
        id: st.id,
        title: st.title,
        status: st.status,
        priority: st.priority,
        startDate: st.createdAt.toISOString(),
        endDate: st.dueDate?.toISOString() ?? null,
        parentId: st.parentId,
      })),
    })),
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate?.toISOString() ?? null,
      isCompleted: m.isCompleted,
    })),
    projectStart: projectStart.toISOString(),
    projectEnd: projectEnd.toISOString(),
  };
}

// ============================================================================
// FIELD VISITS (PM-E)
// ============================================================================

export async function getFieldVisits(filters?: {
  projectId?: string;
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const dateFilter: Record<string, Date> = {};
  if (filters?.startDate) {
    const d = new Date(filters.startDate);
    if (!isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (filters?.endDate) {
    const d = new Date(filters.endDate);
    if (!isNaN(d.getTime())) dateFilter.lte = d;
  }

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.projectId ? { projectId: filters.projectId } : {}),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
  };

  const visits = await prisma.fieldVisitSchedule.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, code: true } },
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      vehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
      formTemplate: { select: { id: true, title: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  return visits;
}

export async function createFieldVisit(data: {
  title: string;
  siteLocation: string;
  clientName?: string;
  projectId?: string;
  employeeId: string;
  vehicleId?: string;
  formTemplateId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  parentScheduleId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const visit = await prisma.fieldVisitSchedule.create({
    data: {
      tenantId,
      title: data.title,
      siteLocation: data.siteLocation,
      clientName: data.clientName || undefined,
      projectId: data.projectId || undefined,
      employeeId: data.employeeId,
      vehicleId: data.vehicleId || undefined,
      formTemplateId: data.formTemplateId || undefined,
      date: new Date(data.date),
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      notes: data.notes || undefined,
      parentScheduleId: data.parentScheduleId || undefined,
      status: "SCHEDULED",
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "field_visit.create",
    entity: "FieldVisitSchedule",
    entityId: visit.id,
  });

  revalidatePath("/projects/field-visits");
  return visit;
}

export async function updateFieldVisit(id: string, data: {
  title?: string;
  siteLocation?: string;
  clientName?: string;
  projectId?: string;
  employeeId?: string;
  vehicleId?: string;
  formTemplateId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  status?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.siteLocation !== undefined) updateData.siteLocation = data.siteLocation;
  if (data.clientName !== undefined) updateData.clientName = data.clientName;
  if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
  if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
  if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId || null;
  if (data.formTemplateId !== undefined) updateData.formTemplateId = data.formTemplateId || null;
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  await prisma.fieldVisitSchedule.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });

  await logAudit({
    tenantId,
    userId,
    action: "field_visit.update",
    entity: "FieldVisitSchedule",
    entityId: id,
  });

  revalidatePath("/projects/field-visits");
}

export async function completeFieldVisit(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.fieldVisitSchedule.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "COMPLETED" },
  });

  await logAudit({
    tenantId,
    userId,
    action: "field_visit.complete",
    entity: "FieldVisitSchedule",
    entityId: id,
  });

  revalidatePath("/projects/field-visits");
}

export async function cancelFieldVisit(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.fieldVisitSchedule.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    tenantId,
    userId,
    action: "field_visit.cancel",
    entity: "FieldVisitSchedule",
    entityId: id,
  });

  revalidatePath("/projects/field-visits");
}
