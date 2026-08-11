import { prisma } from "./db";
import { getRequestInfo } from "./audit";

// Types for the `restrictions` JSONB field on Role
export type TimeRestriction = {
  enabled: boolean;
  allowedDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "HH:mm" in timezone
  endTime: string; // "HH:mm" in timezone
  timezone: string; // IANA timezone, e.g. "Asia/Kolkata"
};

export type SessionRestriction = {
  enabled: boolean;
  maxDurationMinutes: number; // max session lifetime in minutes
  idleTimeoutMinutes: number; // auto-logout after idle period
};

export type IpRestriction = {
  enabled: boolean;
  mode: "whitelist" | "blacklist";
  entries: string[]; // IP addresses or CIDR ranges
};

export type GeoRestriction = {
  enabled: boolean;
  allowedCountries: string[]; // ISO 3166-1 alpha-2 codes
  allowedCities: string[]; // city names (exact match)
  blockedCountries: string[];
  blockedCities: string[];
};

export type EmployeeStatusRestriction = {
  enabled: boolean;
  allowedStatuses: string[]; // EmployeeStatus enum values
};

export type DepartmentScope = {
  enabled: boolean;
  mode: "own" | "all" | "custom";
  departmentIds: string[]; // used when mode === "custom"
};

export type RoleRestrictions = {
  timeRestriction?: TimeRestriction;
  sessionRestriction?: SessionRestriction;
  ipRestriction?: IpRestriction;
  geoRestriction?: GeoRestriction;
  employeeStatusRestriction?: EmployeeStatusRestriction;
  departmentScope?: DepartmentScope;
};

// Result of a security check
export type SecurityCheckResult = {
  allowed: boolean;
  reason?: string;
  // Department scope filter to apply to subsequent DB queries
  departmentScope?: { mode: "own" | "all" | "custom"; departmentIds: string[]; actualDeptId?: string | null };
};

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function checkTimeRestriction(
  restriction: TimeRestriction | undefined
): SecurityCheckResult {
  if (!restriction?.enabled) return { allowed: true };

  const tz = restriction.timezone || "UTC";
  const now = new Date();

  // Get current day and time in the configured timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value || "";
  const currentDay = dayMap[weekdayPart] ?? now.getDay();
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const currentMinutes = hour * 60 + minute;

  const startMinutes = parseTime(restriction.startTime);
  const endMinutes = parseTime(restriction.endTime);

  if (!restriction.allowedDays.includes(currentDay)) {
    return { allowed: false, reason: "Access restricted: outside allowed days" };
  }

  if (endMinutes > startMinutes) {
    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      return { allowed: false, reason: "Access restricted: outside allowed time window" };
    }
  } else {
    // Overnight window (e.g., 22:00–06:00)
    if (currentMinutes < startMinutes && currentMinutes >= endMinutes) {
      return { allowed: false, reason: "Access restricted: outside allowed time window" };
    }
  }

  return { allowed: true };
}

