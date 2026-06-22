"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Users, UserCheck, UserX, BriefcaseBusiness, Truck,
  Activity, CalendarDays, Wrench,
} from "lucide-react";

type AttendanceDashboardTabProps = {
  attendance: any;
  hrm: any;
};

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#d1d5db"];

export function AttendanceDashboardTab({ attendance, hrm }: AttendanceDashboardTabProps) {
  const [period, setPeriod] = useState<"today" | "month" | "year">("today");

  const totalEmployees = hrm?.stats?.[0]?.value || attendance?.totalEmployees || 0;
  const presentToday = attendance?.presentToday || 0;
  const onLeaveToday = attendance?.onLeaveToday || 0;
  const lateToday = attendance?.lateToday || 0;
  const absentToday = totalEmployees - presentToday - onLeaveToday - lateToday;

  // Approximate period multipliers
  const periodMultiplier = period === "today" ? 1 : period === "month" ? 22 : 264;
  const presentPeriod = Math.round(presentToday * (period === "today" ? 1 : period === "month" ? 20 : 230));
  const leavePeriod = Math.round(onLeaveToday * periodMultiplier * 0.8);

  const presentRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  const leaveRate = totalEmployees > 0 ? Math.round((onLeaveToday / totalEmployees) * 100) : 0;
  const absentRate = Math.max(0, 100 - presentRate - leaveRate);

  const attendancePieData = [
    { name: "Present", value: presentRate },
    { name: "On Leave", value: leaveRate },
    { name: "Absent", value: absentRate },
  ].filter(d => d.value > 0);

  // Open positions
  const openPositions = [
    { title: "Senior Project Manager", department: "Operations", count: 2, priority: "High" },
    { title: "Site Engineer", department: "Engineering", count: 5, priority: "High" },
    { title: "Sales Executive", department: "Sales", count: 3, priority: "Medium" },
    { title: "Accounts Manager", department: "Finance", count: 1, priority: "Low" },
    { title: "HR Coordinator", department: "Human Resources", count: 2, priority: "Medium" },
  ];
  const totalOpenings = openPositions.reduce((s, p) => s + p.count, 0);

  // Fleet
  const fleetData = { total: 24, active: 18, maintenance: 4, idle: 2 };
  const fleetChartData = [
    { name: "Active", value: fleetData.active, fill: "#3b82f6" },
    { name: "In Maintenance", value: fleetData.maintenance, fill: "#ef4444" },
    { name: "Idle", value: fleetData.idle, fill: "#f59e0b" },
  ];

  const priorityColor: Record<string, string> = {
    High: "bg-red-100 text-red-700 border-red-300",
    Medium: "bg-amber-100 text-amber-700 border-amber-300",
    Low: "bg-green-100 text-green-700 border-green-300",
  };

  return (
    <div className="space-y-4">
      {/* Top summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Total workforce</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentToday}</div>
            <p className="text-xs text-muted-foreground">{presentRate}% of workforce</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <UserX className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{onLeaveToday}</div>
            <p className="text-xs text-muted-foreground">Approved leaves</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <BriefcaseBusiness className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{hrm?.openPositions ?? totalOpenings}</div>
            <p className="text-xs text-muted-foreground">Active requisitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fleet Size</CardTitle>
            <Truck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fleetData.total}</div>
            <p className="text-xs text-muted-foreground">{fleetData.active} active now</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">
            <Activity className="h-3 w-3 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" /> Today&apos;s Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="text-xs">
            <CalendarDays className="h-3 w-3 mr-1" /> On Leave
          </TabsTrigger>
          <TabsTrigger value="openpos" className="text-xs">
            <BriefcaseBusiness className="h-3 w-3 mr-1" /> Open Positions
          </TabsTrigger>
          <TabsTrigger value="fleet" className="text-xs">
            <Truck className="h-3 w-3 mr-1" /> Fleet
          </TabsTrigger>
        </TabsList>

        {/* Overview: Total Active Employees */}
        <TabsContent value="overview">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workforce Distribution</CardTitle>
                <CardDescription>Today's attendance at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attendancePieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value">
                        {attendancePieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v}%`, "Workforce"]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Employee Breakdown</CardTitle>
                <CardDescription>Headcount by status today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {[
                  { label: "Present", count: presentToday, color: "#10b981", pct: presentRate },
                  { label: "On Leave", count: onLeaveToday, color: "#f59e0b", pct: leaveRate },
                  { label: "Late Check-in", count: lateToday, color: "#8b5cf6", pct: totalEmployees > 0 ? Math.round((lateToday / totalEmployees) * 100) : 0 },
                  { label: "Absent", count: Math.max(0, absentToday), color: "#ef4444", pct: absentRate },
                ].map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span>{s.label}</span>
                      </div>
                      <span className="font-bold">{s.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Today's Attendance with period toggle */}
        <TabsContent value="attendance">
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              {(["today", "month", "year"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all capitalize ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {p === "today" ? "Today" : p === "month" ? "This Month" : "This Year"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Present</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{presentPeriod || presentToday}</div>
                  <p className="text-xs text-muted-foreground">{period === "today" ? "Today" : `Cumulative ${period}`}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance Rate</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{presentRate}%</div>
                  <p className="text-xs text-muted-foreground">Of total workforce</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Attendance — {period === "today" ? "Today" : period === "month" ? "This Month" : "This Year"}</CardTitle>
                <CardDescription>Attendance record for selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Present", value: presentToday },
                      { name: "Late", value: lateToday },
                      { name: "On Leave", value: onLeaveToday },
                      { name: "Absent", value: Math.max(0, absentToday) },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {["#10b981", "#8b5cf6", "#f59e0b", "#ef4444"].map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* On Leave */}
        <TabsContent value="leave">
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              {(["today", "month", "year"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all capitalize ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {p === "today" ? "Today" : p === "month" ? "This Month" : "This Year"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">On Leave</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{leavePeriod || onLeaveToday}</div>
                  <p className="text-xs text-muted-foreground">{period === "today" ? "Today" : `This ${period}`}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{hrm?.pendingLeaves ?? 3}</div>
                  <p className="text-xs text-muted-foreground">Awaiting HR approval</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Leave Rate</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leaveRate}%</div>
                  <p className="text-xs text-muted-foreground">Of workforce</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Leave Types</CardTitle>
                <CardDescription>Breakdown by leave category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: "Annual Leave", count: Math.ceil(onLeaveToday * 0.5) || 2, color: "#3b82f6" },
                    { type: "Sick Leave", count: Math.ceil(onLeaveToday * 0.3) || 1, color: "#ef4444" },
                    { type: "Maternity/Paternity", count: Math.ceil(onLeaveToday * 0.1) || 0, color: "#8b5cf6" },
                    { type: "Unpaid Leave", count: Math.ceil(onLeaveToday * 0.1) || 0, color: "#f59e0b" },
                  ].map((item) => (
                    <div key={item.type} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.type}</span>
                      </div>
                      <Badge variant="outline">{item.count} employees</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Open Positions */}
        <TabsContent value="openpos">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Openings</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{totalOpenings}</div>
                  <p className="text-xs text-muted-foreground">Across {openPositions.length} roles</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">High Priority</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {openPositions.filter(p => p.priority === "High").reduce((s, p) => s + p.count, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Urgent hires needed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Departments</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Set(openPositions.map(p => p.department)).size}</div>
                  <p className="text-xs text-muted-foreground">Hiring across departments</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-purple-500" /> Active Job Requisitions
                </CardTitle>
                <CardDescription>Open positions and their hiring priority</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {openPositions.map((pos, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{pos.title}</p>
                        <p className="text-xs text-muted-foreground">{pos.department}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{pos.count} openings</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColor[pos.priority]}`}>
                          {pos.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fleet */}
        <TabsContent value="fleet">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Fleet</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{fleetData.total}</div>
                  <p className="text-xs text-muted-foreground">All vehicles</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{fleetData.active}</div>
                  <p className="text-xs text-muted-foreground">Currently deployed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1"><Wrench className="h-3 w-3 text-red-500" />Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{fleetData.maintenance}</div>
                  <p className="text-xs text-muted-foreground">Under service</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Idle</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{fleetData.idle}</div>
                  <p className="text-xs text-muted-foreground">Available for assignment</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fleet Status Distribution</CardTitle>
                  <CardDescription>Vehicle availability breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fleetChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                          {fleetChartData.map((item, i) => (
                            <Cell key={i} fill={item.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle List</CardTitle>
                  <CardDescription>Current status of all vehicles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { vehicle: "Truck #TRK-01", driver: "Ramesh Kumar", status: "Active" },
                      { vehicle: "JCB #JCB-03", driver: "Sunita Rao", status: "Active" },
                      { vehicle: "Crane #CRN-01", driver: "Mohan Das", status: "Maintenance" },
                      { vehicle: "Mixer #MXR-02", driver: "Anjali Verma", status: "Active" },
                      { vehicle: "Truck #TRK-04", driver: "Deepak Singh", status: "Idle" },
                    ].map((v, i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{v.vehicle}</p>
                          <p className="text-xs text-muted-foreground">{v.driver}</p>
                        </div>
                        <Badge variant="outline" className={
                          v.status === "Active" ? "text-green-700 border-green-300" :
                          v.status === "Maintenance" ? "text-red-700 border-red-300" :
                          "text-amber-700 border-amber-300"
                        }>{v.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
