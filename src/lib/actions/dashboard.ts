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

// ============================================================================
// Sub-Module 3B: Finance Dashboard
// ============================================================================

export async function getFinanceDashboard() {
  const { tenantId } = await getSessionOrThrow();

  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      ...tenantScope(tenantId),
      status: "PAID",
      paidDate: { gte: sixMonthsAgo },
    },
    select: { total: true, paidDate: true },
  });

  const allInvoices = await prisma.invoice.findMany({
    where: tenantScope(tenantId),
    select: { total: true, amountPaid: true, status: true, dueDate: true },
  });

  // Group revenue by month
  const revenueByMonth: Record<string, number> = {};
  for (const inv of paidInvoices) {
    if (!inv.paidDate) continue;
    const key = `${inv.paidDate.getFullYear()}-${String(inv.paidDate.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(inv.total);
  }

  // Fill in missing months
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
    monthlyRevenue.push({ month: label, revenue: revenueByMonth[key] ?? 0 });
  }

  // Invoice status breakdown
  const statusCounts: Record<string, number> = {};
  let totalRevenue = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;

  for (const inv of allInvoices) {
    statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + 1;
    totalRevenue += Number(inv.amountPaid);
    const outstanding = Number(inv.total) - Number(inv.amountPaid);
    if (outstanding > 0) totalOutstanding += outstanding;
    if (inv.status === "OVERDUE") totalOverdue += outstanding;
  }

  const invoiceBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count,
  }));

  return {
    monthlyRevenue,
    invoiceBreakdown,
    totals: {
      revenue: totalRevenue,
      outstanding: totalOutstanding,
      overdue: totalOverdue,
      invoiceCount: allInvoices.length,
    },
  };
}

// ============================================================================
// Sales Pipeline Dashboard
// ============================================================================

export async function getSalesDashboard() {
  const { tenantId } = await getSessionOrThrow();

  // Pipeline stages
  const stages = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
  const pipelineCounts = await Promise.all(
    stages.map(async (stage) => ({
      stage,
      count: await prisma.lead.count({ where: { ...tenantScope(tenantId), pipelineStage: stage } }),
    }))
  );

  // Deal stages with values
  const dealStages = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"] as const;
  const deals = await prisma.deal.findMany({
    where: tenantScope(tenantId),
    select: { stage: true, value: true },
  });

  const dealsByStage = dealStages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage);
    return {
      stage: stage.replace("CLOSED_", "").replace("_", " "),
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0),
    };
  });

  // Lead sources
  const leadSources = await prisma.lead.groupBy({
    by: ["source"],
    where: tenantScope(tenantId),
    _count: true,
  });

  const sourceData = leadSources.map((ls) => ({
    name: ls.source.replace("_", " "),
    value: ls._count,
  }));

  // Conversion rate
  const totalLeads = pipelineCounts.reduce((sum, p) => sum + p.count, 0);
  const wonLeads = pipelineCounts.find((p) => p.stage === "WON")?.count ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return { pipelineCounts, dealsByStage, sourceData, conversionRate, totalLeads };
}

// ============================================================================
// Overview Dashboard (combines all)
// ============================================================================

export async function getDashboardOverview() {
  const { tenantId } = await getSessionOrThrow();

  const [
    totalLeads,
    totalContacts,
    totalDeals,
    totalInvoices,
    totalQuotations,
    totalAnnouncements,
    totalEvents,
  ] = await Promise.all([
    prisma.lead.count({ where: tenantScope(tenantId) }),
    prisma.contact.count({ where: tenantScope(tenantId) }),
    prisma.deal.count({ where: tenantScope(tenantId) }),
    prisma.invoice.count({ where: tenantScope(tenantId) }),
    prisma.quotation.count({ where: tenantScope(tenantId) }),
    prisma.announcement.count({ where: tenantScope(tenantId) }),
    prisma.calendarEvent.count({ where: { ...tenantScope(tenantId), startTime: { gte: new Date() } } }),
  ]);

  return {
    totalLeads,
    totalContacts,
    totalDeals,
    totalInvoices,
    totalQuotations,
    totalAnnouncements,
    totalEvents,
  };
}
