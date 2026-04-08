"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
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
  FileInput,
  FileBarChart,
  Monitor,
  MapPin,
  Map,
  Route,
  Armchair,
  QrCode,
  ClipboardList,
  Hash,
  Wallet,
  BookOpenCheck,
  CreditCard,
  Banknote,
  FileSpreadsheet,
  FolderOpen,
  UserPlus,
  Briefcase,
  CalendarOff,
  Clock,
  Car,
  FolderKanban,
  Timer,
  TicketCheck,
  Package,
  Warehouse,
  Factory,
  Wrench,
  ShieldCheck,
  Mail,
  PartyPopper,
  ClipboardCheck,
  PinOff,
  Pin,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Navigation data – grouped by high-level category
// ---------------------------------------------------------------------------

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavCategory {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Dock icon */
  icon: LucideIcon;
  /** Sub-items */
  items: NavItem[];
  /** Color accent class */
  accent: string;
}

const categories: NavCategory[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    accent: "text-blue-500",
    items: [
      { name: "Home", href: "/", icon: LayoutDashboard },
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Wallet,
    accent: "text-emerald-500",
    items: [
      { name: "Overview", href: "/finance", icon: Wallet },
      { name: "Accounts", href: "/finance/accounts", icon: BookOpenCheck },
      { name: "Journal", href: "/finance/journal", icon: FileSpreadsheet },
      { name: "Expenses", href: "/finance/expenses", icon: CreditCard },
      { name: "Payroll", href: "/finance/payroll", icon: Banknote },
      { name: "Bills", href: "/finance/bills", icon: Receipt },
      { name: "Reports", href: "/finance/reports", icon: FileBarChart },
      { name: "Documents", href: "/finance/documents", icon: FolderOpen },
    ],
  },
  {
    key: "sales",
    label: "Sales & CRM",
    icon: ShoppingCart,
    accent: "text-orange-500",
    items: [
      { name: "Leads", href: "/sales/leads", icon: Users },
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Deals", href: "/sales/deals", icon: ShoppingCart },
      { name: "Quotations", href: "/sales/quotations", icon: FileText },
      { name: "Invoices", href: "/sales/invoices", icon: Receipt },
      { name: "Subscriptions", href: "/sales/subscriptions", icon: RefreshCw },
      { name: "Orders", href: "/sales/orders", icon: ClipboardList },
      { name: "Visits", href: "/sales/visits", icon: MapPin },
      { name: "Map", href: "/sales/map", icon: Map },
      { name: "Routes", href: "/sales/routes", icon: Route },
      { name: "Reservations", href: "/sales/reservations", icon: Armchair },
      { name: "Forecast", href: "/sales/forecast", icon: TrendingUp },
      { name: "POS", href: "/sales/pos", icon: Monitor },
      { name: "Queue", href: "/sales/queue", icon: Hash },
      { name: "QR Codes", href: "/sales/qr-codes", icon: QrCode },
    ],
  },
  {
    key: "inventory",
    label: "Inventory & SCM",
    icon: Package,
    accent: "text-amber-500",
    items: [
      { name: "Overview", href: "/inventory", icon: Package },
      { name: "Products", href: "/inventory/products", icon: Package },
      { name: "Stock", href: "/inventory/stock", icon: Warehouse },
      { name: "Warehouses", href: "/inventory/warehouses", icon: Building2 },
      { name: "Manufacturing", href: "/inventory/manufacturing", icon: Factory },
      { name: "Assets", href: "/inventory/assets", icon: Wrench },
      { name: "Quality", href: "/inventory/quality", icon: ShieldCheck },
    ],
  },
  {
    key: "hrm",
    label: "HRM",
    icon: Users,
    accent: "text-violet-500",
    items: [
      { name: "Overview", href: "/hrm", icon: Users },
      { name: "Employees", href: "/hrm/employees", icon: UserPlus },
      { name: "Recruitment", href: "/hrm/recruitment", icon: Briefcase },
      { name: "Leaves", href: "/hrm/leaves", icon: CalendarOff },
      { name: "Attendance", href: "/hrm/attendance", icon: Clock },
      { name: "Fleet", href: "/hrm/fleet", icon: Car },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    icon: FolderKanban,
    accent: "text-cyan-500",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Timesheets", href: "/projects/timesheets", icon: Timer },
      { name: "Tickets", href: "/projects/tickets", icon: TicketCheck },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    accent: "text-pink-500",
    items: [
      { name: "Overview", href: "/marketing", icon: Megaphone },
      { name: "Campaigns", href: "/marketing/campaigns", icon: Mail },
      { name: "Events", href: "/marketing/events", icon: PartyPopper },
      { name: "Surveys", href: "/marketing/surveys", icon: ClipboardCheck },
    ],
  },
  {
    key: "organization",
    label: "Organization",
    icon: Building2,
    accent: "text-slate-500",
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
      { name: "Reports", href: "/organization/reports", icon: FileBarChart },
      { name: "Forms", href: "/organization/forms", icon: FileInput },
      { name: "Database", href: "/organization/database", icon: Database },
      { name: "Settings", href: "/organization/settings", icon: Settings },
    ],
  },
];

