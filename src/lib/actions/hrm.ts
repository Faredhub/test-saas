"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
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
  return { userId: user.id as string, tenantId: user.tenantId as string, roles: (user.roles as string[]) || [] };
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

  // Auto-sync missing employee profiles for any registered users under this workspace
  try {
    const existingEmps = await prisma.employee.findMany({
      where: { tenantId },
      select: { email: true, userId: true },
    });
    const existingEmailsSet = new Set(existingEmps.map((e) => e.email.toLowerCase()));

    const unlinkedUsers = await prisma.user.findMany({
      where: {
        tenantId,
        NOT: {
          email: { in: Array.from(existingEmailsSet) },
        },
      },
    });

    if (unlinkedUsers.length > 0) {
      const empCount = await prisma.employee.count({ where: { tenantId } });
      for (let i = 0; i < unlinkedUsers.length; i++) {
        const u = unlinkedUsers[i];
        const nameParts = (u.name || "").trim().split(/\s+/);
        const firstName = u.firstName || nameParts[0] || "Employee";
        const lastName = u.lastName || nameParts.slice(1).join(" ") || "";
        const empId = `EMP-${String(empCount + i + 1).padStart(3, "0")}`;

        await prisma.employee.create({
          data: {
            tenantId,
            userId: u.id,
            employeeId: empId,
            firstName,
            lastName,
            email: u.email,
            phone: u.phone || undefined,
            dateOfJoining: u.createdAt || new Date(),
            employmentType: "FULL_TIME",
            status: u.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Error auto-syncing missing employees:", err);
  }

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
          { middleName: { contains: filters.search, mode: "insensitive" as const } },
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

  const serializedData = data.map((emp) => ({
    ...emp,
    ctc: emp.ctc ? Number(emp.ctc) : null,
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getEmployee(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const emp = await prisma.employee.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      reportingTo: { select: { id: true, firstName: true, lastName: true } },
      reports: { select: { id: true, firstName: true, lastName: true, designation: true } },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 10, include: { leaveType: true } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!emp) return null;
  return {
    ...emp,
    ctc: emp.ctc ? Number(emp.ctc) : null,
    leaveRequests: emp.leaveRequests.map((req) => ({
      ...req,
      days: Number(req.days) as any,
    })),
  };
}

export async function createEmployee(data: {
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  departmentId?: string;
  designation?: string;
  designationId?: string;
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
  avatar?: string;
  password?: string;
}) {
  await requirePermission({ module: "hrm", action: "create", resource: "employees" });
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let resolvedDesignation = data.designation;
    if (data.designationId) {
      const dbDesignation = await prisma.designation.findUnique({
        where: { id: data.designationId },
        select: { name: true },
      });
      if (dbDesignation) {
        resolvedDesignation = dbDesignation.name;
      }
    }

    // Ensure User account exists with login password
    const initialPassword = data.password && data.password.trim() ? data.password.trim() : "Emp@1234";
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    const fullName = `${data.firstName} ${data.middleName ? data.middleName + " " : ""}${data.lastName ?? ""}`.trim();

    let linkedUser = await prisma.user.findFirst({
      where: { email: data.email, tenantId },
    });

    if (!linkedUser) {
      linkedUser = await prisma.user.create({
        data: {
          tenantId,
          email: data.email,
          name: fullName,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
          status: "ACTIVE",
          theme: "SYSTEM",
          locale: "en",
          timezone: "Asia/Kolkata",
          emailVerified: new Date(),
        },
      });

      let empRole = await prisma.role.findFirst({
        where: { tenantId, name: "Employee" },
      });

      if (!empRole) {
        empRole = await prisma.role.create({
          data: {
            tenantId,
            name: "Employee",
            description: "Standard Employee Access",
            isSystem: true,
            isDefault: true,
          },
        });
      }

      await prisma.userRole.create({
        data: {
          userId: linkedUser.id,
          roleId: empRole.id,
        },
      });
    } else if (data.password && data.password.trim()) {
      await prisma.user.update({
        where: { id: linkedUser.id },
        data: { passwordHash },
      });
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        userId: linkedUser.id,
        employeeId: data.employeeId,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        departmentId: data.departmentId || undefined,
        designation: resolvedDesignation,
        designationId: data.designationId || undefined,
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
        avatar: data.avatar,
      },
    });

    await logAudit({ tenantId, userId, action: "employee.create", entity: "Employee", entityId: employee.id });
    revalidatePath("/hrm/employees");
    revalidatePath("/settings/roles");
    return {
      success: true,
      employee: {
        ...employee,
        ctc: employee.ctc ? Number(employee.ctc) : null,
      },
    };
  } catch (err: any) {
    console.error("Prisma error in createEmployee:", err);
    return {
      success: false,
      error: err.message || "Failed to create employee",
    };
  }
}

export async function updateEmployee(
  id: string,
  data: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    departmentId?: string;
    designation?: string;
    designationId?: string | null;
    reportingToId?: string;
    dateOfJoining?: string;
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
    avatar?: string | null;
    password?: string;
  }
) {
  await requirePermission({ module: "hrm", action: "update", resource: "employees" });
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let designationUpdate: any = {};
    if (data.designationId !== undefined) {
      if (data.designationId === null) {
        designationUpdate = { designation: null, designationId: null };
      } else {
        const dbDesignation = await prisma.designation.findUnique({
          where: { id: data.designationId },
          select: { name: true },
        });
        if (dbDesignation) {
          designationUpdate = {
            designation: dbDesignation.name,
            designationId: data.designationId,
          };
        }
      }
    } else if (data.designation !== undefined) {
      designationUpdate = { designation: data.designation };
    }

    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      departmentId,
      reportingToId,
      dateOfJoining,
      employmentType,
      status,
      ctc,
      bankName,
      bankAccountNo,
      ifscCode,
      panNumber,
      aadharNumber,
      pfNumber,
      esiNumber,
      uanNumber,
      avatar,
    } = data;

    const employee = await prisma.employee.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: {
        firstName,
        middleName,
        lastName,
        email,
        phone,
        gender,
        departmentId: departmentId === "" ? null : departmentId,
        reportingToId: reportingToId === "" ? null : reportingToId,
        employmentType,
        status,
        ctc,
        bankName,
        bankAccountNo,
        ifscCode,
        panNumber,
        aadharNumber,
        pfNumber,
        esiNumber,
        uanNumber,
        avatar,
        ...designationUpdate,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
      },
    });

    // If status is being updated, sync the linked User account status as well
    if (status !== undefined) {
      const userStatus = (status === "INACTIVE" || status === "TERMINATED" || status === "RESIGNED") ? "INACTIVE" : "ACTIVE";
      const targetEmp = await prisma.employee.findFirst({
        where: { id, ...tenantScope(tenantId) },
        select: { userId: true, email: true },
      });

      if (targetEmp) {
        if (targetEmp.userId) {
          await prisma.user.updateMany({
            where: { id: targetEmp.userId },
            data: { status: userStatus },
          });
        }
        if (targetEmp.email) {
          await prisma.user.updateMany({
            where: { email: targetEmp.email, ...tenantScope(tenantId) },
            data: { status: userStatus },
          });
        }
      }
    }

    // If password is being updated, hash and sync it to the linked User account
    if (data.password && data.password.trim()) {
      const newPasswordHash = await bcrypt.hash(data.password.trim(), 12);
      const targetEmp = await prisma.employee.findFirst({
        where: { id, ...tenantScope(tenantId) },
        select: { userId: true, email: true },
      });

      if (targetEmp) {
        if (targetEmp.userId) {
          await prisma.user.updateMany({
            where: { id: targetEmp.userId },
            data: { passwordHash: newPasswordHash },
          });
        }
        if (targetEmp.email) {
          await prisma.user.updateMany({
            where: { email: targetEmp.email, ...tenantScope(tenantId) },
            data: { passwordHash: newPasswordHash },
          });
        }
      }
    }

    await logAudit({ tenantId, userId, action: "employee.update", entity: "Employee", entityId: id });
    revalidatePath("/hrm/employees");
    revalidatePath("/settings/roles");
    revalidatePath("/organization/settings");
    return {
      success: true,
      count: employee.count,
    };
  } catch (err: any) {
    console.error("Prisma error in updateEmployee:", err);
    return {
      success: false,
      error: err.message || "Failed to update employee",
    };
  }
}

