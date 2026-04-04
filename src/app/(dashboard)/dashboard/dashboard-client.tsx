"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import {
  Users, UserCircle, ShoppingCart, Receipt, FileText,
  Megaphone, CalendarDays, TrendingUp, IndianRupee, AlertTriangle, Wallet,
  Download, Printer, ChevronDown, PieChart as PieChartIcon,
  FolderKanban, ListChecks, CheckCircle2, Clock,
  UserCheck, UserX, BriefcaseBusiness,
  Package, AlertOctagon, Warehouse, Factory,
  TicketCheck, Flame, TicketSlash,
  Zap, Mail, BarChart3, Calendar,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateCSV, downloadCSV } from "@/lib/export";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6b7280", "#ec4899", "#06b6d4"];

const stageColors: Record<string, string> = {
  NEW: "#3b82f6",
  QUALIFIED: "#8b5cf6",
  PROPOSAL: "#f59e0b",
  NEGOTIATION: "#f97316",
  WON: "#10b981",
  LOST: "#ef4444",
};

type Props = {
  overview: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getDashboardOverview>>;
  sales: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getSalesDashboard>>;
  finance: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getFinanceDashboard>>;
  project: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getProjectDashboard>>;
  attendance: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getAttendanceDashboard>>;
  hrm: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getHrmDashboard>>;
  inventory: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getInventoryDashboard>>;
  tickets: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getTicketDashboard>>;
  marketing: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getMarketingDashboard>>;
};

function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipINR = (value: any) => formatINR(Number(value));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipINROrCount = (value: any, name: any) => String(name) === "value" || String(name) === "Amount Due" ? formatINR(Number(value)) : value;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  SENT: "#3b82f6",
  PAID: "#10b981",
  OVERDUE: "#ef4444",
  CANCELLED: "#f59e0b",
  PARTIALLY_PAID: "#8b5cf6",
  "PARTIALLY PAID": "#8b5cf6",
};

