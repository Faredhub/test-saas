"use client";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  Gavel,
  Megaphone,
  MessageSquare,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidebarStore } from "@/stores/sidebar-store";

const launcherApps = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, color: "bg-blue-600" },
  { label: "Organization", href: "/organization/settings", icon: Building2, color: "bg-slate-700" },
  { label: "Finance", href: "/finance", icon: Wallet, color: "bg-emerald-600" },
  { label: "Projects", href: "/projects", icon: FolderKanban, color: "bg-cyan-600" },
  { label: "Inventory", href: "/inventory", icon: Package, color: "bg-amber-600" },
  { label: "HRM", href: "/hrm", icon: Users, color: "bg-violet-600" },
  { label: "Sales", href: "/sales", icon: ShoppingCart, color: "bg-orange-600" },
  { label: "Marketing", href: "/marketing", icon: Megaphone, color: "bg-pink-600" },
  { label: "Reports", href: "/reports", icon: FileText, color: "bg-indigo-600" },
  { label: "Office", href: "/office", icon: MessageSquare, color: "bg-teal-600" },
  { label: "Settings", href: "/settings/onboarding", icon: Settings, color: "bg-zinc-700" },
];

export function HomeScreenMode() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const terminology = useSidebarStore((s) => s.terminology);

  if (sidebarStyle !== "windows") return null;

  const leadsLabel = terminology.leads ?? "Leads";
  const invoicesLabel = terminology.invoices ?? "Invoices";
  const projectsLabel = terminology.projects ?? "Projects";
  const tendersLabel = terminology.tenders ?? "Tenders";
  const showTenderTools = Boolean(
    terminology.tenders ||
      terminology.cvBank ||
      terminology.sales?.toLowerCase().includes("tender")
  );
  const launcherItems = showTenderTools
    ? [
        ...launcherApps.slice(0, 2),
        { label: tendersLabel, href: "/tenders", icon: Gavel, color: "bg-rose-600" },
        ...launcherApps.slice(2),
      ]
    : launcherApps;

  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-950 text-white">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" />
          Windows Home
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {launcherItems.map((app) => (
            <Link
              key={app.href}
              href={app.href}
              className="group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-white/10"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${app.color}`}>
                <app.icon className="h-6 w-6" />
              </span>
              <span className="max-w-full truncate text-xs text-zinc-200 group-hover:text-white">
                {app.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            { label: `New ${leadsLabel}`, href: "/sales/leads", icon: Users },
            { label: `Create ${invoicesLabel}`, href: "/sales/invoices", icon: Receipt },
            { label: `${projectsLabel} Calendar`, href: "/organization/calendar", icon: CalendarDays },
          ].map((widget) => (
            <Link
              key={widget.href}
              href={widget.href}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
            >
              <widget.icon className="h-5 w-5 text-blue-300" />
              <span className="text-sm font-medium">{widget.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
