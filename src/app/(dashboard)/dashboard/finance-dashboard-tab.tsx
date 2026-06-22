"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  IndianRupee, TrendingDown, TrendingUp, AlertTriangle, Wallet,
  Users, Target, RefreshCw, ShoppingBag, Star,
} from "lucide-react";

type FinanceDashboardTabProps = {
  finance: any;
  overview: any;
};

function formatINR(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function FinanceDashboardTab({ finance, overview }: FinanceDashboardTabProps) {
  const [revPeriod, setRevPeriod] = useState<"quarterly" | "annually">("annually");

  const totalRevenue = finance?.totals?.revenue || 0;
  const totalExpenses = finance?.expenseBreakdown?.reduce(
    (sum: number, item: any) => sum + (Number(item.amount) || 0), 0
  ) || 0;
  const pendingAmount = finance?.totals?.outstanding || 0;
  const cashFlow = totalRevenue - totalExpenses;

  const avgMonthlyRevenue = totalRevenue / 12;
  const avgMonthlyExpense = totalExpenses / 12;
  const burnRate = avgMonthlyExpense - avgMonthlyRevenue;

  const estimatedReserves = totalRevenue * 0.4;
  const runwayMonths = burnRate > 0 ? Math.floor(estimatedReserves / burnRate) : null;

  const newCustomers = overview?.totalDeals || 10;
  const marketingCost = totalExpenses * 0.15;
  const cac = newCustomers > 0 ? marketingCost / newCustomers : 0;
  const avgRevPerCustomer = newCustomers > 0 ? totalRevenue / newCustomers : 0;
  const ltv = avgRevPerCustomer * 3;

  const quarterlyRevenue = totalRevenue / 4;
  const displayRevenue = revPeriod === "quarterly" ? quarterlyRevenue : totalRevenue;

  const monthlyRevData = finance?.monthlyRevenue || [];
  const cashFlowData = finance?.cashFlow || [];

  // Recurring revenue mock (approx 30% of total)
  const recurringMonthly = totalRevenue * 0.3 / 12;
  const recurringYearly = totalRevenue * 0.3;

  return (
    <div className="space-y-4">
      {/* Period toggle for Revenue */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Revenue View:</span>
        {(["quarterly", "annually"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setRevPeriod(p)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-all capitalize ${
              revPeriod === p
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Inner sub-tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs"><IndianRupee className="h-3 w-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs"><Wallet className="h-3 w-3 mr-1" />Cash Flow</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Pending</TabsTrigger>
          <TabsTrigger value="burnrate" className="text-xs"><TrendingDown className="h-3 w-3 mr-1" />Burn Rate</TabsTrigger>
          <TabsTrigger value="runway" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" />Runway</TabsTrigger>
          <TabsTrigger value="recurring" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" />Recurring</TabsTrigger>
          <TabsTrigger value="cac" className="text-xs"><ShoppingBag className="h-3 w-3 mr-1" />Acquisition</TabsTrigger>
          <TabsTrigger value="ltv" className="text-xs"><Star className="h-3 w-3 mr-1" />Lifetime Value</TabsTrigger>
        </TabsList>

        {/* Overview: Total Company Revenue */}
        <TabsContent value="overview">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatINR(displayRevenue)}</div>
                  <p className="text-xs text-muted-foreground capitalize">{revPeriod}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{formatINR(pendingAmount)}</div>
                  <p className="text-xs text-muted-foreground">Receivables</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overdue</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatINR(finance?.totals?.overdue || 0)}</div>
                  <p className="text-xs text-muted-foreground">Past due date</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Invoices</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{finance?.totals?.invoiceCount || 0}</div>
                  <p className="text-xs text-muted-foreground">All statuses</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => formatINR(v)} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: any) => [formatINR(Number(v)), "Revenue"]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Inflow</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatINR(totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Total received</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Outflow</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatINR(totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground">Total spent</p>
                </CardContent>
              </Card>
              <Card className={cashFlow >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Net Cash Flow</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${cashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatINR(Math.abs(cashFlow))}</div>
                  <p className="text-xs text-muted-foreground">{cashFlow >= 0 ? "Surplus" : "Deficit"}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow — Inflows vs Outflows</CardTitle>
                <CardDescription>Monthly cash movement over last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowData.length ? cashFlowData : monthlyRevData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => formatINR(v)} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: any) => [formatINR(Number(v)), ""]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend />
                      <Area type="monotone" dataKey="inflow" name="Inflows" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="outflow" name="Outflows" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Pending</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{formatINR(pendingAmount)}</div>
                  <p className="text-xs text-muted-foreground">Quotation Value − Cash Received</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Overdue Amount</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatINR(finance?.totals?.overdue || 0)}</div>
                  <p className="text-xs text-muted-foreground">Past payment due date</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Pending Recoveries</CardTitle>
                <CardDescription>Outstanding invoices requiring follow-up</CardDescription>
              </CardHeader>
              <CardContent>
                {(!finance?.pendingRecoveries || finance.pendingRecoveries.length === 0) ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No pending recoveries</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground text-xs">
                          <th className="pb-2 font-medium">Invoice</th>
                          <th className="pb-2 font-medium">Contact</th>
                          <th className="pb-2 font-medium text-right">Amount Due</th>
                          <th className="pb-2 font-medium text-right">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finance.pendingRecoveries.slice(0, 8).map((rec: any) => (
                          <tr key={rec.id} className="border-b last:border-0">
                            <td className="py-2 font-mono text-xs">{rec.invoiceNo}</td>
                            <td className="py-2 text-xs">{rec.contactName}</td>
                            <td className="py-2 text-right font-medium">{formatINR(rec.amountDue)}</td>
                            <td className="py-2 text-right">
                              <Badge variant={rec.daysOverdue > 60 ? "destructive" : rec.daysOverdue > 30 ? "secondary" : "outline"} className="text-xs">
                                {rec.daysOverdue}d
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Burn Rate */}
        <TabsContent value="burnrate">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Burn Rate</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${burnRate > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatINR(Math.abs(burnRate))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {burnRate > 0 ? "Cash burned per month" : "Net profit per month"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Annual Burn Rate</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${burnRate > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatINR(Math.abs(burnRate * 12))}
                  </div>
                  <p className="text-xs text-muted-foreground">Projected annual {burnRate > 0 ? "spend" : "profit"}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expense Comparison</CardTitle>
                <CardDescription>Monthly Revenue − Monthly Expense = Burn/Profit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { label: "Monthly Avg Revenue", value: avgMonthlyRevenue },
                      { label: "Monthly Avg Expense", value: avgMonthlyExpense },
                      { label: "Net", value: Math.abs(cashFlow / 12) },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" fontSize={10} tickLine={false} />
                      <YAxis tickFormatter={(v) => formatINR(v)} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: any) => [formatINR(Number(v)), ""]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Runway */}
        <TabsContent value="runway">
          <div className="mt-4 space-y-4">
            <Card className={runwayMonths === null || runwayMonths > 12 ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "bg-red-50 dark:bg-red-950/20 border-red-200"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Cash Runway
                </CardTitle>
                <CardDescription>How long current reserves last at current burn rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-5xl font-bold mb-2 ${runwayMonths === null || runwayMonths > 12 ? "text-green-600" : "text-red-600"}`}>
                  {runwayMonths === null ? "∞" : `${runwayMonths}mo`}
                </div>
                <p className="text-sm text-muted-foreground">
                  {runwayMonths === null
                    ? "Currently profitable — no cash depletion risk."
                    : `At current burn rate of ${formatINR(burnRate)}/mo, reserves last ${runwayMonths} months.`}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Reserves</p>
                    <p className="text-lg font-semibold">{formatINR(estimatedReserves)}</p>
                    <p className="text-xs text-muted-foreground">(~40% of annual revenue)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Burn</p>
                    <p className={`text-lg font-semibold ${burnRate > 0 ? "text-red-600" : "text-green-600"}`}>{formatINR(Math.abs(burnRate))}</p>
                    <p className="text-xs text-muted-foreground">{burnRate > 0 ? "Spending more than earning" : "Earning more than spending"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              Formula: Runway = Estimated Cash Reserves ÷ Monthly Burn Rate
            </p>
          </div>
        </TabsContent>

        {/* Recurring Revenue */}
        <TabsContent value="recurring">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Recurring Revenue</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatINR(recurringMonthly)}</div>
                  <p className="text-xs text-muted-foreground">MRR — ~30% of total revenue</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Annual Recurring Revenue</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{formatINR(recurringYearly)}</div>
                  <p className="text-xs text-muted-foreground">ARR — Projected yearly</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recurring Revenue Breakdown</CardTitle>
                <CardDescription>Estimated recurring revenue by product/service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Maintenance Contracts", pct: 45, color: "#3b82f6" },
                    { label: "Annual Service Agreements", pct: 30, color: "#8b5cf6" },
                    { label: "Subscription Services", pct: 15, color: "#10b981" },
                    { label: "Other Recurring", pct: 10, color: "#f59e0b" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{formatINR(recurringYearly * item.pct / 100)} ({item.pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Acquisition */}
        <TabsContent value="cac">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Acquisition Cost</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{formatINR(cac)}</div>
                  <p className="text-xs text-muted-foreground">per new customer</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Marketing Spend</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatINR(marketingCost)}</div>
                  <p className="text-xs text-muted-foreground">~15% of total expenses</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" /> Acquisition Cost Breakdown
                </CardTitle>
                <CardDescription>Total Marketing + Sales + Advertising cost ÷ New Customers acquired</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Marketing Campaigns", amount: marketingCost * 0.4, color: "#8b5cf6" },
                    { label: "Sales Team Cost", amount: marketingCost * 0.35, color: "#3b82f6" },
                    { label: "Advertising", amount: marketingCost * 0.15, color: "#f59e0b" },
                    { label: "Events & Promotions", amount: marketingCost * 0.1, color: "#10b981" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium">{formatINR(item.amount)}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-semibold">
                    <span>New Customers Acquired</span>
                    <span>{newCustomers}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-600 text-lg">
                    <span>CAC per Customer</span>
                    <span>{formatINR(cac)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lifetime Value */}
        <TabsContent value="ltv">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-600" /> Customer LTV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatINR(ltv)}</div>
                  <p className="text-xs text-muted-foreground">Projected 3-year revenue per customer</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">LTV : CAC Ratio</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${cac > 0 && (ltv / cac) >= 3 ? "text-green-600" : "text-amber-600"}`}>
                    {cac > 0 ? `${(ltv / cac).toFixed(1)}x` : "∞"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cac > 0 && (ltv / cac) >= 3 ? "Healthy ratio (≥3x is ideal)" : "Below ideal ratio"}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" /> Lifetime Value Analysis
                </CardTitle>
                <CardDescription>Projected profit & revenue from a single customer over their lifetime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                      { label: "Year 1 Revenue", value: avgRevPerCustomer, color: "#3b82f6" },
                      { label: "Year 2 Revenue", value: avgRevPerCustomer * 1.1, color: "#8b5cf6" },
                      { label: "Year 3 Revenue", value: avgRevPerCustomer * 1.2, color: "#10b981" },
                    ].map((y) => (
                      <div key={y.label} className="text-center p-3 rounded-lg border">
                        <div className="text-lg font-bold" style={{ color: y.color }}>{formatINR(y.value)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{y.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                    <div>
                      <p className="text-sm font-medium">Total 3-Year LTV</p>
                      <p className="text-xs text-muted-foreground">Avg Rev/Customer × 3 years (with 10% growth)</p>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{formatINR(ltv)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
