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

  type Named = { name: string; code?: string };
  type LeaveSpec = { name: string; days?: number; carryForward?: boolean };

  function toNamed(value: unknown): Named | null {
    if (!value) return null;
    if (typeof value === "string") return { name: value };
    if (typeof value === "object" && value !== null) {
      const v = value as { name?: unknown; code?: unknown };
      if (typeof v.name === "string") {
        return { name: v.name, code: typeof v.code === "string" ? v.code : undefined };
      }
    }
    return null;
  }

  function toLeave(value: unknown): LeaveSpec | null {
    if (!value) return null;
    if (typeof value === "string") return { name: value, days: 12 };
    if (typeof value === "object" && value !== null) {
      const v = value as { name?: unknown; days?: unknown; carryForward?: unknown };
      if (typeof v.name === "string") {
        return {
          name: v.name,
          days: typeof v.days === "number" ? v.days : 12,
          carryForward: typeof v.carryForward === "boolean" ? v.carryForward : false,
        };
      }
    }
    return null;
  }

  function slugCode(s: string, max: number): string {
    return s
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .substring(0, max) || "X";
  }

  const departments = ((template.departments as unknown[]) ?? [])
    .map(toNamed)
    .filter((d): d is Named => d !== null);
  const expenseCategories = ((template.expenseCategories as unknown[]) ?? [])
    .map(toNamed)
    .filter((d): d is Named => d !== null);
  const leaveTypes = ((template.leaveTypes as unknown[]) ?? [])
    .map(toLeave)
    .filter((d): d is LeaveSpec => d !== null);
  const modules = (template.modules as string[]) ?? [];
  const terminology = (template.terminology as Record<string, string>) ?? {};

  // Create departments from template (Department has no `code` column)
  if (departments.length > 0) {
    await prisma.department.createMany({
      data: departments.map((d) => ({
        tenantId,
        name: d.name,
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
        code: ec.code ?? slugCode(ec.name, 10),
      })),
      skipDuplicates: true,
    });
  }

  // Create leave types from template (schema uses annualQuota, not daysPerYear)
  if (leaveTypes.length > 0) {
    await prisma.leaveType.createMany({
      data: leaveTypes.map((lt) => ({
        tenantId,
        name: lt.name,
        code: slugCode(lt.name, 20),
        annualQuota: lt.days ?? 12,
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

  const existingModulesRaw = currentSettings.modules;
  let existingModules: string[] = [];
  if (Array.isArray(existingModulesRaw)) {
    existingModules = existingModulesRaw.filter((m): m is string => typeof m === "string" && m.length > 0);
  } else if (existingModulesRaw && typeof existingModulesRaw === "object") {
    existingModules = Object.entries(existingModulesRaw as Record<string, unknown>)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => key);
  }

  const mergedModules = Array.from(new Set([...existingModules, ...modules, "office"]));

  const existingTerminology = (currentSettings.terminology as Record<string, string> | undefined) ?? {};
  const mergedTerminology = { ...existingTerminology, ...terminology };

  const updatedSettings = {
    ...currentSettings,
    modules: mergedModules,
    ...(Object.keys(mergedTerminology).length > 0 ? { terminology: mergedTerminology } : {}),
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
