import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function createPrismaClient() {
  const pool =
    globalForPrisma.pool ??
    new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

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
