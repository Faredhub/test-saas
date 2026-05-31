"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { getNavigationPreferences } from "@/lib/actions/user";
import {
  LayoutDashboard,
  LayoutGrid,
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
import { motion, AnimatePresence } from "framer-motion";

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
    label: "Sales",
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
      { name: "Sales Visit", href: "/sales/visits", icon: MapPin },
    ],
  },
  {
    key: "Site Store",
    moduleKey: "inventory",
    label: "Site Store ",
    icon: Package,
    accent: "text-amber-500",
    items: [
      { name: "Overview", href: "/inventory", icon: Package },
      { name: "Inventory", href: "/inventory/products", icon: Package },
      { name: "Stock", href: "/inventory/stock", icon: Warehouse },
      { name: "Warehouses", href: "/inventory/warehouses", icon: Building2 },
      { name: "Assets", href: "/inventory/assets", icon: Wrench },
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

function applyTerminology(label: string, terminology: Record<string, string>, isCategory = false) {
  const replacements: Record<string, string | undefined> = {
    "Sales & CRM": terminology.sales,
    Leads: terminology.leads,
    Deals: terminology.deals,
    Invoices: terminology.invoices,
    Products: terminology.products,
    Projects: isCategory ? terminology.projects : undefined,
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
        label: applyTerminology(category.label, terminology, true),
        items: category.items
          .filter((item) => showTenderTools || !item.href.startsWith("/tenders"))
          .map((item) => ({
            ...item,
            name: applyTerminology(item.name, terminology, false),
          })),
      }));
  }, [enabledModules, terminology]);
}

function isLinkActive(itemHref: string, pathname: string, siblingHrefs: string[]) {
  if (pathname === itemHref) return true;
  if (itemHref === "/") return false;

  const hasMoreSpecificMatch = siblingHrefs.some(
    (href) => href !== itemHref && href !== "/" && pathname.startsWith(href)
  );
  if (hasMoreSpecificMatch) return false;

  return pathname.startsWith(itemHref + "/");
}

// ---------------------------------------------------------------------------
// Classic sidebar (original design — all items visible)
// ---------------------------------------------------------------------------