export async function deleteEmployee(id: string) {
  await requirePermission({ module: "hrm", action: "delete", resource: "employees" });
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const employee = await prisma.employee.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
      };
    }

    await prisma.employee.delete({
      where: { id },
    });

    await logAudit({ tenantId, userId, action: "employee.delete", entity: "Employee", entityId: id });
    revalidatePath("/hrm/employees");

    return {
      success: true,
    };
  } catch (err: any) {
    console.error("Prisma error in deleteEmployee:", err);
    return {
      success: false,
      error: err.message || "Failed to delete employee",
    };
  }
}


export async function importEmployees(
  employees: {
    employeeId: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    designation?: string;
    departmentId?: string;
    dateOfJoining?: string;
    employmentType?: string;
    ctc?: number;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const emp of employees) {
      try {
        if (!emp.employeeId || !emp.firstName || !emp.email) {
          errors.push(`Row missing required fields (Employee ID, First Name, or Email).`);
          continue;
        }

        await prisma.employee.create({
          data: {
            tenantId,
            employeeId: String(emp.employeeId).trim(),
            firstName: String(emp.firstName).trim(),
            middleName: emp.middleName ? String(emp.middleName).trim() : null,
            lastName: emp.lastName ? String(emp.lastName).trim() : null,
            email: String(emp.email).trim().toLowerCase(),
            phone: emp.phone ? String(emp.phone).trim() : null,
            designation: emp.designation ? String(emp.designation).trim() : null,
            departmentId: emp.departmentId || undefined,
            dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining) : new Date(),
            employmentType: emp.employmentType || "FULL_TIME",
            ctc: emp.ctc ? Number(emp.ctc) : null,
          },
        });
        successCount++;
      } catch (err: any) {
        let errorMsg = err.message || "Unknown database error";
        if (err.code === "P2002") {
          const target = err.meta?.target || [];
          errorMsg = `Duplicate field: ${target.join(", ")}`;
        }
        errors.push(`Row (ID: ${emp.employeeId || "unknown"}, Email: ${emp.email || "unknown"}): ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "employee.import",
        entity: "Employee",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/employees");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importEmployees:", err);
    return {
      success: false,
      error: err.message || "Failed to import employees",
    };
  }
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

export async function deleteJobPosting(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.jobPosting.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Job posting not found");

  await prisma.jobPosting.delete({
    where: { id },
  });

  await logAudit({ tenantId, userId, action: "job.delete", entity: "JobPosting", entityId: id });
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

export async function createApplicantWithJobTitle(data: {
  jobTitle?: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  notes?: string;
}) {
  const { tenantId } = await getSessionOrThrow();
  let jobId: string | undefined = undefined;

  if (data.jobTitle) {
    const job = await prisma.jobPosting.findFirst({
      where: {
        title: { contains: data.jobTitle, mode: "insensitive" },
        ...tenantScope(tenantId),
      },
    });
    if (job) {
      jobId = job.id;
    }
  }

  // Fallback to first open job posting if none matched
  if (!jobId) {
    const firstOpenJob = await prisma.jobPosting.findFirst({
      where: {
        status: "OPEN",
        ...tenantScope(tenantId),
      },
      orderBy: { createdAt: "desc" },
    });
    if (firstOpenJob) {
      jobId = firstOpenJob.id;
    }
  }

  if (!jobId) {
    throw new Error("No open job posting found to associate this applicant with.");
  }

  return createApplicant({
    jobId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    resumeUrl: data.resumeUrl,
    coverLetter: data.coverLetter,
    notes: data.notes,
  });
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

  // Announce the new holiday by creating system notifications for all company users
  try {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });
    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          tenantId,
          userId: u.id,
          type: "INFO" as const,
          title: "New Holiday Announced",
          message: `${data.name} has been announced as a holiday on ${new Date(data.date).toLocaleDateString()}.`,
          link: "/hrm/leaves?tab=holidays",
        })),
        skipDuplicates: true,
      });
    }
  } catch (err) {
    console.error("Failed to announce holiday notifications:", err);
  }

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

export async function updateHoliday(
  id: string,
  data: {
    name?: string;
    date?: string;
    type?: string;
    isOptional?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isOptional !== undefined) updateData.isOptional = data.isOptional;

  await prisma.holiday.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });

  await logAudit({ tenantId, userId, action: "holiday.update", entity: "Holiday", entityId: id });
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

export async function deleteLeaveType(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.leaveType.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { isActive: false },
  });

  await logAudit({ tenantId, userId, action: "leaveType.delete", entity: "LeaveType", entityId: id });
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

  const serializedData = data.map((item) => ({
    ...item,
    days: Number(item.days) as any,
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
  return {
    ...request,
    days: Number(request.days) as any,
  };
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

export async function updateLeaveRequest(
  id: string,
  data: {
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    reason?: string;
    status?: LeaveStatus;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: {
      ...(data.leaveTypeId !== undefined && { leaveTypeId: data.leaveTypeId }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.days !== undefined && { days: data.days }),
      ...(data.reason !== undefined && { reason: data.reason }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  await logAudit({ tenantId, userId, action: "leave.update", entity: "LeaveRequest", entityId: id });
  revalidatePath("/hrm/leaves");
  return {
    ...request,
    days: Number(request.days) as any,
  };
}

export async function deleteLeaveRequest(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.leaveRequest.delete({
    where: { id },
  });

  await logAudit({ tenantId, userId, action: "leave.delete", entity: "LeaveRequest", entityId: id });
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

  const serializedData = data.map((record) => ({
    ...record,
    totalHours: record.totalHours ? Number(record.totalHours) : null,
    overtime: record.overtime ? Number(record.overtime) : null,
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getCurrentEmployee() {
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");

  const emp = await prisma.employee.findUnique({
    where: { userId },
  });

  return {
    employee: emp ? {
      ...emp,
      ctc: emp.ctc ? Number(emp.ctc) : null,
    } : null,
    isAdmin,
  };
}

export async function clockIn(employeeId?: string, location?: string) {
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");

  const emp = await prisma.employee.findUnique({
    where: { userId },
  });

  if (!emp && !isAdmin) {
    throw new Error("No employee record linked to this user account.");
  }

  const targetEmployeeId = (isAdmin && employeeId) ? employeeId : emp?.id;
  if (!targetEmployeeId) {
    throw new Error("Employee ID is required.");
  }

  if (!isAdmin && employeeId && employeeId !== emp?.id) {
    throw new Error("You cannot clock in for another employee.");
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await prisma.attendance.findFirst({
    where: { ...tenantScope(tenantId), employeeId: targetEmployeeId, date: today },
  });

  if (existing) throw new Error("Already clocked in today");

  const isLate = now.getHours() >= 10; // After 10 AM is late

  const attendance = await prisma.attendance.create({
    data: {
      tenantId,
      employeeId: targetEmployeeId,
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
    metadata: { employeeId: targetEmployeeId, time: now.toISOString() },
  });
  revalidatePath("/hrm/attendance");
  return {
    ...attendance,
    totalHours: attendance.totalHours ? Number(attendance.totalHours) : null,
    overtime: attendance.overtime ? Number(attendance.overtime) : null,
  };
}

export async function clockOut(employeeId?: string) {
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");

  const emp = await prisma.employee.findUnique({
    where: { userId },
  });

  if (!emp && !isAdmin) {
    throw new Error("No employee record linked to this user account.");
  }

  const targetEmployeeId = (isAdmin && employeeId) ? employeeId : emp?.id;
  if (!targetEmployeeId) {
    throw new Error("Employee ID is required.");
  }

  if (!isAdmin && employeeId && employeeId !== emp?.id) {
    throw new Error("You cannot clock out for another employee.");
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const attendance = await prisma.attendance.findFirst({
    where: { ...tenantScope(tenantId), employeeId: targetEmployeeId, date: today },
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
    metadata: { employeeId: targetEmployeeId, totalHours },
  });
  revalidatePath("/hrm/attendance");
}

export async function updateAttendance(
  id: string,
  data: {
    clockIn?: string;
    clockOut?: string;
    status?: AttendanceStatus;
    location?: string;
    notes?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const record = await prisma.attendance.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!record) {
      return { success: false, error: "Attendance record not found" };
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Handle clockIn update
    if (data.clockIn) {
      const dateBase = new Date(record.date);
      const [hours, minutes] = data.clockIn.split(":");
      updateData.clockIn = new Date(dateBase.getFullYear(), dateBase.getMonth(), dateBase.getDate(), Number(hours), Number(minutes));
    }

    // Handle clockOut update and recalculate hours
    if (data.clockOut) {
      const dateBase = new Date(record.date);
      const [hours, minutes] = data.clockOut.split(":");
      updateData.clockOut = new Date(dateBase.getFullYear(), dateBase.getMonth(), dateBase.getDate(), Number(hours), Number(minutes));
    }

    // Recalculate total hours and overtime if we have both clock times
    const newClockIn = updateData.clockIn ?? record.clockIn;
    const newClockOut = updateData.clockOut ?? record.clockOut;
    if (newClockIn && newClockOut) {
      const totalMs = newClockOut.getTime() - newClockIn.getTime();
      const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
      const overtime = Math.max(0, totalHours - 8);
      updateData.totalHours = totalHours;
      updateData.overtime = overtime > 0 ? overtime : null;
    }

    await prisma.attendance.update({
      where: { id },
      data: updateData,
    });

    await logAudit({ tenantId, userId, action: "attendance.update", entity: "Attendance", entityId: id });
    revalidatePath("/hrm/attendance");

    return { success: true };
  } catch (err: any) {
    console.error("Prisma error in updateAttendance:", err);
    return { success: false, error: err.message || "Failed to update attendance" };
  }
}

export async function deleteAttendance(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const record = await prisma.attendance.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!record) {
      return { success: false, error: "Attendance record not found" };
    }

    await prisma.attendance.delete({ where: { id } });

    await logAudit({ tenantId, userId, action: "attendance.delete", entity: "Attendance", entityId: id });
    revalidatePath("/hrm/attendance");

    return { success: true };
  } catch (err: any) {
    console.error("Prisma error in deleteAttendance:", err);
    return { success: false, error: err.message || "Failed to delete attendance record" };
  }
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
        project: { select: { id: true, name: true, code: true } },
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
  projectId?: string;
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
      projectId: data.projectId || undefined,
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
    projectId?: string | null;
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
      projectId: data.projectId === null ? null : data.projectId || undefined,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
    },
  });

  await logAudit({ tenantId, userId, action: "vehicle.update", entity: "Vehicle", entityId: id });
  revalidatePath("/hrm/fleet");
}

export async function deleteVehicle(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!vehicle) {
      return {
        success: false,
        error: "Vehicle not found",
      };
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    await logAudit({ tenantId, userId, action: "vehicle.delete", entity: "Vehicle", entityId: id });
    revalidatePath("/hrm/fleet");

    return {
      success: true,
    };
  } catch (err: any) {
    console.error("Prisma error in deleteVehicle:", err);
    return {
      success: false,
      error: err.message || "Failed to delete vehicle",
    };
  }
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

  const serializedData = data.map((log) => ({
    ...log,
    litres: Number(log.litres),
    costPerLitre: Number(log.costPerLitre),
    totalCost: Number(log.totalCost),
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
  odometerStartPhoto?: string;
  odometerEndPhoto?: string;
  fuelReceiptPhoto?: string;
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
      odometerStartPhoto: data.odometerStartPhoto || null,
      odometerEndPhoto: data.odometerEndPhoto || null,
      fuelReceiptPhoto: data.fuelReceiptPhoto || null,
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

  return {
    ...log,
    litres: Number(log.litres),
    costPerLitre: Number(log.costPerLitre),
    totalCost: Number(log.totalCost),
  };
}

export async function deleteFuelLog(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const log = await prisma.fuelLog.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!log) {
      return {
        success: false,
        error: "Fuel log not found",
      };
    }

    await prisma.fuelLog.delete({
      where: { id },
    });

    await logAudit({ tenantId, userId, action: "fuelLog.delete", entity: "FuelLog", entityId: id });
    revalidatePath("/hrm/fleet");

    return {
      success: true,
    };
  } catch (err: any) {
    console.error("Prisma error in deleteFuelLog:", err);
    return {
      success: false,
      error: err.message || "Failed to delete fuel log",
    };
  }
}

export async function updateFuelLog(
  id: string,
  data: {
    date?: string;
    litres?: number;
    costPerLitre?: number;
    odometerKm?: number;
    fuelStation?: string;
    notes?: string;
    odometerStartPhoto?: string;
    odometerEndPhoto?: string;
    fuelReceiptPhoto?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const log = await prisma.fuelLog.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!log) {
      return {
        success: false,
        error: "Fuel log not found",
      };
    }

    const updateData: any = {};
    if (data.date) updateData.date = new Date(data.date);
    if (data.litres !== undefined) updateData.litres = data.litres;
    if (data.costPerLitre !== undefined) updateData.costPerLitre = data.costPerLitre;

    const finalLitres = data.litres !== undefined ? data.litres : Number(log.litres);
    const finalCost = data.costPerLitre !== undefined ? data.costPerLitre : Number(log.costPerLitre);
    updateData.totalCost = Math.round(finalLitres * finalCost * 100) / 100;

    if (data.odometerKm !== undefined) updateData.odometerKm = data.odometerKm;
    if (data.fuelStation !== undefined) updateData.fuelStation = data.fuelStation;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.odometerStartPhoto !== undefined) updateData.odometerStartPhoto = data.odometerStartPhoto;
    if (data.odometerEndPhoto !== undefined) updateData.odometerEndPhoto = data.odometerEndPhoto;
    if (data.fuelReceiptPhoto !== undefined) updateData.fuelReceiptPhoto = data.fuelReceiptPhoto;

    const updatedLog = await prisma.fuelLog.update({
      where: { id },
      data: updateData,
    });

    if (data.odometerKm) {
      await prisma.vehicle.updateMany({
        where: { id: log.vehicleId, ...tenantScope(tenantId) },
        data: { odometerKm: data.odometerKm },
      });
    }

    await logAudit({ tenantId, userId, action: "fuelLog.update", entity: "FuelLog", entityId: id });
    revalidatePath("/hrm/fleet");

    return {
      success: true,
      data: {
        ...updatedLog,
        litres: Number(updatedLog.litres),
        costPerLitre: Number(updatedLog.costPerLitre),
        totalCost: Number(updatedLog.totalCost),
      },
    };
  } catch (err: any) {
    console.error("Prisma error in updateFuelLog:", err);
    return {
      success: false,
      error: err.message || "Failed to update fuel log",
    };
  }
}

export async function getTrips(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 100, 1), 100);

  const where: any = {
    ...tenantScope(tenantId),
  };

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters?.search) {
    where.OR = [
      { purpose: { contains: filters.search, mode: "insensitive" as const } },
      { startLocation: { contains: filters.search, mode: "insensitive" as const } },
      { endLocation: { contains: filters.search, mode: "insensitive" as const } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, code: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trip.count({ where }),
  ]);

  const serializedData = data.map((t) => ({
    ...t,
    allocatedCost: t.allocatedCost ? Number(t.allocatedCost) : 0,
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createTrip(data: {
  vehicleId?: string;
  employeeId?: string;
  driverId?: string;
  projectId?: string;
  purpose: string;
  startLocation: string;
  endLocation: string;
  startDate: string;
  endDate: string;
  approxDistanceKm?: number;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const costRate = 12; // ₹12 / km allocation default
  const allocatedCost = data.approxDistanceKm ? (data.approxDistanceKm * costRate) : null;

  const trip = await prisma.trip.create({
    data: {
      tenantId,
      vehicleId: data.vehicleId || null,
      employeeId: data.employeeId || null,
      driverId: data.driverId || null,
      projectId: data.projectId || null,
      purpose: data.purpose,
      startLocation: data.startLocation,
      endLocation: data.endLocation,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      approxDistanceKm: data.approxDistanceKm || null,
      allocatedCost,
      status: "PENDING",
    },
  });

  await logAudit({ tenantId, userId, action: "trip.create", entity: "Trip", entityId: trip.id });
  revalidatePath("/hrm/fleet");

  return {
    success: true,
    trip: {
      ...trip,
      allocatedCost: trip.allocatedCost ? Number(trip.allocatedCost) : 0,
    },
  };
}

export async function updateTripStatus(tripId: string, status: string, driverId?: string, vehicleId?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tenantScope(tenantId) },
  });

  if (!trip) {
    return { success: false, error: "Trip not found" };
  }

  const approverEmployee = await prisma.employee.findFirst({
    where: { userId, ...tenantScope(tenantId) },
  });

  const updateData: any = { status };

  if (status === "APPROVED") {
    updateData.approvedById = approverEmployee?.id || null;
    updateData.approvedAt = new Date();
    if (driverId) {
      updateData.driverId = driverId === "null" ? null : driverId;
    }
    if (vehicleId) {
      updateData.vehicleId = vehicleId === "null" ? null : vehicleId;
    }
  }

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
  });

  if (status === "APPROVED" && trip.projectId && trip.allocatedCost) {
    let category = await prisma.expenseCategory.findFirst({
      where: { name: { contains: "Travel", mode: "insensitive" as const }, ...tenantScope(tenantId) },
    });
    if (!category) {
      category = await prisma.expenseCategory.findFirst({
        where: { ...tenantScope(tenantId) },
      });
    }

    const count = await prisma.expense.count({ where: { tenantId } });
    const expenseNo = `EXP-TRIP-${count + 1}`;

    await prisma.expense.create({
      data: {
        tenantId,
        expenseNo,
        categoryId: category?.id || null,
        description: `Trip allocation: ${trip.purpose} (${trip.approxDistanceKm || 0} km)`,
        amount: trip.allocatedCost,
        date: trip.startDate,
        status: "APPROVED",
        submittedById: approverEmployee?.id || trip.employeeId || "",
        projectId: trip.projectId,
        notes: `Automatically generated from approved fleet trip assignment (Trip ID: ${trip.id})`,
      },
    });
  }

  await logAudit({ tenantId, userId, action: `trip.${status.toLowerCase()}`, entity: "Trip", entityId: tripId });
  revalidatePath("/hrm/fleet");

  return {
    success: true,
    trip: {
      ...updatedTrip,
      allocatedCost: updatedTrip.allocatedCost ? Number(updatedTrip.allocatedCost) : 0,
    },
  };
}

export async function deleteTrip(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    const trip = await prisma.trip.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!trip) {
      return { success: false, error: "Trip not found" };
    }

    await prisma.trip.delete({
      where: { id },
    });

    await logAudit({ tenantId, userId, action: "trip.delete", entity: "Trip", entityId: id });
    revalidatePath("/hrm/fleet");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete trip" };
  }
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
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const currentEmp = await prisma.employee.findUnique({ where: { userId } });

  let scopeWhere: any = {};
  if (!isAdmin) {
    if (currentEmp) {
      scopeWhere = {
        OR: [
          { employeeId: currentEmp.id },
          { reviewerId: userId },
        ],
      };
    } else {
      scopeWhere = { reviewerId: userId };
    }
  }

  const where = {
    ...tenantScope(tenantId),
    ...scopeWhere,
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
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");

  if (!isAdmin && data.reviewerId !== userId) {
    throw new Error("Only the assigned manager or HR administrator can provide a performance review.");
  }

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
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");

  const existing = await prisma.performanceReview.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Review not found");

  const currentEmp = await prisma.employee.findUnique({ where: { userId } });
  const isSelf = currentEmp && existing.employeeId === currentEmp.id;
  const isReviewer = existing.reviewerId === userId;

  if (!isAdmin && !isReviewer && !isSelf) {
    throw new Error("Not authorized to update this performance review.");
  }

  if (isSelf && !isReviewer && !isAdmin) {
    if (data.overallRating !== undefined || data.strengths !== undefined || data.improvements !== undefined) {
      throw new Error("Only the assigned manager can provide manager review scores and feedback.");
    }
  }

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

export async function deletePerformanceReview(id: string) {
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");

  if (!isAdmin) {
    return { success: false, error: "Only HR administrators can delete performance reviews." };
  }

  try {
    const review = await prisma.performanceReview.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await prisma.performanceReview.delete({
      where: { id },
    });

    await logAudit({ tenantId, userId, action: "review.delete", entity: "PerformanceReview", entityId: id });
    revalidatePath("/hrm/performance");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete review" };
  }
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
  const { userId, tenantId, roles } = await getSessionOrThrow();
  const isAdmin = roles.some(r => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager");
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const currentEmp = await prisma.employee.findUnique({ where: { userId } });

  let scopeWhere: any = {};
  if (!isAdmin && currentEmp) {
    scopeWhere = { employeeId: currentEmp.id };
  }

  const where = {
    ...tenantScope(tenantId),
    ...scopeWhere,
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
  try {
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
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters?.status ? { status: filters.status as any } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    };

    return await prisma.scheduleEntry.findMany({
      where: where as any,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        shift: true,
      },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    });
  } catch (error) {
    console.error("getScheduleEntries error:", error);
    return [];
  }
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

export async function createScheduleEntriesForRange(data: {
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start or end date");
  }

  if (end < start) {
    throw new Error("End date must be after or equal to start date");
  }

  const entriesData = [];
  const current = new Date(start);
  while (current <= end) {
    entriesData.push({
      tenantId,
      employeeId: data.employeeId,
      shiftId: data.shiftId,
      date: new Date(current),
      notes: data.notes || null,
    });
    current.setDate(current.getDate() + 1);
  }

  const result = await prisma.scheduleEntry.createMany({
    data: entriesData,
  });

  await logAudit({
    tenantId,
    userId,
    action: "schedule.create_range",
    entity: "ScheduleEntry",
    entityId: `${data.employeeId}_${data.startDate}_to_${data.endDate}`,
  });
  revalidatePath("/hrm/scheduling");
  return result;
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

// FIELD VISIT SCHEDULING (Parent-Child Hierarchy)
export async function getFieldVisitSchedules(filters?: {
  employeeId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
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
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    };

    return await prisma.fieldVisitSchedule.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        project: { select: { id: true, name: true, code: true } },
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
        formTemplate: { select: { id: true, title: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("getFieldVisitSchedules error:", error);
    return [];
  }
}

export async function createFieldVisitSchedule(data: {
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

  revalidatePath("/hrm/scheduling");
  revalidatePath("/hrm/fleet");
  return visit;
}

export async function updateFieldVisitStatus(id: string, status: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.fieldVisitSchedule.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status },
  });

  await logAudit({
    tenantId,
    userId,
    action: "field_visit.update_status",
    entity: "FieldVisitSchedule",
    entityId: id,
  });

  revalidatePath("/hrm/scheduling");
  revalidatePath("/hrm/fleet");
}

export async function deleteFieldVisitSchedule(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.fieldVisitSchedule.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "field_visit.delete",
    entity: "FieldVisitSchedule",
    entityId: id,
  });

  revalidatePath("/hrm/scheduling");
  revalidatePath("/hrm/fleet");
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

export async function importPerformanceReviews(
  reviews: {
    employeeIdOrEmail?: string;
    employeeName?: string;
    reviewerEmailOrId?: string;
    reviewerName?: string;
    period: string;
    type?: string;
    overallRating?: number;
    strengths?: string;
    improvements?: string;
    comments?: string;
    status?: string;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const r of reviews) {
      try {
        const empIdentifier = String(r.employeeIdOrEmail || r.employeeName || "").trim();
        const revIdentifier = String(r.reviewerEmailOrId || r.reviewerName || "").trim();

        if (!empIdentifier || !revIdentifier || !r.period) {
          errors.push(`Row missing required fields (Employee Name/Identifier, Reviewer Name/Identifier, or Period).`);
          continue;
        }

        const nameParts = empIdentifier.split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || undefined;

        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeId: { equals: empIdentifier, mode: "insensitive" } },
              { email: { equals: empIdentifier.toLowerCase(), mode: "insensitive" } },
              {
                AND: [
                  { firstName: { equals: firstName, mode: "insensitive" } },
                  lastName ? { lastName: { equals: lastName, mode: "insensitive" } } : {},
                ]
              },
            ],
            ...tenantScope(tenantId),
          },
        });

        if (!employee) {
          errors.push(`Employee not found for: ${empIdentifier}`);
          continue;
        }

        const reviewer = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: revIdentifier.toLowerCase(), mode: "insensitive" } },
              { id: { equals: revIdentifier, mode: "insensitive" } },
              { name: { equals: revIdentifier, mode: "insensitive" } },
            ],
            ...tenantScope(tenantId),
          },
        });

        if (!reviewer) {
          errors.push(`Reviewer User not found for: ${revIdentifier}`);
          continue;
        }

        await prisma.performanceReview.create({
          data: {
            tenantId,
            employeeId: employee.id,
            reviewerId: reviewer.id,
            period: String(r.period).trim(),
            type: (r.type?.trim() as any) || "ANNUAL",
            status: (r.status?.trim() as any) || "DRAFT",
            overallRating: r.overallRating ? Number(r.overallRating) : null,
            strengths: r.strengths ? String(r.strengths).trim() : null,
            improvements: r.improvements ? String(r.improvements).trim() : null,
            comments: r.comments ? String(r.comments).trim() : null,
          },
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Error importing review for employee ${r.employeeIdOrEmail}: ${err.message || "Database error"}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "review.import",
        entity: "PerformanceReview",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/performance");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importPerformanceReviews:", err);
    return {
      success: false,
      error: err.message || "Failed to import performance reviews",
    };
  }
}

export async function importGoals(
  goals: {
    employeeIdOrEmail?: string;
    employeeName?: string;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    targetDate?: string;
    progress?: number;
    status?: string;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const g of goals) {
      try {
        const empIdentifier = String(g.employeeIdOrEmail || g.employeeName || "").trim();

        if (!empIdentifier || !g.title) {
          errors.push(`Row missing required fields (Employee Name/Identifier or Title).`);
          continue;
        }

        const nameParts = empIdentifier.split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || undefined;

        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeId: { equals: empIdentifier, mode: "insensitive" } },
              { email: { equals: empIdentifier.toLowerCase(), mode: "insensitive" } },
              {
                AND: [
                  { firstName: { equals: firstName, mode: "insensitive" } },
                  lastName ? { lastName: { equals: lastName, mode: "insensitive" } } : {},
                ]
              },
            ],
            ...tenantScope(tenantId),
          },
        });

        if (!employee) {
          errors.push(`Employee not found for: ${empIdentifier}`);
          continue;
        }

        await prisma.goal.create({
          data: {
            tenantId,
            employeeId: employee.id,
            title: String(g.title).trim(),
            description: g.description ? String(g.description).trim() : null,
            category: (g.category?.trim() as any) || "PERFORMANCE",
            priority: (g.priority?.trim() as any) || "MEDIUM",
            targetDate: g.targetDate ? new Date(g.targetDate) : null,
            progress: g.progress ? Math.min(Math.max(Number(g.progress), 0), 100) : 0,
            status: (g.status?.trim() as any) || "NOT_STARTED",
            createdById: userId,
          },
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Error importing goal for employee ${g.employeeIdOrEmail}: ${err.message || "Database error"}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "goal.import",
        entity: "Goal",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/performance");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importGoals:", err);
    return {
      success: false,
      error: err.message || "Failed to import goals",
    };
  }
}

export async function importVehicles(
  vehicles: {
    registrationNo: string;
    make?: string;
    model?: string;
    year?: number;
    type?: string;
    fuelType?: string;
    assignedToIdOrEmail?: string;
    insuranceExpiry?: string;
    odometerKm?: number;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const v of vehicles) {
      try {
        if (!v.registrationNo) {
          errors.push("Row missing Registration Number.");
          continue;
        }

        let assignedToId: string | undefined = undefined;
        if (v.assignedToIdOrEmail) {
          const employee = await prisma.employee.findFirst({
            where: {
              OR: [
                { employeeId: String(v.assignedToIdOrEmail).trim() },
                { email: String(v.assignedToIdOrEmail).trim().toLowerCase() },
              ],
              ...tenantScope(tenantId),
            },
          });
          if (employee) {
            assignedToId = employee.id;
          } else {
            errors.push(`Employee not found for: ${v.assignedToIdOrEmail}`);
            continue;
          }
        }

        await prisma.vehicle.create({
          data: {
            tenantId,
            registrationNo: String(v.registrationNo).trim().toUpperCase(),
            make: v.make ? String(v.make).trim() : null,
            model: v.model ? String(v.model).trim() : null,
            year: v.year ? Number(v.year) : null,
            type: v.type ? String(v.type).trim().toUpperCase() : "CAR",
            fuelType: v.fuelType ? String(v.fuelType).trim().toUpperCase() : null,
            assignedToId,
            insuranceExpiry: v.insuranceExpiry ? new Date(v.insuranceExpiry) : null,
            odometerKm: v.odometerKm ? Number(v.odometerKm) : 0,
          },
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Error importing vehicle ${v.registrationNo}: ${err.message || "Database error"}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "vehicle.import",
        entity: "Vehicle",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/fleet");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importVehicles:", err);
    return {
      success: false,
      error: err.message || "Failed to import vehicles",
    };
  }
}

export async function importFuelLogs(
  logs: {
    registrationNo: string;
    date?: string;
    litres: number;
    costPerLitre: number;
    odometerKm?: number;
    fuelStation?: string;
    notes?: string;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const l of logs) {
      try {
        if (!l.registrationNo) {
          errors.push("Row missing Registration Number.");
          continue;
        }

        const vehicle = await prisma.vehicle.findFirst({
          where: {
            registrationNo: { equals: String(l.registrationNo).trim().toUpperCase() },
            ...tenantScope(tenantId),
          },
        });

        if (!vehicle) {
          errors.push(`Vehicle not found for registration number: ${l.registrationNo}`);
          continue;
        }

        const litres = Number(l.litres) || 0;
        const costPerLitre = Number(l.costPerLitre) || 0;
        const totalCost = Math.round(litres * costPerLitre * 100) / 100;

        await prisma.fuelLog.create({
          data: {
            tenantId,
            vehicleId: vehicle.id,
            date: l.date ? new Date(l.date) : new Date(),
            litres,
            costPerLitre,
            totalCost,
            odometerKm: l.odometerKm ? Number(l.odometerKm) : undefined,
            fuelStation: l.fuelStation ? String(l.fuelStation).trim() : null,
            notes: l.notes ? String(l.notes).trim() : null,
          },
        });

        if (l.odometerKm) {
          await prisma.vehicle.updateMany({
            where: { id: vehicle.id, ...tenantScope(tenantId) },
            data: { odometerKm: Number(l.odometerKm) },
          });
        }

        successCount++;
      } catch (err: any) {
        errors.push(`Error importing fuel log for vehicle ${l.registrationNo}: ${err.message || "Database error"}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "fuelLog.import",
        entity: "FuelLog",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/fleet");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importFuelLogs:", err);
    return {
      success: false,
      error: err.message || "Failed to import fuel logs",
    };
  }
}

