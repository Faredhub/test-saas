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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleString("en", { weekday: "short" });
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString("en", { month: "short", year: "2-digit" });
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeStatus(status: string) {
  return status.replace(/_/g, " ");
}

function buildStatusSeries<T extends { status: string }>(rows: T[], statuses: readonly string[]) {
  return statuses.map((status) => ({
    name: normalizeStatus(status),
    value: rows.filter((row) => row.status === status).length,
  }));
}

function safeDateRange(start: Date, end: Date) {
  return { gte: start, lt: end };
}

// ============================================================================
// Civil Industry Dashboard
// ============================================================================

export async function getCivilIndustryDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [
    projects,
    tasks,
    milestones,
    timesheets,
    paidInvoices,
    outstandingInvoices,
    expenses,
    employees,
    attendanceToday,
    attendanceRecent,
    assets,
    warehouses,
    warehouseStock,
    movements,
    visits,
    contactsWithLocation,
  ] = await Promise.all([
    prisma.project.findMany({
      where: tenantScope(tenantId),
      select: {
        id: true,
        name: true,
        code: true,
        clientName: true,
        status: true,
        priority: true,
        budget: true,
        spent: true,
        progress: true,
        startDate: true,
        endDate: true,
        _count: { select: { tasks: true, milestones: true, timesheets: true, tickets: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: tenantScope(tenantId),
      select: { projectId: true, status: true, dueDate: true, actualHours: true, estimatedHours: true },
    }),
    prisma.milestone.findMany({
      where: tenantScope(tenantId),
      select: { projectId: true, isCompleted: true, dueDate: true },
    }),
    prisma.timesheet.findMany({
      where: { ...tenantScope(tenantId), date: { gte: yearStart } },
      select: { projectId: true, hours: true, isBillable: true, date: true },
    }),
    prisma.invoice.findMany({
      where: { ...tenantScope(tenantId), status: "PAID" },
      select: { total: true, amountPaid: true, paidDate: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { ...tenantScope(tenantId), status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { total: true, amountPaid: true, dueDate: true, status: true },
    }),
    prisma.expense.findMany({
      where: tenantScope(tenantId),
      select: { amount: true, status: true, date: true },
    }),
    prisma.employee.findMany({
      where: tenantScope(tenantId),
      select: { id: true, firstName: true, lastName: true, status: true, departmentId: true, designation: true, city: true },
    }),
    prisma.attendance.findMany({
      where: { ...tenantScope(tenantId), date: safeDateRange(today, tomorrow) },
      select: { status: true, totalHours: true, location: true, employee: { select: { firstName: true, lastName: true } } },
    }),
    prisma.attendance.findMany({
      where: { ...tenantScope(tenantId), date: { gte: weekStart, lt: tomorrow } },
      select: { status: true, date: true, totalHours: true, location: true },
    }),
    prisma.asset.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true, category: true, status: true, location: true, purchaseCost: true, currentValue: true },
    }),
    prisma.warehouse.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true, city: true, state: true, isActive: true },
    }),
    prisma.warehouseStock.findMany({
      where: tenantScope(tenantId),
      select: {
        quantity: true,
        reservedQty: true,
        warehouseId: true,
        product: { select: { name: true, minStock: true, costPrice: true, category: true } },
        warehouse: { select: { name: true, city: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where: { ...tenantScope(tenantId), date: { gte: monthStart } },
      select: { type: true, quantity: true, date: true, warehouse: { select: { name: true, city: true } }, product: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.visit.findMany({
      where: tenantScope(tenantId),
      select: { purpose: true, status: true, location: true, checkInAt: true, contact: { select: { company: true, city: true, latitude: true, longitude: true } } },
      orderBy: { checkInAt: "desc" },
      take: 20,
    }),
    prisma.contact.findMany({
      where: { ...tenantScope(tenantId), OR: [{ latitude: { not: null } }, { city: { not: null } }] },
      select: { firstName: true, lastName: true, company: true, city: true, state: true, latitude: true, longitude: true },
      take: 25,
    }),
  ]);

  const projectBudget = projects.reduce((sum, p) => sum + Number(p.budget ?? 0), 0);
  const projectSpent = projects.reduce((sum, p) => sum + Number(p.spent ?? 0), 0);
  const averageProgress = projects.length ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
  const overdueTasks = tasks.filter((task) => task.status !== "DONE" && task.dueDate && task.dueDate < today).length;
  const overdueMilestones = milestones.filter((m) => !m.isCompleted && m.dueDate && m.dueDate < today).length;

  const projectStatusData = buildStatusSeries(projects, ["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]);
  const taskStatusData = buildStatusSeries(tasks, ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]);

  const projectLocations = Object.values(
    projects.reduce<Record<string, { location: string; projects: number; budget: number; spent: number; progress: number }>>((acc, project) => {
      const key = project.clientName || "Unassigned";
      if (!acc[key]) acc[key] = { location: key, projects: 0, budget: 0, spent: 0, progress: 0 };
      acc[key].projects += 1;
      acc[key].budget += Number(project.budget ?? 0);
      acc[key].spent += Number(project.spent ?? 0);
      acc[key].progress += project.progress;
      return acc;
    }, {})
  )
    .map((item) => ({ ...item, budget: roundCurrency(item.budget), spent: roundCurrency(item.spent), progress: Math.round(item.progress / item.projects) }))
    .sort((a, b) => b.projects - a.projects)
    .slice(0, 8);

  const projectResources = projects.slice(0, 8).map((project) => {
    const projectTimesheets = timesheets.filter((t) => t.projectId === project.id);
    const hours = projectTimesheets.reduce((sum, t) => sum + Number(t.hours), 0);
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      employees: new Set(projectTimesheets.map((t) => t.projectId)).size || (hours > 0 ? 1 : 0),
      labourHours: Math.round(hours * 10) / 10,
      assets: assets.filter((asset) => asset.location && project.name.toLowerCase().includes(asset.location.toLowerCase())).length,
      vendors: visits.filter((visit) => visit.purpose.toLowerCase().includes(project.name.toLowerCase())).length,
    };
  });

  const revenueTotal = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || invoice.total), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const pendingRecovery = outstandingInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)), 0);

  const monthlyFinance = Array.from({ length: 6 }).map((_, index) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const key = formatMonthKey(d);
    const revenue = paidInvoices
      .filter((invoice) => formatMonthKey(invoice.paidDate ?? invoice.createdAt) === key)
      .reduce((sum, invoice) => sum + Number(invoice.amountPaid || invoice.total), 0);
    const expenditure = expenses
      .filter((expense) => formatMonthKey(expense.date) === key)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
    return { period: formatMonthLabel(d), revenue: roundCurrency(revenue), expenditure: roundCurrency(expenditure), profit: roundCurrency(revenue - expenditure) };
  });

  const rangeMetrics = {
    week: {
      projects: projects.filter((p) => p.startDate && p.startDate >= weekStart).length,
      revenue: paidInvoices.filter((i) => (i.paidDate ?? i.createdAt) >= weekStart).reduce((sum, i) => sum + Number(i.amountPaid || i.total), 0),
      expenditure: expenses.filter((expense) => expense.date >= weekStart).reduce((sum, expense) => sum + Number(expense.amount), 0),
      attendance: attendanceRecent.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length,
    },
    month: {
      projects: projects.filter((p) => p.startDate && p.startDate >= monthStart).length,
      revenue: paidInvoices.filter((i) => (i.paidDate ?? i.createdAt) >= monthStart).reduce((sum, i) => sum + Number(i.amountPaid || i.total), 0),
      expenditure: expenses.filter((expense) => expense.date >= monthStart).reduce((sum, expense) => sum + Number(expense.amount), 0),
      attendance: attendanceRecent.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length,
    },
    year: {
      projects: projects.filter((p) => p.startDate && p.startDate >= yearStart).length,
      revenue: paidInvoices.filter((i) => (i.paidDate ?? i.createdAt) >= yearStart).reduce((sum, i) => sum + Number(i.amountPaid || i.total), 0),
      expenditure: expenses.filter((expense) => expense.date >= yearStart).reduce((sum, expense) => sum + Number(expense.amount), 0),
      attendance: attendanceRecent.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length,
    },
    total: {
      projects: projects.length,
      revenue: revenueTotal,
      expenditure: expenseTotal,
      attendance: attendanceToday.length,
    },
  };

  const attendanceTrend = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(weekStart, index);
    const next = addDays(day, 1);
    const rows = attendanceRecent.filter((a) => a.date >= day && a.date < next);
    return {
      day: formatDayLabel(day),
      present: rows.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length,
      absent: rows.filter((a) => a.status === "ABSENT").length,
      hours: Math.round(rows.reduce((sum, a) => sum + Number(a.totalHours ?? 0), 0) * 10) / 10,
    };
  });

  const employeeStatusData = buildStatusSeries(employees, ["ACTIVE", "ON_NOTICE", "ON_LEAVE", "RESIGNED", "TERMINATED"]);
  const activeEmployees = employees.filter((employee) => employee.status === "ACTIVE").length;
  const presentEmployees = attendanceToday.filter((entry) => ["PRESENT", "LATE"].includes(entry.status)).length;

  const assetStatusData = Object.values(
    assets.reduce<Record<string, { name: string; value: number; currentValue: number }>>((acc, asset) => {
      const key = asset.status || "UNKNOWN";
      if (!acc[key]) acc[key] = { name: normalizeStatus(key), value: 0, currentValue: 0 };
      acc[key].value += 1;
      acc[key].currentValue += Number(asset.currentValue ?? asset.purchaseCost ?? 0);
      return acc;
    }, {})
  ).map((item) => ({ ...item, currentValue: roundCurrency(item.currentValue) }));

  const inventoryByWarehouse = Object.values(
    warehouseStock.reduce<Record<string, { warehouse: string; city: string; quantity: number; reserved: number; value: number; lowStock: number }>>((acc, stock) => {
      const key = stock.warehouse?.name ?? "Unassigned";
      if (!acc[key]) acc[key] = { warehouse: key, city: stock.warehouse?.city ?? "-", quantity: 0, reserved: 0, value: 0, lowStock: 0 };
      acc[key].quantity += stock.quantity;
      acc[key].reserved += stock.reservedQty;
      acc[key].value += stock.quantity * Number(stock.product.costPrice);
      if (stock.quantity <= stock.product.minStock) acc[key].lowStock += 1;
      return acc;
    }, {})
  ).map((item) => ({ ...item, value: roundCurrency(item.value) }));

  const mapItems = [
    ...contactsWithLocation.map((contact) => ({
      type: "Project/Client",
      name: contact.company || [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      location: [contact.city, contact.state].filter(Boolean).join(", ") || "No city",
      latitude: contact.latitude,
      longitude: contact.longitude,
      status: "Client location",
    })),
    ...warehouses.map((warehouse) => ({
      type: "Inventory",
      name: warehouse.name,
      location: [warehouse.city, warehouse.state].filter(Boolean).join(", ") || "No city",
      latitude: null,
      longitude: null,
      status: warehouse.isActive ? "Active" : "Inactive",
    })),
    ...visits.slice(0, 10).map((visit) => ({
      type: "Movement",
      name: visit.purpose,
      location: visit.location || visit.contact?.city || "Field visit",
      latitude: visit.contact?.latitude ?? null,
      longitude: visit.contact?.longitude ?? null,
      status: normalizeStatus(visit.status),
    })),
  ].slice(0, 35);

  return {
    rangeMetrics,
    project: {
      summary: {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "IN_PROGRESS").length,
        completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
        averageProgress,
        budget: roundCurrency(projectBudget),
        spent: roundCurrency(projectSpent),
        variance: roundCurrency(projectBudget - projectSpent),
        overdueTasks,
        overdueMilestones,
      },
      statusData: projectStatusData,
      taskStatusData,
      locations: projectLocations,
      resources: projectResources,
      projects: projects.slice(0, 8).map((project) => ({
        id: project.id,
        name: project.name,
        code: project.code,
        clientName: project.clientName,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        budget: roundCurrency(Number(project.budget ?? 0)),
        spent: roundCurrency(Number(project.spent ?? 0)),
        scope: {
          tasks: project._count.tasks,
          milestones: project._count.milestones,
          timesheets: project._count.timesheets,
          tickets: project._count.tickets,
        },
      })),
    },
    finance: {
      summary: {
        revenue: roundCurrency(revenueTotal),
        expenditure: roundCurrency(expenseTotal),
        profitLoss: roundCurrency(revenueTotal - expenseTotal),
        projectBudget: roundCurrency(projectBudget),
        projectSpent: roundCurrency(projectSpent),
        pendingRecovery: roundCurrency(pendingRecovery),
      },
      monthlyFinance,
      projectProfitability: projects.slice(0, 8).map((project) => ({
        name: project.name,
        budget: roundCurrency(Number(project.budget ?? 0)),
        spent: roundCurrency(Number(project.spent ?? 0)),
        profitLoss: roundCurrency(Number(project.budget ?? 0) - Number(project.spent ?? 0)),
      })),
      pendingRecoveries: outstandingInvoices.slice(0, 8).map((invoice) => ({
        status: normalizeStatus(invoice.status),
        amountDue: roundCurrency(Math.max(0, Number(invoice.total) - Number(invoice.amountPaid))),
        daysOverdue: invoice.dueDate ? Math.max(0, Math.floor((today.getTime() - invoice.dueDate.getTime()) / 86400000)) : 0,
      })),
    },
    attendance: {
      totalEmployees: employees.length,
      activeEmployees,
      presentToday: presentEmployees,
      absentToday: attendanceToday.filter((entry) => entry.status === "ABSENT").length,
      lateToday: attendanceToday.filter((entry) => entry.status === "LATE").length,
      notCheckedIn: Math.max(0, activeEmployees - attendanceToday.length),
      trend: attendanceTrend,
      byStatus: buildStatusSeries(attendanceToday, ["PRESENT", "LATE", "ABSENT", "HALF_DAY", "ON_LEAVE"]),
    },
    humanResources: {
      totalEmployees: employees.length,
      activeEmployees,
      utilizationRate: activeEmployees ? Math.round((presentEmployees / activeEmployees) * 100) : 0,
      byStatus: employeeStatusData,
      byDesignation: Object.values(
        employees.reduce<Record<string, { name: string; value: number }>>((acc, employee) => {
          const key = employee.designation || "Unassigned";
          if (!acc[key]) acc[key] = { name: key, value: 0 };
          acc[key].value += 1;
          return acc;
        }, {})
      ).slice(0, 8),
    },
    inventory: {
      assets: assets.length,
      activeAssets: assets.filter((asset) => asset.status === "ACTIVE").length,
      inventoryQty: warehouseStock.reduce((sum, stock) => sum + stock.quantity, 0),
      reservedQty: warehouseStock.reduce((sum, stock) => sum + stock.reservedQty, 0),
      inventoryValue: roundCurrency(warehouseStock.reduce((sum, stock) => sum + stock.quantity * Number(stock.product.costPrice), 0)),
      lowStockItems: warehouseStock.filter((stock) => stock.quantity <= stock.product.minStock).length,
      assetStatusData,
      inventoryByWarehouse,
      recentMovements: movements.map((movement) => ({
        product: movement.product.name,
        type: movement.type,
        quantity: movement.quantity,
        warehouse: movement.warehouse?.name ?? "Unassigned",
        city: movement.warehouse?.city ?? "-",
      })),
    },
    map: {
      items: mapItems,
      movementCount: visits.length + movements.length,
      locatedItems: mapItems.filter((item) => item.latitude !== null && item.longitude !== null).length,
      locationCount: new Set(mapItems.map((item) => item.location)).size,
    },
  };
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

  // ---- Expense Breakdown / Invoice Distribution by Status (DASH-F004) ----
  // Since there's no full expense module yet, derive a category-wise breakdown
  // from invoices grouped by status, showing both count and total amount per status.
  const statusAmounts: Record<string, number> = {};
  for (const inv of allInvoices) {
    statusAmounts[inv.status] = (statusAmounts[inv.status] ?? 0) + Number(inv.total);
  }
  const expenseBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status: status.replace("_", " "),
    count,
    amount: statusAmounts[status] ?? 0,
  }));

  // ---- Pending Recoveries (DASH-F003) ----
  const outstandingInvoices = await prisma.invoice.findMany({
    where: {
      ...tenantScope(tenantId),
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: {
      id: true,
      invoiceNo: true,
      total: true,
      amountPaid: true,
      status: true,
      dueDate: true,
      contact: { select: { firstName: true, lastName: true, company: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const pendingRecoveries = outstandingInvoices.map((inv) => {
    const amountDue = Number(inv.total) - Number(inv.amountPaid);
    const daysOverdue = inv.dueDate
      ? Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const contactName = inv.contact
      ? [inv.contact.firstName, inv.contact.lastName].filter(Boolean).join(" ")
      : "Unknown";
    return {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      contactName,
      company: inv.contact?.company ?? null,
      amountDue,
      daysOverdue,
      status: inv.status,
      bucket: daysOverdue <= 30 ? "0-30" : daysOverdue <= 60 ? "31-60" : daysOverdue <= 90 ? "61-90" : "90+" as string,
    };
  });

  const ageingBuckets = [
    { bucket: "0-30 days", amount: 0, count: 0 },
    { bucket: "31-60 days", amount: 0, count: 0 },
    { bucket: "61-90 days", amount: 0, count: 0 },
    { bucket: "90+ days", amount: 0, count: 0 },
  ];
  for (const rec of pendingRecoveries) {
    const idx = rec.bucket === "0-30" ? 0 : rec.bucket === "31-60" ? 1 : rec.bucket === "61-90" ? 2 : 3;
    ageingBuckets[idx].amount += rec.amountDue;
    ageingBuckets[idx].count += 1;
  }

  // ---- Cash Flow (DASH-F005) ----
  const payments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: sixMonthsAgo },
      invoice: tenantScope(tenantId),
    },
    select: { amount: true, paidAt: true },
  });

  const inflowByMonth: Record<string, number> = {};
  for (const p of payments) {
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
    inflowByMonth[key] = (inflowByMonth[key] ?? 0) + Number(p.amount);
  }

  const cashFlow = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
    cashFlow.push({ month: label, inflow: inflowByMonth[key] ?? 0, outflow: 0 });
  }

  return {
    monthlyRevenue,
    invoiceBreakdown,
    expenseBreakdown,
    totals: {
      revenue: totalRevenue,
      outstanding: totalOutstanding,
      overdue: totalOverdue,
      invoiceCount: allInvoices.length,
    },
    pendingRecoveries,
    ageingBuckets,
    cashFlow,
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
// Sub-Module 10: Project Dashboard
// ============================================================================

export async function getProjectDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const [totalProjects, inProgress, completed, overdueTasks] = await Promise.all([
    prisma.project.count({ where: tenantScope(tenantId) }),
    prisma.project.count({ where: { ...tenantScope(tenantId), status: "IN_PROGRESS" } }),
    prisma.project.count({ where: { ...tenantScope(tenantId), status: "COMPLETED" } }),
    prisma.task.count({
      where: {
        ...tenantScope(tenantId),
        status: { not: "DONE" },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  return { totalProjects, inProgress, completed, overdueTasks };
}

// ============================================================================
// Sub-Module 8: Attendance Dashboard
// ============================================================================

export async function getAttendanceDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalEmployees, presentToday, absentToday, lateToday] = await Promise.all([
    prisma.employee.count({ where: { ...tenantScope(tenantId), status: "ACTIVE" } }),
    prisma.attendance.count({
      where: {
        ...tenantScope(tenantId),
        date: { gte: today, lt: tomorrow },
        status: "PRESENT",
      },
    }),
    prisma.attendance.count({
      where: {
        ...tenantScope(tenantId),
        date: { gte: today, lt: tomorrow },
        status: "ABSENT",
      },
    }),
    prisma.attendance.count({
      where: {
        ...tenantScope(tenantId),
        date: { gte: today, lt: tomorrow },
        status: "LATE",
      },
    }),
  ]);

  return { totalEmployees, presentToday, absentToday, lateToday };
}

// ============================================================================
// Sub-Module 8: HRM Dashboard
// ============================================================================

export async function getHrmDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [pendingLeaves, openPositions, newHiresThisMonth] = await Promise.all([
    prisma.leaveRequest.count({
      where: { ...tenantScope(tenantId), status: "PENDING" },
    }),
    prisma.jobPosting.count({
      where: { ...tenantScope(tenantId), status: "OPEN" },
    }),
    prisma.employee.count({
      where: {
        ...tenantScope(tenantId),
        dateOfJoining: { gte: startOfMonth },
      },
    }),
  ]);

  return { pendingLeaves, openPositions, newHiresThisMonth };
}

// ============================================================================
// Sub-Module 7: Inventory Dashboard
// ============================================================================

export async function getInventoryDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const [totalProducts, pendingMfgOrders] = await Promise.all([
    prisma.product.count({ where: { ...tenantScope(tenantId), isActive: true } }),
    prisma.manufacturingOrder.count({
      where: {
        ...tenantScope(tenantId),
        status: { in: ["DRAFT", "CONFIRMED", "IN_PROGRESS", "QUALITY_CHECK"] },
      },
    }),
  ]);

  // Low stock alerts: products where total warehouse stock <= minStock
  const products = await prisma.product.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    select: {
      id: true,
      minStock: true,
      costPrice: true,
      warehouseStock: { select: { quantity: true } },
    },
  });

  let lowStockAlerts = 0;
  let totalStockValue = 0;

  for (const p of products) {
    const totalQty = p.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
    totalStockValue += totalQty * Number(p.costPrice);
    if (totalQty <= p.minStock) {
      lowStockAlerts++;
    }
  }

  return { totalProducts, lowStockAlerts, totalStockValue, pendingMfgOrders };
}

