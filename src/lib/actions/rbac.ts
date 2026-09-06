"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// ROLES
// ============================================================================

export async function getRoles() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.role.findMany({
    where: {
      ...tenantScope(tenantId),
      NOT: {
        name: { startsWith: "User-" }
      }
    },
    include: {
      _count: { select: { users: true, permissions: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createRole(data: { name: string; description?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Check for duplicate role name within the same tenant
  const existing = await prisma.role.findFirst({
    where: { tenantId, name: { equals: data.name.trim(), mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`A role with the name "${data.name.trim()}" already exists. Please use a different name.`);
  }

  const role = await prisma.role.create({
    data: { tenantId, name: data.name.trim(), description: data.description },
  });
  await logAudit({ userId, tenantId, action: "role.create", entity: "Role", entityId: role.id, metadata: { role } });
  revalidatePath("/settings/roles");
  return role;
}

export async function updateRole(id: string, data: { name?: string; description?: string; restrictions?: any }) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.role.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Role not found");

  // If name is being changed, check for duplicates (exclude current role)
  if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.role.findFirst({
      where: {
        tenantId,
        name: { equals: data.name.trim(), mode: "insensitive" },
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new Error(`A role with the name "${data.name.trim()}" already exists. Please use a different credentials.`);
    }
  }

  const role = await prisma.role.update({ where: { id }, data: { ...data, name: data.name?.trim() } });
  await logAudit({ userId, tenantId, action: "role.update", entity: "Role", entityId: id, metadata: { existing, role } });
  revalidatePath("/settings/roles");
  return role;
}

export async function deleteRole(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.role.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!existing) throw new Error("Role not found");
  await prisma.role.delete({ where: { id } });
  await logAudit({ userId, tenantId, action: "role.delete", entity: "Role", entityId: id, metadata: { existing } });
  revalidatePath("/settings/roles");
}

// Track whether permissions have been seeded this process lifetime
const globalForPerms = globalThis as unknown as { __permissionsSeeded?: boolean };

export async function getAllPermissions() {
  // Only seed permissions once per server process — not on every page load
  if (!globalForPerms.__permissionsSeeded) {
    const systemModules = [
      { module: "dashboard", resources: ["analytics"] },
      {
        module: "finance",
        resources: [
          "accounts", "journal", "expenses", "payroll", "bills",
          "credit-notes", "payments", "reports", "documents", "currency",
        ],
      },
      {
        module: "sales",
        resources: [
          "leads", "contacts", "tenders", "cv-bank", "deals", "quotations",
          "orders", "reporting", "pricelists", "teams", "invoices",
          "subscriptions", "visits", "kiosk", "waiter-calls", "table-manager",
          "token-points", "captain", "pos-integrations", "simulation",
        ],
      },
      {
        module: "inventory",
        resources: [
          "products", "variants", "lots", "stock", "warehouses",
          "deliveries", "manufacturing", "assets", "vendors",
        ],
      },
      {
        module: "hrm",
        resources: [
          "employees", "recruitment", "leaves", "attendance",
          "performance", "scheduling", "trips", "fleet",
        ],
      },
      {
        module: "projects",
        resources: ["projects", "templates", "timesheets", "tickets", "field-visits"],
      },
      {
        module: "marketing",
        resources: [
          "campaigns", "email-builder", "social", "events", "surveys", "sms", "whatsapp",
        ],
      },
      {
        module: "website",
        resources: [
          "pages", "store", "blog", "forum", "faq", "chat", "ecommerce", "themes", "domains",
        ],
      },
      {
        module: "organization",
        resources: [
          "business-portal", "departments", "branches", "contracts", "signatures",
          "library", "notices", "calendar", "notes", "approvals", "reports", "forms", "database",
        ],
      },
      {
        module: "office",
        resources: ["documents", "spreadsheets", "presentations", "email", "messaging", "calls"],
      },
      {
        module: "civil",
        resources: ["geotechnical", "survey", "design", "estimation"],
      },
      {
        module: "settings",
        resources: ["users", "roles", "tenant"],
      },
    ];

    const actions = ["create", "read", "update", "delete", "export"];

    try {
      // Build all permission data upfront
      const permData = systemModules.flatMap((mod) =>
        mod.resources.flatMap((resource) =>
          actions.map((action) => ({
            module: mod.module,
            action,
            resource,
            description: `${action} ${mod.module}/${resource}`,
          }))
        )
      );

      // Use createMany with skipDuplicates — single DB round-trip instead of ~480
      await prisma.permission.createMany({
        data: permData,
        skipDuplicates: true,
      });
    } catch (err) {
      console.error("Error ensuring permissions in getAllPermissions:", err);
    }

    globalForPerms.__permissionsSeeded = true;
  }

  return prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }],
  });
}

export async function getRolePermissions(roleId: string) {
  const perms = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return perms.map((rp) => rp.permission);
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const { userId, tenantId } = await getSessionOrThrow();
  const role = await prisma.role.findFirst({ where: { id: roleId, ...tenantScope(tenantId) } });
  if (!role) throw new Error("Role not found");

  // Delete existing and re-create
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }
  await logAudit({ userId, tenantId, action: "role.permissions.update", entity: "Role", entityId: roleId, metadata: { permissionIds } });
  revalidatePath("/settings/roles");
  revalidatePath("/", "layout");
}

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

export async function getUsersWithRoles() {
  const { tenantId } = await getSessionOrThrow();
  const users = await prisma.user.findMany({
    where: tenantScope(tenantId),
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      status: true,
      roleAssignments: {
        include: { role: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch employees to get their designations and link them
  const employees = await prisma.employee.findMany({
    where: tenantScope(tenantId),
    select: {
      id: true,
      userId: true,
      email: true,
      designation: true,
      designationId: true,
      departmentId: true,
    },
  });

  const employeeUserIdMap = new Map(employees.filter(emp => emp.userId).map(emp => [emp.userId, emp]));
  const employeeEmailMap = new Map(employees.map(emp => [emp.email.toLowerCase(), emp]));

  return users.map(user => {
    const emp = employeeUserIdMap.get(user.id) || employeeEmailMap.get(user.email.toLowerCase()) || null;
    const hasCustomPermissions = user.roleAssignments.some(ra => ra.role.name.startsWith("User-"));
    const normalRoleAssignments = user.roleAssignments.filter(ra => !ra.role.name.startsWith("User-"));
    return {
      ...user,
      roleAssignments: normalRoleAssignments,
      hasCustomPermissions,
      employee: emp ? {
        id: emp.id,
        designation: emp.designation,
        designationId: emp.designationId,
        departmentId: emp.departmentId,
      } : null,
    };
  });
}

export async function assignRoleToUser(userId: string, roleId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();
  // Verify role and user belong to tenant
  const role = await prisma.role.findFirst({ where: { id: roleId, ...tenantScope(tenantId) } });
  if (!role) throw new Error("Role not found");
  const user = await prisma.user.findFirst({ where: { id: userId, ...tenantScope(tenantId) } });
  if (!user) throw new Error("User not found");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
  await logAudit({ userId: currentUserId, tenantId, action: "user.role.assign", entity: "User", entityId: userId, metadata: { roleId, roleName: role.name } });
  revalidatePath("/settings/roles");
  revalidatePath("/", "layout");
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();
  await prisma.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
  await logAudit({ userId: currentUserId, tenantId, action: "user.role.remove", entity: "User", entityId: userId, metadata: { roleId } });
  revalidatePath("/settings/roles");
  revalidatePath("/", "layout");
}

export async function createUserWithRole(data: {
  name: string;
  email: string;
  password?: string;
  roleId: string;
}) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();

  // Validate email
  const existingUser = await prisma.user.findFirst({
    where: { tenantId, email: data.email.toLowerCase() },
  });
  if (existingUser) throw new Error("A user with this email already exists in your workspace");

  if (!data.password || data.password.length < 8) {
    throw new Error("Password is required and must be at least 8 characters");
  }
  const password = data.password;
  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = await prisma.$transaction(async (tx) => {
    // Create the User record mapped to this tenant
    const user = await tx.user.create({
      data: {
        tenantId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    // Assign user role
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: data.roleId,
      },
    });

    // Also link/create employee profile if needed
    const count = await tx.employee.count({ where: { tenantId } });
    const employeeId = `EMP-${String(count + 1).padStart(3, "0")}`;

    // Split name into first and last
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Employee";
    const lastName = nameParts.slice(1).join(" ") || "";

    await tx.employee.create({
      data: {
        tenantId,
        userId: user.id,
        employeeId,
        firstName,
        lastName: lastName || null,
        email: data.email.toLowerCase(),
        dateOfJoining: new Date(),
      },
    });

    return user;
  });

  await logAudit({
    userId: currentUserId,
    tenantId,
    action: "user.create_with_role",
    entity: "User",
    entityId: newUser.id,
    metadata: { name: data.name, email: data.email, roleId: data.roleId },
  });

  revalidatePath("/settings/roles");
}

export async function getUserPermissions(userId: string) {
  const { tenantId } = await getSessionOrThrow();
  const user = await prisma.user.findFirst({ where: { id: userId, ...tenantScope(tenantId) } });
  if (!user) throw new Error("User not found");

  // Check if user has explicit custom permissions via User-{userId} role
  const customRole = await prisma.role.findFirst({
    where: { name: `User-${userId}`, ...tenantScope(tenantId) },
    include: {
      permissions: { include: { permission: true } },
    },
  });

  if (customRole) {
    const userRoleLink = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: customRole.id } },
    });
    // Full override — an empty custom role means "no access", not "fall back
    // to base roles".
    if (userRoleLink) {
      return customRole.permissions.map((rp) => rp.permission);
    }
  }

  const directRolePermissions = await prisma.rolePermission.findMany({
    where: {
      role: {
        users: {
          some: { userId },
        },
        NOT: {
          name: { startsWith: "User-" },
        },
      },
    },
    include: {
      permission: true,
    },
  });

  const employee = await prisma.employee.findFirst({
    where: {
      ...tenantScope(tenantId),
      OR: [{ userId }, { email: user.email.toLowerCase() }],
    },
    select: {
      designationRelation: {
        select: {
          roles: {
            select: {
              role: {
                select: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const designationRolePermissions: any[] = [];
  employee?.designationRelation?.roles.forEach((dr) => {
    dr.role.permissions.forEach((rp) => {
      designationRolePermissions.push(rp.permission);
    });
  });

  const allPermsMap = new Map<string, any>();
  directRolePermissions.forEach((rp) => allPermsMap.set(rp.permission.id, rp.permission));
  designationRolePermissions.forEach((p) => allPermsMap.set(p.id, p));

  return Array.from(allPermsMap.values());
}

export async function setUserPermissionsForUser(userId: string, permissionIds: string[]) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();
  const user = await prisma.user.findFirst({ where: { id: userId, ...tenantScope(tenantId) } });
  if (!user) throw new Error("User not found");

  // Find or create custom role for this user
  const roleName = `User-${userId}`;
  let customRole = await prisma.role.findFirst({
    where: { name: roleName, ...tenantScope(tenantId) },
  });

  if (!customRole) {
    customRole = await prisma.role.create({
      data: {
        tenantId,
        name: roleName,
        description: `Custom permissions for user ${user.name || user.email}`,
        isSystem: false,
      },
    });
  }

  // Ensure userRole link exists
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: customRole.id } },
    update: {},
    create: {
      userId,
      roleId: customRole.id,
    },
  });

  // Delete existing permissions for the custom role and re-create them
  await prisma.rolePermission.deleteMany({ where: { roleId: customRole.id } });
  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: customRole.id, permissionId })),
    });
  }

  await logAudit({
    userId: currentUserId,
    tenantId,
    action: "user.permissions.update",
    entity: "User",
    entityId: userId,
    metadata: { permissionIds },
  });

  revalidatePath("/settings/roles");
  revalidatePath("/", "layout");
}

