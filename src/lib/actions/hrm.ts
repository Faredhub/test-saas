"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type {
  EmployeeStatus,
  JobStatus,
  ApplicantStage,
  LeaveStatus,
  AttendanceStatus,
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
// EMPLOYEE MANAGEMENT (HRM-A-001-004)
// ============================================================================

export async function getEmployees(filters?: {
  search?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { firstName: { contains: filters.search, mode: "insensitive" as const } },
            { lastName: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
            { employeeId: { contains: filters.search, mode: "insensitive" as const } },
            { designation: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        reportingTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getEmployee(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.employee.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      reportingTo: { select: { id: true, firstName: true, lastName: true } },
      reports: { select: { id: true, firstName: true, lastName: true, designation: true } },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 10, include: { leaveType: true } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
    },
  });
}

export async function createEmployee(data: {
  employeeId: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  departmentId?: string;
  designation?: string;
  reportingToId?: string;
  dateOfJoining: string;
  employmentType?: string;
  ctc?: number;
  bankName?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  panNumber?: string;
  aadharNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const employee = await prisma.employee.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender,
      departmentId: data.departmentId || undefined,
      designation: data.designation,
      reportingToId: data.reportingToId || undefined,
      dateOfJoining: new Date(data.dateOfJoining),
      employmentType: data.employmentType ?? "FULL_TIME",
      ctc: data.ctc,
      bankName: data.bankName,
      bankAccountNo: data.bankAccountNo,
      ifscCode: data.ifscCode,
      panNumber: data.panNumber,
      aadharNumber: data.aadharNumber,
      pfNumber: data.pfNumber,
      esiNumber: data.esiNumber,
      uanNumber: data.uanNumber,
    },
  });

  await logAudit({ tenantId, userId, action: "employee.create", entity: "Employee", entityId: employee.id });
  revalidatePath("/hrm/employees");
  return employee;
}

export async function updateEmployee(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    departmentId?: string;
    designation?: string;
    reportingToId?: string;
    employmentType?: string;
    status?: EmployeeStatus;
    ctc?: number;
    bankName?: string;
    bankAccountNo?: string;
    ifscCode?: string;
    panNumber?: string;
    aadharNumber?: string;
    pfNumber?: string;
    esiNumber?: string;
    uanNumber?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const employee = await prisma.employee.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
  });

  await logAudit({ tenantId, userId, action: "employee.update", entity: "Employee", entityId: id });
  revalidatePath("/hrm/employees");
  return employee;
}

export async function getOrgChart() {
  const { tenantId } = await getSessionOrThrow();

  const employees = await prisma.employee.findMany({
    where: { ...tenantScope(tenantId), status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      designation: true,
      departmentId: true,
      reportingToId: true,
    },
    orderBy: { firstName: "asc" },
  });

  return employees;
}

export async function getDepartments() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.department.findMany({
    where: tenantScope(tenantId),
    orderBy: { name: "asc" },
  });
}

// ============================================================================
// RECRUITMENT (HRM-B-001-004)
// ============================================================================