// ============================================================================
// Sub-Module 10: Ticket Dashboard
// ============================================================================

export async function getTicketDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [openTickets, urgentTickets, resolvedThisMonth] = await Promise.all([
    prisma.ticket.count({
      where: { ...tenantScope(tenantId), status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
    }),
    prisma.ticket.count({
      where: { ...tenantScope(tenantId), priority: "URGENT", status: { not: "CLOSED" } },
    }),
    prisma.ticket.count({
      where: {
        ...tenantScope(tenantId),
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { gte: startOfMonth },
      },
    }),
  ]);

  return { openTickets, urgentTickets, resolvedThisMonth };
}

// ============================================================================
// Sub-Module 6: Marketing Dashboard
// ============================================================================

export async function getMarketingDashboard() {
  const { tenantId } = await getSessionOrThrow();

  const [activeCampaigns, upcomingEvents] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        ...tenantScope(tenantId),
        status: { in: ["SENDING", "SENT", "SCHEDULED"] },
      },
      select: { totalSent: true, totalOpened: true },
    }),
    prisma.marketingEvent.count({
      where: {
        ...tenantScope(tenantId),
        startDate: { gte: new Date() },
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
    }),
  ]);

  const totalSent = activeCampaigns.reduce((sum, c) => sum + c.totalSent, 0);
  const totalOpened = activeCampaigns.reduce((sum, c) => sum + c.totalOpened, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return {
    activeCampaigns: activeCampaigns.length,
    totalSent,
    avgOpenRate,
    upcomingEvents,
  };
}

