import { prisma } from "./db";

type AuditLogInput = {
  tenantId: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Parse a User-Agent string into a simple device type label.
 */
export function parseDeviceType(ua: string): string {
  const lower = ua.toLowerCase();
  if (/tablet|ipad/.test(lower)) return "Tablet";
  if (/mobile|android|iphone|ipod/.test(lower)) return "Mobile";
  return "Desktop";
}

/**
 * Extract IP address and User-Agent from the current Next.js request headers.
 * Safe to call inside Server Components, Server Actions, Route Handlers,
 * and NextAuth callbacks that run within a request context.
 */
export async function getRequestInfo(): Promise<{
  ipAddress: string | undefined;
  userAgent: string | undefined;
  deviceType: string | undefined;
}> {
  try {
    const { headers } = await import("next/headers");
    const hdrs = await headers();
    const ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      undefined;
    const userAgent = hdrs.get("user-agent") || undefined;
    const deviceType = userAgent ? parseDeviceType(userAgent) : undefined;
    return { ipAddress, userAgent, deviceType };
  } catch {
    // headers() throws if called outside a request context
    return { ipAddress: undefined, userAgent: undefined, deviceType: undefined };
  }
}

/**
 * Write an audit log entry. Fire-and-forget — does not throw on failure.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch {
    console.error("[audit] Failed to write audit log:", input.action);
  }
}
