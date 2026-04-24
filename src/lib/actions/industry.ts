"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// ============================================================================
// Helpers
// ============================================================================

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// INDUSTRY TEMPLATES
// ============================================================================

export async function getIndustryTemplates() {
  const templates = await prisma.industryTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });

  // Group by industry
  const grouped: Record<string, typeof templates> = {};
  templates.forEach((t) => {
    if (!grouped[t.industry]) grouped[t.industry] = [];
    grouped[t.industry].push(t);
  });

  return grouped;
}

export async function getIndustryTemplate(industry: string, subCategory: string) {
  return prisma.industryTemplate.findUnique({
    where: { industry_subCategory: { industry, subCategory } },
  });
}

export async function applyIndustryTemplate(tenantId: string, templateId: string) {
  const { userId, tenantId: sessionTenantId } = await getSessionOrThrow();

  // Only allow applying to own tenant
  if (tenantId !== sessionTenantId) {
    throw new Error("Cannot apply template to another tenant");
  }

  const template = await prisma.industryTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) throw new Error("Template not found");

  const departments = (template.departments as Array<{ name: string; code?: string }>) ?? [];
  const expenseCategories = (template.expenseCategories as Array<{ name: string; code?: string }>) ?? [];
  const leaveTypes = (template.leaveTypes as Array<{ name: string; days: number; carryForward?: boolean }>) ?? [];
  const modules = (template.modules as string[]) ?? [];
  const terminology = (template.terminology as Record<string, string>) ?? {};

  // Create departments from template
  if (departments.length > 0) {
    await prisma.department.createMany({
      data: departments.map((d) => ({
        tenantId,
        name: d.name,
        code: d.code ?? d.name.substring(0, 4).toUpperCase(),
      })),
      skipDuplicates: true,
    });
  }

  // Create expense categories from template
  if (expenseCategories.length > 0) {
    await prisma.expenseCategory.createMany({
      data: expenseCategories.map((ec) => ({
        tenantId,
        name: ec.name,
        code: ec.code ?? ec.name.substring(0, 6).toUpperCase(),
      })),
      skipDuplicates: true,
    });
  }

  // Create leave types from template
  if (leaveTypes.length > 0) {
    await prisma.leaveType.createMany({
      data: leaveTypes.map((lt) => ({
        tenantId,
        name: lt.name,
        code: lt.name.toUpperCase().replace(/\s+/g, "_"),
        daysPerYear: lt.days,
        carryForward: lt.carryForward ?? false,
      })),
      skipDuplicates: true,
    });
  }

  // Update tenant settings with modules and terminology
  const currentTenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const currentSettings = (currentTenant?.settings as Record<string, unknown>) ?? {};
  const updatedSettings = {
    ...currentSettings,
    ...(modules.length > 0 ? { modules } : {}),
    ...(Object.keys(terminology).length > 0 ? { terminology } : {}),
    industryTemplate: {
      id: template.id,
      industry: template.industry,
      subCategory: template.subCategory,
      appliedAt: new Date().toISOString(),
    },
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: updatedSettings },
  });

  await logAudit({
    tenantId,
    userId,
    action: "industry_template.apply",
    entity: "IndustryTemplate",
    entityId: template.id,
  });

  revalidatePath("/settings");
  return { success: true, template: template.displayName };
}
