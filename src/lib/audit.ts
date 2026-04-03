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
