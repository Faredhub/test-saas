// Server-only utility module (no "use server" directive needed — exports non-async functions/types)

import { prisma } from "./db";
import { auth } from "./auth";
import { cache } from "react";

export type PermissionCheck = {
  module: string;
  action: string;
  resource: string;
};

/**
 * Check if a user has a specific permission via their assigned roles.
 */
export async function hasPermission(
  userId: string,
  check: PermissionCheck
): Promise<boolean> {
  // Admin and Super Admin bypass: grant all permissions (direct + designation roles)
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
  const isAdminOrSuper = allRoles.some(
    (r) => r.name === "Admin" || r.name === "Super Admin"
  );
  if (isAdminOrSuper) return true;

  const perms = await getCachedPermissions(userId);
  return perms.has(permissionKey(check));
}

/**
 * Require permission or throw. Use in server actions.
 */
export async function requirePermission(check: PermissionCheck): Promise<{
  userId: string;
  tenantId: string;
}> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const userId = user.id as string;
  const tenantId = user.tenantId as string;

  // Admin / Super Admin bypass: if user has the "Admin" or "Super Admin" role directly
  const isAdminOrSuperDirect = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: { in: ["Admin", "Super Admin"] },
        tenantId,
      },
    },
  });
  if (isAdminOrSuperDirect) return { userId, tenantId };

  // Admin / Super Admin bypass: check if user has Admin or Super Admin role via their Designation
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: {
      designationRelation: {
        select: {
          roles: {
            where: {
              role: {
                name: { in: ["Admin", "Super Admin"] },
                tenantId,
              },
            },
          },
        },
      },
    },
  });
  const hasDesignationAdminOrSuper = (employee?.designationRelation?.roles.length ?? 0) > 0;
  if (hasDesignationAdminOrSuper) return { userId, tenantId };

  const allowed = await hasPermission(userId, check);
  if (!allowed) {
    throw new Error(
      `Forbidden: missing permission ${permissionKey(check)}`
    );
  }
  return { userId, tenantId };
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