export async function getJobPostings(filters?: {
  status?: JobStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { department: { contains: filters.search, mode: "insensitive" as const } },
            { location: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      include: {
        _count: { select: { applicants: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.jobPosting.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createJobPosting(data: {
  title: string;
  department?: string;
  location?: string;
  type?: string;
  experience?: string;
  salary?: string;
  description: string;
  requirements?: string;
  openings?: number;
  closingDate?: string;
  status?: JobStatus;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const job = await prisma.jobPosting.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title,
      department: data.department,
      location: data.location,
      type: data.type ?? "FULL_TIME",
      experience: data.experience,
      salary: data.salary,
      description: data.description,
      requirements: data.requirements,
      openings: data.openings ?? 1,
      closingDate: data.closingDate ? new Date(data.closingDate) : undefined,
      status: data.status ?? "DRAFT",
    },
  });

  await logAudit({ tenantId, userId, action: "job.create", entity: "JobPosting", entityId: job.id });
  revalidatePath("/hrm/recruitment");
  return job;
}

export async function updateJobPosting(
  id: string,
  data: {
    title?: string;
    department?: string;
    location?: string;
    type?: string;
    experience?: string;
    salary?: string;
    description?: string;
    requirements?: string;
    openings?: number;
    closingDate?: string;
    status?: JobStatus;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.jobPosting.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...data,
      closingDate: data.closingDate ? new Date(data.closingDate) : undefined,
    },
  });

  await logAudit({ tenantId, userId, action: "job.update", entity: "JobPosting", entityId: id });
  revalidatePath("/hrm/recruitment");
}

export async function getApplicants(filters?: {
  jobId?: string;
  stage?: ApplicantStage;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.jobId ? { jobId: filters.jobId } : {}),
    ...(filters?.stage ? { stage: filters.stage } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.applicant.findMany({
      where,
      include: {
        job: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.applicant.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createApplicant(data: {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const applicant = await prisma.applicant.create({
    data: {
      tenantId,
      jobId: data.jobId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      resumeUrl: data.resumeUrl,
      coverLetter: data.coverLetter,
      notes: data.notes,
    },
  });

  await logAudit({ tenantId, userId, action: "applicant.create", entity: "Applicant", entityId: applicant.id });
  revalidatePath("/hrm/recruitment");
  return applicant;
}

export async function updateApplicantStage(id: string, stage: ApplicantStage, notes?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.applicant.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      stage,
      ...(notes ? { notes } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "applicant.stageChange",
    entity: "Applicant",
    entityId: id,
    metadata: { stage },
  });
  revalidatePath("/hrm/recruitment");
}

// ============================================================================
// HOLIDAYS & LEAVE (HRM-C-001-005)
// ============================================================================

export async function getHolidays(year?: number) {
  const { tenantId } = await getSessionOrThrow();
  const targetYear = year ?? new Date().getFullYear();

  return prisma.holiday.findMany({
    where: {
      ...tenantScope(tenantId),
      date: {
        gte: new Date(`${targetYear}-01-01`),
        lt: new Date(`${targetYear + 1}-01-01`),
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function createHoliday(data: {
  name: string;
  date: string;
  type?: string;
  isOptional?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const holiday = await prisma.holiday.create({
    data: {
      tenantId,
      name: data.name,
      date: new Date(data.date),
      type: data.type ?? "PUBLIC",
      isOptional: data.isOptional ?? false,
    },
  });

  await logAudit({ tenantId, userId, action: "holiday.create", entity: "Holiday", entityId: holiday.id });
  revalidatePath("/hrm/leaves");
  return holiday;
}

export async function deleteHoliday(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.holiday.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "holiday.delete", entity: "Holiday", entityId: id });
  revalidatePath("/hrm/leaves");
}

export async function getLeaveTypes() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.leaveType.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createLeaveType(data: {
  name: string;
  code: string;
  annualQuota: number;
  carryForward?: boolean;
  maxCarry?: number;
  isPaid?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const leaveType = await prisma.leaveType.create({
    data: {
      tenantId,
      name: data.name,
      code: data.code,
      annualQuota: data.annualQuota,
      carryForward: data.carryForward ?? false,
      maxCarry: data.maxCarry ?? 0,
      isPaid: data.isPaid ?? true,
    },
  });

  await logAudit({ tenantId, userId, action: "leaveType.create", entity: "LeaveType", entityId: leaveType.id });
  revalidatePath("/hrm/leaves");
  return leaveType;
}

export async function updateLeaveType(
  id: string,
  data: {
    name?: string;
    code?: string;
    annualQuota?: number;
    carryForward?: boolean;
    maxCarry?: number;
    isPaid?: boolean;
    isActive?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.leaveType.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "leaveType.update", entity: "LeaveType", entityId: id });
  revalidatePath("/hrm/leaves");
}

export async function getLeaveRequests(filters?: {
  employeeId?: string;
  status?: LeaveStatus;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        leaveType: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createLeaveRequest(data: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const request = await prisma.leaveRequest.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      days: data.days,
      reason: data.reason,
    },
  });

  await logAudit({ tenantId, userId, action: "leave.request", entity: "LeaveRequest", entityId: request.id });
  revalidatePath("/hrm/leaves");
  return request;
}

export async function approveLeaveRequest(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.leaveRequest.updateMany({
    where: { id, ...tenantScope(tenantId), status: "PENDING" },
    data: {
      status: "APPROVED",
      approvedById: userId,
      approvedAt: new Date(),
    },
  });

  await logAudit({ tenantId, userId, action: "leave.approve", entity: "LeaveRequest", entityId: id });
  revalidatePath("/hrm/leaves");
}

export async function rejectLeaveRequest(id: string, reason: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.leaveRequest.updateMany({
    where: { id, ...tenantScope(tenantId), status: "PENDING" },
    data: {
      status: "REJECTED",
      approvedById: userId,
      approvedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await logAudit({ tenantId, userId, action: "leave.reject", entity: "LeaveRequest", entityId: id });
  revalidatePath("/hrm/leaves");
}

export async function getLeaveBalance(employeeId: string) {
  const { tenantId } = await getSessionOrThrow();

  const [leaveTypes, usedLeaves] = await Promise.all([
    prisma.leaveType.findMany({
      where: { ...tenantScope(tenantId), isActive: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        ...tenantScope(tenantId),
        employeeId,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: {
          gte: new Date(`${new Date().getFullYear()}-01-01`),
        },
      },
      select: { leaveTypeId: true, days: true, status: true },
    }),
  ]);

  return leaveTypes.map((lt) => {
    const used = usedLeaves
      .filter((l) => l.leaveTypeId === lt.id && l.status === "APPROVED")
      .reduce((sum, l) => sum + Number(l.days), 0);
    const pending = usedLeaves
      .filter((l) => l.leaveTypeId === lt.id && l.status === "PENDING")
      .reduce((sum, l) => sum + Number(l.days), 0);
    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      leaveTypeCode: lt.code,
      annualQuota: lt.annualQuota,
      used,
      pending,
      remaining: lt.annualQuota - used,
    };
  });
}

// ============================================================================
// ATTENDANCE (HRM-D-001-005)
// ============================================================================

export async function getAttendance(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.startDate || filters?.endDate
      ? {
          date: {
            ...(filters?.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters?.endDate ? { lte: new Date(filters.endDate) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attendance.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function clockIn(employeeId: string, location?: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await prisma.attendance.findFirst({
    where: { ...tenantScope(tenantId), employeeId, date: today },
  });

  if (existing) throw new Error("Already clocked in today");

  const isLate = now.getHours() >= 10; // After 10 AM is late

  const attendance = await prisma.attendance.create({
    data: {
      tenantId,
      employeeId,
      date: today,
      clockIn: now,
      status: isLate ? "LATE" : "PRESENT",
      location,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "attendance.clockIn",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { employeeId, time: now.toISOString() },
  });
  revalidatePath("/hrm/attendance");
  return attendance;
}

export async function clockOut(employeeId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const attendance = await prisma.attendance.findFirst({
    where: { ...tenantScope(tenantId), employeeId, date: today },
  });

  if (!attendance) throw new Error("No clock-in record found for today");
  if (attendance.clockOut) throw new Error("Already clocked out today");

  const clockInTime = attendance.clockIn!;
  const totalMs = now.getTime() - clockInTime.getTime();
  const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
  const overtime = Math.max(0, totalHours - 8);
  const status: AttendanceStatus = totalHours < 4 ? "HALF_DAY" : attendance.status;

  await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockOut: now,
      totalHours,
      overtime: overtime > 0 ? overtime : undefined,
      status,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "attendance.clockOut",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { employeeId, totalHours },
  });
  revalidatePath("/hrm/attendance");
}

export async function getAttendanceReport(month: number, year: number, employeeId?: string) {
  const { tenantId } = await getSessionOrThrow();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const where = {
    ...tenantScope(tenantId),
    date: { gte: startDate, lte: endDate },
    ...(employeeId ? { employeeId } : {}),
  };

  const records = await prisma.attendance.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
    },
    orderBy: [{ employeeId: "asc" }, { date: "asc" }],
  });

  // Group by employee
  const byEmployee = new Map<
    string,
    {
      employee: { id: string; firstName: string; lastName: string | null; employeeId: string };
      present: number;
      absent: number;
      late: number;
      halfDay: number;
      onLeave: number;
      totalHours: number;
      overtime: number;
    }
  >();

  for (const r of records) {
    const key = r.employeeId;
    if (!byEmployee.has(key)) {
      byEmployee.set(key, {
        employee: r.employee,
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        onLeave: 0,
        totalHours: 0,
        overtime: 0,
      });
    }
    const emp = byEmployee.get(key)!;
    if (r.status === "PRESENT") emp.present++;
    else if (r.status === "ABSENT") emp.absent++;
    else if (r.status === "LATE") { emp.late++; emp.present++; }
    else if (r.status === "HALF_DAY") emp.halfDay++;
    else if (r.status === "ON_LEAVE") emp.onLeave++;
    emp.totalHours += Number(r.totalHours ?? 0);
    emp.overtime += Number(r.overtime ?? 0);
  }

  return {
    month,
    year,
    workingDays: endDate.getDate(),
    summary: Array.from(byEmployee.values()),
  };
}

// ============================================================================
// HRM STATS (Dashboard)
// ============================================================================

export async function getHrmStats() {
  const { tenantId } = await getSessionOrThrow();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [
    totalEmployees,
    activeEmployees,
    pendingLeaves,
    openPositions,
    todayAttendance,
    totalVehicles,
  ] = await Promise.all([
    prisma.employee.count({ where: tenantScope(tenantId) }),
    prisma.employee.count({ where: { ...tenantScope(tenantId), status: "ACTIVE" } }),
    prisma.leaveRequest.count({ where: { ...tenantScope(tenantId), status: "PENDING" } }),
    prisma.jobPosting.count({ where: { ...tenantScope(tenantId), status: "OPEN" } }),
    prisma.attendance.count({ where: { ...tenantScope(tenantId), date: todayStart } }),
    prisma.vehicle.count({ where: tenantScope(tenantId) }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    pendingLeaves,
    openPositions,
    todayAttendance,
    totalVehicles,
  };
}

// ============================================================================
// FLEET MANAGEMENT (HRM-F-001-004)
// ============================================================================

export async function getVehicles(filters?: {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.search
      ? {
          OR: [
            { registrationNo: { contains: filters.search, mode: "insensitive" as const } },
            { make: { contains: filters.search, mode: "insensitive" as const } },
            { model: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { fuelLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createVehicle(data: {
  registrationNo: string;
  make?: string;
  model?: string;
  year?: number;
  type?: string;
  fuelType?: string;
  assignedToId?: string;
  insuranceExpiry?: string;
  odometerKm?: number;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const vehicle = await prisma.vehicle.create({
    data: {
      tenantId,
      registrationNo: data.registrationNo,
      make: data.make,
      model: data.model,
      year: data.year,
      type: data.type ?? "CAR",
      fuelType: data.fuelType,
      assignedToId: data.assignedToId || undefined,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
      odometerKm: data.odometerKm ?? 0,
    },
  });

  await logAudit({ tenantId, userId, action: "vehicle.create", entity: "Vehicle", entityId: vehicle.id });
  revalidatePath("/hrm/fleet");
  return vehicle;
}

export async function updateVehicle(
  id: string,
  data: {
    make?: string;
    model?: string;
    year?: number;
    type?: string;
    fuelType?: string;
    assignedToId?: string | null;
    status?: string;
    insuranceExpiry?: string;
    odometerKm?: number;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.vehicle.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...data,
      assignedToId: data.assignedToId === null ? null : data.assignedToId || undefined,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
    },
  });

  await logAudit({ tenantId, userId, action: "vehicle.update", entity: "Vehicle", entityId: id });
  revalidatePath("/hrm/fleet");
}

export async function getFuelLogs(filters?: {
  vehicleId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.vehicleId ? { vehicleId: filters.vehicleId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fuelLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createFuelLog(data: {
  vehicleId: string;
  date: string;
  litres: number;
  costPerLitre: number;
  totalCost: number;
  odometerKm?: number;
  fuelStation?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const log = await prisma.fuelLog.create({
    data: {
      tenantId,
      vehicleId: data.vehicleId,
      date: new Date(data.date),
      litres: data.litres,
      costPerLitre: data.costPerLitre,
      totalCost: data.totalCost,
      odometerKm: data.odometerKm,
      fuelStation: data.fuelStation,
      notes: data.notes,
    },
  });

  // Update vehicle odometer if provided
  if (data.odometerKm) {
    await prisma.vehicle.updateMany({
      where: { id: data.vehicleId, ...tenantScope(tenantId) },
      data: { odometerKm: data.odometerKm },
    });
  }

  await logAudit({ tenantId, userId, action: "fuelLog.create", entity: "FuelLog", entityId: log.id });
  revalidatePath("/hrm/fleet");
  return log;
}

// ============================================================================
// PERFORMANCE REVIEWS (HRM-E-001)
// ============================================================================

export async function getPerformanceReviews(filters?: {
  employeeId?: string;
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.status ? { status: filters.status as any } : {}),
    ...(filters?.type ? { type: filters.type as any } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.performanceReview.findMany({
      where: where as any,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.performanceReview.count({ where: where as any }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createPerformanceReview(data: {
  employeeId: string;
  reviewerId: string;
  period: string;
  type?: string;
  overallRating?: number;
  strengths?: string;
  improvements?: string;
  comments?: string;
  selfRating?: number;
  selfComments?: string;
  criteria?: Array<{ name: string; weight: number; rating: number; comment?: string }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const review = await prisma.performanceReview.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      reviewerId: data.reviewerId,
      period: data.period,
      type: (data.type as "ANNUAL" | "SEMI_ANNUAL" | "QUARTERLY" | "PROBATION" | "PROJECT_BASED") ?? "ANNUAL",
      overallRating: data.overallRating,
      strengths: data.strengths,
      improvements: data.improvements,
      comments: data.comments,
      selfRating: data.selfRating,
      selfComments: data.selfComments,
      criteria: data.criteria ?? [],
    },
  });

  await logAudit({ tenantId, userId, action: "review.create", entity: "PerformanceReview", entityId: review.id });
  revalidatePath("/hrm/performance");
  return review;
}

export async function updatePerformanceReview(
  id: string,
  data: {
    status?: string;
    overallRating?: number;
    strengths?: string;
    improvements?: string;
    comments?: string;
    selfRating?: number;
    selfComments?: string;
    criteria?: Array<{ name: string; weight: number; rating: number; comment?: string }>;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.overallRating !== undefined) updateData.overallRating = data.overallRating;
  if (data.strengths !== undefined) updateData.strengths = data.strengths;
  if (data.improvements !== undefined) updateData.improvements = data.improvements;
  if (data.comments !== undefined) updateData.comments = data.comments;
  if (data.selfRating !== undefined) updateData.selfRating = data.selfRating;
  if (data.selfComments !== undefined) updateData.selfComments = data.selfComments;
  if (data.criteria !== undefined) updateData.criteria = data.criteria;
  if (data.status === "COMPLETED") updateData.completedAt = new Date();

  await prisma.performanceReview.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });

  await logAudit({ tenantId, userId, action: "review.update", entity: "PerformanceReview", entityId: id, metadata: data });
  revalidatePath("/hrm/performance");
}

// ============================================================================
// GOALS (HRM-E-002)
// ============================================================================

export async function getGoals(filters?: {
  employeeId?: string;
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.status ? { status: filters.status as any } : {}),
    ...(filters?.category ? { category: filters.category as any } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.goal.findMany({
      where: where as any,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.goal.count({ where: where as any }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createGoal(data: {
  employeeId: string;
  title: string;
  description?: string;
  category?: string;
  targetDate?: string;
  priority?: string;
  keyResults?: Array<{ title: string; target: number; current: number; unit: string }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const goal = await prisma.goal.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      title: data.title,
      description: data.description,
      category: (data.category as "PERFORMANCE" | "DEVELOPMENT" | "TEAM" | "COMPANY") ?? "PERFORMANCE",
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      priority: (data.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") ?? "MEDIUM",
      keyResults: data.keyResults ?? [],
      createdById: userId,
    },
  });

  await logAudit({ tenantId, userId, action: "goal.create", entity: "Goal", entityId: goal.id });
  revalidatePath("/hrm/performance");
  return goal;
}

export async function updateGoal(
  id: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    targetDate?: string;
    progress?: number;
    status?: string;
    priority?: string;
    keyResults?: Array<{ title: string; target: number; current: number; unit: string }>;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);
  if (data.progress !== undefined) updateData.progress = data.progress;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.keyResults !== undefined) updateData.keyResults = data.keyResults;

  await prisma.goal.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });

  await logAudit({ tenantId, userId, action: "goal.update", entity: "Goal", entityId: id, metadata: data });
  revalidatePath("/hrm/performance");
}

export async function deleteGoal(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.goal.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "CANCELLED" },
  });

  await logAudit({ tenantId, userId, action: "goal.delete", entity: "Goal", entityId: id });
  revalidatePath("/hrm/performance");
}

// ============================================================================
// SHIFTS & SCHEDULING (PM-E-001-003)
// ============================================================================

export async function getShifts() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.shift.findMany({
    where: tenantScope(tenantId),
    orderBy: { name: "asc" },
  });
}

export async function createShift(data: {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  color?: string;
  isDefault?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const shift = await prisma.shift.create({
    data: {
      tenantId,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes ?? 60,
      color: data.color ?? "#3b82f6",
      isDefault: data.isDefault ?? false,
    },
  });

  await logAudit({ tenantId, userId, action: "shift.create", entity: "Shift", entityId: shift.id });
  revalidatePath("/hrm/scheduling");
  return shift;
}

export async function updateShift(
  id: string,
  data: {
    name?: string;
    startTime?: string;
    endTime?: string;
    breakMinutes?: number;
    color?: string;
    isDefault?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.shift.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.breakMinutes !== undefined ? { breakMinutes: data.breakMinutes } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "shift.update", entity: "Shift", entityId: id });
  revalidatePath("/hrm/scheduling");
}

export async function deleteShift(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.shift.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "shift.delete", entity: "Shift", entityId: id });
  revalidatePath("/hrm/scheduling");
}

export async function getScheduleEntries(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters?.status ? { status: filters.status as any } : {}),
    ...(filters?.startDate || filters?.endDate
      ? {
          date: {
            ...(filters?.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters?.endDate ? { lte: new Date(filters.endDate) } : {}),
          },
        }
      : {}),
  };

  return prisma.scheduleEntry.findMany({
    where: where as any,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      shift: true,
    },
    orderBy: [{ date: "asc" }, { employeeId: "asc" }],
  });
}

export async function createScheduleEntry(data: {
  employeeId: string;
  shiftId: string;
  date: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const entry = await prisma.scheduleEntry.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      shiftId: data.shiftId,
      date: new Date(data.date),
      notes: data.notes,
    },
  });

  await logAudit({ tenantId, userId, action: "schedule.create", entity: "ScheduleEntry", entityId: entry.id });
  revalidatePath("/hrm/scheduling");
  return entry;
}

export async function updateScheduleEntry(
  id: string,
  data: { shiftId?: string; status?: string; notes?: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.scheduleEntry.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.shiftId !== undefined ? { shiftId: data.shiftId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    } as any,
  });

  await logAudit({ tenantId, userId, action: "schedule.update", entity: "ScheduleEntry", entityId: id });
  revalidatePath("/hrm/scheduling");
}

export async function deleteScheduleEntry(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.scheduleEntry.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "schedule.delete", entity: "ScheduleEntry", entityId: id });
  revalidatePath("/hrm/scheduling");
}

// ============================================================================
// EMPLOYEE OFFBOARDING (HRM-A-002 Enhancement)
// ============================================================================

export async function initiateOffboarding(
  employeeId: string,
  data: {
    reason: "RESIGNED" | "TERMINATED" | "RETIRED" | "CONTRACT_END";
    lastWorkingDate: string;
    notes?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify the employee belongs to this tenant and is currently active
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...tenantScope(tenantId) },
  });

  if (!employee) throw new Error("Employee not found");
  if (employee.status !== "ACTIVE" && employee.status !== "ON_LEAVE") {
    throw new Error("Employee is not in an active state for offboarding");
  }

  // Set employee status to ON_NOTICE and record the last working date
  await prisma.employee.updateMany({
    where: { id: employeeId, ...tenantScope(tenantId) },
    data: {
      status: "ON_NOTICE" as EmployeeStatus,
      dateOfLeaving: new Date(data.lastWorkingDate),
    },
  });

  // Cancel all pending leave requests for this employee
  await prisma.leaveRequest.updateMany({
    where: {
      employeeId,
      ...tenantScope(tenantId),
      status: "PENDING",
    },
    data: { status: "CANCELLED" as LeaveStatus },
  });

  await logAudit({
    tenantId,
    userId,
    action: "employee.offboarding.initiate",
    entity: "Employee",
    entityId: employeeId,
    metadata: {
      reason: data.reason,
      lastWorkingDate: data.lastWorkingDate,
      notes: data.notes ?? null,
    },
  });

  revalidatePath("/hrm/employees");
  return { success: true };
}

export async function completeOffboarding(employeeId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...tenantScope(tenantId) },
  });

  if (!employee) throw new Error("Employee not found");
  if (employee.status !== "ON_NOTICE") {
    throw new Error("Employee must be ON_NOTICE to complete offboarding");
  }

  // Determine final status from the most recent audit log
  const initiationLog = await prisma.auditLog.findFirst({
    where: {
      ...tenantScope(tenantId),
      entityId: employeeId,
      action: "employee.offboarding.initiate",
    },
    orderBy: { createdAt: "desc" },
  });

  const reason = (initiationLog?.metadata as Record<string, string>)?.reason ?? "RESIGNED";
  const finalStatus: EmployeeStatus =
    reason === "TERMINATED" ? "TERMINATED" : "RESIGNED";

  // Update employee status
  await prisma.employee.updateMany({
    where: { id: employeeId, ...tenantScope(tenantId) },
    data: { status: finalStatus },
  });

  // Unassign any vehicles assigned to this employee
  await prisma.vehicle.updateMany({
    where: { assignedToId: employeeId, ...tenantScope(tenantId) },
    data: { assignedToId: null },
  });

  // Deactivate the linked user account if one exists
  if (employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { status: "INACTIVE" },
    });
  }

  await logAudit({
    tenantId,
    userId,
    action: "employee.offboarding.complete",
    entity: "Employee",
    entityId: employeeId,
    metadata: { finalStatus, reason },
  });

  revalidatePath("/hrm/employees");
  return { success: true, finalStatus };
}

export async function getOffboardingChecklist(employeeId: string) {
  const { tenantId } = await getSessionOrThrow();

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...tenantScope(tenantId) },
  });

  if (!employee) throw new Error("Employee not found");

  const [
    pendingLeaves,
    assignedVehicles,
    pendingExpenses,
    pendingPayslips,
  ] = await Promise.all([
    prisma.leaveRequest.count({
      where: { employeeId, ...tenantScope(tenantId), status: "PENDING" },
    }),
    prisma.vehicle.count({
      where: { assignedToId: employeeId, ...tenantScope(tenantId) },
    }),
    prisma.expense.count({
      where: { submittedById: employeeId, ...tenantScope(tenantId), status: "PENDING" },
    }),
    prisma.payslip.count({
      where: { employeeId, ...tenantScope(tenantId), status: "DRAFT" },
    }),
  ]);

  const checklist = [
    {
      name: "Pending Leave Requests",
      status: pendingLeaves === 0 ? "done" : "pending",
      count: pendingLeaves,
      action: "Cancel or process pending leave requests",
    },
    {
      name: "Assigned Vehicles",
      status: assignedVehicles === 0 ? "done" : "pending",
      count: assignedVehicles,
      action: "Return assigned vehicles",
    },
    {
      name: "Pending Expense Claims",
      status: pendingExpenses === 0 ? "done" : "pending",
      count: pendingExpenses,
      action: "Settle pending expense claims",
    },
    {
      name: "Pending Payslips",
      status: pendingPayslips === 0 ? "done" : "pending",
      count: pendingPayslips,
      action: "Finalize and process pending payslips",
    },
    {
      name: "IT Assets & Access",
      status: "pending" as const,
      count: 0,
      action: "Revoke system access and collect IT equipment",
    },
  ];

  return { employee, checklist };
}

export async function getExitEmployees(filters?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const exitStatuses: EmployeeStatus[] = ["ON_NOTICE", "RESIGNED", "TERMINATED"];

  const where = {
    ...tenantScope(tenantId),
    status: {
      in: filters?.status
        ? [filters.status as EmployeeStatus]
        : exitStatuses,
    },
  };

  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        reportingTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dateOfLeaving: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
