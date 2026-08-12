import { PrismaClient } from "../src/generated/prisma/client";

type JsonValue = unknown;

const industryDesignations: { department: string; designations: string[] }[] = [
  { department: "Management", designations: ["Managing Director", "Director", "CEO/CTO/COO/CFO"] },
  { department: "Admin", designations: ["Executive Assistant", "Administrative Assistant", "Office Manager", "Receptionist", "Data Entry Clerk"] },
  { department: "Human Resource", designations: ["HR Executive", "HR Generalist"] },
  { department: "Tender", designations: ["Tender Executive", "Tender Manager"] },
  { department: "IT", designations: ["IT Manager", "IT Support Specialist", "Network Administrator"] },
  { department: "Sales & Marketing", designations: ["Business Development Manager", "Business Development Representative", "Sales Development Representative"] },
  { department: "Accounting", designations: ["Accounting Manager", "Accountant"] },
  { department: "Survey & GIS", designations: ["GIS Manager", "GIS Analyst", "Survey Supervisor", "Surveyor", "Assistant Surveyor"] },
  { department: "Planning & Design", designations: ["Highway Manager", "Highway Engineer", "Assistant Highway Engineer", "Structural Manager", "Structural Engineer", "Assistant Structural Engineer", "Chief Architect", "Senior Architect", "Architect", "CAD Engineer"] },
  { department: "Estimate", designations: ["Estimating Manager", "Estimator"] },
  { department: "Geotechnical Investigation", designations: ["Geotechnical Manager", "Lead Geotechnical Engineer", "Senior Geotechnical Engineer", "Geotechnical Engineer", "Assistant Geotechnical Engineer"] },
];

type PermissionRecord = { id: string; module: string; action: string; resource: string };

export async function seedDesignations(prisma: PrismaClient, tenantId: string) {
  console.log("🏭 Seeding construction industry designations...");

  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map<string, string>();
  for (const p of allPermissions) {
    permissionMap.set(`${p.module}:${p.action}:${p.resource}`, p.id);
  }

  function getResourcePermissions(resources: string[], actions: string[]): string[] {
    const ids: string[] = [];
    for (const r of resources) {
      for (const a of actions) {
        const key = `organization:${a}:${r}`;
        const id = permissionMap.get(key);
        if (id) ids.push(id);
      }
    }
    return ids;
  }

  const baseActionPerms = ["read"] as const;
  const fullActionPerms = ["create", "read", "update", "delete"] as const;

  const managerResources = [
    "departments", "branches", "announcements", "calendar", "notes",
    "contracts", "signatures", "documents", "forms", "reports", "workflows",
  ];
  const staffResources = [
    "announcements", "calendar", "notes", "documents", "forms", "reports",
  ];

  for (const entry of industryDesignations) {
    let department = await prisma.department.findFirst({
      where: { tenantId, name: entry.department },
    });

    if (!department) {
      department = await prisma.department.create({
        data: { tenantId, name: entry.department },
      });
    }

    for (const desigName of entry.designations) {
      const existing = await prisma.designation.findFirst({
        where: { tenantId, departmentId: department.id, name: desigName },
      });
      if (existing) continue;

      // Determine if this is a manager level role
      const isManager = desigName.toLowerCase().includes("manager") ||
        desigName.toLowerCase().includes("director") ||
        desigName.toLowerCase().includes("ceo") ||
        desigName.toLowerCase().includes("cfo") ||
        desigName.toLowerCase().includes("cto") ||
        desigName.toLowerCase().includes("coo") ||
        desigName.toLowerCase().includes("chief") ||
        desigName.toLowerCase().includes("lead");

      const permIds = isManager
        ? getResourcePermissions(managerResources, [...fullActionPerms])
        : getResourcePermissions(staffResources, [...baseActionPerms]);

      // Create a dedicated role for this designation
      const roleName = `${desigName} (${entry.department})`;
      let role = await prisma.role.findFirst({
        where: { tenantId, name: roleName },
      });

      if (!role) {
        role = await prisma.role.create({
          data: {
            tenantId,
            name: roleName,
            description: `Auto-generated role for ${desigName} in ${entry.department}`,
            isSystem: false,
          },
        });

        for (const permId of permIds) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
            update: {},
            create: { roleId: role.id, permissionId: permId },
          });
        }
      }

      const designation = await prisma.designation.create({
        data: {
          tenantId,
          name: desigName,
          departmentId: department.id,
        },
      });

      // Link role to designation
      await prisma.designationRole.upsert({
        where: {
          designationId_roleId: {
            designationId: designation.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          designationId: designation.id,
          roleId: role.id,
        },
      });
    }
  }

  console.log(`✅ Seeded ${industryDesignations.length} departments with designations, roles, and permissions`);
}
