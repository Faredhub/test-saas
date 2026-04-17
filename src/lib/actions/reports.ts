"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { ReportType, ReportGenStatus } from "@/generated/prisma/enums";

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
// REPORT TEMPLATES
// ============================================================================

export async function getReportTemplates(filters?: {
  type?: ReportType;
  search?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { description: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const templates = await prisma.reportTemplate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reports: true } } },
  });

  return templates;
}

export async function createReportTemplate(data: {
  name: string;
  type: ReportType;
  description?: string;
  sections?: unknown[];
  headerConfig?: Record<string, unknown>;
  footerConfig?: Record<string, unknown>;
  pageSize?: string;
  orientation?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const template = await prisma.reportTemplate.create({
    data: {
      tenantId,
      name: data.name,
      type: data.type,
      description: data.description ?? null,
      sections: (data.sections as never) ?? [],
      headerConfig: (data.headerConfig as never) ?? null,
      footerConfig: (data.footerConfig as never) ?? null,
      pageSize: data.pageSize ?? "A4",
      orientation: data.orientation ?? "portrait",
      createdById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "report_template.create",
    entity: "ReportTemplate",
    entityId: template.id,
    metadata: { name: data.name, type: data.type },
  });

  revalidatePath("/reports/templates");
  return template;
}

export async function updateReportTemplate(
  id: string,
  data: {
    name?: string;
    type?: ReportType;
    description?: string;
    sections?: unknown[];
    headerConfig?: Record<string, unknown>;
    footerConfig?: Record<string, unknown>;
    pageSize?: string;
    orientation?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.reportTemplate.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Template not found");

  const template = await prisma.reportTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.sections !== undefined ? { sections: data.sections as never } : {}),
      ...(data.headerConfig !== undefined ? { headerConfig: data.headerConfig as never } : {}),
      ...(data.footerConfig !== undefined ? { footerConfig: data.footerConfig as never } : {}),
      ...(data.pageSize !== undefined ? { pageSize: data.pageSize } : {}),
      ...(data.orientation !== undefined ? { orientation: data.orientation } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "report_template.update",
    entity: "ReportTemplate",
    entityId: id,
  });

  revalidatePath("/reports/templates");
  return template;
}

export async function deleteReportTemplate(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.reportTemplate.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { _count: { select: { reports: true } } },
  });
  if (!existing) throw new Error("Template not found");
  if (existing._count.reports > 0) {
    throw new Error("Cannot delete a template that has generated reports");
  }

  await prisma.reportTemplate.delete({ where: { id } });

  await logAudit({
    tenantId,
    userId,
    action: "report_template.delete",
    entity: "ReportTemplate",
    entityId: id,
  });

  revalidatePath("/reports/templates");
}

// ============================================================================
// GENERATED REPORTS
// ============================================================================

export async function getGeneratedReports(filters?: {
  status?: ReportGenStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 50, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { clientName: { contains: filters.search, mode: "insensitive" as const } },
            { projectRef: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [reports, total] = await Promise.all([
    prisma.generatedReport.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { template: { select: { id: true, name: true, type: true } } },
    }),
    prisma.generatedReport.count({ where }),
  ]);

  return { reports, total, page, pageSize };
}

export async function getReportById(id: string) {
  const { tenantId } = await getSessionOrThrow();

  return prisma.generatedReport.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { template: true },
  });
}

export async function createGeneratedReport(data: {
  templateId: string;
  title: string;
  clientName?: string;
  location?: string;
  projectRef?: string;
  data?: Record<string, unknown>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify template belongs to tenant
  const template = await prisma.reportTemplate.findFirst({
    where: { id: data.templateId, ...tenantScope(tenantId) },
  });
  if (!template) throw new Error("Template not found");

  const report = await prisma.generatedReport.create({
    data: {
      tenantId,
      templateId: data.templateId,
      title: data.title,
      clientName: data.clientName ?? null,
      location: data.location ?? null,
      projectRef: data.projectRef ?? null,
      data: (data.data as never) ?? {},
      generatedById: userId,
    },
    include: { template: { select: { id: true, name: true, type: true } } },
  });

  await logAudit({
    tenantId,
    userId,
    action: "generated_report.create",
    entity: "GeneratedReport",
    entityId: report.id,
    metadata: { title: data.title, templateId: data.templateId },
  });

  revalidatePath("/reports");
  return report;
}

export async function updateGeneratedReport(
  id: string,
  data: {
    title?: string;
    clientName?: string;
    location?: string;
    projectRef?: string;
    data?: Record<string, unknown>;
    status?: ReportGenStatus;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.generatedReport.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Report not found");

  // Status transition validation
  if (data.status) {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["FINAL"],
      FINAL: ["APPROVED", "DRAFT"],
      APPROVED: ["ARCHIVED"],
      ARCHIVED: [],
    };
    if (!validTransitions[existing.status]?.includes(data.status)) {
      throw new Error(
        `Cannot transition from ${existing.status} to ${data.status}`
      );
    }
  }

  const report = await prisma.generatedReport.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.projectRef !== undefined ? { projectRef: data.projectRef } : {}),
      ...(data.data !== undefined ? { data: data.data as never } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    include: { template: { select: { id: true, name: true, type: true } } },
  });

  await logAudit({
    tenantId,
    userId,
    action: "generated_report.update",
    entity: "GeneratedReport",
    entityId: id,
    metadata: { status: data.status },
  });

  revalidatePath("/reports");
  revalidatePath(`/reports/${id}`);
  return report;
}

export async function deleteGeneratedReport(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.generatedReport.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Report not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft reports can be deleted");
  }

  await prisma.generatedReport.delete({ where: { id } });

  await logAudit({
    tenantId,
    userId,
    action: "generated_report.delete",
    entity: "GeneratedReport",
    entityId: id,
  });

  revalidatePath("/reports");
}
