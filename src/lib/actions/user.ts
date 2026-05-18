"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validators/auth";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

export async function getUserProfile() {
  const { userId, tenantId } = await getSessionOrThrow();

  const user = await prisma.user.findFirst({
    where: { id: userId, ...tenantScope(tenantId) },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatar: true,
      theme: true,
      locale: true,
      timezone: true,
      mfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      tenant: {
        select: { id: true, name: true, slug: true, plan: true },
      },
      roleAssignments: {
        include: { role: { select: { name: true } } },
      },
    },
  });

  return user;
}

export async function updateUserProfile(data: {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // HIGH-02: Explicitly destructure allowed fields to prevent mass assignment
  const { name, firstName, lastName, phone, timezone, locale } = data;
  await prisma.user.updateMany({
    where: { id: userId, ...tenantScope(tenantId) },
    data: { name, firstName, lastName, phone, timezone, locale },
  });

  await logAudit({ tenantId, userId, action: "user.profile.update", entity: "User", entityId: userId });
  revalidatePath("/");
}

export async function updateUserTheme(theme: "LIGHT" | "DARK" | "SYSTEM") {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.user.updateMany({
    where: { id: userId, ...tenantScope(tenantId) },
    data: { theme },
  });

  revalidatePath("/");
}

export async function getNavigationPreferences() {
  const { tenantId } = await getSessionOrThrow();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};
  const terminology =
    (settings.terminology as Record<string, string> | undefined) ?? {};
  const modulesSetting = settings.modules;

  let enabledModules: string[] | null = null;
  if (Array.isArray(modulesSetting)) {
    enabledModules = modulesSetting.filter(
      (value): value is string => typeof value === "string"
    );
  } else if (modulesSetting && typeof modulesSetting === "object") {
    enabledModules = Object.entries(modulesSetting as Record<string, unknown>)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => key);
  }

  return {
    terminology,
    enabledModules,
    industryTemplate: settings.industryTemplate ?? null,
  };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const user = await prisma.user.findFirst({
    where: { id: userId, ...tenantScope(tenantId) },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new Error("No password set for this account.");
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("Current password is incorrect.");
  }

  // LOW-02: Use the same password schema as registration for consistent validation
  const passwordCheck = registerSchema.shape.password.safeParse(newPassword);
  if (!passwordCheck.success) {
    throw new Error(passwordCheck.error.issues[0]?.message ?? "Invalid password.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.updateMany({
    where: { id: userId, ...tenantScope(tenantId) },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  await logAudit({ tenantId, userId, action: "user.password.change", entity: "User", entityId: userId });
}

export async function globalSearch(query: string) {
  if (!query || query.length < 2) return { results: [] };

  const { tenantId } = await getSessionOrThrow();
  const q = query.trim();

  const [leads, contacts, deals, invoices, quotations, announcements, calendarEvents, notes, contracts, employees, projects, tickets, products, campaigns] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, company: true },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, company: true },
      take: 5,
    }),
    prisma.deal.findMany({
      where: {
        ...tenantScope(tenantId),
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, stage: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { invoiceNo: { contains: q, mode: "insensitive" } },
          { contact: { firstName: { contains: q, mode: "insensitive" } } },
          { contact: { lastName: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, invoiceNo: true, status: true, contact: { select: { firstName: true, lastName: true } } },
      take: 5,
    }),
    prisma.quotation.findMany({
      where: {
        ...tenantScope(tenantId),
        quotationNo: { contains: q, mode: "insensitive" },
      },
      select: { id: true, quotationNo: true, status: true },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: {
        ...tenantScope(tenantId),
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, priority: true },
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: {
        ...tenantScope(tenantId),
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, type: true },
      take: 5,
    }),
    prisma.note.findMany({
      where: {
        ...tenantScope(tenantId),
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, type: true },
      take: 5,
    }),
    prisma.contract.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { contractNo: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, contractNo: true, status: true },
      take: 5,
    }),
    // Module 8: HRM
    prisma.employee.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { employeeId: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, designation: true },
      take: 5,
    }),
    // Module 10: Projects
    prisma.project.findMany({
      where: {
        ...tenantScope(tenantId),
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
    prisma.ticket.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { ticketNo: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, ticketNo: true, subject: true, status: true },
      take: 5,
    }),
    // Module 7: Inventory
    prisma.product.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, sku: true },
      take: 5,
    }),
    // Module 6: Marketing
    prisma.campaign.findMany({
      where: {
        ...tenantScope(tenantId),
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
  ]);

  const results = [
    ...leads.map((l) => ({ type: "lead" as const, id: l.id, label: `${l.firstName} ${l.lastName ?? ""}`.trim(), sub: l.company, href: `/sales/leads` })),
    ...contacts.map((c) => ({ type: "contact" as const, id: c.id, label: `${c.firstName} ${c.lastName ?? ""}`.trim(), sub: c.company, href: `/sales/contacts` })),
    ...deals.map((d) => ({ type: "deal" as const, id: d.id, label: d.title, sub: d.stage, href: `/sales/deals` })),
    ...invoices.map((i) => ({ type: "invoice" as const, id: i.id, label: i.invoiceNo, sub: i.contact ? `${i.contact.firstName} ${i.contact.lastName ?? ""}`.trim() : i.status, href: `/sales/invoices` })),
    ...quotations.map((q) => ({ type: "quotation" as const, id: q.id, label: q.quotationNo, sub: q.status, href: `/sales/quotations` })),
    ...announcements.map((a) => ({ type: "notice" as const, id: a.id, label: a.title, sub: a.priority, href: `/organization/notices` })),
    ...calendarEvents.map((e) => ({ type: "event" as const, id: e.id, label: e.title, sub: e.type, href: `/organization/calendar` })),
    ...notes.map((n) => ({ type: "note" as const, id: n.id, label: n.title, sub: n.type, href: `/organization/notes` })),
    ...contracts.map((c) => ({ type: "contract" as const, id: c.id, label: c.title, sub: c.contractNo, href: `/organization/contracts` })),
    ...employees.map((e) => ({ type: "employee" as const, id: e.id, label: `${e.firstName} ${e.lastName ?? ""}`.trim(), sub: e.designation, href: `/hrm/employees` })),
    ...projects.map((p) => ({ type: "project" as const, id: p.id, label: p.name, sub: p.status, href: `/projects` })),
    ...tickets.map((t) => ({ type: "ticket" as const, id: t.id, label: t.ticketNo, sub: t.subject, href: `/projects/tickets` })),
    ...products.map((p) => ({ type: "product" as const, id: p.id, label: p.name, sub: p.sku, href: `/inventory/products` })),
    ...campaigns.map((c) => ({ type: "campaign" as const, id: c.id, label: c.name, sub: c.status, href: `/marketing/campaigns` })),
  ];

  return { results };
}
