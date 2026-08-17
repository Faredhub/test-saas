// Server-only utility module (no "use server" directive needed — exports non-async functions/types)

import { prisma } from "./db";
import { auth } from "./auth";
import { cache } from "react";
import { evaluateRoleRestrictions, type SecurityCheckResult } from "./security";

export type PermissionCheck = {
  module: string;
  action: string;
  resource: string;
};

export type PermissionResult = {
  userId: string;
  tenantId: string;
  departmentScope?: SecurityCheckResult["departmentScope"];
};

/**
 * Evaluate micro-RBAC restrictions (time, IP, geo, session, employee status, department).
 * Cached per request to avoid redundant DB calls.
 */
const getCachedSecurityEvaluation = cache(async (userId: string) => {
  return evaluateRoleRestrictions(userId);
});

/**
 * Check if a user has a specific permission via their assigned roles.
 * Also enforces micro-RBAC restrictions (time window, IP, employee status, etc).
 */
export async function hasPermission(
  userId: string,
  check: PermissionCheck
): Promise<boolean> {
  const directUserRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const directRoles = directUserRoles.map((ur) => ur.role);

  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: {
      designationRelation: {
        select: {
          roles: {
            include: { role: true },
          },
        },
      },
    },
  });
  const designationRoles = employee?.designationRelation?.roles.map((dr) => dr.role) || [];

  const allRoles = [...directRoles, ...designationRoles];
  const isSuperAdmin = allRoles.some((r) => r.name.toLowerCase().includes("super"));
  if (isSuperAdmin) return true;

  // Enforce micro-RBAC restrictions (time, IP, status, etc.)
  const security = await getCachedSecurityEvaluation(userId);
  if (!security.allowed) {
    console.warn(`[rbac] Access blocked by security restrictions for user ${userId}:`, security.reasons);
    return false;
  }

  const isAdmin = allRoles.some((r) => r.name.toLowerCase().includes("admin") || r.name.toLowerCase().includes("owner"));
  if (isAdmin) return true;

  const perms = await getCachedPermissions(userId);
  return perms.has(permissionKey(check));
}

/**
 * Require permission or throw. Use in server actions.
 * Also enforces micro-RBAC restrictions and returns department scope for data filtering.
 */
export async function requirePermission(check: PermissionCheck): Promise<PermissionResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const userId = user.id as string;
  const tenantId = user.tenantId as string;

  // Enforce micro-RBAC restrictions first (time window, IP, employee status, etc.)
  const security = await getCachedSecurityEvaluation(userId);
  if (!security.allowed) {
    const reasonList = security.reasons.join("; ");
    throw new Error(`Forbidden: access restricted (${reasonList})`);
  }

  // Super Admin bypass: check directly
  const isSuperDirect = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: { contains: "Super", mode: "insensitive" as const }, tenantId },
    },
  });
  if (isSuperDirect) return { userId, tenantId, departmentScope: undefined };

  // Admin / Owner bypass: check directly
  const isAdminDirect = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        OR: [
          { name: { contains: "Admin", mode: "insensitive" as const } },
          { name: { contains: "Owner", mode: "insensitive" as const } },
        ],
        tenantId,
      },
    },
  });
  if (isAdminDirect) return { userId, tenantId, departmentScope: undefined };

  // Super Admin via designation
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: {
      designationRelation: {
        select: {
          roles: {
            where: { role: { name: "Super Admin", tenantId } },
          },
        },
      },
    },
  });
  if ((employee?.designationRelation?.roles.length ?? 0) > 0) {
    return { userId, tenantId, departmentScope: undefined };
  }

  const allowed = await hasPermission(userId, check);
  if (!allowed) {
    throw new Error(
      `Forbidden: missing permission ${permissionKey(check)}`
    );
  }

  return { userId, tenantId, departmentScope: security.departmentScope };
}

/**
 * Get all permissions for a user (aggregated from all their roles: direct + designation-based).
 * Cached per request to avoid repeated DB calls.
 */
export const getCachedPermissions = cache(async (userId: string) => {
  // Check if user has explicit custom permissions via User-{userId} role
  const customRole = await prisma.role.findFirst({
    where: { name: `User-${userId}` },
    include: {
      permissions: { include: { permission: true } },
    },
  });

  if (customRole) {
    const userRoleLink = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: customRole.id } },
    });
    if (userRoleLink && customRole.permissions.length > 0) {
      return new Set(customRole.permissions.map((rp) => permissionKey(rp.permission)));
    }
  }

  // Fetch direct role permissions (excluding User- custom roles)
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

  // Fetch designation role permissions
  const employee = await prisma.employee.findUnique({
    where: { userId },
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
    dr.role.permissions.forEach((p) => {
      designationRolePermissions.push(p);
    });
  });

  const allRolePermissions = [...directRolePermissions, ...designationRolePermissions];
  const set = new Set(allRolePermissions.map((rp) => permissionKey(rp.permission)));
  return set;
});

/**
 * Get all permissions for a user as objects.
 */
export async function getUserPermissions(userId: string) {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role: {
        users: {
          some: { userId },
        },
      },
    },
    include: {
      permission: true,
    },
  });

  return rolePermissions.map((rp) => rp.permission);
}

/**
 * Get user roles with permissions for the settings UI.
 */
export async function getUserRoles(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });
  return userRoles.map((ur) => ur.role);
}

/**
 * Build a permission string like "sales:read:leads" for easy comparison.
 */
export function permissionKey(p: PermissionCheck): string {
  return `${p.module}:${p.action}:${p.resource}`;
}