// ============================================================================
// Module 6: Marketing (Extended)
// ============================================================================

export async function getMarketingDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const [totalCampaigns, activeCampaigns, recentCampaigns, upcomingEvents, eventAttendees] =
    await Promise.all([
      prisma.campaign.count({ where: tenantScope(tenantId) }),
      prisma.campaign.findMany({
        where: {
          ...tenantScope(tenantId),
          status: { in: ["SENDING", "SENT", "SCHEDULED"] },
        },
        select: { totalSent: true, totalOpened: true },
      }),
      prisma.campaign.findMany({
        where: tenantScope(tenantId),
        select: { id: true, name: true, status: true, totalSent: true, totalOpened: true, sentAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.marketingEvent.findMany({
        where: {
          ...tenantScope(tenantId),
          startDate: { gte: new Date() },
          status: { in: ["DRAFT", "PUBLISHED"] },
        },
        select: { id: true, title: true, startDate: true, capacity: true },
        orderBy: { startDate: "asc" },
        take: 5,
      }),
      prisma.eventAttendee.count({
        where: {
          event: tenantScope(tenantId),
        },
      }),
    ]);

  const totalSent = activeCampaigns.reduce((sum, c) => sum + c.totalSent, 0);
  const totalOpened = activeCampaigns.reduce((sum, c) => sum + c.totalOpened, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return {
    totalCampaigns,
    activeCampaignCount: activeCampaigns.length,
    totalSent,
    avgOpenRate,
    recentCampaigns,
    upcomingEvents,
    totalAttendees: eventAttendees,
  };
}

// ============================================================================
// Module 7: Supply Chain / Inventory (Extended)
// ============================================================================

export async function getInventoryDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const [totalProducts, warehouseCount, mfgOrders, recentMovements] = await Promise.all([
    prisma.product.count({ where: { ...tenantScope(tenantId), isActive: true } }),
    prisma.warehouse.count({ where: tenantScope(tenantId) }),
    prisma.manufacturingOrder.findMany({
      where: tenantScope(tenantId),
      select: { status: true },
    }),
    prisma.stockMovement.findMany({
      where: tenantScope(tenantId),
      select: { id: true, type: true, quantity: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Products with stock data for low-stock alerts and value
  const products = await prisma.product.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    select: {
      id: true,
      minStock: true,
      costPrice: true,
      warehouseStock: { select: { quantity: true } },
    },
  });

  let lowStockCount = 0;
  let totalStockValue = 0;
  for (const p of products) {
    const totalQty = p.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
    totalStockValue += totalQty * Number(p.costPrice);
    if (totalQty <= p.minStock) lowStockCount++;
  }

  // Manufacturing orders by status
  const mfgByStatus: Record<string, number> = {};
  for (const o of mfgOrders) {
    mfgByStatus[o.status] = (mfgByStatus[o.status] ?? 0) + 1;
  }
  const mfgStatusData = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "QUALITY_CHECK", "COMPLETED", "CANCELLED"].map(
    (s) => ({ status: s.replace("_", " "), count: mfgByStatus[s] ?? 0 })
  );

  return {
    totalProducts,
    warehouseCount,
    lowStockCount,
    totalStockValue,
    mfgStatusData,
    recentMovements,
  };
}

// ============================================================================
// Module 8: HRM (Extended)
// ============================================================================

export async function getHRMDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalEmployees,
    newHiresThisMonth,
    onLeaveToday,
    pendingLeaves,
    approvedLeavesThisMonth,
    upcomingReviews,
  ] = await Promise.all([
    prisma.employee.count({ where: { ...tenantScope(tenantId), status: "ACTIVE" } }),
    prisma.employee.count({
      where: { ...tenantScope(tenantId), dateOfJoining: { gte: startOfMonth } },
    }),
    prisma.attendance.count({
      where: {
        ...tenantScope(tenantId),
        date: { gte: today, lt: tomorrow },
        status: "ON_LEAVE",
      },
    }),
    prisma.leaveRequest.count({
      where: { ...tenantScope(tenantId), status: "PENDING" },
    }),
    prisma.leaveRequest.count({
      where: {
        ...tenantScope(tenantId),
        status: "APPROVED",
        approvedAt: { gte: startOfMonth },
      },
    }),
    prisma.performanceReview.count({
      where: { ...tenantScope(tenantId), status: "DRAFT" },
    }),
  ]);

  return {
    totalEmployees,
    newHiresThisMonth,
    onLeaveToday,
    pendingLeaves,
    approvedLeavesThisMonth,
    upcomingReviews,
  };
}

// ============================================================================
// Module 10: Projects (Extended)
// ============================================================================

export async function getProjectsDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [
    activeProjects,
    completedProjects,
    todoTasks,
    inProgressTasks,
    doneTasks,
    overdueTasks,
    openTickets,
    ticketsByPriority,
    timesheets,
  ] = await Promise.all([
    prisma.project.count({ where: { ...tenantScope(tenantId), status: "IN_PROGRESS" } }),
    prisma.project.count({ where: { ...tenantScope(tenantId), status: "COMPLETED" } }),
    prisma.task.count({ where: { ...tenantScope(tenantId), status: "TODO" } }),
    prisma.task.count({ where: { ...tenantScope(tenantId), status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { ...tenantScope(tenantId), status: "DONE" } }),
    prisma.task.count({
      where: {
        ...tenantScope(tenantId),
        status: { not: "DONE" },
        dueDate: { lt: new Date() },
      },
    }),
    prisma.ticket.count({
      where: { ...tenantScope(tenantId), status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
    }),
    prisma.ticket.groupBy({
      by: ["priority"],
      where: { ...tenantScope(tenantId), status: { not: "CLOSED" } },
      _count: true,
    }),
    prisma.timesheet.findMany({
      where: {
        ...tenantScope(tenantId),
        date: { gte: startOfWeek, lt: endOfWeek },
      },
      select: { hours: true, isBillable: true },
    }),
  ]);

  const ticketPriorityData = ["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => ({
    name: p,
    value: ticketsByPriority.find((t) => t.priority === p)?._count ?? 0,
  }));

  const totalHoursThisWeek = timesheets.reduce((sum, t) => sum + Number(t.hours), 0);
  const billableHours = timesheets.filter((t) => t.isBillable).reduce((sum, t) => sum + Number(t.hours), 0);
  const nonBillableHours = totalHoursThisWeek - billableHours;

  return {
    activeProjects,
    completedProjects,
    overdueTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
    openTickets,
    ticketPriorityData,
    totalHoursThisWeek: Math.round(totalHoursThisWeek * 10) / 10,
    billableHours: Math.round(billableHours * 10) / 10,
    nonBillableHours: Math.round(nonBillableHours * 10) / 10,
  };
}

// ============================================================================
// Module 11: Website/CMS
// ============================================================================

export async function getWebsiteDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const [publishedPages, totalPages, publishedPosts, totalPosts, forumTopics, faqItems, openConversations] =
    await Promise.all([
      prisma.webPage.count({ where: { ...tenantScope(tenantId), isPublished: true } }),
      prisma.webPage.count({ where: tenantScope(tenantId) }),
      prisma.blogPost.count({ where: { ...tenantScope(tenantId), status: "PUBLISHED" } }),
      prisma.blogPost.count({ where: tenantScope(tenantId) }),
      prisma.forumTopic.count({ where: tenantScope(tenantId) }),
      prisma.fAQItem.count({ where: { ...tenantScope(tenantId), isPublished: true } }),
      prisma.chatConversation.count({
        where: { ...tenantScope(tenantId), status: { in: ["OPEN", "ASSIGNED"] } },
      }),
    ]);

  return {
    publishedPages,
    totalPages,
    publishedPosts,
    totalPosts,
    forumTopics,
    faqItems,
    openConversations,
  };
}

