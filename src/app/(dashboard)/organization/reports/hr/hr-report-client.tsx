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
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Download,
  ChevronDown,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/export";
import type { HRReportData } from "@/lib/actions/organization";

type Props = {
  data: HRReportData;
};

export function HRReportClient({ data }: Props) {
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-12-31");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const { summary, salaryDistribution, performanceDistribution, projectAllocation, departmentEmployees } = data;

  const handleExportCSV = () => {
    const headers = ["Department", "Employee Count"];
    const rows = summary.departments.map((d) => [d.name, String(d.count)]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`hr-report-${fromDate}-to-${toDate}`, csv);
  };

  const handleExportEmployeesCSV = () => {
    const headers = ["Name", "ID", "Department", "Designation", "Project", "Allocation %"];
    const rows = projectAllocation.map((e) => [
      e.employeeName,
      e.employeeId,
      e.department,
      e.designation,
      e.project,
      String(e.allocation),
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`hr-employees-${fromDate}`, csv);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);

  const toggleDept = (dept: string) => {
    setExpandedDept((prev) => (prev === dept ? null : dept));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">HR Report</h1>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {summary.totalEmployees}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              {summary.activeEmployees}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.newHiresThisMonth} new hires this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-amber-500" />
              {summary.onLeave}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attrition Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              {summary.attritionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.terminated} terminated
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salary Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={salaryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Bar dataKey="avgSalary" fill="#3b82f6" name="Avg Salary" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={performanceDistribution}
                  dataKey="count"
                  nameKey="rating"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {performanceDistribution.map((entry, i) => (
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
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {summary.departments.map((d) => (
                <div key={d.name}>
                  <button
                    className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-muted"
                    onClick={() => toggleDept(d.name)}
                  >
                    <span className="font-medium">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{d.count}</Badge>
                      {expandedDept === d.name ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {expandedDept === d.name && (
                    <div className="ml-4 space-y-1 py-1">
                      {departmentEmployees
                        .find((de) => de.department === d.name)
                        ?.employees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between rounded px-3 py-1.5 text-sm hover:bg-muted"
                          >
                            <span>{emp.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {emp.designation}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
                                {emp.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Project Allocation</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportEmployeesCSV}>
              <Download className="mr-1 h-3 w-3" /> Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Allocation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectAllocation.map((p) => (
                  <TableRow key={p.employeeId}>
                    <TableCell className="font-medium">
                      {p.employeeName}
                      <div className="text-xs text-muted-foreground">{p.employeeId}</div>
                    </TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.project}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          p.allocation >= 80
                            ? "bg-green-100 text-green-700"
                            : p.allocation >= 50
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }
                      >
                        {p.allocation}%
                      </Badge>
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
