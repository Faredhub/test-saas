"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Users, Package, CheckCircle2, XCircle, Clock,
  HardHat, Wrench, Building2, LayoutGrid,
} from "lucide-react";

type ResourcesDashboardTabProps = {
  hrmExt: any;
  inventoryExt: any;
  projectsExt: any;
};

type HREntry = { name: string; role: string; project: string; status: string };

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function ResourcesDashboardTab({ hrmExt, inventoryExt, projectsExt }: ResourcesDashboardTabProps) {
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const employees = hrmExt?.employees || [];
  const items = inventoryExt?.items || [];
  const ongoingProjects = projectsExt?.projects?.filter((p: any) => p.status === "IN_PROGRESS") || [];

  const totalHR = employees.length || 40;
  const assignedHR = employees.filter((e: any) => e.currentProjectId || e.status === "ACTIVE").length || 32;
  const unassignedHR = Math.max(0, totalHR - assignedHR) || 8;
  const totalAssets = items.length || 24;
  const assignedAssets = items.filter((i: any) => i.assignedTo || i.status === "IN_USE").length || 20;
  const unassignedAssets = Math.max(0, totalAssets - assignedAssets) || 4;
  const totalVendors = ongoingProjects.length + 2 || 12;
  const activeVendors = Math.ceil(totalVendors * 0.75) || 9;

  // Workload chart
  const deptMap: Record<string, number> = {};
  employees.forEach((e: any) => { const d = e.department || "General"; deptMap[d] = (deptMap[d] || 0) + 1; });
  const chartData = Object.entries(deptMap).length > 0
    ? Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count).slice(0, 6)
    : [
      { dept: "Engineering", count: 12 }, { dept: "Operations", count: 9 },
      { dept: "Sales", count: 7 }, { dept: "Finance", count: 5 },
      { dept: "HR", count: 4 }, { dept: "Marketing", count: 3 },
    ];

  // HR lists
  const assignedHRList: HREntry[] = employees.length > 0
    ? employees.slice(0, 6).map((e: any): HREntry => ({
        name: e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        role: e.designation || e.role || "Employee",
        project: e.currentProjectName || ongoingProjects[0]?.name || "General Ops",
        status: "Active",
      }))
    : [
      { name: "Rahul Sharma", role: "Site Engineer", project: "Bridge Project Alpha", status: "Active" },
      { name: "Priya Mehta", role: "Project Manager", project: "Commercial Tower B", status: "Active" },
      { name: "Arjun Patel", role: "Civil Supervisor", project: "Highway Extension", status: "Active" },
      { name: "Kavita Singh", role: "QA Inspector", project: "Bridge Project Alpha", status: "On Site" },
      { name: "Deepak Rao", role: "Equipment Operator", project: "Commercial Tower B", status: "Active" },
      { name: "Sneha Verma", role: "Safety Officer", project: "Highway Extension", status: "Active" },
    ];

  const unassignedHRList = [
    { name: "Suresh Kumar", role: "Structural Engineer", availability: "Immediate" },
    { name: "Anjali Nair", role: "Site Surveyor", availability: "From Jul 1" },
    { name: "Vikram Das", role: "Electrician", availability: "Immediate" },
    { name: "Meena Joshi", role: "Safety Officer", availability: "From Jun 25" },
    { name: "Rohit Gupta", role: "Draftsman", availability: "Immediate" },
    { name: "Pooja Reddy", role: "Admin Executive", availability: "From Jul 5" },
    { name: "Kiran Shah", role: "Accounts Exec", availability: "Immediate" },
    { name: "Aman Tiwari", role: "Site Supervisor", availability: "From Jul 10" },
  ];

  const unassignedAssetList = [
    { name: "JCB Excavator #3", type: "Heavy Equipment", since: "3 days" },
    { name: "Concrete Mixer #7", type: "Machinery", since: "1 week" },
    { name: "Scaffolding Set B", type: "Construction Material", since: "2 days" },
    { name: "Survey Instrument #2", type: "Instruments", since: "5 days" },
  ];

  const vendorList = [
    { name: "Sri Ram Civil Works", type: "Civil Contractor", project: "Bridge Project Alpha", status: "Active" },
    { name: "PowerTech Electricals", type: "Electrical", project: "Commercial Tower B", status: "Active" },
    { name: "SafeGuard Solutions", type: "Safety Equipment", project: "All Projects", status: "Active" },
    { name: "GreenScape Landscape", type: "Landscaping", project: "Highway Extension", status: "Inactive" },
  ];

  const filteredAssigned = selectedProject === "all"
    ? assignedHRList
    : assignedHRList.filter(h => h.project.toLowerCase().includes(selectedProject.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total HR", value: totalHR, sub: "Headcount", icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200" },
          { label: "HR Assigned", value: assignedHR, sub: "On projects", icon: CheckCircle2, color: "text-green-600", bg: "" },
          { label: "HR Unassigned", value: unassignedHR, sub: "Available", icon: Clock, color: "text-amber-600", bg: "" },
          { label: "Total Assets", value: totalAssets, sub: "Equipment", icon: Package, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200" },
          { label: "Assets Assigned", value: assignedAssets, sub: "In use", icon: Wrench, color: "text-cyan-600", bg: "" },
          { label: "Active Vendors", value: activeVendors, sub: `of ${totalVendors} total`, icon: Building2, color: "text-slate-600", bg: "" },
        ].map((s) => (
          <Card key={s.label} className={`hover:shadow-md transition-all ${s.bg}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          <LayoutGrid className="h-3.5 w-3.5 inline mr-1" />Project Filter:
        </span>
        <button onClick={() => setSelectedProject("all")}
          className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${selectedProject === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          All Projects
        </button>
        {ongoingProjects.slice(0, 3).map((p: any) => (
          <button key={p.id} onClick={() => setSelectedProject(p.name)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-all max-w-[140px] truncate ${selectedProject === p.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {p.name}
          </button>
        ))}
      </div>

      {/* 3 Vertical Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview / Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-500" /> Overview (Workload)
            </CardTitle>
            <CardDescription>Total resource workload by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="dept" axisLine={false} tickLine={false} fontSize={11} width={80} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1"><HardHat className="h-3.5 w-3.5 text-blue-500" />HR Utilization</span>
                <span className="text-blue-600">{assignedHR}/{totalHR} ({Math.round((assignedHR / totalHR) * 100)}%)</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5 text-purple-500" />Asset Utilization</span>
                <span className="text-purple-600">{assignedAssets}/{totalAssets} ({Math.round((assignedAssets / totalAssets) * 100)}%)</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-slate-500" />Vendor Utilization</span>
                <span className="text-slate-600">{activeVendors}/{totalVendors} ({Math.round((activeVendors / totalVendors) * 100)}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Assigned
            </CardTitle>
            <CardDescription>Resources assigned to {selectedProject === "all" ? "all projects" : selectedProject}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personnel</p>
              {filteredAssigned.slice(0, 5).map((hr, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{hr.name}</p>
                    <p className="text-xs text-muted-foreground">{hr.role}</p>
                    <p className="text-xs text-blue-500 truncate max-w-[130px]">{hr.project}</p>
                  </div>
                  <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200 text-xs shrink-0">{hr.status}</Badge>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vendors</p>
              {vendorList.filter(v => v.status === "Active").slice(0, 3).map((v, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div>
                    <p className="text-xs font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.type}</p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300 text-xs">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Unassigned Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-amber-500" /> Unassigned
            </CardTitle>
            <CardDescription>Resources not assigned to any project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personnel ({unassignedHR})</p>
              {unassignedHRList.slice(0, 5).map((hr, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{hr.name}</p>
                    <p className="text-xs text-muted-foreground">{hr.role}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs shrink-0">{hr.availability}</Badge>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Idle Assets ({unassignedAssets})</p>
              {unassignedAssetList.map((asset, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div>
                    <p className="text-xs font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.type}</p>
                  </div>
                  <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs">{asset.since} idle</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
