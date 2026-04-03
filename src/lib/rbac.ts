import { prisma } from "./db";

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
  const count = await prisma.rolePermission.count({
    where: {
      role: {
        users: {
          some: { userId },
        },
      },
      permission: {
        module: check.module,
        action: check.action,
        resource: check.resource,
      },
    },
  });

  return count > 0;
}

/**
 * Get all permissions for a user (aggregated from all their roles).
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
 * Build a permission string like "sales:read:leads" for easy comparison.
 */
export function permissionKey(p: PermissionCheck): string {
  return `${p.module}:${p.action}:${p.resource}`;
}
