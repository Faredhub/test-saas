"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  HardHat,
  IndianRupee,
  MapPinned,
  PackageCheck,
  Route,
  Users,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CivilDashboardData = Awaited<ReturnType<typeof import("@/lib/actions/dashboard").getCivilIndustryDashboard>>;

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b", "#db2777", "#a855f7"];

const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "#2563eb",
  IN_PROGRESS: "#f59e0b",
  ON_HOLD: "#a855f7",
  COMPLETED: "#16a34a",
  CANCELLED: "#dc2626",
};

const HR_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#16a34a",
  ON_LEAVE: "#f59e0b",
  ON_NOTICE: "#a855f7",
  RESIGNED: "#dc2626",
  TERMINATED: "#2563eb",
};

function getProjectStatusColor(statusName: string): string {
  const normalizedStatus = statusName.toUpperCase().replace(/\s+/g, "_");
  return PROJECT_STATUS_COLORS[normalizedStatus] || "#2563eb";
}

function getHRStatusColor(statusName: string): string {
  const normalizedStatus = statusName.toUpperCase().replace(/\s+/g, "_");
  return HR_STATUS_COLORS[normalizedStatus] || "#2563eb";
}

function formatINR(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-primary/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export function CivilDashboard({ data }: { data: CivilDashboardData }) {
  const [range, setRange] = useState<"week" | "month" | "year" | "total">("month");
  const currentRange = data.rangeMetrics[range];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Civil Industry Dashboard</h2>
          <p className="text-sm text-muted-foreground">Project, finance, attendance, resource, inventory, and location intelligence</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["week", "month", "year", "total"] as const).map((item) => (
            <Button 
              key={item} 
              type="button" 
              size="sm" 
              variant={range === item ? "default" : "outline"} 
              onClick={() => setRange(item)}
              className="transition-all duration-300 hover:shadow-md hover:scale-105"
            >
              {titleCase(item)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label={`${titleCase(range)} Projects`} value={formatCount(currentRange.projects)} helper="Specific/all range summary" icon={HardHat} />
        <MetricCard label="Revenue" value={formatINR(currentRange.revenue)} helper="Organization revenue" icon={CircleDollarSign} />
        <MetricCard label="Expenditure" value={formatINR(currentRange.expenditure)} helper="Approved/recorded spend" icon={IndianRupee} />
        <MetricCard label="Attendance Signals" value={formatCount(currentRange.attendance)} helper="Everyday resource activity" icon={CalendarCheck2} />
      </div>

      <Tabs defaultValue="project" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2">
          <TabsTrigger 
            value="project" 
            className="transition-all duration-300 hover:shadow-md hover:scale-105 data-[state=active]:shadow-md"
          >
            Project
          </TabsTrigger>
          <TabsTrigger 
            value="finance" 
            className="transition-all duration-300 hover:shadow-md hover:scale-105 data-[state=active]:shadow-md"
          >
            Finance
          </TabsTrigger>
          <TabsTrigger 
            value="attendance" 
            className="transition-all duration-300 hover:shadow-md hover:scale-105 data-[state=active]:shadow-md"
          >
            Attendance
          </TabsTrigger>
          <TabsTrigger 
            value="hr" 
            className="transition-all duration-300 hover:shadow-md hover:scale-105 data-[state=active]:shadow-md"
          >
            Human Resources
          </TabsTrigger>
          <TabsTrigger 
            value="inventory" 
            className="transition-all duration-300 hover:shadow-md hover:scale-105 data-[state=active]:shadow-md"
          >
            Assets/Inventory
          </TabsTrigger>
          <TabsTrigger 
            value="map" 
            className="transition-all duration-300 hover:shadow-md hover:scale-105 data-[state=active]:shadow-md"
          >
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Total Projects" value={data.project.summary.totalProjects} helper={`${data.project.summary.activeProjects} active, ${data.project.summary.completedProjects} complete`} icon={BriefcaseBusiness} />
            <MetricCard label="Average Progress" value={`${data.project.summary.averageProgress}%`} helper="Across current project scope" icon={CheckCircle2} />
            <MetricCard label="Budget Variance" value={formatINR(data.project.summary.variance)} helper={`${formatINR(data.project.summary.spent)} spent`} icon={IndianRupee} />
            <MetricCard label="Overdue Scope" value={data.project.summary.overdueTasks + data.project.summary.overdueMilestones} helper="Tasks and milestones" icon={Clock} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Project Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.project.statusData} dataKey="value" nameKey="name" outerRadius={95} label>
                      {data.project.statusData.map((item) => (
                        <Cell key={item.name} fill={getProjectStatusColor(item.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Project Details by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.project.locations}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="location" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="projects" name="Projects" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="progress" name="Avg Progress %" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Project Summary & Scope Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.project.projects.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No projects recorded yet.</p>
              ) : (
                data.project.projects.map((project) => (
                  <div 
                    key={project.id} 
                    className="grid gap-3 rounded-md border p-3 transition-all duration-300 hover:shadow-md hover:bg-accent/5 md:grid-cols-[1.4fr_1fr_1fr] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{project.name}</p>
                        <Badge variant="outline" className="transition-all duration-300 hover:scale-105">{titleCase(project.status)}</Badge>
                        {project.code ? <Badge variant="secondary" className="transition-all duration-300 hover:scale-105">{project.code}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{project.clientName || "No client/location assigned"}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {project.scope.tasks} tasks, {project.scope.milestones} milestones, {project.scope.tickets} tickets
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{project.progress}%</span>
                      <span className="text-muted-foreground"> progress, </span>
                      <span className="font-medium">{formatINR(project.spent)}</span>
                      <span className="text-muted-foreground"> spent</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Organization Revenue" value={formatINR(data.finance.summary.revenue)} icon={CircleDollarSign} />
            <MetricCard label="Project Expenditure" value={formatINR(data.finance.summary.projectSpent)} icon={IndianRupee} />
            <MetricCard label="Profit/Loss" value={formatINR(data.finance.summary.profitLoss)} icon={ClipboardList} />
            <MetricCard label="Pending Recovery" value={formatINR(data.finance.summary.pendingRecovery)} icon={Clock} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Revenue, Expenditure & Profit/Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.finance.monthlyFinance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" className="text-xs" />
                    <YAxis tickFormatter={(value) => formatINR(Number(value))} className="text-xs" />
                    <Tooltip formatter={(value) => formatINR(Number(value))} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" fill="#16a34a" fillOpacity={0.14} />
                    <Area type="monotone" dataKey="expenditure" name="Expenditure" stroke="#dc2626" fill="#dc2626" fillOpacity={0.12} />
                    <Area type="monotone" dataKey="profit" name="Profit/Loss" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Project Expenditure & Profit/Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.finance.projectProfitability}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis tickFormatter={(value) => formatINR(Number(value))} className="text-xs" />
                    <Tooltip formatter={(value) => formatINR(Number(value))} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Spent" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profitLoss" name="Balance" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Present Today" value={data.attendance.presentToday} helper={`${data.attendance.lateToday} late`} icon={CalendarCheck2} />
            <MetricCard label="Absent Today" value={data.attendance.absentToday} icon={Clock} />
            <MetricCard label="Not Checked In" value={data.attendance.notCheckedIn} icon={Users} />
            <MetricCard label=" Employees" value={data.attendance.activeEmployees} icon={BriefcaseBusiness} />
          </div>
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Everyday Employees Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.attendance.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present/Late" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hours" name="Hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Human Resources" value={data.humanResources.totalEmployees} helper={`${data.humanResources.activeEmployees} active`} icon={Users} />
            <MetricCard label="Utilization" value={`${data.humanResources.utilizationRate}%`} helper="Present vs active employees" icon={PackageCheck} />
            <MetricCard label="Current Status Groups" value={data.humanResources.byStatus.reduce((sum, item) => sum + item.value, 0)} icon={BriefcaseBusiness} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Human Resource Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.humanResources.byStatus} dataKey="value" nameKey="name" outerRadius={95} label>
                      {data.humanResources.byStatus.map((item) => (
                        <Cell key={item.name} fill={getHRStatusColor(item.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Human Resource Utilized by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.humanResources.byDesignation}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" name="Employees" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Assets" value={data.inventory.assets} helper={`${data.inventory.activeAssets} active`} icon={Boxes} />
            <MetricCard label="Inventory Qty" value={formatCount(data.inventory.inventoryQty)} helper={`${formatCount(data.inventory.reservedQty)} reserved`} icon={Warehouse} />
            <MetricCard label="Current Value" value={formatINR(data.inventory.inventoryValue)} icon={IndianRupee} />
            <MetricCard label="Low Stock" value={data.inventory.lowStockItems} icon={PackageCheck} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Assets Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.inventory.assetStatusData} dataKey="value" nameKey="name" outerRadius={95} label>
                      {data.inventory.assetStatusData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Inventory Utilized by Warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.inventory.inventoryByWarehouse}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="warehouse" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" name="Quantity" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reserved" name="Reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lowStock" name="Low Stock" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Tracked Locations" value={data.map.locationCount} icon={MapPinned} />
            <MetricCard label="Located Records" value={data.map.locatedItems} helper="With latitude/longitude" icon={Building2} />
            <MetricCard label="Movement Signals" value={data.map.movementCount} icon={Route} />
          </div>
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Human Resource / Inventory / Project / Finance Location, Status & Movement</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map.items.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">No map-ready location or movement records found.</p>
              ) : (
                data.map.items.map((item, index) => (
                  <div 
                    key={`${item.type}-${item.name}-${index}`} 
                    className="rounded-md border p-3 transition-all duration-300 hover:shadow-md hover:scale-[1.02] hover:bg-accent/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.location}</p>
                      </div>
                      <Badge variant="outline" className="transition-all duration-300 hover:scale-105">{item.type}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{item.status}</span>
                      {item.latitude !== null && item.longitude !== null ? (
                        <span>
                          {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                        </span>
                      ) : (
                        <span>Coordinates pending</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}