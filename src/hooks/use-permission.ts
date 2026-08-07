"use client";

import { useCurrentUser } from "./use-current-user";

export function usePermission() {
  const { user } = useCurrentUser();

  const isSuperOrAdmin =
    user?.roles?.some(
      (r) =>
        r === "Admin" ||
        r === "Super Admin" ||
        r === "admin" ||
        r === "SuperAdmin"
    ) ?? false;

  const userPermissions = user?.permissions || [];

  /**
   * Check if the user has permission for a specific action on a resource.
   * @param action "read" | "create" | "update" | "delete" | "export"
   * @param resource e.g. "employees", "expenses", "leads", "stock"
   * @param module optional module name e.g. "hrm", "finance", "sales"
   */
  function hasPermission(
    action: string,
    resource: string,
    module?: string
  ): boolean {
    if (!user) return true; // Fallback while session loads
    if (isSuperOrAdmin) return true;
    if (userPermissions.includes("*")) return true;

    const actLower = action.toLowerCase();
    const resLower = resource.toLowerCase();
    const modLower = module?.toLowerCase();

    return userPermissions.some((perm) => {
      const p = perm.toLowerCase();
      // Match "module:action:resource" or ":action:resource" or "action:resource"
      if (modLower) {
        if (p === `${modLower}:${actLower}:${resLower}`) return true;
      }
      return (
        p.includes(`:${actLower}:${resLower}`) ||
        p.endsWith(`:${resLower}`) && p.includes(`:${actLower}:`) ||
        p.includes(`${actLower}:${resLower}`)
      );
    });
  }

  return {
    isSuperOrAdmin,
    hasPermission,
    canCreate: (resource: string, module?: string) => hasPermission("create", resource, module),
    canRead: (resource: string, module?: string) => hasPermission("read", resource, module),
    canUpdate: (resource: string, module?: string) => hasPermission("update", resource, module),
    canDelete: (resource: string, module?: string) => hasPermission("delete", resource, module),
    canExport: (resource: string, module?: string) => hasPermission("export", resource, module),
  };
}