// ---------------------------------------------------------------------------
// Classic sidebar (original design — all items visible)
// ---------------------------------------------------------------------------

function ClassicSidebar() {
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

      <nav className="flex flex-col gap-1 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 4rem)" }}>
        {categories.map((group) => (
          <div key={group.key} className="mb-4">
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

// ---------------------------------------------------------------------------
// Modern sidebar — icon dock + slide-out sub-panel
// ---------------------------------------------------------------------------

function ModernSidebar() {
  const pathname = usePathname();
  const { activeCategory, setActiveCategory, panelPinned, togglePanelPinned } =
    useSidebarStore();

  // Auto-select category based on current route
  useEffect(() => {
    if (activeCategory) return; // user already picked one
    for (const cat of categories) {
      for (const item of cat.items) {
        if (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) {
          setActiveCategory(cat.key);
          return;
        }
      }
    }
  }, []); // only on mount

  const activeCat = categories.find((c) => c.key === activeCategory);

  // Check if a category contains the active route
  function categoryHasActiveRoute(cat: NavCategory) {
    return cat.items.some(
      (item) =>
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href))
    );
  }

  return (
    <div className="hidden lg:flex h-screen">
      {/* Icon Dock */}
      <div className="flex w-[68px] shrink-0 flex-col items-center border-r bg-background py-3 gap-1">
        {/* Logo */}
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold mb-3 hover:opacity-90 transition-opacity"
        >
          T
        </Link>

        {/* Category icons */}
        <div className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-1">
          <TooltipProvider delay={0}>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.key;
              const hasActive = categoryHasActiveRoute(cat);

              return (
                <Tooltip key={cat.key}>
                  <TooltipTrigger>
                    <button
                      onClick={() => setActiveCategory(cat.key)}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                        isSelected
                          ? "bg-primary/10 text-primary shadow-sm"
                          : hasActive
                            ? "text-foreground bg-muted/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {/* Active indicator dot */}
                      {hasActive && !isSelected && (
                        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                      {/* Selected indicator bar */}
                      {isSelected && (
                        <span className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                      )}
                      <cat.icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    <p className="font-medium">{cat.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Bottom: Settings shortcut */}
        <TooltipProvider delay={0}>
          <Tooltip>
            <TooltipTrigger>
              <Link
                href="/organization/settings"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  pathname.startsWith("/organization/settings")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="font-medium">Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Sub-panel */}
      {activeCat && (
        <div
          className={cn(
            "flex w-56 shrink-0 flex-col border-r bg-background/80 backdrop-blur-sm transition-all duration-200",
            !panelPinned && "absolute left-[68px] top-0 z-40 h-full shadow-xl"
          )}
        >
          {/* Panel header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2 min-w-0">
              <activeCat.icon className={cn("h-4 w-4 shrink-0", activeCat.accent)} />
              <span className="text-sm font-semibold truncate">{activeCat.label}</span>
            </div>
            <button
              onClick={togglePanelPinned}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={panelPinned ? "Unpin panel" : "Pin panel"}
            >
              {panelPinned ? (
                <Pin className="h-3.5 w-3.5" />
              ) : (
                <PinOff className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Panel items */}
          <nav className="flex flex-col gap-0.5 overflow-y-auto p-3 flex-1">
            {activeCat.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? activeCat.accent : ""
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Panel footer */}
          <div className="border-t px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
              {activeCat.items.length} items
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar – switches between modern & classic based on user preference
// ---------------------------------------------------------------------------

export function Sidebar() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);

  if (sidebarStyle === "classic") {
    return <ClassicSidebar />;
  }

  return <ModernSidebar />;
}
