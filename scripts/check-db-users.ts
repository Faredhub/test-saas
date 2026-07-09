import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      createdAt: true,
      action: true,
      userId: true,
      metadata: true,
      ipAddress: true,
    }
  });

  console.log("RECENT AUDIT LOGS:");
  console.log(JSON.stringify(logs, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