export async function importLeaveTypes(
  leaveTypes: {
    name: string;
    code: string;
    annualQuota?: number;
    carryForward?: boolean;
    maxCarry?: number;
    isPaid?: boolean;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const lt of leaveTypes) {
      try {
        if (!lt.name || !lt.code) {
          errors.push("Row missing Name or Code.");
          continue;
        }

        await prisma.leaveType.create({
          data: {
            tenantId,
            name: String(lt.name).trim(),
            code: String(lt.code).trim().toUpperCase(),
            annualQuota: lt.annualQuota !== undefined ? Number(lt.annualQuota) : 12,
            carryForward: lt.carryForward ?? false,
            maxCarry: lt.maxCarry !== undefined ? Number(lt.maxCarry) : 0,
            isPaid: lt.isPaid ?? true,
          },
        });
        successCount++;
      } catch (err: any) {
        let errorMsg = err.message || "Unknown database error";
        if (err.code === "P2002") {
          errorMsg = `Duplicate leave type code: ${lt.code}`;
        }
        errors.push(`Row (Name: ${lt.name || "unknown"}, Code: ${lt.code || "unknown"}): ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "leaveType.import",
        entity: "LeaveType",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/leaves");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importLeaveTypes:", err);
    return {
      success: false,
      error: err.message || "Failed to import leave types",
    };
  }
}

export async function importHolidays(
  holidays: {
    date: string;
    name: string;
    type?: string;
    isOptional?: boolean;
  }[]
) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    let successCount = 0;
    const errors: string[] = [];

    for (const h of holidays) {
      try {
        if (!h.date || !h.name) {
          errors.push("Row missing Date or Holiday Name.");
          continue;
        }

        const parsedDate = new Date(h.date);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row (Name: ${h.name}): Invalid date format: ${h.date}`);
          continue;
        }

        await prisma.holiday.create({
          data: {
            tenantId,
            name: String(h.name).trim(),
            date: parsedDate,
            type: h.type ? String(h.type).trim().toUpperCase() : "PUBLIC",
            isOptional: h.isOptional ?? false,
          },
        });
        successCount++;
      } catch (err: any) {
        let errorMsg = err.message || "Unknown database error";
        if (err.code === "P2002") {
          errorMsg = `Duplicate holiday entry for "${h.name}" on ${h.date}`;
        }
        errors.push(`Row (Name: ${h.name || "unknown"}, Date: ${h.date || "unknown"}): ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      await logAudit({
        tenantId,
        userId,
        action: "holiday.import",
        entity: "Holiday",
        entityId: "batch",
        metadata: { count: successCount },
      });
      revalidatePath("/hrm/leaves");
    }

    return {
      success: true,
      count: successCount,
      errors,
    };
  } catch (err: any) {
    console.error("Prisma error in importHolidays:", err);
    return {
      success: false,
      error: err.message || "Failed to import holidays",
    };
  }
}