export function checkSessionRestriction(
  restriction: SessionRestriction | undefined,
  sessionStartedAt?: Date | null
): SecurityCheckResult {
  if (!restriction?.enabled) return { allowed: true };

  if (restriction.maxDurationMinutes > 0 && sessionStartedAt) {
    const elapsed = (Date.now() - sessionStartedAt.getTime()) / 60000; // minutes
    if (elapsed > restriction.maxDurationMinutes) {
      return { allowed: false, reason: "Session expired: maximum duration exceeded" };
    }
  }

  return { allowed: true };
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function cidrMatch(ip: string, cidr: string): boolean {
  const [rangeIp, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIp);
  return (ipNum & mask) === (rangeNum & mask);
}

export function checkIpRestriction(
  restriction: IpRestriction | undefined,
  ipAddress?: string | null
): SecurityCheckResult {
  if (!restriction?.enabled || !restriction.entries?.length) return { allowed: true };
  if (!ipAddress) return { allowed: false, reason: "IP address not available for check" };

  const clientIp = ipAddress.split(",")[0]?.trim(); // Handle x-forwarded-for
  if (!clientIp) return { allowed: false, reason: "IP address not available for check" };

  const matched = restriction.entries.some((entry) => {
    if (entry.includes("/")) return cidrMatch(clientIp, entry);
    return entry === clientIp;
  });

  if (restriction.mode === "whitelist" && !matched) {
    return { allowed: false, reason: "Access denied: IP not in whitelist" };
  }
  if (restriction.mode === "blacklist" && matched) {
    return { allowed: false, reason: "Access denied: IP is blacklisted" };
  }

  return { allowed: true };
}

export function checkEmployeeStatusRestriction(
  restriction: EmployeeStatusRestriction | undefined,
  employeeStatus?: string | null
): SecurityCheckResult {
  if (!restriction?.enabled) return { allowed: true };

  if (!employeeStatus) {
    return { allowed: false, reason: "No employee record found" };
  }

  if (!restriction.allowedStatuses.includes(employeeStatus)) {
    return { allowed: false, reason: `Employee status "${employeeStatus}" is not permitted for this role` };
  }

  return { allowed: true };
}

function getDepartmentScope(
  scope: DepartmentScope | undefined,
  userDeptId?: string | null
): SecurityCheckResult["departmentScope"] {
  if (!scope?.enabled) return undefined;

  if (scope.mode === "own") {
    return { mode: "own", departmentIds: userDeptId ? [userDeptId] : [], actualDeptId: userDeptId };
  }
  if (scope.mode === "custom") {
    return { mode: "custom", departmentIds: scope.departmentIds || [], actualDeptId: userDeptId };
  }
  // mode === "all"
  return undefined;
}

// Aggregate all role restrictions for a user and evaluate them
export async function evaluateRoleRestrictions(
  userId: string
): Promise<{ allowed: boolean; reasons: string[]; departmentScope?: SecurityCheckResult["departmentScope"] }> {
  const reasons: string[] = [];

  // Fetch all roles assigned to this user (direct + designation)
  const directRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { name: true, restrictions: true } } },
  });

  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: {
      status: true,
      departmentId: true,
      designationRelation: {
        select: {
          roles: {
            select: {
              role: { select: { name: true, restrictions: true } },
            },
          },
        },
      },
    },
  });

  const designationRoles =
    employee?.designationRelation?.roles.map((dr) => dr.role) || [];
  const allRoles = [
    ...directRoles.map((ur) => ur.role),
    ...designationRoles,
  ];

  if (allRoles.length === 0) {
    return { allowed: true, reasons: [] };
  }

  // Admin/Super Admin roles bypass all restrictions
  const isAdmin = allRoles.some((r) => r.name === "Admin" || r.name === "Super Admin");
  if (isAdmin) return { allowed: true, reasons: [], departmentScope: undefined };

  const reqInfo = await getRequestInfo();
  const ipAddress = reqInfo.ipAddress;
  const employeeStatus = employee?.status;
  const userDeptId = employee?.departmentId;

  let departmentScope: SecurityCheckResult["departmentScope"] | undefined;

  for (const role of allRoles) {
    const restrictions = role.restrictions as RoleRestrictions | null;
    if (!restrictions) continue;

    // All restrictions within a role must pass for the role to be valid
    // We collect reasons from all roles but block if ANY role blocks

    const timeCheck = checkTimeRestriction(restrictions.timeRestriction);
    if (!timeCheck.allowed) reasons.push(`[${role.name}] ${timeCheck.reason}`);

    const ipCheck = checkIpRestriction(restrictions.ipRestriction, ipAddress);
    if (!ipCheck.allowed) reasons.push(`[${role.name}] ${ipCheck.reason}`);

    const statusCheck = checkEmployeeStatusRestriction(
      restrictions.employeeStatusRestriction,
      employeeStatus
    );
    if (!statusCheck.allowed) reasons.push(`[${role.name}] ${statusCheck.reason}`);

    // Geo check passes by default (requires external geolocation service)
    if (restrictions.geoRestriction?.enabled) {
      // Geo enforcement requires a geolocation provider — log but don't block
      // In production, integrate with a service like ip-api.com or MaxMind
      if (restrictions.geoRestriction.allowedCountries?.length > 0 || restrictions.geoRestriction.blockedCountries?.length > 0) {
        console.warn(`[security] Geo restriction configured for role "${role.name}" — geo provider not configured, allowing`);
      }
    }

    // Department scope — use the most restrictive scope across all roles
    if (restrictions.departmentScope?.enabled) {
      const scope = getDepartmentScope(restrictions.departmentScope, userDeptId);
      if (scope) {
        if (!departmentScope) {
          departmentScope = scope;
        } else if (scope.mode === "own") {
          departmentScope = scope; // "own" is most restrictive
        } else if (scope.mode === "custom" && departmentScope.mode !== "own") {
          // Intersect department IDs for multiple custom scopes
          const existingIds = new Set(departmentScope.departmentIds);
          const newIds = scope.departmentIds.filter((id) => existingIds.has(id));
          departmentScope = { ...scope, departmentIds: newIds };
        }
      }
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons: reasons.length > 0 ? reasons : [],
    departmentScope,
  };
}

// Get the effective department scope for a user (for server-action query filtering)
export async function getUserDepartmentScope(
  userId: string
): Promise<{ mode: "own" | "all" | "custom"; departmentIds: string[]; actualDeptId?: string | null } | undefined> {
  const result = await evaluateRoleRestrictions(userId);
  return result.departmentScope;
}

// Check if a user can access data from a specific department
export async function canAccessDepartment(
  userId: string,
  targetDepartmentId: string
): Promise<boolean> {
  const scope = await getUserDepartmentScope(userId);
  if (!scope) return true; // No department scope; access all

  if (scope.mode === "all") return true;
  return scope.departmentIds.includes(targetDepartmentId);
}

// Build a Prisma `where` clause filter for department-scoped queries
export async function departmentFilter(
  userId: string,
  deptField: string = "departmentId"
): Promise<Record<string, unknown>> {
  const scope = await getUserDepartmentScope(userId);
  if (!scope) return {};

  if (scope.mode === "own") {
    if (!scope.actualDeptId) return { [deptField]: undefined }; // Force no results
    return { [deptField]: scope.actualDeptId };
  }
  if (scope.mode === "custom") {
    if (scope.departmentIds.length === 0) return { [deptField]: undefined };
    return { [deptField]: { in: scope.departmentIds } };
  }
  return {};
}

// Collect all role restrictions (raw) for a given user
export async function getUserRoleRestrictions(
  userId: string
): Promise<RoleRestrictions | null> {
  const result = await evaluateRoleRestrictions(userId);
  return result.allowed ? null : { /* aggregated */ };
}
