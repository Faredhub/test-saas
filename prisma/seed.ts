import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;
type IndustryTemplateSeed = {
  industry: string;
  subCategory: string;
  displayName: string;
  icon?: string;
  departments?: JsonValue;
  expenseCategories?: JsonValue;
  leaveTypes?: JsonValue;
  taxConfig?: JsonValue;
  modules?: string[];
  terminology?: JsonValue;
  sortOrder?: number;
};

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
      domain: "knnect360.com",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      maxUsers: 50,
      email: "admin@knnect360.com",
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
          website: true,
          reports: true,
          office: true,
        },
      },
    },
  });

  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // Create superadmin users
  const passwordHash = await bcrypt.hash("Admin@123", 12);

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

  const usersToCreate = [
    {
      email: "admin@knnect360.com",
      name: "System Admin",
      firstName: "System",
      lastName: "Admin",
    },
    {
      email: "kamkhya@knnect360.com",
      name: "Kamkhya Admin",
      firstName: "Kamkhya",
      lastName: "Admin",
    },
    {
      email: "subham@gmail.com",
      name: "Subham Admin",
      firstName: "Subham",
      lastName: "Admin",
    },
    {
      email: "admin@subhadraconsultant.com",
      name: "Subhadra Admin",
      firstName: "Subhadra",
      lastName: "Admin",
    }
  ];

  for (const u of usersToCreate) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: u.email,
        },
      },
      update: {
        passwordHash,
        status: "ACTIVE",
      },
      create: {
        tenantId: tenant.id,
        email: u.email,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash,
        status: "ACTIVE",
        theme: "SYSTEM",
        locale: "en",
        timezone: "Asia/Kolkata",
        emailVerified: new Date(),
      },
    });

    console.log(`✅ User created: ${user.email} (${user.id})`);

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

    console.log(`✅ Role assigned to user: ${user.email}`);
  }

  // Seed permissions for all modules
  const modules = [
    { module: "dashboard", resources: ["analytics"] },
    { module: "organization", resources: ["departments", "branches", "announcements", "calendar", "notes", "contracts", "signatures", "documents", "forms", "reports", "workflows"] },
    { module: "sales", resources: ["leads", "contacts", "deals", "quotations", "invoices", "payments", "orders", "visits", "pos", "subscriptions"] },
    { module: "finance", resources: ["accounts", "journal", "expenses", "payroll", "bills", "documents", "credit-notes", "reports"] },
    { module: "hrm", resources: ["employees", "recruitment", "leaves", "attendance", "fleet", "performance", "goals", "scheduling"] },
    { module: "projects", resources: ["projects", "tasks", "milestones", "timesheets", "tickets", "files", "templates"] },
    { module: "inventory", resources: ["products", "stock", "warehouses", "manufacturing", "assets", "quality"] },
    { module: "marketing", resources: ["campaigns", "events", "surveys"] },
    { module: "website", resources: ["pages", "templates", "blog", "forum", "faq", "chat"] },
    { module: "reports", resources: ["templates", "generated"] },
    { module: "office", resources: ["documents", "spreadsheets", "presentations", "email", "messaging"] },
    { module: "settings", resources: ["users", "roles", "tenant"] },
  ];

  const actions = ["create", "read", "update", "delete", "export"];
  const permissionIds: string[] = [];

  for (const mod of modules) {
    for (const resource of mod.resources) {
      for (const action of actions) {
        const perm = await prisma.permission.upsert({
          where: {
            module_action_resource: {
              module: mod.module,
              action,
              resource,
            },
          },
          update: {},
          create: {
            module: mod.module,
            action,
            resource,
            description: `${action} ${mod.module}/${resource}`,
          },
        });
        permissionIds.push(perm.id);
      }
    }
  }
  console.log(`✅ ${permissionIds.length} permissions seeded`);

  // Assign ALL permissions to Super Admin role
  for (const permId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permId,
      },
    });
  }
  console.log(`✅ All permissions assigned to Super Admin`);

  // Create default roles: Manager, Employee, Viewer
  const managerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Manager" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Manager",
      description: "Department manager with create/read/update access",
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Employee" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Employee",
      description: "Standard employee with read access and self-service",
      isSystem: true,
      isDefault: true,
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Viewer" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Viewer",
      description: "Read-only access to assigned modules",
      isSystem: true,
    },
  });

  // Assign read permissions to all default roles, create/update to Manager
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    if (perm.action === "read") {
      for (const r of [managerRole, employeeRole, viewerRole]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: r.id, permissionId: perm.id } },
          update: {},
          create: { roleId: r.id, permissionId: perm.id },
        });
      }
    }
    if (perm.action === "create" || perm.action === "update") {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      });
    }
  }
  console.log(`✅ Default roles created: Manager, Employee, Viewer`);

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

  // Seed Industry Templates (loaded from canonical JSON catalog)
  try {
    const templatesJsonPath = path.join(process.cwd(), "prisma", "industry-templates.json");
    const industryTemplates: IndustryTemplateSeed[] = fs.existsSync(templatesJsonPath)
      ? (JSON.parse(fs.readFileSync(templatesJsonPath, "utf8")) as IndustryTemplateSeed[])
      : [];

    for (const tmpl of industryTemplates) {
      await prisma.industryTemplate.upsert({
        where: {
          industry_subCategory: {
            industry: tmpl.industry,
            subCategory: tmpl.subCategory,
          },
        },
        update: {
          displayName: tmpl.displayName,
          icon: tmpl.icon,
          departments: tmpl.departments,
          expenseCategories: tmpl.expenseCategories,
          leaveTypes: tmpl.leaveTypes,
          taxConfig: tmpl.taxConfig,
          modules: tmpl.modules,
          terminology: tmpl.terminology,
          sortOrder: tmpl.sortOrder,
        },
        create: {
          industry: tmpl.industry,
          subCategory: tmpl.subCategory,
          displayName: tmpl.displayName,
          icon: tmpl.icon,
          departments: tmpl.departments,
          expenseCategories: tmpl.expenseCategories,
          leaveTypes: tmpl.leaveTypes,
          taxConfig: tmpl.taxConfig,
          modules: tmpl.modules,
          terminology: tmpl.terminology,
          sortOrder: tmpl.sortOrder,
        },
      });
    }
    console.log(`✅ ${industryTemplates.length} industry templates seeded`);
  } catch (e) {
    console.warn("⚠️ Industry template seeding skipped (table may not exist yet):", (e as Error).message);
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log(`\n📧 Login options:`);
  console.log(`   - kamkhya@knnect360.com`);
  console.log(`   - subham@gmail.com`);
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
