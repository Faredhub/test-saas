import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "tixeltech" },
    update: {},
    create: {
      name: "TixelTech Private Limited",
      slug: "tixeltech",
      domain: "tixelerp.com",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      maxUsers: 50,
      email: "admin@tixelerp.com",
      phone: "+91-9876543210",
      city: "Bhubaneswar",
      state: "Odisha",
      country: "India",
      pincode: "751018",
      settings: {
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        fiscalYearStartMonth: 4,
        modules: {
          auth: true,
          home: true,
          dashboard: true,
          organization: true,
          sales: true,
          finance: true,
          hrm: true,
          inventory: true,
          projects: true,
          marketing: true,
        },
      },
    },
  });

  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // Create superadmin user
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "kamkhya@tixelerp.com",
      },
    },
    update: {
      passwordHash,
      status: "ACTIVE",
    },
    create: {
      tenantId: tenant.id,
      email: "kamkhya@tixelerp.com",
      name: "Kamkhya Admin",
      firstName: "Kamkhya",
      lastName: "Admin",
      passwordHash,
      status: "ACTIVE",
      theme: "SYSTEM",
      locale: "en",
      timezone: "Asia/Kolkata",
      emailVerified: new Date(),
    },
  });

  console.log(`✅ User created: ${user.email} (${user.id})`);

  // Create superadmin role
  const role = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "Super Admin",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Super Admin",
      description: "Full system access",
      isSystem: true,
      isDefault: false,
    },
  });

  console.log(`✅ Role created: ${role.name} (${role.id})`);

  // Assign role to user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log(`✅ Role assigned to user`);

  // Create default departments
  const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"];
  for (const dept of departments) {
    await prisma.department.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: dept,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: dept,
      },
    });
  }
  console.log(`✅ ${departments.length} departments created`);

  // Create default leave types
  const leaveTypes = [
    { name: "Casual Leave", code: "CL", annualQuota: 12, isPaid: true, carryForward: false },
    { name: "Sick Leave", code: "SL", annualQuota: 12, isPaid: true, carryForward: false },
    { name: "Earned Leave", code: "EL", annualQuota: 15, isPaid: true, carryForward: true, maxCarry: 30 },
    { name: "Loss of Pay", code: "LOP", annualQuota: 0, isPaid: false, carryForward: false },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: lt.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...lt,
      },
    });
  }
  console.log(`✅ ${leaveTypes.length} leave types created`);

  // Create default Chart of Accounts
  const accounts = [
    { code: "1000", name: "Cash", type: "ASSET" as const },
    { code: "1100", name: "Bank Account", type: "ASSET" as const },
    { code: "1200", name: "Accounts Receivable", type: "ASSET" as const },
    { code: "1300", name: "Inventory", type: "ASSET" as const },
    { code: "1400", name: "Fixed Assets", type: "ASSET" as const },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
    { code: "2100", name: "Salary Payable", type: "LIABILITY" as const },
    { code: "2200", name: "TDS Payable", type: "LIABILITY" as const },
    { code: "2300", name: "GST Payable", type: "LIABILITY" as const },
    { code: "2400", name: "PF Payable", type: "LIABILITY" as const },
    { code: "2500", name: "ESI Payable", type: "LIABILITY" as const },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" as const },
    { code: "3100", name: "Retained Earnings", type: "EQUITY" as const },
    { code: "4000", name: "Sales Revenue", type: "REVENUE" as const },
    { code: "4100", name: "Service Revenue", type: "REVENUE" as const },
    { code: "4200", name: "Other Income", type: "REVENUE" as const },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
    { code: "5100", name: "Salaries & Wages", type: "EXPENSE" as const },
    { code: "5200", name: "Rent Expense", type: "EXPENSE" as const },
    { code: "5300", name: "Utilities Expense", type: "EXPENSE" as const },
    { code: "5400", name: "Office Supplies", type: "EXPENSE" as const },
    { code: "5500", name: "Travel Expense", type: "EXPENSE" as const },
    { code: "5600", name: "Marketing Expense", type: "EXPENSE" as const },
    { code: "5700", name: "Depreciation", type: "EXPENSE" as const },
  ];
  for (const acc of accounts) {
    await prisma.gLAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: acc.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...acc,
      },
    });
  }
  console.log(`✅ ${accounts.length} GL accounts created`);

  // Create default expense categories
  const expenseCategories = [
    "Travel", "Office Supplies", "Meals & Entertainment",
    "Software & Subscriptions", "Equipment", "Training",
    "Telecommunication", "Fuel", "Miscellaneous",
  ];
  for (const cat of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: cat,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: cat,
      },
    });
  }
  console.log(`✅ ${expenseCategories.length} expense categories created`);

  // Create default warehouse
  await prisma.warehouse.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "MAIN",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Main Warehouse",
      code: "MAIN",
      address: "Plot 4387, Tankapani Road",
      city: "Bhubaneswar",
      state: "Odisha",
    },
  });
  console.log(`✅ Default warehouse created`);

  console.log("\n🎉 Seed completed successfully!");
  console.log(`\n📧 Login: kamkhya@tixelerp.com`);
  console.log(`🔑 Password: Admin@123`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
