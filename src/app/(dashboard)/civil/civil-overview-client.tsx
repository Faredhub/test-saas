"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
  Mountain,
  MapPin,
  Ruler,
  Calculator,
  FileText,
  TrendingUp,
  LayoutTemplate,
  ArrowRight,
} from "lucide-react";
import type { getCivilOverviewStats } from "@/lib/actions/civil";

type Stats = Awaited<ReturnType<typeof getCivilOverviewStats>>;

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  FINAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

const typeColors: Record<string, string> = {
  Geotechnical: "bg-amber-100 text-amber-700",
  Survey: "bg-blue-100 text-blue-700",
  Design: "bg-purple-100 text-purple-700",
  Estimation: "bg-emerald-100 text-emerald-700",
};

const reportModules = [
  {
    title: "Geotechnical Investigation",
    description: "SPT, CBR, Plate Load Tests, Soil Classification reports",
    href: "/civil/geotechnical",
    icon: Mountain,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "Survey Reports",
    description: "Road, Site, Canal, Boundary surveys with station data",
    href: "/civil/survey",
    icon: MapPin,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Design Reports",
    description: "Road, Building, Canal, Bridge structural design",
    href: "/civil/design",
    icon: Ruler,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Cost Estimation",
    description: "BOQ, Analysis of Rates, quantity take-off & costing",
    href: "/civil/estimation",
    icon: Calculator,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

export function CivilOverviewClient({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Civil Engineering Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate geotechnical, survey, design, and estimation reports.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Total Reports</p>
            <p className="text-2xl font-semibold text-blue-600">
              {stats.totalReports}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-semibold text-green-600">
              {new Intl.NumberFormat("en-IN").format(stats.thisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Templates</p>
            <p className="text-2xl font-semibold text-purple-600">
              {new Intl.NumberFormat("en-IN").format(stats.templates)}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Report Types</p>
            <p className="text-2xl font-semibold text-amber-600">4</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportModules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`${mod.bg} p-3 rounded-lg`}>
                  <mod.icon className={`h-6 w-6 ${mod.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mod.description}
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-sm text-primary font-medium">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stats.recentReports.length > 0 && (
        <Card>
          <div className="p-6 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-base">Recent Reports</h3>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentReports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeColors[r.type] ?? "bg-slate-100 text-slate-700"}>
                      {r.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.projectName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.client}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[r.status] ?? "bg-slate-100 text-slate-700"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