export async function resetUserPermissions(userId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();
  const roleName = `User-${userId}`;
  const customRole = await prisma.role.findFirst({
    where: { name: roleName, ...tenantScope(tenantId) },
  });

  if (customRole) {
    await prisma.userRole.deleteMany({ where: { userId, roleId: customRole.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: customRole.id } });
    await prisma.role.delete({ where: { id: customRole.id } });
  }

  await logAudit({
    userId: currentUserId,
    tenantId,
    action: "user.permissions.reset",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/settings/roles");
  revalidatePath("/", "layout");
}

// ============================================================================
// DESIGNATION ROLE ASSIGNMENT
// ============================================================================

export async function getDesignationRoles(designationId: string) {
  const { tenantId } = await getSessionOrThrow();
  // Verify designation belongs to tenant
  const designation = await prisma.designation.findFirst({
    where: { id: designationId, ...tenantScope(tenantId) }
  });
  if (!designation) throw new Error("Designation not found");

  return prisma.designationRole.findMany({
    where: { designationId },
    include: { role: true },
  });
}

export async function assignRoleToDesignation(designationId: string, roleId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();

  // Verify designation and role belong to tenant
  const designation = await prisma.designation.findFirst({
    where: { id: designationId, ...tenantScope(tenantId) }
  });
  if (!designation) throw new Error("Designation not found");

  const role = await prisma.role.findFirst({
    where: { id: roleId, ...tenantScope(tenantId) }
  });
  if (!role) throw new Error("Role not found");

  const existing = await prisma.designationRole.findUnique({
    where: { designationId_roleId: { designationId, roleId } }
  });
  if (existing) return existing;

  const dr = await prisma.designationRole.create({
    data: { designationId, roleId },
  });

  await logAudit({
    userId: currentUserId,
    tenantId,
    action: "designation.role.assign",
    entity: "Designation",
    entityId: designationId,
    metadata: { roleId, roleName: role.name, designationName: designation.name },
  });

  revalidatePath("/settings/roles");
  return dr;
}

export async function removeRoleFromDesignation(designationId: string, roleId: string) {
  const { userId: currentUserId, tenantId } = await getSessionOrThrow();

  // Verify designation belongs to tenant
  const designation = await prisma.designation.findFirst({
    where: { id: designationId, ...tenantScope(tenantId) }
  });
  if (!designation) throw new Error("Designation not found");

  await prisma.designationRole.delete({
    where: { designationId_roleId: { designationId, roleId } }
  });

  await logAudit({
    userId: currentUserId,
    tenantId,
    action: "designation.role.remove",
    entity: "Designation",
    entityId: designationId,
    metadata: { roleId, designationName: designation.name },
  });

  revalidatePath("/settings/roles");
}

