"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  Plus,
  Home,
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
      { name: "Books", href: "/finance/accounts", icon: BookOpenCheck },
      { name: "Journal", href: "/finance/journal", icon: FileSpreadsheet },
      { name: "Expenses", href: "/finance/expenses", icon: CreditCard },
      { name: "Payroll", href: "/finance/payroll", icon: Banknote },
      { name: "Settle", href: "/finance/bills", icon: Receipt },
      { name: "Credit Notes", href: "/finance/credit-notes", icon: FilePlus2 },
      // { name: "Payments", href: "/finance/payments", icon: Landmark },
      { name: "Reports", href: "/finance/reports", icon: FileBarChart },
      { name: "Documents", href: "/finance/documents", icon: FolderOpen },
      // { name: "Currency", href: "/finance/currency", icon: Globe },
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
      // { name: "Pipeline", href: "/sales/pipeline", icon: ClipboardList },
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Tenders", href: "/tenders", icon: Gavel },
      { name: "CV Bank", href: "/tenders/cv-bank", icon: Contact },
      { name: "Deals", href: "/sales/deals", icon: ShoppingCart },
      { name: "Quotations", href: "/sales/quotations", icon: FileText },
      { name: "Invoice", href: "/sales/invoices", icon: Receipt },
      { name: "Subscriptions", href: "/sales/subscriptions", icon: RefreshCw },
      { name: "Route", href: "/sales/visits", icon: MapPin },
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
      { name: "Stock", href: "/inventory/stock", icon: Warehouse },
      { name: "Warehouses", href: "/inventory/warehouses", icon: Building2 },
      { name: "Maintenance", href: "/inventory/assets", icon: Wrench },
    ],
  },
  {
    key: "hrm",
    moduleKey: "hrm",
    label: "Human Resource",
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
      { name: "Health", href: "/organization/database", icon: Database },
      // { name: "Settings", href: "/organization/settings", icon: Settings },
    ],
  },
  // {
  //   key: "reporting",
  //   moduleKey: "reports",
  //   label: "Reports",
  //   icon: FileBarChart2,
  //   accent: "text-indigo-500",
  //   items: [
  //     { name: "Templates", href: "/reports/templates", icon: LayoutTemplate },
  //     { name: "Generated", href: "/reports", icon: FileBarChart2 },
  //   ],
  // },
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
      { name: "Discuss", href: "/office/messaging", icon: MessageSquare },
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
      { name: "Mail Server", href: "/settings/mail", icon: Mail },
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

export function useNavigationCategories() {
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
// macOS Launchpad-style Applications Overlay Components
// ---------------------------------------------------------------------------

function MacLaunchpadIcon({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-[2.5px] p-[3.5px] w-5.5 h-5.5 rounded-md", className)}>
      <div className="rounded-[1.5px] bg-[#FF5F56] shadow-[0_0_3px_rgba(255,95,86,0.3)]" />
      <div className="rounded-[1.5px] bg-[#27C93F] shadow-[0_0_3px_rgba(39,201,63,0.3)]" />
      <div className="rounded-[1.5px] bg-[#007AFF] shadow-[0_0_3px_rgba(0,122,255,0.3)]" />
      <div className="rounded-[1.5px] bg-[#FF9500] shadow-[0_0_3px_rgba(255,149,0,0.3)]" />
      <div className="rounded-[1.5px] bg-[#AF52DE] shadow-[0_0_3px_rgba(175,82,222,0.3)]" />
      <div className="rounded-[1.5px] bg-[#FFCC00] shadow-[0_0_3px_rgba(255,204,0,0.3)]" />
      <div className="rounded-[1.5px] bg-[#FF2D55] shadow-[0_0_3px_rgba(255,45,85,0.3)]" />
      <div className="rounded-[1.5px] bg-[#34C759] shadow-[0_0_3px_rgba(52,199,89,0.3)]" />
      <div className="rounded-[1.5px] bg-[#5856D6] shadow-[0_0_3px_rgba(88,86,214,0.3)]" />
    </div>
  );
}

function MacAppStoreIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#34aadc] to-[#007aff] shadow-md shadow-blue-500/10", className)}>
      {/* Three overlapping white lines forming App Store 'A' */}
      <div className="absolute w-[2px] h-[65%] bg-white rounded-full transform -rotate-[30deg] translate-x-[-3.5px] translate-y-[-1px]" />
      <div className="absolute w-[2px] h-[65%] bg-white rounded-full transform rotate-[30deg] translate-x-[3.5px] translate-y-[-1px]" />
      <div className="absolute w-[45%] h-[2px] bg-white rounded-full transform translate-y-[3px]" />
    </div>
  );
}

