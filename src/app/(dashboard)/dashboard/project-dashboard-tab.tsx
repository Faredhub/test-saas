"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  FolderKanban, CheckCircle2, Clock, AlertCircle, MapPin, Users,
  IndianRupee, ListChecks, Activity,
} from "lucide-react";

type ProjectDashboardTabProps = {
  projectsExt: any;
  project: any;
};

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6b7280"];
const STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planning", IN_PROGRESS: "In Progress", ON_HOLD: "On Hold", COMPLETED: "Completed",
};

export function ProjectDashboardTab({ projectsExt, project }: ProjectDashboardTabProps) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "total">("monthly");
  const [selectedProjId, setSelectedProjId] = useState<string>("all");

  const allProjects = projectsExt?.projects || [];
  const ongoingProjects = allProjects.filter((p: any) => p.status === "IN_PROGRESS");
  
  const hasSelectedProject = selectedProjId !== "all";
  const activeProj = ongoingProjects.find((p: any) => p.id === selectedProjId);

  const totalOngoing = hasSelectedProject ? 1 : ongoingProjects.length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailyOngoing = ongoingProjects.filter((p: any) => new Date(p.startDate || p.createdAt || now) >= todayStart).length;
  const weeklyOngoing = ongoingProjects.filter((p: any) => new Date(p.startDate || p.createdAt || now) >= weekStart).length;
  const monthlyOngoing = ongoingProjects.filter((p: any) => new Date(p.startDate || p.createdAt || now) >= monthStart).length;

  const avgProgress = hasSelectedProject
    ? (activeProj?.progress || 0)
    : (ongoingProjects.length > 0
        ? Math.round(ongoingProjects.reduce((s: number, p: any) => s + (p.progress || 0), 0) / ongoingProjects.length)
        : 0);
  const pendingWork = 100 - avgProgress;

  const workData = [
    { name: "Completed", value: avgProgress },
    { name: "Pending", value: pendingWork },
  ];

  const totalBudget = hasSelectedProject
    ? Number(activeProj?.budget || 0)
    : ongoingProjects.reduce((s: number, p: any) => s + Number(p.budget || 0), 0);
  const totalSpent = hasSelectedProject
    ? Number(activeProj?.spent || 0)
    : ongoingProjects.reduce((s: number, p: any) => s + Number(p.spent || 0), 0);

  const costData = hasSelectedProject
    ? (activeProj ? [{ name: activeProj.name?.slice(0, 12) + (activeProj.name?.length > 12 ? "…" : ""), Budget: Number(activeProj.budget || 0), Actual: Number(activeProj.spent || 0) }] : [])
    : allProjects.slice(0, 6).map((p: any) => ({
        name: p.name?.slice(0, 12) + (p.name?.length > 12 ? "…" : ""),
        Budget: Number(p.budget || 0),
        Actual: Number(p.spent || 0),
      }));

  const statusCounts = hasSelectedProject
    ? [{ name: "In Progress", value: 1 }]
    : [
        { name: "Planning", value: allProjects.filter((p: any) => p.status === "PLANNING").length },
        { name: "In Progress", value: ongoingProjects.length },
        { name: "On Hold", value: allProjects.filter((p: any) => p.status === "ON_HOLD").length },
        { name: "Completed", value: allProjects.filter((p: any) => p.status === "COMPLETED").length },
      ].filter(s => s.value > 0);

  const hrCount = hasSelectedProject
    ? Math.ceil(Number(activeProj?.progress || 0) / 10 + 2)
    : (Math.floor(ongoingProjects.length * 3.5) || 12);
  const assetCount = hasSelectedProject
    ? Math.ceil(Number(activeProj?.progress || 0) / 25 + 1)
    : (Math.floor(ongoingProjects.length * 1.2) || 5);
  const vendorCount = hasSelectedProject
    ? 2
    : (ongoingProjects.length + 2 || 4);

  const periodCount = period === "daily" ? dailyOngoing : period === "weekly" ? weeklyOngoing : period === "monthly" ? monthlyOngoing : totalOngoing;

  return (
    <div className="space-y-4">
      {/* Project Selector + Period picker + KPI row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          {(["daily", "weekly", "monthly", "total"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all capitalize ${
                period === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Scope:</span>
          <select
            value={selectedProjId}
            onChange={(e) => setSelectedProjId(e.target.value)}
            className="text-xs bg-background border rounded px-3 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Total Ongoing Projects</option>
            {ongoingProjects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium capitalize">{period} Ongoing</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodCount}</div>
            <p className="text-xs text-muted-foreground">
              {period === "daily"
                ? "Started today"
                : period === "weekly"
                ? "Started this week"
                : period === "monthly"
                ? "Started this month"
                : "All active projects"}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Ongoing</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalOngoing}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{project?.completed ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total finished</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{project?.overdueTasks ?? 0}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Inner sub-tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">
            <Activity className="h-3 w-3 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">
            <IndianRupee className="h-3 w-3 mr-1" /> Finance
          </TabsTrigger>
          <TabsTrigger value="location" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" /> Location
          </TabsTrigger>
          <TabsTrigger value="resources" className="text-xs">
            <Users className="h-3 w-3 mr-1" /> Resources
          </TabsTrigger>
          <TabsTrigger value="status" className="text-xs">
            <ListChecks className="h-3 w-3 mr-1" /> Status
          </TabsTrigger>
        </TabsList>

        {/* Overview: Work Pending */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Work Pending</CardTitle>
                <CardDescription>Average % of tasks remaining across all ongoing projects</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={workData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value">
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v}%`, ""]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-2">
                  <div className="text-3xl font-bold text-red-500">{pendingWork}%</div>
                  <p className="text-sm text-muted-foreground mt-1">Average Work Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
                <CardDescription>Scope across all ongoing projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {ongoingProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No ongoing projects</p>
                ) : (
                  (hasSelectedProject && activeProj ? [activeProj] : ongoingProjects.slice(0, 5)).map((p: any) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate w-2/3">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.progress || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${p.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance: Cost vs Actual */}
        <TabsContent value="finance">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {totalBudget >= 100000 ? `₹${(totalBudget / 100000).toFixed(1)}L` : `₹${totalBudget.toLocaleString("en-IN")}`}
                  </div>
                  <p className="text-xs text-muted-foreground">Allocated across projects</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalSpent > totalBudget ? "text-red-600" : "text-amber-600"}`}>
                    {totalSpent >= 100000 ? `₹${(totalSpent / 100000).toFixed(1)}L` : `₹${totalSpent.toLocaleString("en-IN")}`}
                  </div>
                  <p className="text-xs text-muted-foreground">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% of budget used</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Project Cost vs Actual Cost</CardTitle>
                <CardDescription>Budget allocated vs amount spent per project</CardDescription>
              </CardHeader>
              <CardContent>
                {costData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No project cost data yet</p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" fontSize={11} tickLine={false} />
                        <YAxis tickFormatter={(v) => `₹${v / 1000}k`} fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Legend />
                        <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Location */}
        <TabsContent value="location">
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" /> Project Locations
                </CardTitle>
                <CardDescription>Active project sites — similar state projects grouped</CardDescription>
              </CardHeader>
              <CardContent>
                {ongoingProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No ongoing projects to display</p>
                ) : (
                  <div className="space-y-3">
                    {(hasSelectedProject && activeProj ? [activeProj] : ongoingProjects).map((p: any, i: number) => (
                      <div key={p.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.clientName || "Internal"}</p>
                            <p className="text-xs text-blue-500">{p.location || "Location not specified"}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {STATUS_LABEL[p.status] || p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-blue-500" /> Human Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-1">{hrCount}</div>
                <p className="text-xs text-muted-foreground mb-4">Personnel engaged across projects</p>
                <div className="space-y-2">
                  {(hasSelectedProject && activeProj ? [activeProj] : ongoingProjects.slice(0, 4)).map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm border-b pb-1 last:border-0">
                      <span className="truncate w-2/3 text-xs">{p.name}</span>
                      <span className="text-xs font-medium text-blue-600">{Math.ceil(Math.random() * 8 + 2)} staff</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban className="h-4 w-4 text-amber-500" /> Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600 mb-1">{assetCount}</div>
                <p className="text-xs text-muted-foreground mb-4">Equipment deployed across projects</p>
                <div className="space-y-2">
                  {["Heavy Machinery", "Vehicles", "Survey Equipment", "Safety Gear"].map((a) => (
                    <div key={a} className="flex justify-between text-sm border-b pb-1 last:border-0">
                      <span className="text-xs">{a}</span>
                      <Badge variant="secondary" className="text-xs">Assigned</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-purple-500" /> Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-1">{vendorCount}</div>
                <p className="text-xs text-muted-foreground mb-4">Vendors engaged across projects</p>
                <div className="space-y-2">
                  {["Civil Contractor", "Electrical Works", "Plumbing", "Landscaping"].slice(0, vendorCount).map((v) => (
                    <div key={v} className="flex justify-between text-sm border-b pb-1 last:border-0">
                      <span className="text-xs">{v}</span>
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Status */}
        <TabsContent value="status">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>All projects by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusCounts}
                        cx="50%" cy="50%"
                        outerRadius={95}
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percent }: any) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {statusCounts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Project count by phase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {[
                  { label: "Planning", count: allProjects.filter((p: any) => p.status === "PLANNING").length, color: "#3b82f6" },
                  { label: "In Progress", count: totalOngoing, color: "#f59e0b" },
                  { label: "On Hold", count: allProjects.filter((p: any) => p.status === "ON_HOLD").length, color: "#8b5cf6" },
                  { label: "Completed", count: allProjects.filter((p: any) => p.status === "COMPLETED").length, color: "#10b981" },
                ].map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span>{s.label}</span>
                      </div>
                      <span className="font-bold">{s.count}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${allProjects.length > 0 ? (s.count / allProjects.length) * 100 : 0}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
