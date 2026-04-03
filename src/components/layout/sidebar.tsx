"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Users,
  ShoppingCart,
  FileText,
  Receipt,
  CalendarDays,
  StickyNote,
  Megaphone,
  GitBranch,
  UserCircle,
  Settings,
  CheckSquare,
  TrendingUp,
  RefreshCw,
  ScrollText,
  BookOpen,
  PenTool,
  Database,
  Monitor,
  MapPin,
  Armchair,
  QrCode,
  ClipboardList,
  Hash,
} from "lucide-react";

const navigation = [
  {
    label: "Overview",
    items: [
      { name: "Home", href: "/", icon: LayoutDashboard },
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    ],
  },
  {
    label: "Sales & CRM",
    items: [
      { name: "Leads", href: "/sales/leads", icon: Users },
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Deals", href: "/sales/deals", icon: ShoppingCart },
      { name: "Quotations", href: "/sales/quotations", icon: FileText },
      { name: "Invoices", href: "/sales/invoices", icon: Receipt },
      { name: "Subscriptions", href: "/sales/subscriptions", icon: RefreshCw },
      { name: "Orders", href: "/sales/orders", icon: ClipboardList },
      { name: "Visits", href: "/sales/visits", icon: MapPin },
      { name: "Reservations", href: "/sales/reservations", icon: Armchair },
      { name: "Forecast", href: "/sales/forecast", icon: TrendingUp },
      { name: "POS", href: "/sales/pos", icon: Monitor },
      { name: "Queue", href: "/sales/queue", icon: Hash },
      { name: "QR Codes", href: "/sales/qr-codes", icon: QrCode },
    ],
  },
  {
    label: "Organization",
    items: [
      { name: "Departments", href: "/organization/departments", icon: GitBranch },
      { name: "Branches", href: "/organization/branches", icon: Building2 },
      { name: "Contracts", href: "/organization/contracts", icon: ScrollText },
      { name: "Signatures", href: "/organization/signatures", icon: PenTool },
      { name: "Library", href: "/organization/library", icon: BookOpen },
      { name: "Notices", href: "/organization/notices", icon: Megaphone },
      { name: "Calendar", href: "/organization/calendar", icon: CalendarDays },
      { name: "Notes", href: "/organization/notes", icon: StickyNote },
      { name: "Approvals", href: "/organization/approvals", icon: CheckSquare },
      { name: "Database", href: "/organization/database", icon: Database },
      { name: "Settings", href: "/organization/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            T
          </div>
          <span className="text-lg font-semibold tracking-tight">TixelERP</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
