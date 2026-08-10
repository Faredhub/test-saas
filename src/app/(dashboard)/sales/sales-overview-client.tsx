"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Award,
  Clock,
  Briefcase,
  FileText,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type SalesOverviewProps = {
  stats: {
    leadsCount: number;
    customersCount: number;
    invoicesCount: number;
    invoicesTotalAmount: number;
    openDealsCount: number;
    pipelineValue: number;
    winRate: number;
    closeRate: number;
    avgDayToClose: number;
    avgOpenDealAge: number;
    topDeals: Array<{ id: string; title: string; value: number; stage: string; contact?: { firstName: string; lastName?: string | null } | null }>;
    dealTracking: Array<{ stage: string; count: number; value: number }>;
    salesForecasting: Array<{ month: string; value: number }>;
  };
};

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

export function SalesOverviewClient({ stats }: SalesOverviewProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time executive deal tracking, win rates, forecasting, and revenue metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales/quotations">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4 text-blue-600" /> Quotations
            </Button>
          </Link>
          <Link href="/sales/orders">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Briefcase className="h-4 w-4" /> Sales Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.pipelineValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.openDealsCount} Open Deals in Active Pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate %</CardTitle>
            <Award className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Close Rate: {stats.closeRate}%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Days to Close</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDayToClose} Days</div>
            <p className="text-xs text-muted-foreground mt-1">Avg Open Deal Age: {stats.avgOpenDealAge} Days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.invoicesTotalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.invoicesCount} Total Invoices Generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Tracking Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-blue-600" /> Pipeline Deal Tracking
            </CardTitle>
            <CardDescription>Breakdown of deal stages by count and value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dealTracking} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [formatINR(Number(value)), "Value"]} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Forecasting Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Sales Forecasting
            </CardTitle>
            <CardDescription>Projected revenue distribution by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salesForecasting} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [formatINR(Number(value)), "Projected"]} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Leaderboard & Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Deals List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Top Open Deals</CardTitle>
              <CardDescription>Highest value deals currently in progress</CardDescription>
            </div>
            <Link href="/sales/deals">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.topDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No open deals found.</p>
            ) : (
              <div className="space-y-3">
                {stats.topDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                    <div>
                      <h4 className="text-sm font-semibold">{deal.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName || ""}` : "No contact assigned"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">{formatINR(deal.value)}</div>
                      <Badge variant="outline" className="text-[10px] uppercase">{deal.stage}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sales Quick Stats</CardTitle>
            <CardDescription>Directory totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Active Leads</span>
              </div>
              <span className="text-sm font-bold">{stats.leadsCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Customers</span>
              </div>
              <span className="text-sm font-bold">{stats.customersCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Invoices Issued</span>
              </div>
              <span className="text-sm font-bold">{stats.invoicesCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
