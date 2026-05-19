import crypto from "crypto";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");

function checksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set; skipping migrations.");
    return;
  }

  if (!fs.existsSync(migrationsDir)) {
    console.log("No Prisma migrations directory found; skipping migrations.");
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock(2026040308)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    const appliedRows = await client.query(`
      SELECT "migration_name", "checksum"
      FROM "_prisma_migrations"
      WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
    `);
    const applied = new Map(appliedRows.rows.map((row) => [row.migration_name, row.checksum]));

    const migrations = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    if (applied.size === 0 && migrations.length > 0) {
      const schemaProbe = await client.query(
        `SELECT 1 FROM pg_type WHERE typname = 'Plan' LIMIT 1`
      );
      if (schemaProbe.rowCount > 0) {
        console.log(
          "Detected existing schema with empty _prisma_migrations table. Baselining all migrations as applied."
        );
        for (const migrationName of migrations) {
          const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
          if (!fs.existsSync(sqlPath)) continue;
          const sql = fs.readFileSync(sqlPath, "utf8");
          const baselineChecksum = checksum(sql);
          await client.query(
            `
              INSERT INTO "_prisma_migrations"
                ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
              VALUES ($1, $2, now(), $3, now(), 1)
              ON CONFLICT DO NOTHING
            `,
            [crypto.randomUUID(), baselineChecksum, migrationName]
          );
          applied.set(migrationName, baselineChecksum);
          console.log(`  Baselined ${migrationName}`);
        }
      }
    }

    let appliedCount = 0;

    for (const migrationName of migrations) {
      const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
      if (!fs.existsSync(sqlPath)) continue;

      const sql = fs.readFileSync(sqlPath, "utf8");
      const nextChecksum = checksum(sql);
      const previousChecksum = applied.get(migrationName);

      if (previousChecksum) {
        if (previousChecksum !== nextChecksum) {
          throw new Error(`Checksum mismatch for applied migration ${migrationName}`);
        }
        continue;
      }

      console.log(`Applying migration ${migrationName}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `
            INSERT INTO "_prisma_migrations"
              ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
            VALUES ($1, $2, now(), $3, now(), 1)
          `,
          [crypto.randomUUID(), nextChecksum, migrationName]
        );
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log(
      appliedCount === 0
        ? "Database already has all migrations."
        : `Applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}.`
    );
  } finally {
    await client.query("SELECT pg_advisory_unlock(2026040308)").catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
