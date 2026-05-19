"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { getNavigationPreferences } from "@/lib/actions/user";
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
  Globe,
  FileCode,
  PenLine,
  MessageSquare,
  HelpCircle,
  Headphones,
  Phone,
  FileBarChart2,
  LayoutTemplate,
  MessagesSquare,
  FileSpreadsheetIcon,
  Presentation,
  MailIcon,
  Shield,
  Star,
  FilePlus2,
  Landmark,
  Gavel,
  Contact,
  X,
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
  /** Tenant module key used by onboarding templates */
  moduleKey: string;
  /** Display label */
  label: string;
  /** Dock icon */
  icon: LucideIcon;
  /** Sub-items */
  items: NavItem[];
  /** Color accent class */
  accent: string;
}

const baseCategories: NavCategory[] = [
  {
    key: "overview",
    moduleKey: "home",
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
    moduleKey: "finance",
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
      { name: "Credit Notes", href: "/finance/credit-notes", icon: FilePlus2 },
      { name: "Payments", href: "/finance/payments", icon: Landmark },
      { name: "Reports", href: "/finance/reports", icon: FileBarChart },
      { name: "Documents", href: "/finance/documents", icon: FolderOpen },
      { name: "Currency", href: "/finance/currency", icon: Globe },
    ],
  },
  {
    key: "sales",
    moduleKey: "sales",
    label: "Sales & CRM",
    icon: ShoppingCart,
    accent: "text-orange-500",
    items: [
      { name: "Leads", href: "/sales/leads", icon: Users },
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Tenders", href: "/tenders", icon: Gavel },
      { name: "CV Bank", href: "/tenders/cv-bank", icon: Contact },
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
    moduleKey: "inventory",
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
    moduleKey: "hrm",
    label: "HRM",
    icon: Users,
    accent: "text-violet-500",
    items: [
      { name: "Overview", href: "/hrm", icon: Users },
      { name: "Employees", href: "/hrm/employees", icon: UserPlus },
      { name: "Recruitment", href: "/hrm/recruitment", icon: Briefcase },
      { name: "Leaves", href: "/hrm/leaves", icon: CalendarOff },
      { name: "Attendance", href: "/hrm/attendance", icon: Clock },
      { name: "Performance", href: "/hrm/performance", icon: Star },
      { name: "Scheduling", href: "/hrm/scheduling", icon: CalendarDays },
      { name: "Fleet", href: "/hrm/fleet", icon: Car },
    ],
  },
  {
    key: "projects",
    moduleKey: "projects",
    label: "Projects",
    icon: FolderKanban,
    accent: "text-cyan-500",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Templates", href: "/projects/templates", icon: LayoutTemplate },
      { name: "Timesheets", href: "/projects/timesheets", icon: Timer },
      { name: "Tickets", href: "/projects/tickets", icon: TicketCheck },
    ],
  },
  {
    key: "marketing",
    moduleKey: "marketing",
    label: "Marketing",
    icon: Megaphone,
    accent: "text-pink-500",
    items: [
      { name: "Overview", href: "/marketing", icon: Megaphone },
      { name: "Campaigns", href: "/marketing/campaigns", icon: Mail },
      { name: "Social", href: "/marketing/social", icon: MessageSquare },
      { name: "Events", href: "/marketing/events", icon: PartyPopper },
      { name: "Surveys", href: "/marketing/surveys", icon: ClipboardCheck },
    ],
  },
  {
    key: "reports",
    moduleKey: "reports",
    label: "Reports",
    icon: FileBarChart2,
    accent: "text-teal-500",
    items: [
      { name: "Reports", href: "/reports", icon: FileBarChart2 },
      { name: "Templates", href: "/reports/templates", icon: LayoutTemplate },
    ],
  },
  {
    key: "website",
    moduleKey: "website",
    label: "Website & CMS",
    icon: Globe,
    accent: "text-cyan-500",
    items: [
      { name: "Overview", href: "/website", icon: Globe },
      { name: "Pages", href: "/website/pages", icon: FileCode },
      { name: "Blog", href: "/website/blog", icon: PenLine },
      { name: "Forum", href: "/website/forum", icon: MessageSquare },
      { name: "FAQ", href: "/website/faq", icon: HelpCircle },
      { name: "Live Chat", href: "/website/chat", icon: Headphones },
    ],
  },
  {
    key: "organization",
    moduleKey: "organization",
    label: "Organization",
    icon: Building2,
    accent: "text-slate-500",
    items: [
      { name: "Business Portal", href: "/organization/business-portal", icon: CreditCard },
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
  {
    key: "reporting",
    moduleKey: "reports",
    label: "Reports",
    icon: FileBarChart2,
    accent: "text-indigo-500",
    items: [
      { name: "Templates", href: "/reports/templates", icon: LayoutTemplate },
      { name: "Generated", href: "/reports", icon: FileBarChart2 },
    ],
  },
  {
    key: "office",
    moduleKey: "office",
    label: "Office",
    icon: MessagesSquare,
    accent: "text-teal-500",
    items: [
      { name: "Overview", href: "/office", icon: MessagesSquare },
      { name: "Documents", href: "/office/documents", icon: FileText },
      { name: "Spreadsheets", href: "/office/spreadsheets", icon: FileSpreadsheetIcon },
      { name: "Presentations", href: "/office/presentations", icon: Presentation },
      { name: "Email", href: "/office/email", icon: MailIcon },
      { name: "Messaging", href: "/office/messaging", icon: MessageSquare },
      { name: "Calls", href: "/office/calls", icon: Phone },
    ],
  },
  {
    key: "settings",
    moduleKey: "settings",
    label: "Settings",
    icon: Shield,
    accent: "text-gray-500",
    items: [
      { name: "Roles & RBAC", href: "/settings/roles", icon: Shield },
      { name: "Organization", href: "/organization/settings", icon: Settings },
      { name: "Profile", href: "/profile", icon: UserCircle },
    ],
  },
];

const defaultModuleKeys = new Set([
  "home",
  "dashboard",
  "organization",
  "sales",
  "finance",
  "hrm",
  "inventory",
  "projects",
  "marketing",
  "website",
  "reports",
  "office",
  "settings",
]);

function applyTerminology(label: string, terminology: Record<string, string>) {
  const replacements: Record<string, string | undefined> = {
    "Sales & CRM": terminology.sales,
    Leads: terminology.leads,
    Deals: terminology.deals,
    Invoices: terminology.invoices,
    Products: terminology.products,
    Inventory: terminology.inventory,
    Projects: terminology.projects,
    Contacts: terminology.contacts,
    Orders: terminology.orders,
    Tenders: terminology.tenders,
    "CV Bank": terminology.cvBank,
  };

  return Object.entries(replacements).reduce(
    (next, [from, to]) => (to ? next.replaceAll(from, to) : next),
    label
  );
}

function useNavigationCategories() {
  const terminology = useSidebarStore((s) => s.terminology);
  const enabledModules = useSidebarStore((s) => s.enabledModules);
  const setWorkspaceNavigation = useSidebarStore((s) => s.setWorkspaceNavigation);

  useEffect(() => {
    let mounted = true;
    getNavigationPreferences()
      .then((prefs) => {
        if (mounted) setWorkspaceNavigation(prefs);
      })
      .catch(() => {
        if (mounted) setWorkspaceNavigation({});
      });
    return () => {
      mounted = false;
    };
  }, [setWorkspaceNavigation]);

  return useMemo(() => {
    const enabled = enabledModules ? new Set(enabledModules) : defaultModuleKeys;
    const showTenderTools = Boolean(
      terminology.tenders ||
        terminology.cvBank ||
        terminology.sales?.toLowerCase().includes("tender")
    );
    return baseCategories
      .filter(
        (category) =>
          enabled.has(category.moduleKey) ||
          category.moduleKey === "home" ||
          category.moduleKey === "settings"
      )
      .map((category) => ({
        ...category,
        label: applyTerminology(category.label, terminology),
        items: category.items
          .filter((item) => showTenderTools || !item.href.startsWith("/tenders"))
          .map((item) => ({
            ...item,
            name: applyTerminology(item.name, terminology),
          })),
      }));
  }, [enabledModules, terminology]);
}

// ---------------------------------------------------------------------------
// Classic sidebar (original design — all items visible)
// ---------------------------------------------------------------------------

function ClassicSidebar() {
  const pathname = usePathname();
  const categories = useNavigationCategories();

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
  const categories = useNavigationCategories();
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
                  <TooltipTrigger
                    render={
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
                        {hasActive && !isSelected && (
                          <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        {isSelected && (
                          <span className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                        )}
                        <cat.icon className="h-5 w-5" />
                      </button>
                    }
                  />
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
            <TooltipTrigger
              render={
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
              }
            />
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
// Mobile sidebar overlay
// ---------------------------------------------------------------------------

function MobileSidebar() {
  const pathname = usePathname();
  const categories = useNavigationCategories();
  const { mobileOpen, setMobileOpen } = useSidebarStore();

  // Close on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  if (!mobileOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={() => setMobileOpen(false)}
      />
      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl lg:hidden overflow-y-auto">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              T
            </div>
            <span className="text-lg font-semibold tracking-tight">TixelERP</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {categories.map((group) => (
            <div key={group.key} className="mb-3">
              <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <group.icon className={cn("h-3.5 w-3.5", group.accent)} />
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
                    onClick={() => setMobileOpen(false)}
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Horizontal navigation for top / bottom positions
// ---------------------------------------------------------------------------

function HorizontalNavigation() {
  const pathname = usePathname();
  const categories = useNavigationCategories();
  const { activeCategory, setActiveCategory, sidebarStyle } = useSidebarStore();

  const activeCat =
    categories.find((category) => category.key === activeCategory) ??
    categories.find((category) =>
      category.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href))
      )
    ) ??
    categories[0];

  return (
    <div className="hidden shrink-0 border-b bg-background lg:block">
      <div className="flex h-16 items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 pr-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            T
          </div>
          <span className="text-sm font-semibold tracking-tight">TixelERP</span>
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {categories.map((category) => {
            const selected = activeCat?.key === category.key;
            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <category.icon className="h-4 w-4" />
                {sidebarStyle === "windows" ? null : (
                  <span className="hidden xl:inline">{category.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeCat && (
        <div className="flex h-11 items-center gap-1 overflow-x-auto border-t px-4">
          {activeCat.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Windows navigation — compact taskbar-style module launcher
// ---------------------------------------------------------------------------

function WindowsNavigation() {
  const pathname = usePathname();
  const categories = useNavigationCategories();
  const { activeCategory, setActiveCategory, navPosition } = useSidebarStore();
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  if (isHorizontal) return <HorizontalNavigation />;

  return (
    <aside className="hidden w-20 shrink-0 border-r bg-zinc-950 text-white lg:flex lg:flex-col">
      <Link href="/" className="flex h-16 items-center justify-center border-b border-white/10">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-black text-zinc-950">
          T
        </div>
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
        {categories.map((category) => {
          const hasActive = category.items.some(
            (item) =>
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
          );
          const selected = activeCategory === category.key;
          return (
            <TooltipProvider key={category.key} delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setActiveCategory(category.key)}
                      className={cn(
                        "relative grid h-11 w-11 place-items-center rounded-xl transition-colors",
                        selected || hasActive
                          ? "bg-white text-zinc-950"
                          : "text-zinc-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <category.icon className="h-5 w-5" />
                      {hasActive && (
                        <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-blue-400" />
                      )}
                    </button>
                  }
                />
                <TooltipContent side={navPosition === "right" ? "left" : "right"}>
                  {category.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/settings/onboarding"
          className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white"
          title="Onboarding"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sidebar – switches between modern & classic based on user preference
// ---------------------------------------------------------------------------

export function Sidebar() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const navPosition = useSidebarStore((s) => s.navPosition);
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  return (
    <>
      <MobileSidebar />
      {isHorizontal ? (
        <HorizontalNavigation />
      ) : sidebarStyle === "classic" ? (
        <ClassicSidebar />
      ) : sidebarStyle === "windows" ? (
        <WindowsNavigation />
      ) : (
        <ModernSidebar />
      )}
    </>
  );
}
