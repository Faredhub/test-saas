// Pure permission-matching helpers shared by server (rbac) and client (sidebar/hooks).
// A permission key is `module:action:resource`, e.g. "organization:read:departments".
// These helpers must stay free of any server-only imports (no prisma, no auth).

export interface ParsedPermission {
  module: string;
  action: string;
  resource: string;
}

/** Sentinel used to represent "all access". */
export const WILDCARD = "*";

/**
 * Parse a `module:action:resource` key into its parts.
 * Returns null for anything that is not a well-formed permission key.
 */
export function parsePermissionKey(key: string): ParsedPermission | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (trimmed === WILDCARD) {
    return { module: WILDCARD, action: WILDCARD, resource: WILDCARD };
  }
  const parts = trimmed.split(":");
  if (parts.length < 3) return null;
  const [module, action, ...rest] = parts;
  return {
    module: module.toLowerCase(),
    action: action.toLowerCase(),
    resource: rest.join(":").toLowerCase(),
  };
}

function segmentMatches(actual: string, expected: string): boolean {
  return expected === WILDCARD || actual === expected;
}

/**
 * True if `permissions` grants `action` on `resource` (optionally scoped to `module`).
 * - `module`: when omitted, a permission from any module is accepted.
 * - `action`: when omitted or "*", any action is accepted (used for "can view" checks).
 * - `resource`: the resource key to match (exact, case-insensitive).
 */
export function hasPermissionForResource(
  permissions: string[] | undefined | null,
  module: string | undefined,
  resource: string,
  action?: string
): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes(WILDCARD)) return true;

  const mod = module?.toLowerCase();
  const res = resource.toLowerCase();
  const act = action?.toLowerCase();

  return permissions.some((key) => {
    const p = parsePermissionKey(key);
    if (!p) return false;

    // Module scoping: only enforce when a module was requested.
    if (mod && p.module !== WILDCARD && p.module !== mod) return false;

    // Resource must match exactly.
    if (!segmentMatches(p.resource, res)) return false;

    // Action: omit/`*` means "any action".
    if (act && act !== WILDCARD) {
      if (p.action !== WILDCARD && p.action !== act) return false;
    }

    return true;
  });
}

/**
 * True if the user holds at least one permission belonging to `module`
 * (used for coarse module-level visibility, e.g. showing a sidebar section).
 */
export function hasModuleAccess(
  permissions: string[] | undefined | null,
  module: string
): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes(WILDCARD)) return true;

  const mod = module.toLowerCase();
  return permissions.some((key) => {
    const p = parsePermissionKey(key);
    if (!p) return false;
    return p.module === WILDCARD || p.module === mod;
  });
}
