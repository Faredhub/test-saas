import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Returns a Prisma query filter scoped to the given tenant.
 * Use this in every query to enforce multi-tenant isolation.
 *
 * Example:
 *   prisma.lead.findMany({ where: { ...tenantScope(tenantId), status: "NEW" } })
 */
export function tenantScope(tenantId: string) {
  return { tenantId } as const;
}