// ============================================================================
// Module 13: Office
// ============================================================================

export async function getOfficeDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [documents, spreadsheets, presentations, unreadEmails, activeChannels, messagesToday] =
    await Promise.all([
      prisma.officeDocument.count({ where: { ...tenantScope(tenantId), createdAt: { gte: startOfMonth } } }),
      prisma.spreadsheet.count({ where: { ...tenantScope(tenantId), createdAt: { gte: startOfMonth } } }),
      prisma.presentation.count({ where: { ...tenantScope(tenantId), createdAt: { gte: startOfMonth } } }),
      prisma.emailMessage.count({
        where: { ...tenantScope(tenantId), isRead: false, folder: "INBOX" },
      }),
      prisma.chatChannel.count({ where: tenantScope(tenantId) }),
      prisma.chatMessage.count({
        where: {
          ...tenantScope(tenantId),
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
    ]);

  return {
    documentsThisMonth: documents,
    spreadsheetsThisMonth: spreadsheets,
    presentationsThisMonth: presentations,
    unreadEmails,
    activeChannels,
    messagesToday,
  };
}

// ============================================================================
// Attendance/Resource (Extended with weekly trend)
// ============================================================================

export async function getAttendanceDashboardData() {
  const { tenantId } = await getSessionOrThrow();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalEmployees, presentToday, lateToday, absentToday] = await Promise.all([
    prisma.employee.count({ where: { ...tenantScope(tenantId), status: "ACTIVE" } }),
    prisma.attendance.count({
      where: { ...tenantScope(tenantId), date: { gte: today, lt: tomorrow }, status: "PRESENT" },
    }),
    prisma.attendance.count({
      where: { ...tenantScope(tenantId), date: { gte: today, lt: tomorrow }, status: "LATE" },
    }),
    prisma.attendance.count({
      where: { ...tenantScope(tenantId), date: { gte: today, lt: tomorrow }, status: "ABSENT" },
    }),
  ]);

  // Weekly attendance trend (last 7 days)
  const weeklyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const present = await prisma.attendance.count({
      where: {
        ...tenantScope(tenantId),
        date: { gte: dayStart, lt: dayEnd },
        status: { in: ["PRESENT", "LATE"] },
      },
    });
    const label = dayStart.toLocaleString("en", { weekday: "short" });
    weeklyTrend.push({ day: label, present });
  }

  return {
    totalEmployees,
    presentToday,
    lateToday,
    absentToday,
    notCheckedIn: Math.max(0, totalEmployees - presentToday - lateToday - absentToday),
    weeklyTrend,
  };
}

// ============================================================================
// Quick Metrics: Upcoming Deadlines & Recent Activity
// ============================================================================

export async function getQuickMetrics() {
  const { tenantId } = await getSessionOrThrow();

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const [tasksDueThisWeek, invoicesDueThisWeek, recentActivity] = await Promise.all([
    prisma.task.count({
      where: {
        ...tenantScope(tenantId),
        status: { not: "DONE" },
        dueDate: { gte: now, lte: endOfWeek },
      },
    }),
    prisma.invoice.count({
      where: {
        ...tenantScope(tenantId),
        status: { in: ["SENT", "PARTIALLY_PAID"] },
        dueDate: { gte: now, lte: endOfWeek },
      },
    }),
    prisma.auditLog.findMany({
      where: tenantScope(tenantId),
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    tasksDueThisWeek,
    invoicesDueThisWeek,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      userName: a.user?.name ?? "System",
      createdAt: a.createdAt.toISOString(),
    })),
  };
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
