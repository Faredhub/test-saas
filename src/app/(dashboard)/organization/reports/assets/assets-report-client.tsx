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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Package,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Wrench,
  Download,
  CalendarDays,
  TrendingDown,
  Clock,
} from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/export";
import type { AssetsReportData } from "@/lib/actions/organization";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6b7280"];

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
  "Expiring Soon": "bg-amber-100 text-amber-700",
  Expired: "bg-red-100 text-red-700",
};

type Props = {
  data: AssetsReportData;
};

export function AssetsReportClient({ data }: Props) {
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-12-31");

  const { summary, valueHistory, maintenanceSchedule, insuranceTracking, ageDistribution, sparePartsUtilization } = data;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);

  const handleExportCSV = () => {
    const headers = ["Category", "Count", "Value (INR)"];
    const rows = summary.categories.map((c) => [c.name, String(c.count), String(c.value)]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`assets-report-${fromDate}`, csv);
  };

  const handleExportMaintenanceCSV = () => {
    const headers = ["Asset", "Category", "Last Maintenance", "Next Maintenance", "Status", "Cost"];
    const rows = maintenanceSchedule.map((m) => [
      m.assetName,
      m.category,
      m.lastMaintenance,
      m.nextMaintenance,
      m.status,
      String(m.cost),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`assets-maintenance-${fromDate}`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets Report</h1>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              {summary.totalAssets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              {summary.activeAssets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              {summary.maintenanceAssets}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalCurrentValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Acquired at {formatCurrency(summary.totalAcquisitionValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={valueHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 10000000).toFixed(1)}Cr`} />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Line
                  type="monotone"
                  dataKey="acquisitionValue"
                  stroke="#3b82f6"
                  name="Acquisition Value"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="currentValue"
                  stroke="#ef4444"
                  name="Current Value"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageDistribution}
                  dataKey="count"
                  nameKey="ageRange"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {ageDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={summary.categories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Bar dataKey="value" fill="#8b5cf6" name="Value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.categories.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{c.count} units</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(c.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Maintenance Schedule</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportMaintenanceCSV}>
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Last Maintenance</TableHead>
                <TableHead>Next Maintenance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceSchedule.map((m) => (
                <TableRow key={m.assetId}>
                  <TableCell className="font-medium">
                    {m.assetName}
                    <div className="text-xs text-muted-foreground">{m.assetId}</div>
                  </TableCell>
                  <TableCell>{m.category}</TableCell>
                  <TableCell>
                    {new Date(m.lastMaintenance).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    {new Date(m.nextMaintenance).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[m.status] || "bg-gray-100"}>
                      {m.status === "Overdue" && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(m.cost)}
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
            <CardTitle>Insurance Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Policy No</TableHead>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insuranceTracking.map((ins) => (
                  <TableRow key={ins.policyNo}>
                    <TableCell className="font-medium">{ins.assetName}</TableCell>
                    <TableCell className="text-xs">{ins.policyNo}</TableCell>
                    <TableCell>{ins.insurer}</TableCell>
                    <TableCell>
                      {new Date(ins.expiryDate).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[ins.status] || "bg-gray-100"}>
                        {ins.status === "Expiring Soon" && (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {ins.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spare Parts Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sparePartsUtilization.map((sp, idx) => (
                  <TableRow key={`${sp.assetName}-${sp.sparePart}-${idx}`}>
                    <TableCell className="font-medium text-sm">{sp.assetName}</TableCell>
                    <TableCell>{sp.sparePart}</TableCell>
                    <TableCell className="text-right">{sp.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sp.unitCost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sp.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
