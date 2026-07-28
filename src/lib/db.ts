import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Clear cached dev instance if schema reloaded
if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  // Re-instantiate in dev mode when schema/client regenerated
  delete globalForPrisma.prisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

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