export function getAppIconGradient(name: string): string {
  const lowercaseName = name.toLowerCase();

  // Finance Module - Rich emerald/teal deepcolor
  if (lowercaseName.includes("account")) return "from-emerald-600 via-teal-700 to-cyan-800";
  if (lowercaseName.includes("journal")) return "from-teal-600 via-cyan-700 to-sky-800";
  if (lowercaseName.includes("expense")) return "from-rose-600 via-pink-700 to-fuchsia-800";
  if (lowercaseName.includes("payroll")) return "from-amber-600 via-orange-600 to-red-700";
  if (lowercaseName.includes("bill")) return "from-orange-600 via-red-700 to-rose-800";
  if (lowercaseName.includes("credit note")) return "from-fuchsia-600 via-purple-700 to-violet-800";
  if (lowercaseName.includes("payment")) return "from-blue-600 via-indigo-700 to-purple-800";
  if (lowercaseName.includes("currency")) return "from-emerald-500 via-teal-600 to-green-700";

  // Sales Module - Warm, deep orange/crimson gradients
  if (lowercaseName.includes("lead")) return "from-indigo-600 via-purple-700 to-fuchsia-800";
  if (lowercaseName.includes("contact")) return "from-pink-600 via-rose-700 to-red-700";
  if (lowercaseName.includes("tender")) return "from-amber-600 via-yellow-600 to-orange-700";
  if (lowercaseName.includes("cv bank")) return "from-teal-700 via-emerald-600 to-cyan-700";
  if (lowercaseName.includes("deal")) return "from-orange-600 via-red-600 to-rose-700";
  if (lowercaseName.includes("quotation")) return "from-sky-600 via-blue-700 to-indigo-800";
  if (lowercaseName.includes("invoice")) return "from-rose-500 via-orange-600 to-red-600";
  if (lowercaseName.includes("subscription")) return "from-cyan-600 via-blue-600 to-indigo-700";
  if (lowercaseName.includes("visit")) return "from-violet-600 via-purple-700 to-indigo-800";

  // Inventory Module - Solid earthy amber/slate gradients
  if (lowercaseName.includes("inventory")) return "from-yellow-600 via-amber-600 to-orange-700";
  if (lowercaseName.includes("stock")) return "from-amber-800 via-orange-800 to-red-900";
  if (lowercaseName.includes("warehouse")) return "from-blue-800 via-indigo-800 to-slate-900";
  if (lowercaseName.includes("asset")) return "from-slate-700 via-slate-800 to-zinc-900";

  // HRM Module - Deep purples and glowing reds
  if (lowercaseName.includes("employee")) return "from-purple-600 via-indigo-700 to-blue-800";
  if (lowercaseName.includes("recruitment")) return "from-sky-600 via-blue-700 to-indigo-800";
  if (lowercaseName.includes("leave")) return "from-red-600 via-rose-600 to-pink-700";
  if (lowercaseName.includes("attendance")) return "from-green-600 via-emerald-600 to-teal-700";
  if (lowercaseName.includes("performance")) return "from-yellow-500 via-amber-500 to-orange-600";
  if (lowercaseName.includes("scheduling")) return "from-pink-600 via-rose-600 to-red-700";
  if (lowercaseName.includes("fleet")) return "from-blue-600 via-cyan-600 to-teal-700";

  // Projects Module - Tech deepcyans/blues
  if (lowercaseName.includes("project")) return "from-cyan-600 via-blue-600 to-indigo-700";
  if (lowercaseName.includes("template")) return "from-slate-600 via-zinc-700 to-slate-800";
  if (lowercaseName.includes("timesheet")) return "from-blue-500 via-sky-600 to-teal-600";
  if (lowercaseName.includes("ticket")) return "from-purple-600 via-pink-700 to-rose-700";

  // Marketing & website - Bright magentas and greens
  if (lowercaseName.includes("campaign")) return "from-rose-600 via-pink-600 to-fuchsia-700";
  if (lowercaseName.includes("social")) return "from-sky-500 via-blue-600 to-indigo-600";
  if (lowercaseName.includes("event")) return "from-fuchsia-600 via-purple-700 to-indigo-800";
  if (lowercaseName.includes("survey")) return "from-emerald-600 via-teal-600 to-cyan-700";
  if (lowercaseName.includes("page")) return "from-purple-700 via-violet-750 to-indigo-800";
  if (lowercaseName.includes("blog")) return "from-yellow-600 via-orange-600 to-red-700";
  if (lowercaseName.includes("forum")) return "from-cyan-650 via-teal-700 to-emerald-800";
  if (lowercaseName.includes("faq")) return "from-indigo-600 via-blue-700 to-sky-700";
  if (lowercaseName.includes("live chat") || lowercaseName.includes("chat")) return "from-green-600 via-emerald-600 to-teal-700";

  // Organization / System Module - Deep premium steel metallic
  if (lowercaseName.includes("business portal") || lowercaseName.includes("portal")) return "from-slate-800 via-slate-900 to-zinc-950";
  if (lowercaseName.includes("department")) return "from-violet-700 via-purple-800 to-indigo-900";
  if (lowercaseName.includes("branch")) return "from-indigo-700 via-blue-800 to-slate-900";
  if (lowercaseName.includes("contract")) return "from-teal-700 via-cyan-800 to-indigo-900";
  if (lowercaseName.includes("signature")) return "from-fuchsia-700 via-pink-800 to-rose-900";
  if (lowercaseName.includes("library")) return "from-amber-600 via-yellow-700 to-orange-800";
  if (lowercaseName.includes("notice")) return "from-rose-600 via-red-700 to-orange-800";
  if (lowercaseName.includes("calendar")) return "from-red-600 via-rose-700 to-pink-800";
  if (lowercaseName.includes("note")) return "from-yellow-600 via-amber-600 to-orange-700";
  if (lowercaseName.includes("approval")) return "from-emerald-700 via-teal-700 to-cyan-800";
  if (lowercaseName.includes("form")) return "from-indigo-600 via-sky-600 to-cyan-700";
  if (lowercaseName.includes("database")) return "from-blue-700 via-indigo-800 to-slate-950";
  if (lowercaseName.includes("spreadsheet")) return "from-green-700 via-emerald-700 to-teal-800";
  if (lowercaseName.includes("presentation")) return "from-orange-600 via-red-700 to-rose-800";
  if (lowercaseName.includes("email")) return "from-sky-600 via-blue-700 to-indigo-800";
  if (lowercaseName.includes("messaging")) return "from-indigo-600 via-blue-700 to-teal-800";
  if (lowercaseName.includes("call")) return "from-green-600 via-teal-700 to-cyan-800";

  // Settings & Core Overview - Deep primary gradients
  if (lowercaseName.includes("role") || lowercaseName.includes("rbac") || lowercaseName.includes("shield")) return "from-red-700 via-orange-700 to-yellow-800";
  if (lowercaseName.includes("profile")) return "from-blue-700 via-indigo-700 to-purple-800";
  if (lowercaseName.includes("settings") || lowercaseName.includes("organization")) return "from-slate-700 via-slate-800 to-zinc-900";
  if (lowercaseName.includes("home")) return "from-blue-600 via-indigo-600 to-purple-700";
  if (lowercaseName.includes("dashboard")) return "from-violet-600 via-purple-700 to-indigo-800";

  return "from-blue-600 via-indigo-600 to-purple-700";
}