export function DashboardClient({ overview, sales, finance, project, attendance, hrm, inventory, tickets, marketing }: Props) {
  const handleExportCSV = () => {
    const headers = [
      "Metric", "Value",
    ];
    const rows: string[][] = [
      ["Total Revenue", String(finance.totals.revenue)],
      ["Outstanding", String(finance.totals.outstanding)],
      ["Overdue", String(finance.totals.overdue)],
      ["Total Invoices", String(finance.totals.invoiceCount)],
      ["Total Leads", String(overview.totalLeads)],
      ["Total Contacts", String(overview.totalContacts)],
      ["Total Deals", String(overview.totalDeals)],
      ["Total Quotations", String(overview.totalQuotations)],
      ["Total Announcements", String(overview.totalAnnouncements)],
      ["Upcoming Events", String(overview.totalEvents)],
      ["Sales Conversion Rate", `${sales.conversionRate}%`],
      [],
      ["--- Invoice Distribution by Status ---", ""],
      ["Status", "Count", "Amount"].slice(0, 2),
    ];
    for (const item of finance.expenseBreakdown) {
      rows.push([item.status, String(item.count), String(item.amount)]);
    }
    rows.push([]);
    rows.push(["--- Monthly Revenue ---", ""]);
    for (const m of finance.monthlyRevenue) {
      rows.push([m.month, String(m.revenue)]);
    }
    rows.push([]);
    rows.push(["--- Pipeline Stages ---", ""]);
    for (const p of sales.pipelineCounts) {
      rows.push([p.stage, String(p.count)]);
    }
    rows.push([]);
    rows.push(["--- Ageing Buckets ---", ""]);
    rows.push(["Bucket", "Amount", "Count"]);
    for (const b of finance.ageingBuckets) {
      rows.push([b.bucket, String(b.amount), String(b.count)]);
    }

    const csv = generateCSV(headers, rows);
    downloadCSV(`dashboard-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 dashboard-print-area">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Business intelligence and analytics</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="no-print inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileText className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Dashboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Leads", value: overview.totalLeads, icon: Users, href: "/sales/leads" },
          { label: "Contacts", value: overview.totalContacts, icon: UserCircle, href: "/sales/contacts" },
          { label: "Deals", value: overview.totalDeals, icon: ShoppingCart, href: "/sales/deals" },
          { label: "Quotations", value: overview.totalQuotations, icon: FileText, href: "/sales/quotations" },
          { label: "Invoices", value: overview.totalInvoices, icon: Receipt, href: "/sales/invoices" },
          { label: "Notices", value: overview.totalAnnouncements, icon: Megaphone, href: "/organization/notices" },
          { label: "Events", value: overview.totalEvents, icon: CalendarDays, href: "/organization/calendar" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-primary/20 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversion Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Pipeline Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6">
                  <div>
                    <p className="text-3xl font-bold">{sales.totalLeads}</p>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">{sales.conversionRate}%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {sales.pipelineCounts.map((p) => (
                    <div key={p.stage} className="flex items-center gap-3">
                      <div className="w-20 text-xs font-medium">{p.stage}</div>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${sales.totalLeads > 0 ? (p.count / sales.totalLeads) * 100 : 0}%`,
                            backgroundColor: stageColors[p.stage] ?? "#6b7280",
                            minWidth: p.count > 0 ? "1rem" : 0,
                          }}
                        />
                      </div>
                      <div className="w-8 text-right text-sm font-medium">{p.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lead Sources Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.sourceData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={sales.sourceData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {sales.sourceData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Deal Pipeline Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Deal Pipeline by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.dealsByStage.every((d) => d.count === 0) ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No deals yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sales.dealsByStage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="stage" className="text-xs" />
                      <YAxis yAxisId="count" orientation="left" className="text-xs" />
                      <YAxis yAxisId="value" orientation="right" tickFormatter={(v) => formatINR(v)} className="text-xs" />
                      <Tooltip formatter={tooltipINROrCount} />
                      <Legend />
                      <Bar yAxisId="count" dataKey="count" fill="#3b82f6" name="Deals" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="value" dataKey="value" fill="#10b981" name="Value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          {/* Finance Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 tabular-nums">
                  {formatINR(finance.totals.revenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 tabular-nums">
                  {formatINR(finance.totals.outstanding)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 tabular-nums">
                  {formatINR(finance.totals.overdue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{finance.totals.invoiceCount}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Revenue Area Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" /> Monthly Revenue (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={finance.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => formatINR(v)} className="text-xs" />
                    <Tooltip formatter={tooltipINR} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Invoice Status Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {finance.invoiceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={finance.invoiceBreakdown} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {finance.invoiceBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Cash Flow Area Chart (DASH-F005) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Cash Flow (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {finance.cashFlow.every((c) => c.inflow === 0 && c.outflow === 0) ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center text-muted-foreground">
                      <IndianRupee className="mx-auto h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Cash flow visualization will be available</p>
                      <p className="text-xs">once payment data is recorded</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={finance.cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis tickFormatter={(v: number) => formatINR(v)} className="text-xs" />
                      <Tooltip formatter={tooltipINR} />
                      <Legend />
                      <Area type="monotone" dataKey="inflow" name="Inflows" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="outflow" name="Outflows" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Distribution by Status — DASH-F004 Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" /> Invoice Distribution by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finance.expenseBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No invoice data yet</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={finance.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        dataKey="amount"
                        nameKey="status"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        label={({ status, amount }: any) => `${status}: ${formatINR(Number(amount))}`}
                      >
                        {finance.expenseBreakdown.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={STATUS_COLORS[entry.status.toUpperCase()] ?? COLORS[i % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipINR} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {finance.expenseBreakdown.map((item, i) => (
                      <div key={item.status} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[item.status.toUpperCase()] ?? COLORS[i % COLORS.length] }}
                        />
                        <span className="truncate">{item.status}</span>
                        <span className="ml-auto font-medium tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending Recoveries & Budget (DASH-F003, DASH-F006) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ageing Buckets Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Ageing Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {finance.ageingBuckets.every((b) => b.count === 0) ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No outstanding invoices</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={finance.ageingBuckets}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="bucket" className="text-xs" />
                      <YAxis tickFormatter={(v: number) => formatINR(v)} className="text-xs" />
                      <Tooltip
                        formatter={tooltipINROrCount}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Amount Due" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="count" name="Invoices" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Budget vs Actual Placeholder (DASH-F006) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Budget vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { category: "Revenue", budget: 500000, actual: finance.totals.revenue },
                    { category: "Expenses", budget: 300000, actual: 0 },
                    { category: "Profit", budget: 200000, actual: finance.totals.revenue },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" className="text-xs" />
                    <YAxis tickFormatter={(v: number) => formatINR(v)} className="text-xs" />
                    <Tooltip formatter={tooltipINR} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#6b7280" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 rounded-md border border-dashed border-muted-foreground/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Budget data is using sample values. Set up budgets in the <span className="font-medium text-foreground">Finance module</span> for accurate comparisons.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Recoveries Table (DASH-F003) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Pending Recoveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finance.pendingRecoveries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No pending recoveries</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Invoice</th>
                        <th className="pb-2 font-medium">Contact</th>
                        <th className="pb-2 font-medium text-right">Amount Due</th>
                        <th className="pb-2 font-medium text-right">Days Overdue</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finance.pendingRecoveries.slice(0, 10).map((rec) => (
                        <tr key={rec.id} className="border-b last:border-0">
                          <td className="py-2 font-mono text-xs">{rec.invoiceNo}</td>
                          <td className="py-2">
                            <div>{rec.contactName}</div>
                            {rec.company && <div className="text-xs text-muted-foreground">{rec.company}</div>}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">{formatINR(rec.amountDue)}</td>
                          <td className="py-2 text-right tabular-nums">
                            <Badge variant={rec.daysOverdue > 60 ? "destructive" : rec.daysOverdue > 30 ? "secondary" : "outline"}>
                              {rec.daysOverdue}d
                            </Badge>
                          </td>
                          <td className="py-2">
                            <Badge variant={rec.status === "OVERDUE" ? "destructive" : "outline"}>
                              {rec.status.replace("_", " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {finance.pendingRecoveries.length > 10 && (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      Showing 10 of {finance.pendingRecoveries.length} outstanding invoices
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Project Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Project Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Projects", value: project.totalProjects, icon: FolderKanban, color: "text-blue-600" },
            { label: "In Progress", value: project.inProgress, icon: ListChecks, color: "text-amber-600" },
            { label: "Completed", value: project.completed, icon: CheckCircle2, color: "text-green-600" },
            { label: "Overdue Tasks", value: project.overdueTasks, icon: Clock, color: "text-red-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* HR & Attendance */}
      <div>
        <h2 className="text-lg font-semibold mb-3">HR &amp; Attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Employees", value: attendance.totalEmployees, icon: Users, color: "text-blue-600" },
            { label: "Present Today", value: attendance.presentToday, icon: UserCheck, color: "text-green-600" },
            { label: "Pending Leaves", value: hrm.pendingLeaves, icon: UserX, color: "text-amber-600" },
            { label: "Open Positions", value: hrm.openPositions, icon: BriefcaseBusiness, color: "text-purple-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Inventory & Supply Chain */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Inventory &amp; Supply Chain</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Products", value: inventory.totalProducts, icon: Package, color: "text-blue-600", fmt: false },
            { label: "Low Stock Alerts", value: inventory.lowStockAlerts, icon: AlertOctagon, color: "text-red-600", fmt: false },
            { label: "Stock Value", value: inventory.totalStockValue, icon: Warehouse, color: "text-green-600", fmt: true },
            { label: "Pending MFG Orders", value: inventory.pendingMfgOrders, icon: Factory, color: "text-amber-600", fmt: false },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.fmt ? formatINR(Number(stat.value)) : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Support & Tickets */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Support &amp; Tickets</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Open Tickets", value: tickets.openTickets, icon: TicketCheck, color: "text-blue-600" },
            { label: "Urgent", value: tickets.urgentTickets, icon: Flame, color: "text-red-600" },
            { label: "Resolved This Month", value: tickets.resolvedThisMonth, icon: TicketSlash, color: "text-green-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Marketing */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Marketing</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active Campaigns", value: marketing.activeCampaigns, icon: Zap, color: "text-purple-600" },
            { label: "Emails Sent", value: marketing.totalSent.toLocaleString(), icon: Mail, color: "text-blue-600" },
            { label: "Avg Open Rate %", value: `${marketing.avgOpenRate}%`, icon: BarChart3, color: "text-green-600" },
            { label: "Upcoming Events", value: marketing.upcomingEvents, icon: Calendar, color: "text-amber-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
