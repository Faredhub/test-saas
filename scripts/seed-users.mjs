import crypto from "crypto";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

export async function seedUsersAndRoles(clientInstance) {
  const isExternalClient = !!clientInstance;
  const client = clientInstance || new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  if (!isExternalClient) {
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL is not set in environment or .env file.");
      process.exit(1);
    }
    await client.connect();
  }

  try {
    console.log("🌱 Seeding tenant, roles, and admin users...");

    // 1. Create Tenant
    const tenantRes = await client.query(`
      INSERT INTO "tenants" (
        "id", "name", "slug", "domain", "plan", "status", "maxUsers",
        "email", "phone", "city", "state", "country", "pincode",
        "settings", "storageUsedBytes", "storageLimitBytes",
        "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, 'ENTERPRISE', 'ACTIVE', 50,
        $5, $6, $7, $8, $9, $10,
        $11::jsonb, 0, 1073741824,
        now(), now()
      )
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "status" = 'ACTIVE',
        "updatedAt" = now()
      RETURNING "id", "name"
    `, [
      "tenant_tixeltech_main",
      "TixelTech Private Limited",
      "tixeltech",
      "knnect360.com",
      "admin@knnect360.com",
      "+91-9876543210",
      "Bhubaneswar",
      "Odisha",
      "India",
      "751018",
      JSON.stringify({
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        fiscalYearStartMonth: 4,
        modules: {
          auth: true, home: true, dashboard: true, organization: true,
          sales: true, finance: true, hrm: true, inventory: true,
          projects: true, marketing: true, website: true, reports: true,
          office: true
        }
      })
    ]);

    const tenantId = tenantRes.rows[0].id;
    console.log(`✅ Tenant verified: ${tenantRes.rows[0].name} (${tenantId})`);

    // 2. Create Roles
    const superAdminRoleRes = await client.query(`
      INSERT INTO "roles" (
        "id", "tenantId", "name", "description", "isSystem", "isDefault", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, true, false, now(), now())
      ON CONFLICT ("tenantId", "name") DO UPDATE SET "isSystem" = true, "updatedAt" = now()
      RETURNING "id", "name"
    `, ["role_super_admin", tenantId, "Super Admin", "Full system access"]);
    const superAdminRoleId = superAdminRoleRes.rows[0].id;

    const adminRoleRes = await client.query(`
      INSERT INTO "roles" (
        "id", "tenantId", "name", "description", "isSystem", "isDefault", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, true, false, now(), now())
      ON CONFLICT ("tenantId", "name") DO UPDATE SET "isSystem" = true, "updatedAt" = now()
      RETURNING "id", "name"
    `, ["role_org_admin", tenantId, "Admin", "Organization Administrator"]);
    const adminRoleId = adminRoleRes.rows[0].id;

    console.log(`✅ Roles verified: Super Admin, Admin`);

    // 3. Create Admin Users
    // Pre-hashed bcrypt hashes for passwords
    const adminPasswordHash = "$2b$12$P0tVABAszMHeziym/83qmutvhtNIyjY1q/.4MvNp3o69DNU499/q."; // "Admin@123"
    const subhadraPasswordHash = "$2b$12$jQLZZfq0QHqaOh4S5wTu6uraquy6kuN81k4mQt2L.ULrLUARm55xO"; // "Subhadra@qG842fvKGwpS#26"

    const usersToCreate = [
      {
        id: "user_admin_super",
        email: "admin@knnect360.com",
        name: "System Admin",
        firstName: "System",
        lastName: "Admin",
        passwordHash: adminPasswordHash,
        roleId: superAdminRoleId
      },
      {
        id: "user_admin_subhadra",
        email: "admin@subhadraconsultant.com",
        name: "Subhadra Admin",
        firstName: "Subhadra",
        lastName: "Admin",
        passwordHash: subhadraPasswordHash,
        roleId: adminRoleId
      },
      {
        id: "user_admin_kamkhya",
        email: "kamkhya@tixelerp.com",
        name: "Kamakhya Admin",
        firstName: "Kamakhya",
        lastName: "Admin",
        passwordHash: adminPasswordHash,
        roleId: superAdminRoleId
      }
    ];

    for (const u of usersToCreate) {
      const userRes = await client.query(`
        INSERT INTO "users" (
          "id", "tenantId", "email", "name", "firstName", "lastName",
          "passwordHash", "status", "theme", "locale", "timezone",
          "emailVerified", "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 'ACTIVE', 'SYSTEM', 'en', 'Asia/Kolkata',
          now(), now(), now()
        )
        ON CONFLICT ("tenantId", "email") DO UPDATE SET
          "passwordHash" = EXCLUDED."passwordHash",
          "status" = 'ACTIVE',
          "updatedAt" = now()
        RETURNING "id", "email"
      `, [u.id, tenantId, u.email, u.name, u.firstName, u.lastName, u.passwordHash]);

      const userId = userRes.rows[0].id;

      // Assign role
      await client.query(`
        INSERT INTO "user_roles" ("userId", "roleId")
        VALUES ($1, $2)
        ON CONFLICT ("userId", "roleId") DO NOTHING
      `, [userId, u.roleId]);

      console.log(`✅ User seeded: ${u.email} (Role: ${u.roleId === superAdminRoleId ? 'Super Admin' : 'Admin'})`);
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
    throw err;
  } finally {
    if (!isExternalClient) {
      await client.end();
    }
  }
}

// Run directly if invoked as standalone script
if (process.argv[1]?.endsWith("seed-users.mjs") || process.argv[1]?.endsWith("seed-users.js")) {
  seedUsersAndRoles().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