interface LauncherApp {
  name: string;
  href: string;
  icon: LucideIcon;
  categoryKey: string;
  tab: string;
}

function ApplicationsOverlay({
  onClose,
  categories,
  initialCategoryKey,
}: {
  onClose: () => void;
  categories: any[];
  initialCategoryKey: string | null;
}) {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = useMemo(() => {
    return ["All", ...categories.map((cat) => cat.label)];
  }, [categories]);

  useEffect(() => {
    if (!initialCategoryKey || initialCategoryKey === "launcher") {
      setActiveTab("All");
    } else {
      const matchingCat = categories.find((cat) => cat.key === initialCategoryKey);
      if (matchingCat) {
        setActiveTab(matchingCat.label);
      } else {
        setActiveTab("All");
      }
    }
  }, [initialCategoryKey, categories]);

  const launcherApps = useMemo(() => {
    const apps: LauncherApp[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((item: any) => {
        if (apps.some((a) => a.href === item.href)) return;
        apps.push({
          name: item.name,
          href: item.href,
          icon: item.icon,
          categoryKey: cat.key,
          tab: cat.label,
        });
      });
    });
    return apps;
  }, [categories]);

  const filteredApps = useMemo(() => {
    return launcherApps.filter((app) => {
      const matchesTab = activeTab === "All" || app.tab === activeTab;
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tab.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [launcherApps, activeTab, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 dark:bg-black/40 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative flex h-[80vh] max-h-[700px] w-full max-w-4xl flex-col rounded-[2.5rem] border border-slate-200/50 dark:border-white/10 bg-white/80 dark:bg-[#0c0d19]/80 backdrop-blur-2xl p-6 md:p-8 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute -right-20 -bottom-20 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5 relative pr-10 sm:pr-0">
          <div className="flex items-center gap-3">
            <MacAppStoreIcon className="w-10 h-10 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 transition-all duration-300">
                {activeTab === "All" ? "Applications" : activeTab}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider">
                {filteredApps.length} features available
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64 md:w-80 sm:mr-10">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-full border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-[#0c0d19]/90 shadow-inner transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-zinc-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute top-1 sm:top-1/2 sm:-translate-y-1/2 right-0 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-all duration-200 cursor-pointer shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-4 scrollbar-none border-b border-slate-100 dark:border-white/5 -mx-6 px-6 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-sm"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto py-6 -mx-6 px-6 scrollbar-none">
          {filteredApps.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-6 justify-items-center"
            >
              <AnimatePresence>
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  const gradientClass = getAppIconGradient(app.name);

                  return (
                    <motion.div
                      key={app.href}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="group w-full max-w-[100px] flex flex-col items-center cursor-pointer"
                    >
                      <Link
                        href={app.href}
                        onClick={onClose}
                        className="flex flex-col items-center w-full"
                      >
                        {/* iOS Squircle App Icon Container */}
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1.5 shadow-md group-hover:shadow-[0_12px_25px_rgba(0,0,0,0.3)]">
                          {/* Ambient Glowing Shadow Behind */}
                          <div className={cn(
                            "absolute inset-[-2px] rounded-2xl bg-gradient-to-tr blur-md opacity-45 group-hover:opacity-75 group-hover:blur-lg transition-all duration-300 pointer-events-none",
                            gradientClass
                          )} />

                          {/* Primary Gradient Squircle Icon */}
                          <div
                            className={cn(
                              "relative w-full h-full rounded-2xl bg-gradient-to-tr flex items-center justify-center overflow-hidden border border-white/20 dark:border-white/10 z-10",
                              gradientClass
                            )}
                          >
                            {/* Top lighting reflection */}
                            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

                            {/* Sleek icon glow */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

                            <Icon className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] shrink-0" />
                          </div>
                        </div>

                        <span className="mt-2 text-center text-[11px] font-bold text-slate-600 dark:text-zinc-400 truncate w-full group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-200 px-1">
                          {app.name}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-12">
              <p className="text-sm font-semibold text-slate-400 dark:text-zinc-500">No applications match your search</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveTab("All"); }}
                className="mt-3 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Windows navigation — compact taskbar-style module launcher
// ---------------------------------------------------------------------------

export function getAppByHref(href: string, categories: any[]) {
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.href === href) {
        return {
          ...item,
          categoryAccent: cat.accent,
          categoryLabel: cat.label,
        };
      }
    }
  }
  // Also check top-level overview links
  if (href === "/") {
    return {
      name: "Home",
      href: "/",
      icon: LayoutDashboard,
      categoryAccent: "text-blue-500",
      categoryLabel: "Overview",
    };
  }
  return null;
}

function WindowsNavigation() {
  const pathname = usePathname();
  const categories = useNavigationCategories();
  const { activeCategory, setActiveCategory, navPosition, panelPinned, togglePanelPinned, pinnedHrefs, addPinnedHref, removePinnedHref } = useSidebarStore();
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const href = e.dataTransfer.getData("text/plain");
    if (href) {
      // Validate that the app exists
      const app = getAppByHref(href, categories);
      if (app) {
        addPinnedHref(href);
      }
    }
  };

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

  const pinnedApps = useMemo(() => {
    return (pinnedHrefs || [])
      .map((href) => getAppByHref(href, categories))
      .filter((app): app is NonNullable<typeof app> => app !== null);
  }, [pinnedHrefs, categories]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "hidden lg:flex shrink-0 items-center justify-center relative transition-all duration-300",
        isHorizontal ? "w-full h-20" : "h-screen",
        navPosition === "right" && "flex-row-reverse"
      )}
    >
      {/* 🔮 Curving, Pinned-style Sidebar */}
      <motion.aside
        initial={{ y: isHorizontal ? (navPosition === "top" ? -30 : 30) : 0, x: isHorizontal ? 0 : (navPosition === "left" ? -30 : 30), opacity: 0 }}
        animate={{ y: 0, x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className={cn(
          "bg-gradient-to-b from-[#0F1123] via-[#0B0D19] to-[#070810] text-white relative select-none z-30 transition-all duration-300 border border-white/5 shadow-2xl",
          isDragOver && "ring-2 ring-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.35)] scale-[1.02] border-purple-500/30",
          isHorizontal
            ? cn("flex flex-row items-center justify-between px-6 h-14 rounded-[2rem] border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] w-[95%] max-w-4xl mx-auto")
            : cn(
              "flex flex-col items-center justify-between py-6 w-20 h-[calc(100vh-2rem)] my-4",
              navPosition === "left" ? "ml-4 rounded-full border-r-0" : "mr-4 rounded-full border-l-0"
            )
        )}
      >
        {/* Premium Logo wrapped as Clickable Home Link */}
        <div className={cn(
          "flex items-center shrink-0",
          isHorizontal ? "flex-row gap-3 pr-4 border-r border-white/10" : "flex-col gap-4 pb-4 border-b border-white/10 w-full"
        )}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 items-center justify-center shrink-0"
          >
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#9B51E0] to-[#E0519B] text-white font-black text-xl shadow-lg shadow-purple-500/20"
            >
              T
            </Link>
          </motion.div>
        </div>

        {/* Center / Navigation Menu Items (Quick Access Pinned Apps) */}
        <nav className={cn(
          "flex items-center gap-3 overflow-y-auto scrollbar-none transition-all duration-300 py-4 px-2 w-full flex-1",
          isHorizontal ? "flex-row px-4 flex-1 justify-center overflow-x-auto" : "flex-col py-4 w-full flex-1"
        )}>
          {pinnedApps.length === 0 ? (
            <div
              className={cn(
                "flex items-center justify-center border border-dashed border-white/20 rounded-2xl transition-all duration-300 shrink-0",
                isHorizontal ? "w-10 h-10" : "w-10 h-10",
                isDragOver ? "border-purple-400 bg-purple-500/10 text-purple-300 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "text-white/30"
              )}
              title="Drag apps here to pin"
            >
              <Plus className="w-5 h-5 animate-pulse" />
            </div>
          ) : (
            pinnedApps.map((app, idx) => {
              const Icon = app.icon;
              const isActive = pathname === app.href || (app.href !== "/" && pathname.startsWith(app.href));
              const gradientClass = getAppIconGradient(app.name);

              return (
                <motion.div
                  key={`${app.href}-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className="relative group shrink-0 flex items-center justify-center w-10 h-10"
                >
                  <TooltipProvider delay={0}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div className="relative flex items-center justify-center w-10 h-10">
                            <Link
                              href={app.href}
                              className={cn(
                                "relative flex items-center justify-center cursor-pointer transition-all duration-300 rounded-xl w-10 h-10 shadow-md group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]",
                                isActive ? "scale-105 ring-2 ring-white/50 border-white/10" : "hover:scale-110 active:scale-95"
                              )}
                            >
                              {/* Gradient background with lighting reflection */}
                              <div className={cn(
                                "absolute inset-0 rounded-xl bg-gradient-to-tr z-0 border border-white/20 dark:border-white/10 overflow-hidden",
                                gradientClass
                              )}>
                                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                              </div>
                              
                              <Icon className="relative z-10 w-5 h-5 text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.2)] shrink-0" />
                            </Link>

                            {/* Tiny macOS-style active running dot under the app */}
                            {isActive && (
                              <span className={cn(
                                "absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20",
                                isHorizontal 
                                  ? "bottom-[-6px] left-1/2 -translate-x-1/2 w-1.5 h-1.5" 
                                  : (navPosition === "left" ? "right-[-6px] top-1/2 -translate-y-1/2 w-1.5 h-1.5" : "left-[-6px] top-1/2 -translate-y-1/2 w-1.5 h-1.5")
                              )} />
                            )}

                            {/* Hover unpin 'X' button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removePinnedHref(app.href);
                              }}
                              className="absolute -top-1.5 -right-1.5 z-30 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/85 hover:bg-red-600 text-white text-[9px] opacity-0 group-hover:opacity-100 border border-white/25 transition-all duration-205 cursor-pointer shadow-md hover:scale-110 active:scale-90"
                              title="Unpin from sidebar"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        }
                      />
                      <TooltipContent side={isHorizontal ? "bottom" : (navPosition === "left" ? "right" : "left")} sideOffset={12}>
                        {app.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              );
            })
          )}
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