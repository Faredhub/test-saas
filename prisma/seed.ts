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
          website: true,
          reports: true,
          office: true,
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

  // Seed Industry Templates
  try {
    const industryTemplates = [
      {
        industry: "Construction & Engineering",
        subCategory: "Construction",
        displayName: "Construction (Builder/Developer)",
        icon: "Building2",
        departments: ["Project Management", "Site Engineering", "Procurement", "Estimation & Costing", "Safety & Compliance", "Quality Control", "Accounts & Finance"],
        expenseCategories: ["Raw Materials", "Labour Charges", "Equipment Rental", "Site Overheads", "Transportation", "Safety Equipment", "Permits & Licenses", "Sub-contractor Payments"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Festival Leave", "Compensatory Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "projects", "inventory", "reports"],
        terminology: {
          sales: "Tender CRM",
          leads: "Tenders",
          tenders: "Tender Register",
          deals: "Opportunities",
          contacts: "Clients / Vendors",
          cvBank: "CV Bank",
          invoices: "Running Account Bills",
          products: "Materials",
          projects: "Sites",
        },
        sortOrder: 1,
      },
      {
        industry: "Construction & Engineering",
        subCategory: "Engineering Consultant",
        displayName: "Engineering Consultant (Civil/Architect/MEP/Property Mgmt)",
        icon: "HardHat",
        departments: ["Design & Drafting", "Structural Engineering", "MEP Services", "Project Coordination", "Business Development", "Accounts"],
        expenseCategories: ["Software Licenses", "Printing & Plotting", "Site Visit Travel", "Professional Fees", "Office Rent", "Staff Welfare", "Equipment"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Study Leave", "Compensatory Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "projects", "reports"],
        terminology: {
          sales: "Tender CRM",
          leads: "Tenders",
          tenders: "Tender Register",
          deals: "Consultancy Opportunities",
          contacts: "Clients / Vendors",
          cvBank: "CV Bank",
          invoices: "Fee Notes",
          projects: "Assignments",
        },
        sortOrder: 2,
      },
      {
        industry: "Art & Culture",
        subCategory: "Crafts",
        displayName: "Crafts (Handicrafts/Handloom/Art)",
        icon: "Palette",
        departments: ["Production", "Design Studio", "Sales & Marketing", "Quality Check", "Packaging & Dispatch", "Accounts"],
        expenseCategories: ["Raw Materials", "Artisan Wages", "Dyeing & Finishing", "Packaging", "Shipping & Courier", "Exhibition Fees", "Design Tools"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Festival Leave", "Maternity Leave"],
        taxConfig: { gstRate: 5, tdsApplicable: false },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "marketing", "reports"],
        terminology: { products: "Craft Items", deals: "Bulk Orders", leads: "Buyer Enquiries" },
        sortOrder: 3,
      },
      {
        industry: "Art & Culture",
        subCategory: "Visual Art",
        displayName: "Visual Art (Gallery/Library/Museum)",
        icon: "Frame",
        departments: ["Curation", "Collections Management", "Visitor Services", "Education & Outreach", "Administration", "Marketing"],
        expenseCategories: ["Exhibition Setup", "Conservation & Restoration", "Insurance", "Catalogue Printing", "Venue Maintenance", "Event Hosting", "Artist Fees"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Study Leave"],
        taxConfig: { gstRate: 12, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "marketing", "website", "reports"],
        terminology: { products: "Artworks", inventory: "Collections", leads: "Patron Enquiries", deals: "Acquisitions" },
        sortOrder: 4,
      },
      {
        industry: "Food & Beverage",
        subCategory: "Shops & Outlet",
        displayName: "Shops & Outlet (Bakery/Candy/Food Truck/Catering)",
        icon: "Cookie",
        departments: ["Kitchen & Production", "Front of House", "Procurement", "Quality & Hygiene", "Delivery & Dispatch", "Accounts"],
        expenseCategories: ["Raw Ingredients", "Packaging", "Gas & Fuel", "Equipment Maintenance", "Delivery Charges", "FSSAI Licensing", "Staff Uniforms", "Waste Disposal"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Weekly Off", "Festival Leave"],
        taxConfig: { gstRate: 5, tdsApplicable: false },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "reports"],
        terminology: { products: "Menu Items", inventory: "Stock", leads: "Catering Enquiries", orders: "Kitchen Orders" },
        sortOrder: 5,
      },
      {
        industry: "Food & Beverage",
        subCategory: "Bar & Restaurant",
        displayName: "Bar & Restaurant (Bar/Night Club/Fine Dining/Takeaway)",
        icon: "UtensilsCrossed",
        departments: ["Kitchen", "Bar", "Front of House", "Housekeeping", "Procurement", "Accounts & Compliance", "Marketing"],
        expenseCategories: ["Food Supplies", "Beverages & Liquor", "Linen & Crockery", "Licensing & Excise", "Music & Entertainment", "Interior Maintenance", "Delivery Platform Fees"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Weekly Off", "Compensatory Off", "Festival Leave"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "marketing", "reports"],
        terminology: { products: "Menu Items", leads: "Reservations", orders: "Table Orders", invoices: "Guest Bills" },
        sortOrder: 6,
      },
      {
        industry: "Hospitality & Leisure",
        subCategory: "Hotel & Resort",
        displayName: "Hotel & Resort",
        icon: "Hotel",
        departments: ["Front Office", "Housekeeping", "Food & Beverage", "Maintenance", "Revenue Management", "Sales & Marketing", "HR & Training", "Accounts"],
        expenseCategories: ["Linen & Amenities", "Food & Beverage Costs", "Utility Bills", "Maintenance & Repairs", "OTA Commissions", "Laundry", "Guest Supplies", "Licensing"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Compensatory Off", "Weekly Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "marketing", "website", "reports"],
        terminology: { leads: "Guest Enquiries", deals: "Bookings", invoices: "Folios", contacts: "Guests", products: "Rooms & Packages" },
        sortOrder: 7,
      },
      {
        industry: "Hospitality & Leisure",
        subCategory: "Fun & Sports",
        displayName: "Fun & Sports (Alleys/Gaming/Outdoor)",
        icon: "Gamepad2",
        departments: ["Operations", "Guest Relations", "Maintenance", "Safety & First Aid", "Ticketing", "Accounts", "Marketing"],
        expenseCategories: ["Equipment Purchase", "Equipment Maintenance", "Safety Gear", "Insurance", "Utility Bills", "Event Setup", "Prize & Rewards"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Weekly Off", "Seasonal Leave"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "marketing", "reports"],
        terminology: { leads: "Booking Enquiries", deals: "Group Bookings", products: "Activities & Passes", contacts: "Visitors" },
        sortOrder: 8,
      },
      {
        industry: "Health & Wellness",
        subCategory: "Healthcare",
        displayName: "Healthcare (Pharmacy/Clinic)",
        icon: "Heart",
        departments: ["Clinical Operations", "Pharmacy", "Reception & Billing", "Lab & Diagnostics", "Nursing", "Administration", "Accounts"],
        expenseCategories: ["Medicines & Consumables", "Lab Reagents", "Medical Equipment", "Biomedical Waste Disposal", "Licensing & Compliance", "Staff Training", "Insurance"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Maternity Leave", "Emergency Leave"],
        taxConfig: { gstRate: 12, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "reports"],
        terminology: { leads: "Patient Enquiries", contacts: "Patients", products: "Medicines & Services", invoices: "Patient Bills", deals: "Treatment Plans" },
        sortOrder: 9,
      },
      {
        industry: "Health & Wellness",
        subCategory: "Fitness",
        displayName: "Fitness (GYM/Yoga/Pilates/Spa)",
        icon: "Dumbbell",
        departments: ["Training & Coaching", "Front Desk", "Spa & Therapy", "Maintenance", "Sales & Membership", "Accounts"],
        expenseCategories: ["Equipment Purchase", "Equipment Maintenance", "Supplements & Products", "Utility Bills", "Trainer Commissions", "Housekeeping", "Marketing & Ads"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Weekly Off", "Festival Leave"],
        taxConfig: { gstRate: 18, tdsApplicable: false },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "marketing", "reports"],
        terminology: { leads: "Membership Enquiries", deals: "Membership Plans", contacts: "Members", invoices: "Membership Invoices" },
        sortOrder: 10,
      },
      {
        industry: "Retail & eCommerce",
        subCategory: "Shops & Outlets",
        displayName: "Shops & Outlets (wide range)",
        icon: "Store",
        departments: ["Store Operations", "Procurement & Buying", "Visual Merchandising", "Warehouse & Logistics", "Customer Service", "Accounts", "Marketing", "eCommerce"],
        expenseCategories: ["Purchase of Goods", "Rent & CAM Charges", "Packaging Materials", "Shipping & Courier", "POS & Software", "Shrinkage & Damages", "Advertising"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Festival Leave", "Weekly Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "marketing", "website", "reports"],
        terminology: { leads: "Walk-in Enquiries", deals: "Purchase Orders", projects: "Store Launches" },
        sortOrder: 11,
      },
      {
        industry: "Manufacturing & Supply Chain",
        subCategory: "Manufacturing",
        displayName: "Manufacturing",
        icon: "Factory",
        departments: ["Production", "Quality Assurance", "R&D", "Procurement", "Maintenance", "Dispatch & Logistics", "Accounts", "HR & Safety"],
        expenseCategories: ["Raw Materials", "Consumables", "Machine Maintenance", "Power & Fuel", "Packaging", "Waste Management", "Pollution Control", "Labour Contractor Payments"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Compensatory Off", "National Holiday"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "projects", "reports"],
        terminology: { products: "Finished Goods", inventory: "Bill of Materials", deals: "Purchase Orders", leads: "Trade Enquiries" },
        sortOrder: 12,
      },
      {
        industry: "Manufacturing & Supply Chain",
        subCategory: "Supply Chain",
        displayName: "Supply Chain (Logistics/Warehouse/Distribution)",
        icon: "Truck",
        departments: ["Fleet Management", "Warehouse Operations", "Route Planning", "Customer Service", "Compliance & Documentation", "Accounts", "HR"],
        expenseCategories: ["Fuel & Diesel", "Vehicle Maintenance", "Tolls & Permits", "Warehouse Rent", "Insurance", "Loading & Unloading", "GPS & Technology"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Compensatory Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "reports"],
        terminology: { products: "Consignments", leads: "Shipping Enquiries", deals: "Freight Contracts", invoices: "Lorry Receipts" },
        sortOrder: 13,
      },
      {
        industry: "Education & Training",
        subCategory: "Centers",
        displayName: "Centers (DIY Workshop/Driving School/eLearning)",
        icon: "GraduationCap",
        departments: ["Training & Instruction", "Content Development", "Admissions", "Student Support", "IT & Platform", "Accounts"],
        expenseCategories: ["Training Materials", "Instructor Fees", "Platform & Software", "Venue Rent", "Certification Costs", "Marketing & Ads", "Equipment"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Vacation Leave", "Festival Leave"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "marketing", "website", "reports"],
        terminology: { leads: "Student Enquiries", deals: "Enrolments", contacts: "Students", invoices: "Fee Receipts" },
        sortOrder: 14,
      },
      {
        industry: "Education & Training",
        subCategory: "Institutions",
        displayName: "Institutions (School/Colleges)",
        icon: "School",
        departments: ["Academics", "Administration", "Examination Cell", "Library", "Student Affairs", "Accounts & Fee Collection", "IT", "Sports & Co-curricular"],
        expenseCategories: ["Faculty Salaries", "Lab Equipment", "Library Books", "Exam & Stationery", "Campus Maintenance", "Transport", "Hostel Operations", "Affiliation Fees"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Vacation Leave", "Duty Leave", "Maternity Leave"],
        taxConfig: { gstRate: 0, tdsApplicable: true },
        modules: ["dashboard", "organization", "finance", "hrm", "inventory", "reports", "website"],
        terminology: { leads: "Admission Enquiries", deals: "Admissions", contacts: "Students & Parents", invoices: "Fee Challans" },
        sortOrder: 15,
      },
      {
        industry: "Business Services",
        subCategory: "Firms",
        displayName: "Firms (Accounting/Audit/Law/Marketing)",
        icon: "Briefcase",
        departments: ["Client Servicing", "Audit & Assurance", "Tax & Compliance", "Legal Advisory", "Business Development", "Accounts", "HR"],
        expenseCategories: ["Professional Subscriptions", "Office Rent", "Travel & Conveyance", "Software & Tools", "Printing & Stationery", "Client Entertainment", "Insurance"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Study Leave", "Compensatory Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "projects", "reports", "office"],
        terminology: { leads: "Client Enquiries", deals: "Engagements", projects: "Assignments", invoices: "Fee Invoices" },
        sortOrder: 16,
      },
      {
        industry: "Business Services",
        subCategory: "Home Service",
        displayName: "Home Service (Rental/Cleaning/Electrician)",
        icon: "Wrench",
        departments: ["Field Operations", "Scheduling & Dispatch", "Customer Support", "Procurement", "Quality Check", "Accounts"],
        expenseCategories: ["Tools & Equipment", "Spare Parts", "Fuel & Transport", "Uniforms", "Insurance", "Training", "Marketing & Ads"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Weekly Off", "Festival Leave"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "inventory", "reports"],
        terminology: { leads: "Service Requests", deals: "Job Orders", contacts: "Customers", projects: "Service Assignments" },
        sortOrder: 17,
      },
      {
        industry: "Events & Clubs",
        subCategory: "Manage",
        displayName: "Manage (Event Mgmt/Wedding Planner/Coworking/NPO)",
        icon: "CalendarDays",
        departments: ["Event Planning", "Creative & Design", "Vendor Management", "Logistics & Setup", "Client Relations", "Accounts", "Marketing"],
        expenseCategories: ["Venue Booking", "Vendor Payments", "Decor & Fabrication", "Catering", "Entertainment & Artists", "Travel & Stay", "Permits & Licenses"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Compensatory Off", "Festival Leave"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "projects", "marketing", "reports"],
        terminology: { leads: "Event Enquiries", deals: "Event Contracts", projects: "Events", contacts: "Clients" },
        sortOrder: 18,
      },
      {
        industry: "Events & Clubs",
        subCategory: "Club",
        displayName: "Club (Members/Sports/Summer Camps)",
        icon: "Trophy",
        departments: ["Membership Services", "Sports & Activities", "Facilities Management", "Food & Beverage", "Events & Recreation", "Accounts"],
        expenseCategories: ["Ground & Court Maintenance", "Sports Equipment", "Food & Beverage Costs", "Event Setup", "Utility Bills", "Insurance", "Staff Welfare"],
        leaveTypes: ["Casual Leave", "Sick Leave", "Earned Leave", "Weekly Off"],
        taxConfig: { gstRate: 18, tdsApplicable: true },
        modules: ["dashboard", "organization", "sales", "finance", "hrm", "marketing", "reports"],
        terminology: { leads: "Membership Enquiries", deals: "Membership Plans", contacts: "Members", invoices: "Subscription Invoices" },
        sortOrder: 19,
      },
    ];

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
