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
  Globe, MessageSquare, FileEdit, StickyNote,
  FolderOpen, Sheet, Presentation, Hash,
  Target, Activity, Timer, ClipboardList,
  UserPlus, CalendarClock, Star, Map,
} from "lucide-react";
import Link from "next/link";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateCSV, downloadCSV } from "@/lib/export";
import { CivilDashboard } from "./civil-dashboard";
import { ProjectDashboardTab } from "./project-dashboard-tab";
import { FinanceDashboardTab } from "./finance-dashboard-tab";
import { AttendanceDashboardTab } from "./attendance-dashboard-tab";
import { ResourcesDashboardTab } from "./resources-dashboard-tab";
import { MapDashboardTab } from "./map-dashboard-tab";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6b7280", "#ec4899", "#06b6d4"];

const stageColors: Record<string, string> = {
  NEW: "#3b82f6",
  QUALIFIED: "#8b5cf6",
  PROPOSAL: "#f59e0b",
  NEGOTIATION: "#f97316",
  WON: "#10b981",
  LOST: "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#6b7280",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
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
  marketingExt: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getMarketingDashboardData>>;
  inventoryExt: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getInventoryDashboardData>>;
  hrmExt: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getHRMDashboardData>>;
  projectsExt: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getProjectsDashboardData>>;
  website: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getWebsiteDashboardData>>;
  office: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getOfficeDashboardData>>;
  attendanceExt: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getAttendanceDashboardData>>;
  quickMetrics: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getQuickMetrics>>;
  civil: Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getCivilIndustryDashboard>>;
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardClient({
  overview, sales, finance, project, attendance, hrm, inventory, tickets, marketing,
  marketingExt, inventoryExt, hrmExt, projectsExt, website, office, attendanceExt, quickMetrics, civil,
}: Props) {
  const activeCategory = useSidebarStore((s) => s.activeCategory);

  const isOverview = !activeCategory || activeCategory === "overview";
  const isSales = activeCategory === "sales";
  const isFinance = activeCategory === "finance";
  const isHRM = activeCategory === "hrm";
  const isProjects = activeCategory === "projects";
  const isInventory = activeCategory === "Site Store" || activeCategory === "inventory";
  const isMarketing = activeCategory === "marketing";
  const isWebsite = activeCategory === "website";
  const isOffice = activeCategory === "office";

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

  // Attendance donut data
  const attendanceDonutData = [
    { name: "Present", value: attendanceExt.presentToday, color: "#10b981" },
    { name: "Late", value: attendanceExt.lateToday, color: "#f59e0b" },
    { name: "Absent", value: attendanceExt.absentToday, color: "#ef4444" },
    { name: "Not Checked In", value: attendanceExt.notCheckedIn, color: "#d1d5db" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 dashboard-print-area">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isFinance ? "Finance Dashboard" : isSales ? "Sales CRM Dashboard" : isHRM ? "Human Resources Dashboard" : isProjects ? "Projects & Tasks Dashboard" : isInventory ? "Inventory Dashboard" : isMarketing ? "Marketing Dashboard" : isWebsite ? "Website CMS Dashboard" : isOffice ? "Office Communications Dashboard" : "Business Intelligence Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFinance ? "Financial analytics, revenue trends, and invoices" : isSales ? "Pipeline summary, conversion rates, and deals tracking" : isHRM ? "Workforce roster, attendance trends, and leave tracker" : isProjects ? "Project timelines, task allocations, and timesheets" : isInventory ? "Stock levels, warehouses, and low stock alerts" : isMarketing ? "Campaign performance, sent emails, and events metrics" : isWebsite ? "Visitor analytics, published pages, and blog summaries" : isOffice ? "Team announcements, shared documents, and communication logs" : "Global business intelligence and department-level analytics"}
          </p>
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
      {isOverview && (
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
              <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
      )}

      {/* CivilDashboard only shows when navigating to Projects via sidebar */}
      {isProjects && <CivilDashboard data={civil} />}

      {/* ================================================================ */}
      {/* 5-Tab BI Overview: Project / Finance / Attendance / Resources / Map */}
      {/* IMPORTANT: TabsContent isolation means ONLY active tab content shows */}
      {/* ================================================================ */}
      {isOverview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Business Intelligence
            </h2>
          </div>
          <Tabs defaultValue="project" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1 mb-2 w-full justify-start">
              <TabsTrigger value="project" className="flex items-center gap-1.5 text-sm">
                <FolderKanban className="h-3.5 w-3.5" /> Project
              </TabsTrigger>
              <TabsTrigger value="finance" className="flex items-center gap-1.5 text-sm">
                <IndianRupee className="h-3.5 w-3.5" /> Finance
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-sm">
                <UserCheck className="h-3.5 w-3.5" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-1.5 text-sm">
                <Users className="h-3.5 w-3.5" /> Resources
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-1.5 text-sm">
                <Map className="h-3.5 w-3.5" /> Map
              </TabsTrigger>
            </TabsList>
            <TabsContent value="project">
              <ProjectDashboardTab projectsExt={projectsExt} project={project} />
            </TabsContent>
            <TabsContent value="finance">
              <FinanceDashboardTab finance={finance} overview={overview} />
            </TabsContent>
            <TabsContent value="attendance">
              <AttendanceDashboardTab attendance={attendanceExt} hrm={hrm} />
            </TabsContent>
            <TabsContent value="resources">
              <ResourcesDashboardTab hrmExt={hrmExt} inventoryExt={inventoryExt} projectsExt={projectsExt} />
            </TabsContent>
            <TabsContent value="map">
              <MapDashboardTab projectsExt={projectsExt} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Tabbed Dashboard — Sales/Finance sidebar navigation */}
      {(isSales || isFinance) && (
        <Tabs defaultValue={isSales ? "sales" : "finance"} value={isSales ? "sales" : "finance"}>

          {/* Sales Tab */}
          {isSales && (
            <TabsContent value="sales" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Conversion Rate */}
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="lg:col-span-2 hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
          )}

          {/* Finance Tab */}
          {isFinance && (
            <TabsContent value="finance" className="space-y-6">
              {/* Finance Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 tabular-nums">
                      {formatINR(finance.totals.revenue)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600 tabular-nums">
                      {formatINR(finance.totals.outstanding)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Overdue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 tabular-nums">
                      {formatINR(finance.totals.overdue)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="lg:col-span-2 hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
              <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
                <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
              <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
          )}
        </Tabs>
      )}

      {/* ================================================================ */}
      {/* Marketing & Events */}
      {/* ================================================================ */}
      {isMarketing && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Marketing &amp; Events</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Campaign Performance */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{marketingExt.activeCampaignCount}</p>
                    <p className="text-xs text-muted-foreground">Active Campaigns</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{marketingExt.totalSent.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Emails Sent</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{marketingExt.avgOpenRate}%</p>
                    <p className="text-xs text-muted-foreground">Avg Open Rate</p>
                  </div>
                </div>
                {marketingExt.recentCampaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet</p>
                ) : (
                  <div className="space-y-2">
                    {marketingExt.recentCampaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                        <div className="truncate flex-1 mr-2">{c.name}</div>
                        <Badge variant={c.status === "SENT" ? "default" : "outline"} className="text-xs shrink-0">
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Overview */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Event Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{marketingExt.upcomingEvents.length}</p>
                    <p className="text-xs text-muted-foreground">Upcoming Events</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{marketingExt.totalAttendees.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Attendees</p>
                  </div>
                </div>
                {marketingExt.upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
                ) : (
                  <div className="space-y-2">
                    {marketingExt.upcomingEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                        <div className="truncate flex-1 mr-2">{e.title}</div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(e.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Inventory & Supply Chain */}
      {/* ================================================================ */}
      {isInventory && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Inventory &amp; Supply Chain</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stock Alerts */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4" /> Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{inventoryExt.lowStockCount}</p>
                    <p className="text-xs text-muted-foreground">Low Stock Items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{inventoryExt.totalProducts}</p>
                    <p className="text-xs text-muted-foreground">Total Products</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{inventoryExt.warehouseCount}</p>
                    <p className="text-xs text-muted-foreground">Warehouses</p>
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Stock Value</span>
                    <span className="font-semibold text-green-600">{formatINR(inventoryExt.totalStockValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manufacturing Status */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Factory className="h-4 w-4" /> Manufacturing Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryExt.mfgStatusData.every((d) => d.count === 0) ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No manufacturing orders yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inventoryExt.mfgStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="status" type="category" className="text-xs" width={90} />
                      <Tooltip />
                      <Bar dataKey="count" name="Orders" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* HRM */}
      {/* ================================================================ */}
      {isHRM && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Human Resources</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Workforce Overview */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Workforce Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Total Employees
                    </div>
                    <span className="text-xl font-bold text-blue-600">{hrmExt.totalEmployees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserPlus className="h-3.5 w-3.5" /> New Hires This Month
                    </div>
                    <span className="text-xl font-bold text-green-600">{hrmExt.newHiresThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserX className="h-3.5 w-3.5" /> On Leave Today
                    </div>
                    <span className="text-xl font-bold text-amber-600">{hrmExt.onLeaveToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5" /> Pending Reviews
                    </div>
                    <span className="text-xl font-bold text-purple-600">{hrmExt.upcomingReviews}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Today */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Attendance Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceDonutData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No attendance data yet</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={attendanceDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {attendanceDonutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {attendanceDonutData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="ml-auto font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Leave Requests */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">{hrmExt.pendingLeaves}</p>
                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Approved This Month</span>
                      <span className="font-semibold text-green-600">{hrmExt.approvedLeavesThisMonth}</span>
                    </div>
                  </div>
                  {hrmExt.pendingLeaves === 0 && (
                    <p className="text-xs text-muted-foreground text-center">All leave requests are processed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Projects & Tickets */}
      {/* ================================================================ */}
      {isProjects && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Projects &amp; Tickets</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Project Status */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" /> Project Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Badge variant="default">{projectsExt.activeProjects}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">{projectsExt.completedProjects}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overdue Tasks</span>
                    <Badge variant={projectsExt.overdueTasks > 0 ? "destructive" : "outline"}>{projectsExt.overdueTasks}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Overview */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Task Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">To Do</span>
                    <span className="font-semibold">{projectsExt.todoTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <span className="font-semibold text-blue-600">{projectsExt.inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Done</span>
                    <span className="font-semibold text-green-600">{projectsExt.doneTasks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Open Tickets by Priority */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TicketCheck className="h-4 w-4" /> Open Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectsExt.ticketPriorityData.every((d) => d.value === 0) ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No open tickets</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie
                          data={projectsExt.ticketPriorityData.filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={55}
                          dataKey="value"
                          label={({ name, value }) => `${value}`}
                        >
                          {projectsExt.ticketPriorityData.filter((d) => d.value > 0).map((entry, i) => (
                            <Cell key={i} fill={PRIORITY_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {projectsExt.ticketPriorityData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[d.name] ?? "#6b7280" }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="ml-auto font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timesheet Hours */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-4 w-4" /> Timesheet Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-3">
                  <p className="text-3xl font-bold">{projectsExt.totalHoursThisWeek}h</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billable</span>
                    <span className="font-medium text-green-600">{projectsExt.billableHours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Non-billable</span>
                    <span className="font-medium text-gray-500">{projectsExt.nonBillableHours}h</span>
                  </div>
                  {projectsExt.totalHoursThisWeek > 0 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${(projectsExt.billableHours / projectsExt.totalHoursThisWeek) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Website & CMS */}
      {/* ================================================================ */}
      {/* Website & CMS — sidebar navigation only */}
      {isWebsite && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Website &amp; CMS</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Content Stats */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Content Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                      <FileEdit className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{website.publishedPages}</p>
                      <p className="text-xs text-muted-foreground">Published Pages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950">
                      <StickyNote className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{website.publishedPosts}</p>
                      <p className="text-xs text-muted-foreground">Blog Posts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{website.forumTopics}</p>
                      <p className="text-xs text-muted-foreground">Forum Topics</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
                      <ClipboardList className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{website.faqItems}</p>
                      <p className="text-xs text-muted-foreground">FAQ Items</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Support */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Chat Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-blue-600">{website.openConversations}</p>
                  <p className="text-sm text-muted-foreground">Open Conversations</p>
                </div>
                {website.openConversations === 0 ? (
                  <div className="rounded-md bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">No open conversations right now</p>
                  </div>
                ) : (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {website.openConversations} conversation{website.openConversations !== 1 ? "s" : ""} waiting for response
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Office */}
      {/* ================================================================ */}
      {/* Office — sidebar navigation only */}
      {isOffice && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Office</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Documents Activity */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" /> Documents Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Created this month</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xl font-bold mt-1">{office.documentsThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Docs</p>
                  </div>
                  <div className="text-center">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                      <Sheet className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-xl font-bold mt-1">{office.spreadsheetsThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Sheets</p>
                  </div>
                  <div className="text-center">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
                      <Presentation className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="text-xl font-bold mt-1">{office.presentationsThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Slides</p>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Unread Emails
                    </span>
                    <span className="font-semibold text-red-600">{office.unreadEmails}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages Today */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4" /> Messages Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{office.messagesToday}</p>
                    <p className="text-sm text-muted-foreground">Messages Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{office.activeChannels}</p>
                    <p className="text-sm text-muted-foreground">Active Channels</p>
                  </div>
                </div>
                {office.messagesToday === 0 && (
                  <div className="mt-4 rounded-md bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">No messages sent today yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Attendance Weekly Trend */}
      {/* ================================================================ */}
      {isHRM && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Attendance Trend</h2>
          <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Weekly Attendance (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceExt.weeklyTrend.every((d) => d.present === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No attendance data for the past week</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={attendanceExt.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* Quick Metrics */}
      {/* ================================================================ */}
      {isOverview && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Metrics</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Deadlines */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" /> Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Due this week</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{quickMetrics.tasksDueThisWeek}</p>
                    <p className="text-xs text-muted-foreground">Tasks Due</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{quickMetrics.invoicesDueThisWeek}</p>
                    <p className="text-xs text-muted-foreground">Invoices Due</p>
                  </div>
                </div>
                {quickMetrics.tasksDueThisWeek === 0 && quickMetrics.invoicesDueThisWeek === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-3">Nothing due this week</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quickMetrics.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {quickMetrics.recentActivity.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-sm border-b last:border-0 pb-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">
                            <span className="font-medium">{a.userName}</span>{" "}
                            <span className="text-muted-foreground">{a.action}</span>
                            {a.entity && (
                              <span className="text-muted-foreground"> on {a.entity}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Legacy Section Cards (kept for backward compatibility) */}
      {/* ================================================================ */}

      {/* Project Overview */}
      {isProjects && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Project Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Projects", value: project.totalProjects, icon: FolderKanban, color: "text-blue-600" },
              { label: "In Progress", value: project.inProgress, icon: ListChecks, color: "text-amber-600" },
              { label: "Completed", value: project.completed, icon: CheckCircle2, color: "text-green-600" },
              { label: "Overdue Tasks", value: project.overdueTasks, icon: Clock, color: "text-red-600" },
            ].map((stat) => (
              <Card key={stat.label} className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
      )}

      {/* HR & Attendance */}
      {isHRM && (
        <div>
          <h2 className="text-lg font-semibold mb-3">HR &amp; Attendance</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Employees", value: attendance.totalEmployees, icon: Users, color: "text-blue-600" },
              { label: "Present Today", value: attendance.presentToday, icon: UserCheck, color: "text-green-600" },
              { label: "Pending Leaves", value: hrm.pendingLeaves, icon: UserX, color: "text-amber-600" },
              { label: "Open Positions", value: hrm.openPositions, icon: BriefcaseBusiness, color: "text-purple-600" },
            ].map((stat) => (
              <Card key={stat.label} className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
      )}

      {/* Inventory & Supply Chain */}
      {isInventory && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Inventory &amp; Supply Chain</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Products", value: inventory.totalProducts, icon: Package, color: "text-blue-600", fmt: false },
              { label: "Low Stock Alerts", value: inventory.lowStockAlerts, icon: AlertOctagon, color: "text-red-600", fmt: false },
              { label: "Stock Value", value: inventory.totalStockValue, icon: Warehouse, color: "text-green-600", fmt: true },
              { label: "Pending MFG Orders", value: inventory.pendingMfgOrders, icon: Factory, color: "text-amber-600", fmt: false },
            ].map((stat) => (
              <Card key={stat.label} className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
      )}

      {/* Support & Tickets */}
      {isProjects && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Support &amp; Tickets</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Open Tickets", value: tickets.openTickets, icon: TicketCheck, color: "text-blue-600" },
              { label: "Urgent", value: tickets.urgentTickets, icon: Flame, color: "text-red-600" },
              { label: "Resolved This Month", value: tickets.resolvedThisMonth, icon: TicketSlash, color: "text-green-600" },
            ].map((stat) => (
              <Card key={stat.label} className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
      )}

      {/* Marketing */}
      {isMarketing && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Marketing</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Campaigns", value: marketing.activeCampaigns, icon: Zap, color: "text-purple-600" },
              { label: "Emails Sent", value: marketing.totalSent.toLocaleString(), icon: Mail, color: "text-blue-600" },
              { label: "Avg Open Rate %", value: `${marketing.avgOpenRate}%`, icon: BarChart3, color: "text-green-600" },
              { label: "Upcoming Events", value: marketing.upcomingEvents, icon: Calendar, color: "text-amber-600" },
            ].map((stat) => (
              <Card key={stat.label} className="hover:border-primary/20 hover:shadow-md transition-all duration-200">
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
      )}
    </div>
  );
}
