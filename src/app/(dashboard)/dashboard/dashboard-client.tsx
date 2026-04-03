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
  Megaphone, CalendarDays, TrendingUp, IndianRupee,
} from "lucide-react";
import Link from "next/link";

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
};

function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function DashboardClient({ overview, sales, finance }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Business intelligence and analytics</p>
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
                      <Tooltip formatter={(value: number, name: string) => name === "value" ? formatINR(value) : value} />
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
                    <Tooltip formatter={(value: number) => formatINR(value)} />
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

            {/* Cash Flow placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cash Flow</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <IndianRupee className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Cash flow visualization will be available</p>
                  <p className="text-xs">once payment data is recorded</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