function ClassicSidebar() {
  const pathname = usePathname();
  const categories = useNavigationCategories();

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="hidden w-64 shrink-0 border-r bg-background lg:block"
    >
      <div className="flex h-16 items-center border-b px-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              T
            </div>
            <span className="text-lg font-semibold tracking-tight">Knnect360</span>
          </Link>
        </motion.div>
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 4rem)" }}>
        {categories.map((group, groupIdx) => (
          <motion.div 
            key={group.key} 
            className="mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.05, duration: 0.3 }}
          >
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item, itemIdx) => {
              const siblingHrefs = group.items.map((i) => i.href);
              const isActive = isLinkActive(item.href, pathname, siblingHrefs);
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIdx * 0.05 + itemIdx * 0.02, duration: 0.2 }}
                  whileHover={{ x: 4 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <item.icon className="h-4 w-4" />
                    </motion.div>
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ))}
      </nav>
    </motion.aside>
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
    if (activeCategory) return;
    for (const cat of categories) {
      for (const item of cat.items) {
        if (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) {
          setActiveCategory(cat.key);
          return;
        }
      }
    }
  }, [categories, pathname, activeCategory, setActiveCategory]);

  const activeCat = categories.find((c) => c.key === activeCategory);

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
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-[68px] shrink-0 flex-col items-center border-r bg-background py-3 gap-1"
      >
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold mb-3 hover:opacity-90 transition-opacity"
          >
            T
          </Link>
        </motion.div>

        {/* Category icons */}
        <div className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto py-1">
          <TooltipProvider delay={0}>
            {categories.map((cat, idx) => {
              const isSelected = activeCategory === cat.key;
              const hasActive = categoryHasActiveRoute(cat);

              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          suppressHydrationWarning
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
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary"
                            />
                          )}
                          {isSelected && (
                            <motion.span 
                              layoutId="activeIndicator"
                              className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary"
                            />
                          )}
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <cat.icon className="h-5 w-5" />
                          </motion.div>
                        </button>
                      }
                    />
                    <TooltipContent side="right" sideOffset={8}>
                      <p className="font-medium">{cat.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Bottom: Settings shortcut */}
        <TooltipProvider delay={0}>
          <Tooltip>
            <TooltipTrigger
              render={
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
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
                </motion.div>
              }
            />
            <TooltipContent side="right" sideOffset={8}>
              <p className="font-medium">Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* Sub-panel */}
      <AnimatePresence mode="wait">
        {activeCat && (
          <motion.div
            key={activeCat.key}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "flex w-56 shrink-0 flex-col border-r bg-background/80 backdrop-blur-sm",
              !panelPinned && "absolute left-[68px] top-0 z-40 h-full shadow-xl"
            )}
          >
            {/* Panel header */}
            <motion.div 
              className="flex h-16 items-center justify-between border-b px-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <activeCat.icon className={cn("h-4 w-4 shrink-0", activeCat.accent)} />
                </motion.div>
                <span className="text-sm font-semibold truncate">{activeCat.label}</span>
              </div>
              <motion.button
                suppressHydrationWarning
                onClick={togglePanelPinned}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={panelPinned ? "Unpin panel" : "Pin panel"}
              >
                <motion.div
                  animate={{ rotate: panelPinned ? 0 : 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {panelPinned ? (
                    <Pin className="h-3.5 w-3.5" />
                  ) : (
                    <PinOff className="h-3.5 w-3.5" />
                  )}
                </motion.div>
              </motion.button>
            </motion.div>

            {/* Panel items */}
            <nav className="flex flex-col gap-0.5 overflow-y-auto p-3 flex-1">
              {activeCat.items.map((item, idx) => {
                const siblingHrefs = activeCat.items.map((i) => i.href);
                const isActive = isLinkActive(item.href, pathname, siblingHrefs);

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    whileHover={{ x: 4 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? activeCat.accent : ""
                          )}
                        />
                      </motion.div>
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <motion.div
                          initial={{ x: -5, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                        >
                          <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
                        </motion.div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Panel footer */}
            <motion.div 
              className="border-t px-4 py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                {activeCat.items.length} items
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <AnimatePresence>
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl lg:hidden overflow-y-auto"
          >
            <div className="flex h-16 items-center justify-between border-b px-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                    T
                  </div>
                  <span className="text-lg font-semibold tracking-tight">Knnect360</span>
                </Link>
              </motion.div>
              <motion.button
                suppressHydrationWarning
                onClick={() => setMobileOpen(false)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {categories.map((group, groupIdx) => (
                <motion.div 
                  key={group.key} 
                  className="mb-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIdx * 0.05, duration: 0.3 }}
                >
                  <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <group.icon className={cn("h-3.5 w-3.5", group.accent)} />
                    {group.label}
                  </p>
                  {group.items.map((item, itemIdx) => {
                    const siblingHrefs = group.items.map((i) => i.href);
                    const isActive = isLinkActive(item.href, pathname, siblingHrefs);
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIdx * 0.05 + itemIdx * 0.02, duration: 0.2 }}
                        whileHover={{ x: 4 }}
                      >
                        <Link
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
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
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
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="hidden shrink-0 border-b bg-background lg:block"
    >
      <div className="flex h-16 items-center gap-3 px-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link href="/" className="flex items-center gap-2 pr-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              T
            </div>
            <span className="text-sm font-semibold tracking-tight">Knnect360</span>
          </Link>
        </motion.div>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {categories.map((category) => {
            const selected = activeCat?.key === category.key;
            return (
              <motion.button
                suppressHydrationWarning
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <category.icon className="h-4 w-4" />
                {sidebarStyle === "windows" ? null : (
                  <motion.span 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    className="hidden xl:inline"
                  >
                    {category.label}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeCat && (
          <motion.div
            key={activeCat.key}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex h-11 items-center gap-1 overflow-x-auto border-t px-4"
          >
            {activeCat.items.map((item, idx) => {
              const siblingHrefs = activeCat.items.map((i) => i.href);
              const isActive = isLinkActive(item.href, pathname, siblingHrefs);
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                    >
                      {item.name}
                    </motion.span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Windows navigation — compact taskbar-style module launcher
// ---------------------------------------------------------------------------

function WindowsNavigation() {
  const pathname = usePathname();
  const categories = useNavigationCategories();
  const { activeCategory, setActiveCategory, navPosition, panelPinned, togglePanelPinned } = useSidebarStore();
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  // Auto-select category based on current route
  const lastPathnameRef = useRef(pathname);

  useEffect(() => {
    const navOccurred = lastPathnameRef.current !== pathname;
    lastPathnameRef.current = pathname;

    if (navOccurred || !activeCategory) {
      // Find the category that matches the route
      const matchingCat = categories.find((cat) =>
        cat.items.some(
          (item) =>
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
        )
      );

      if (matchingCat && matchingCat.key !== activeCategory) {
        setActiveCategory(matchingCat.key);
      }
    }
  }, [pathname, categories, activeCategory, setActiveCategory]);

  const activeCat = categories.find((c) => c.key === activeCategory);

  const subPanelClasses = cn(
    "flex shrink-0 border border-slate-100 dark:border-white/5 bg-white dark:bg-[#121425] text-zinc-900 dark:text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden z-50 transition-all duration-300",
    // Horizontal positioning (Top and Bottom)
    isHorizontal
      ? cn(
          "fixed w-[90%] max-w-3xl h-12 rounded-full left-1/2 -translate-x-1/2 items-center flex-row",
          navPosition === "top" ? "top-[5.5rem]" : "bottom-[5.5rem]"
        )
      : // Vertical positioning (Left and Right)
        cn(
          "flex-col my-4 h-[calc(100vh-2rem)]",
          navPosition === "left"
            ? (panelPinned ? "w-56 rounded-r-[2.5rem]" : "absolute left-24 top-0 w-56 rounded-[2.5rem]")
            : (panelPinned ? "w-56 rounded-l-[2.5rem]" : "absolute right-24 top-0 w-56 rounded-[2.5rem]")
        )
  );

  const isLauncherActive = activeCategory === "overview" || activeCategory === null;

  return (
    <div className={cn(
      "hidden lg:flex shrink-0 items-center justify-center relative",
      isHorizontal ? "w-full h-20" : "h-screen",
      navPosition === "right" && "flex-row-reverse"
    )}>
      {/* 🔮 Curving, Integrated Easy UI Sidebar */}
      <motion.aside 
        initial={{ y: isHorizontal ? (navPosition === "top" ? -30 : 30) : 0, x: isHorizontal ? 0 : (navPosition === "left" ? -30 : 30), opacity: 0 }}
        animate={{ y: 0, x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className={cn(
          "bg-gradient-to-b from-[#0F1123] via-[#0B0D19] to-[#070810] text-white relative select-none z-30 transition-all duration-300 border-white/5 shadow-2xl",
          isHorizontal 
            ? cn("flex flex-row items-center justify-between px-6 h-14 rounded-[2rem] border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] w-[95%] max-w-4xl mx-auto")
            : cn(
                "flex flex-col items-center justify-between py-6 w-20 h-[calc(100vh-2rem)] my-4 border",
                navPosition === "left" ? "ml-4 rounded-l-[2.5rem] border-r-0" : "mr-4 rounded-r-[2.5rem] border-l-0"
              )
        )}
      >
        {/* macOS Style Window Controls & Logo */}
        <div className={cn(
          "flex items-center shrink-0",
          isHorizontal ? "flex-row gap-3 pr-4" : "flex-col gap-4 pb-4"
        )}>
          {/* macOS Style Window Controls (Red, Yellow, Green dots) */}
          <div className="flex flex-row items-center gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_8px_rgba(255,95,86,0.5)] cursor-pointer hover:brightness-110" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-[0_0_8px_rgba(255,189,46,0.5)] cursor-pointer hover:brightness-110" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-[0_0_8px_rgba(39,201,63,0.5)] cursor-pointer hover:brightness-110" />
          </div>

          {/* Premium Logo (Stylized Logo from mockups) */}
          <div className="flex h-10 w-10 items-center justify-center shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#9B51E0] to-[#E0519B] text-white font-black text-xl shadow-lg shadow-purple-500/20">
              T
            </div>
          </div>
        </div>

        {/* Start / Launch Grid Tile (1st Icon - Reference Image 1) */}
        <div className={cn(
          "relative shrink-0 flex items-center justify-center h-14",
          isHorizontal ? "pr-4" : "w-full pb-4"
        )}>
          {isLauncherActive ? (
            // ACTIVE DOCK ITEM
            isHorizontal ? (
              // Horizontal: beautiful self-contained active badge
              <div 
                onClick={() => setActiveCategory("overview")}
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#121425] text-zinc-950 dark:text-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
              >
                <LayoutGrid className="w-5 h-5 text-zinc-950 dark:text-white fill-zinc-950/10 dark:fill-white/10 shrink-0" />
              </div>
            ) : (
              // Vertical: Bulging tab notch merging with content card (1st Image Style)
              <div 
                onClick={() => setActiveCategory("overview")}
                className="relative w-full h-12 flex items-center justify-center cursor-pointer"
              >
                {/* Bulging Active Pill tab background */}
                <div className={cn(
                  "absolute bg-white dark:bg-[#121425] shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-10 transition-all duration-300",
                  navPosition === "left" && "right-[-24px] w-[92px] h-12 rounded-l-full",
                  navPosition === "right" && "left-[-24px] w-[92px] h-12 rounded-r-full"
                )} />
                
                {/* Top / Bottom Reverse Rounded Corners */}
                {navPosition === "left" && (
                  <>
                    <div className="absolute right-0 -top-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                      <div className="w-full h-full rounded-br-2xl bg-[#0B0D19]" />
                    </div>
                    <div className="absolute right-0 -bottom-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                      <div className="w-full h-full rounded-tr-2xl bg-[#0B0D19]" />
                    </div>
                  </>
                )}
                {navPosition === "right" && (
                  <>
                    <div className="absolute left-0 -top-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                      <div className="w-full h-full rounded-bl-2xl bg-[#0B0D19]" />
                    </div>
                    <div className="absolute left-0 -bottom-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                      <div className="w-full h-full rounded-tl-2xl bg-[#0B0D19]" />
                    </div>
                  </>
                )}

                {/* Centered active icon */}
                <div className="relative z-20 flex items-center justify-center hover:scale-105 transition-all duration-300">
                  <LayoutGrid className="w-5 h-5 text-zinc-950 fill-zinc-950/10 shrink-0" />
                </div>
              </div>
            )
          ) : (
            // INACTIVE DOCK ITEM: Clean Minimal Outline
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory("overview")}
              className="w-10 h-10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:scale-110 flex items-center justify-center transition-all duration-300 cursor-pointer"
            >
              <LayoutGrid className="w-5 h-5 text-white/80" />
            </motion.button>
          )}
        </div>

        {/* Center / Navigation Menu Items (Excluding Overview) */}
        <nav className={cn(
          "flex items-center gap-3 overflow-auto scrollbar-none",
          isHorizontal ? "flex-row px-4 flex-1 justify-center" : "flex-col py-2 w-full flex-1"
        )}>
          {categories.filter((cat) => cat.key !== "overview").map((category, idx) => {
            const selected = activeCategory === category.key;
            const IconComponent = category.icon;

            return (
              <motion.div
                key={category.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                className={cn("relative shrink-0 flex items-center justify-center", isHorizontal ? "w-12" : "w-full")}
              >
                <TooltipProvider key={category.key} delay={0}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        selected ? (
                          isHorizontal ? (
                            // Horizontal: beautiful self-contained active badge
                            <div 
                              onClick={() => setActiveCategory(category.key)}
                              className="w-10 h-10 rounded-xl bg-white dark:bg-[#121425] text-zinc-950 dark:text-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20 scale-105 z-10"
                            >
                              <IconComponent className="w-5 h-5 text-zinc-950 dark:text-white fill-zinc-950/10 dark:fill-white/10 shrink-0" />
                            </div>
                          ) : (
                            // Vertical: Bulging tab notch merging with content card
                            <div 
                              onClick={() => setActiveCategory(category.key)}
                              className="relative w-full h-12 flex items-center justify-center cursor-pointer"
                            >
                              {/* Bulging Active Pill tab background */}
                              <div className={cn(
                                "absolute bg-white dark:bg-[#121425] shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-10 transition-all duration-300",
                                navPosition === "left" && "right-[-24px] w-[92px] h-12 rounded-l-full",
                                navPosition === "right" && "left-[-24px] w-[92px] h-12 rounded-r-full"
                              )} />

                              {/* Top / Bottom Reverse Rounded Corners */}
                              {navPosition === "left" && (
                                <>
                                  <div className="absolute right-0 -top-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                                    <div className="w-full h-full rounded-br-2xl bg-[#0B0D19]" />
                                  </div>
                                  <div className="absolute right-0 -bottom-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                                    <div className="w-full h-full rounded-tr-2xl bg-[#0B0D19]" />
                                  </div>
                                </>
                              )}
                              {navPosition === "right" && (
                                <>
                                  <div className="absolute left-0 -top-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                                    <div className="w-full h-full rounded-bl-2xl bg-[#0B0D19]" />
                                  </div>
                                  <div className="absolute left-0 -bottom-4 w-4 h-4 bg-white dark:bg-[#121425] z-10">
                                    <div className="w-full h-full rounded-tl-2xl bg-[#0B0D19]" />
                                  </div>
                                </>
                              )}

                              {/* Centered active icon */}
                              <div className="relative z-20 flex items-center justify-center hover:scale-105 transition-all duration-300">
                                <IconComponent className="w-5 h-5 text-zinc-950 fill-zinc-950/10 shrink-0" />
                              </div>
                            </div>
                          )
                        ) : (
                          <button
                            suppressHydrationWarning
                            onClick={() => setActiveCategory(category.key)}
                            className="relative grid h-12 w-12 place-items-center rounded-full transition-all duration-300 cursor-pointer text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:scale-110"
                          >
                            <IconComponent className="h-5 w-5 stroke-[1.8]" />
                          </button>
                        )
                      }
                    />
                    <TooltipContent side={isHorizontal ? "bottom" : (navPosition === "left" ? "right" : "left")} sideOffset={12}>
                      {category.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            );
          })}
        </nav>

        {/* Footer Settings Gear */}
        <div className={cn(
          "flex justify-center border-white/10 shrink-0",
          isHorizontal ? "pl-4 border-l h-8 items-center" : "pt-4 border-t w-full"
        )}>
          <motion.div
            whileHover={{ scale: 1.12, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/settings/onboarding"
              className="grid h-10 w-10 place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:scale-110 transition-all duration-300"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </motion.aside>

      {/* 💻 Matching Floating App Launcher Sub-panel */}
      <AnimatePresence mode="wait">
        {activeCat && (
          <motion.div
            key={activeCat.key}
            initial={{ 
              opacity: 0, 
              y: isHorizontal ? (navPosition === "top" ? -20 : 20) : 0, 
              x: isHorizontal ? 0 : (navPosition === "left" ? -20 : 20) 
            }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ 
              opacity: 0, 
              y: isHorizontal ? (navPosition === "top" ? -20 : 20) : 0, 
              x: isHorizontal ? 0 : (navPosition === "left" ? -20 : 20) 
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={subPanelClasses}
          >
            {/* Panel content based on orientation */}
            {isHorizontal ? (
              // HORIZONTAL SUB-PANEL LAYOUT (No more vertical stacking!)
              <div className="flex flex-row items-center w-full h-full px-4 gap-4">
                {/* Category title */}
                <div className="flex items-center gap-2 shrink-0 border-r border-slate-100 dark:border-white/5 pr-4 h-8">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <activeCat.icon className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                  </motion.div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{activeCat.label}</span>
                </div>

                {/* Sub-menu items list in a horizontal row */}
                <nav className="flex flex-row items-center gap-2 overflow-x-auto flex-1 scrollbar-none py-1 h-full">
                  {activeCat.items.map((item, idx) => {
                    const siblingHrefs = activeCat.items.map((i) => i.href);
                    const isActive = isLinkActive(item.href, pathname, siblingHrefs);

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        className="shrink-0"
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-all duration-300 relative h-8 border",
                            isActive
                              ? "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/10 text-zinc-900 dark:text-white font-bold pl-8 shadow-sm"
                              : "text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-zinc-900 dark:hover:text-white"
                          )}
                        >
                          {/* ACTIVE ITEM Notch */}
                          {isActive && (
                            <div className="absolute left-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shadow-sm z-10 animate-fade-in">
                              <item.icon className="h-3 w-3 text-zinc-800 dark:text-zinc-200" />
                            </div>
                          )}

                          {!isActive && (
                            <item.icon className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                          )}

                          <span className="truncate">{item.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Right Pin & Footer info */}
                <div className="flex items-center gap-3 shrink-0 border-l border-slate-100 pl-4 h-8">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hidden sm:block">
                    {activeCat.items.length} Quick Links
                  </p>
                  <motion.button
                    suppressHydrationWarning
                    onClick={togglePanelPinned}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-slate-50 transition-colors"
                    title={panelPinned ? "Unpin launcher" : "Pin launcher"}
                  >
                    <motion.div
                      animate={{ rotate: panelPinned ? 0 : 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      {panelPinned ? (
                        <Pin className="h-3.5 w-3.5" />
                      ) : (
                        <PinOff className="h-3.5 w-3.5" />
                      )}
                    </motion.div>
                  </motion.button>
                </div>
              </div>
            ) : (
              // VERTICAL SUB-PANEL LAYOUT (Standard side menu)
              <>
                {/* Panel header */}
                <motion.div 
                  className="flex h-14 items-center justify-between border-b border-slate-100 dark:border-white/5 px-4 shrink-0"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <activeCat.icon className={cn("h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300")} />
                    </motion.div>
                    <span className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">{activeCat.label}</span>
                  </div>
                  <motion.button
                    suppressHydrationWarning
                    onClick={togglePanelPinned}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-slate-50 transition-colors"
                    title={panelPinned ? "Unpin launcher" : "Pin launcher"}
                  >
                    <motion.div
                      animate={{ rotate: panelPinned ? 0 : 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      {panelPinned ? (
                        <Pin className="h-3.5 w-3.5" />
                      ) : (
                        <PinOff className="h-3.5 w-3.5" />
                      )}
                    </motion.div>
                  </motion.button>
                </motion.div>

                {/* Sub-menu items (White background, Slate capsule style) */}
                <nav className="flex flex-col gap-1.5 overflow-y-auto p-3 flex-1 scrollbar-none">
                  {activeCat.items.map((item, idx) => {
                    const siblingHrefs = activeCat.items.map((i) => i.href);
                    const isActive = isLinkActive(item.href, pathname, siblingHrefs);

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        whileHover={{ x: 4 }}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-full px-4 py-2.5 text-xs transition-all duration-300 relative h-10 border",
                            isActive
                              ? "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/10 text-zinc-900 dark:text-white font-bold pl-12 scale-[1.01] shadow-sm"
                              : "text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-zinc-900 dark:hover:text-white hover:scale-[1.01] hover:border-slate-100/50 dark:hover:border-white/5"
                          )}
                        >
                          {/* ACTIVE ITEM: left circular notch container */}
                          {isActive && (
                            <div className="absolute left-1 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shadow-sm z-10 animate-fade-in">
                              <item.icon className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
                            </div>
                          )}

                          {/* Spacer or normal icon */}
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.3 }}
                            className={cn("flex items-center justify-center shrink-0", isActive ? "opacity-0 w-8" : "")}
                          >
                            {!isActive && (
                              <item.icon className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                            )}
                          </motion.div>
                          
                          <span className="truncate">{item.name}</span>
                          
                          {isActive && (
                            <motion.div
                              initial={{ x: -5, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              className="ml-auto"
                            >
                              <ChevronRight className="h-3 w-3 text-zinc-500 dark:text-zinc-400 opacity-70" />
                            </motion.div>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Panel footer */}
                <motion.div 
                  className="border-t border-slate-100 dark:border-white/5 px-4 py-2.5 shrink-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {activeCat.items.length} Quick Links
                  </p>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const sidebarStyle = useSidebarStore((s) => s.sidebarStyle);
  const navPosition = useSidebarStore((s) => s.navPosition);
  const hasHydrated = useSidebarStore((s) => s.hasHydrated);
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  if (!hasHydrated) return null;

  return (
    <>
      <MobileSidebar />
      {sidebarStyle === "windows" ? (
        <WindowsNavigation />
      ) : isHorizontal ? (
        <HorizontalNavigation />
      ) : sidebarStyle === "classic" ? (
        <ClassicSidebar />
      ) : (
        <ModernSidebar />
      )}
    </>
  );
}