"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Building2,
  FileText,
  IndianRupee,
  Star,
  Clock,
  Download,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/export";
import type { VendorReportData } from "@/lib/actions/organization";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

const starColor = (rating: number) => {
  if (rating >= 4) return "text-green-500";
  if (rating >= 3) return "text-amber-500";
  return "text-red-500";
};

const paymentStatusColors: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
};

const projectStatusColors: Record<string, string> = {
  "On Track": "bg-green-100 text-green-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Delayed: "bg-red-100 text-red-700",
};

type Props = {
  data: VendorReportData;
};

export function VendorReportClient({ data }: Props) {
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-12-31");

  const { summary, ratingDistribution, workAwardedByVendor, workStatusByVendor, projectTimelines, paymentStatus } = data;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);

  const handleExportCSV = () => {
    const headers = ["Vendor", "Total Work Value", "Contracts"];
    const rows = workAwardedByVendor.map((v) => [
      v.vendorName,
      String(v.totalWorkValue),
      String(v.contractCount),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`vendor-report-${fromDate}`, csv);
  };

  const handleExportPaymentCSV = () => {
    const headers = ["Vendor", "Invoice No", "Amount", "Due Date", "Status"];
    const rows = paymentStatus.map((p) => [
      p.vendorName,
      p.invoiceNo,
      String(p.amount),
      p.dueDate,
      p.status,
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`vendor-payments-${fromDate}`, csv);
  };

  const ratingChartData = ratingDistribution.map((r) => ({
    name: `${r.rating}★`,
    value: r.vendorCount,
    rating: r.rating,
  }));

  const workStatusChartData = workStatusByVendor.slice(0, 6).map((v) => ({
    name: v.vendorName.length > 15 ? v.vendorName.slice(0, 15) + "..." : v.vendorName,
    completed: v.completed,
    ongoing: v.ongoing,
    pending: v.pending,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendor Report</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
            />
          </div>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              {summary.totalVendors}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              {summary.activeContracts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Awarded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-purple-500" />
              {formatCurrency(summary.totalAwardedValue).replace("₹", "")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Star className={`h-5 w-5 ${starColor(summary.avgRating)}`} />
              {summary.avgRating}
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.onTimeDelivery}% on-time delivery
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Work Awarded by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={workAwardedByVendor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                />
                <YAxis
                  dataKey="vendorName"
                  type="category"
                  width={150}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Bar dataKey="totalWorkValue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={ratingChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {ratingChartData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[entry.rating - 1] || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Status by Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead className="text-center">Ongoing</TableHead>
                <TableHead className="text-center">Pending</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workStatusByVendor.map((v) => (
                <TableRow key={v.vendorName}>
                  <TableCell className="font-medium">{v.vendorName}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">
                    {v.completed}
                  </TableCell>
                  <TableCell className="text-center text-blue-600">
                    {v.ongoing}
                  </TableCell>
                  <TableCell className="text-center text-amber-600">
                    {v.pending}
                  </TableCell>
                  <TableCell className="text-center">{v.total}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-[100px] rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{
                            width: `${(v.completed / v.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {((v.completed / v.total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Timelines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor / Project</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTimelines.map((p) => (
                  <TableRow key={`${p.vendorName}-${p.project}`}>
                    <TableCell>
                      <div className="font-medium">{p.project}</div>
                      <div className="text-xs text-muted-foreground">{p.vendorName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(p.startDate).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        –{" "}
                        {new Date(p.endDate).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(p.value)}
                    </TableCell>
                    <TableCell>
                      <Badge className={projectStatusColors[p.status] || "bg-gray-100"}>
                        {p.status === "Delayed" && (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        )}
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payment Status</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportPaymentCSV}>
              <Download className="mr-1 h-3 w-3" /> Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentStatus.map((p) => (
                <div
                  key={p.invoiceNo}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium text-sm">{p.vendorName}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.invoiceNo} · Due{" "}
                      {new Date(p.dueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">
                      {formatCurrency(p.amount)}
                    </span>
                    <Badge
                      className={paymentStatusColors[p.status] || "bg-gray-100"}
                    >
                      {p.status === "Overdue" && (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {p.status === "Paid" && (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      )}
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
