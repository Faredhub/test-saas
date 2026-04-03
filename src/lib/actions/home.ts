"use server";

import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

export async function getHomeStats() {
  const { tenantId } = await getSessionOrThrow();

  const [
    totalLeads,
    openDeals,
    pendingInvoices,
    totalContacts,
    recentLeads,
    recentActivities,
    announcements,
    upcomingEvents,
  ] = await Promise.all([
    prisma.lead.count({ where: tenantScope(tenantId) }),
    prisma.deal.count({ where: { ...tenantScope(tenantId), stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    prisma.invoice.count({ where: { ...tenantScope(tenantId), status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.contact.count({ where: tenantScope(tenantId) }),
    prisma.lead.findMany({
      where: tenantScope(tenantId),
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, company: true, pipelineStage: true, createdAt: true },
    }),
    prisma.activity.findMany({
      where: tenantScope(tenantId),
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, subject: true, createdAt: true, user: { select: { name: true } } },
    }),
    prisma.announcement.findMany({
      where: { ...tenantScope(tenantId), expiresAt: { gte: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        ...tenantScope(tenantId),
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      take: 5,
      select: { id: true, title: true, startTime: true, endTime: true, type: true },
    }),
  ]);

  // Calculate revenue from paid invoices this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      ...tenantScope(tenantId),
      status: "PAID",
      paidDate: { gte: startOfMonth },
    },
    select: { total: true },
  });

  const monthlyRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  return {
    stats: { totalLeads, openDeals, pendingInvoices, totalContacts, monthlyRevenue },
    recentLeads,
    recentActivities,
    announcements,
    upcomingEvents,
  };
}
