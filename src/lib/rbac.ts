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

  // Super Admin bypass: if user has the "Super Admin" role, allow everything
  const isSuperAdmin = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: "Super Admin", tenantId },
    },
  });
  if (isSuperAdmin) return { userId, tenantId };

  const allowed = await hasPermission(userId, check);
  if (!allowed) {
    throw new Error(
      `Forbidden: missing permission ${permissionKey(check)}`
    );
  }
  return { userId, tenantId };
}

/**
 * Get all permissions for a user (aggregated from all their roles).
 * Cached per request to avoid repeated DB calls.
 */
export const getCachedPermissions = cache(async (userId: string) => {
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

  const set = new Set(rolePermissions.map((rp) => permissionKey(rp.permission)));
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
