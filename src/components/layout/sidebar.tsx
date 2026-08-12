"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { getNavigationPreferences } from "@/lib/actions/user";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  Building2,
  Users,
  ShoppingCart,
  ShoppingBag,
  Palette,
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
  BellRing,
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
  Layers,
  Tag,
  Warehouse,
  Factory,
  Wrench,
  ShieldCheck,
  Mail,
  PartyPopper,
  Paintbrush,
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
      { name: "Payments", href: "/finance/payments", icon: Landmark },
      { name: "Reports", href: "/finance/reports", icon: FileBarChart },
      { name: "Documents", href: "/finance/documents", icon: FolderOpen },
      { name: "Currency", href: "/finance/currency", icon: Globe },
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
      { name: "Contacts", href: "/sales/contacts", icon: UserCircle },
      { name: "Tenders", href: "/tenders", icon: Gavel },
      { name: "CV Bank", href: "/tenders/cv-bank", icon: Contact },
      { name: "Deals", href: "/sales/deals", icon: ShoppingCart },
      { name: "Quotations", href: "/sales/quotations", icon: FileText },
      { name: "Sales Orders", href: "/sales/orders", icon: ClipboardList },
      { name: "Products", href: "/sales/products", icon: Package },
      { name: "Product Variants", href: "/sales/product-variants", icon: Layers },
      { name: "Pricelists", href: "/sales/pricelists", icon: Tag },
      { name: "Sales Teams", href: "/sales/teams", icon: Users },
      { name: "Invoice", href: "/sales/invoices", icon: Receipt },
      { name: "Subscriptions", href: "/sales/subscriptions", icon: RefreshCw },
      { name: "Route", href: "/sales/visits", icon: MapPin },
      { name: "Kiosk", href: "/sales/kiosk", icon: Monitor },
      { name: "Waiter Calls", href: "/sales/waiter-calls", icon: BellRing },
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
      { name: "Vendors", href: "/inventory/vendors", icon: Users },
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
      { name: "Field Visits", href: "/projects/field-visits", icon: ClipboardCheck },
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
      { name: "Email Designer", href: "/marketing/email-builder", icon: Paintbrush },
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
      { name: "eCommerce", href: "/website/ecommerce", icon: ShoppingBag },
      { name: "Themes", href: "/website/themes", icon: Palette },
      { name: "Domains", href: "/website/domains", icon: Globe },
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
    label: "Workspace",
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
      { name: "Roles", href: "/settings/roles", icon: Shield },
      { name: "Mail Server", href: "/settings/mail", icon: Mail },
      { name: "Management", href: "/organization/settings", icon: Settings },
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
  // User explicitly wants "Products" displayed as "Products" (overriding legacy "Rooms & Packages" terminology)
  const customTerminology: Record<string, string | undefined> = { ...terminology, products: undefined };

  const replacements: Record<string, string | undefined> = {
    "Sales & CRM": customTerminology.sales,
    Products: customTerminology.products,
    Projects: customTerminology.projects,
    Orders: customTerminology.orders,
    Tenders: customTerminology.tenders,
    "CV Bank": customTerminology.cvBank,
  };

  return Object.entries(replacements).reduce(
    (next, [from, to]) => (to ? next.replaceAll(from, to) : next),
    label
  );
}

const routeResourceMap: Record<string, string[]> = {
  "/": ["*"],
  "/dashboard": ["analytics", "dashboard"],
  "/finance": ["accounts", "finance", "expenses", "bills"],
  "/finance/accounts": ["accounts"],
  "/finance/journal": ["journal"],
  "/finance/expenses": ["expenses"],
  "/finance/payroll": ["payroll"],
  "/finance/bills": ["bills"],
  "/finance/credit-notes": ["credit-notes"],
  "/finance/reports": ["reports"],
  "/finance/documents": ["documents"],
  "/sales/leads": ["leads"],
  "/sales/contacts": ["contacts"],
  "/tenders": ["tenders"],
  "/tenders/cv-bank": ["cv-bank", "tenders"],
  "/sales/deals": ["deals"],
  "/sales/quotations": ["quotations"],
  "/sales/invoices": ["invoices"],
  "/sales/subscriptions": ["subscriptions"],
  "/sales/visits": ["visits"],
  "/sales/kiosk": ["kiosk"],
  "/sales/waiter-calls": ["waiter-calls"],
  "/inventory": ["stock", "inventory", "warehouses", "assets", "vendors"],
  "/inventory/stock": ["stock"],
  "/inventory/warehouses": ["warehouses"],
  "/inventory/assets": ["assets"],
  "/inventory/vendors": ["stock", "inventory", "warehouses"],
  "/hrm": ["employees", "hrm", "attendance", "leaves"],
  "/hrm/employees": ["employees"],
  "/hrm/recruitment": ["recruitment"],
  "/hrm/leaves": ["leaves"],
  "/hrm/attendance": ["attendance"],
  "/hrm/performance": ["performance"],
  "/hrm/scheduling": ["scheduling"],
  "/hrm/fleet": ["fleet"],
  "/projects": ["projects"],
  "/projects/templates": ["templates"],
  "/projects/timesheets": ["timesheets"],
  "/projects/tickets": ["tickets"],
  "/projects/field-visits": ["field-visits", "projects"],
  "/marketing": ["campaigns", "marketing"],
  "/marketing/campaigns": ["campaigns"],
  "/marketing/email-builder": ["campaigns", "email-builder"],
  "/marketing/social": ["social"],
  "/marketing/events": ["events"],
  "/marketing/surveys": ["surveys"],
  "/website": ["pages", "website"],
  "/website/pages": ["pages"],
  "/website/blog": ["blog"],
  "/website/forum": ["forum"],
  "/website/faq": ["faq"],
  "/website/chat": ["chat"],
  "/website/ecommerce": ["ecommerce", "website"],
  "/website/themes": ["themes", "website"],
  "/website/domains": ["domains", "website"],
  "/organization/business-portal": ["tenant", "organization"],
  "/organization/departments": ["departments"],
  "/organization/branches": ["branches"],
  "/organization/contracts": ["contracts"],
  "/organization/signatures": ["signatures"],
  "/organization/library": ["documents", "library"],
  "/organization/notices": ["announcements", "notices"],
  "/organization/calendar": ["calendar"],
  "/organization/notes": ["notes"],
  "/organization/approvals": ["workflows", "approvals"],
  "/organization/reports": ["reports"],
  "/organization/forms": ["forms"],
  "/organization/database": ["tenant", "database"],
  "/office": ["messaging", "office"],
  "/office/documents": ["documents"],
  "/office/spreadsheets": ["spreadsheets"],
  "/office/presentations": ["presentations"],
  "/office/email": ["email"],
  "/office/messaging": ["messaging"],
  "/office/calls": ["messaging"],
  "/settings/roles": ["roles"],
  "/settings/mail": ["tenant", "settings"],
  "/organization/settings": ["tenant", "settings"],
  "/profile": ["*"],
};

function hasPermissionForRoute(user: any, href: string): boolean {
  if (!user) return true; // Fallback during initial load

  // Admin and Super Admin access everything
  const roles: string[] = user.roles || [];
  if (
    roles.includes("Admin") ||
    roles.includes("Super Admin") ||
    roles.includes("admin") ||
    roles.includes("SuperAdmin")
  ) {
    return true;
  }

  // Home, Dashboard, Profile are open to all authenticated users
  if (href === "/" || href === "/dashboard" || href === "/profile") {
    return true;
  }

  const permissions: string[] = user.permissions || [];
  if (permissions.includes("*")) return true;

  // Check exact mapped resources for this href route
  const targetResources = routeResourceMap[href] || [];
  if (targetResources.length > 0) {
    return permissions.some((perm) => {
      const permLower = perm.toLowerCase();
      return targetResources.some((res) => permLower.includes(res.toLowerCase()));
    });
  }

  // Fallback: check module/resource name from path
  const parts = href.split("/").filter(Boolean);
  if (parts.length === 0) return true;

  const primaryModule = parts[0];
  const secondaryResource = parts[1] || primaryModule;

  return permissions.some((perm) => {
    const permLower = perm.toLowerCase();
    return (
      permLower.includes(secondaryResource.toLowerCase()) ||
      permLower.includes(primaryModule.toLowerCase())
    );
  });
}

export function useNavigationCategories() {
  const terminology = useSidebarStore((s) => s.terminology);
  const enabledModules = useSidebarStore((s) => s.enabledModules);
  const setWorkspaceNavigation = useSidebarStore((s) => s.setWorkspaceNavigation);
  const { user } = useCurrentUser();

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
      .map((category) => {
        const allowedItems = category.items
          .filter((item) => hasPermissionForRoute(user, item.href))
          .filter((item) => showTenderTools || !item.href.startsWith("/tenders"))
          .map((item) => ({
            ...item,
            name: applyTerminology(item.name, terminology, false),
          }));

        return {
          ...category,
          label: applyTerminology(category.label, terminology, true),
          items: allowedItems,
        };
      })
      .filter((category) => category.items.length > 0);
  }, [enabledModules, terminology, user]);
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
// Odoo-inspired Applications Overlay + Modern (windows) navigation
// ---------------------------------------------------------------------------

/** Vibrant solid icon colors for Odoo-style white app tiles */
export function getAppIconColor(name: string): string {
  const n = name.toLowerCase();

  if (n.includes("account") || n.includes("book")) return "text-emerald-500";
  if (n.includes("journal")) return "text-teal-500";
  if (n.includes("expense")) return "text-rose-500";
  if (n.includes("payroll")) return "text-amber-500";
  if (n.includes("bill") || n.includes("settle")) return "text-orange-500";
  if (n.includes("credit note")) return "text-fuchsia-500";
  if (n.includes("payment")) return "text-blue-500";
  if (n.includes("currency")) return "text-emerald-600";
  if (n.includes("report")) return "text-indigo-500";
  if (n.includes("document") && !n.includes("spread")) return "text-sky-500";

  if (n.includes("lead")) return "text-violet-500";
  if (n.includes("contact")) return "text-pink-500";
  if (n.includes("tender")) return "text-amber-600";
  if (n.includes("cv bank")) return "text-teal-600";
  if (n.includes("deal")) return "text-orange-500";
  if (n.includes("quotation")) return "text-sky-600";
  if (n.includes("order")) return "text-blue-600";
  if (n.includes("product")) return "text-purple-500";
  if (n.includes("pricelist") || n.includes("variant")) return "text-fuchsia-500";
  if (n.includes("team")) return "text-indigo-500";
  if (n.includes("invoice")) return "text-rose-500";
  if (n.includes("subscription")) return "text-cyan-500";
  if (n.includes("visit") || n.includes("route")) return "text-violet-600";

  if (n.includes("stock")) return "text-orange-600";
  if (n.includes("warehouse")) return "text-blue-700";
  if (n.includes("maintenance") || n.includes("asset")) return "text-slate-600";
  if (n.includes("vendor")) return "text-amber-700";
  if (n.includes("inventory")) return "text-amber-500";

  if (n.includes("employee")) return "text-purple-500";
  if (n.includes("recruitment")) return "text-sky-500";
  if (n.includes("leave") || n.includes("time off")) return "text-red-500";
  if (n.includes("attendance")) return "text-green-500";
  if (n.includes("performance")) return "text-amber-500";
  if (n.includes("scheduling")) return "text-pink-500";
  if (n.includes("fleet")) return "text-cyan-600";

  if (n.includes("project")) return "text-cyan-500";
  if (n.includes("template")) return "text-slate-500";
  if (n.includes("timesheet")) return "text-sky-500";
  if (n.includes("ticket")) return "text-purple-500";

  if (n.includes("campaign")) return "text-rose-500";
  if (n.includes("email designer") || n.includes("email builder")) return "text-violet-500";
  if (n.includes("social")) return "text-sky-500";
  if (n.includes("event")) return "text-fuchsia-500";
  if (n.includes("survey")) return "text-emerald-500";
  if (n.includes("marketing")) return "text-pink-500";

  if (n.includes("website") || n.includes("page")) return "text-cyan-500";
  if (n.includes("domain")) return "text-indigo-500";
  if (n.includes("blog")) return "text-orange-500";
  if (n.includes("forum")) return "text-teal-500";
  if (n.includes("faq")) return "text-indigo-500";
  if (n.includes("live chat") || n.includes("chat") || n.includes("discuss") || n.includes("messaging")) return "text-green-500";

  if (n.includes("portal") || n.includes("business")) return "text-slate-600";
  if (n.includes("department")) return "text-violet-500";
  if (n.includes("branch")) return "text-indigo-500";
  if (n.includes("contract")) return "text-teal-600";
  if (n.includes("signature") || n.includes("sign")) return "text-fuchsia-500";
  if (n.includes("library")) return "text-amber-600";
  if (n.includes("notice")) return "text-rose-500";
  if (n.includes("calendar") || n.includes("appointment")) return "text-red-500";
  if (n.includes("note") || n.includes("to-do") || n.includes("todo")) return "text-yellow-600";
  if (n.includes("approval")) return "text-emerald-600";
  if (n.includes("form")) return "text-indigo-500";
  if (n.includes("database") || n.includes("health")) return "text-blue-600";
  if (n.includes("spreadsheet")) return "text-green-600";
  if (n.includes("presentation")) return "text-orange-500";
  if (n.includes("email")) return "text-sky-500";
  if (n.includes("call")) return "text-green-600";
  if (n.includes("workspace") || n.includes("office")) return "text-teal-500";

  if (n.includes("role") || n.includes("rbac") || n.includes("shield")) return "text-red-500";
  if (n.includes("mail server") || n.includes("mail")) return "text-sky-600";
  if (n.includes("profile")) return "text-blue-500";
  if (n.includes("settings") || n.includes("management") || n.includes("organization")) return "text-slate-500";
  if (n.includes("home")) return "text-indigo-500";
  if (n.includes("dashboard")) return "text-violet-500";
  if (n.includes("knowledge")) return "text-purple-500";
  if (n.includes("helpdesk") || n.includes("help")) return "text-teal-500";

  return "text-indigo-500";
}

/** Soft pastel wash behind icons on white tiles */
export function getAppIconSoftBg(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("account") || n.includes("journal") || n.includes("attendance") || n.includes("approval") || n.includes("survey") || n.includes("spreadsheet")) return "bg-emerald-50 dark:bg-emerald-500/10";
  if (n.includes("expense") || n.includes("invoice") || n.includes("leave") || n.includes("campaign") || n.includes("notice")) return "bg-rose-50 dark:bg-rose-500/10";
  if (n.includes("email designer") || n.includes("email builder")) return "bg-violet-50 dark:bg-violet-500/10";
  if (n.includes("payroll") || n.includes("tender") || n.includes("performance") || n.includes("library") || n.includes("stock") || n.includes("inventory")) return "bg-amber-50 dark:bg-amber-500/10";
  if (n.includes("lead") || n.includes("project") || n.includes("ticket") || n.includes("department") || n.includes("dashboard")) return "bg-violet-50 dark:bg-violet-500/10";
  if (n.includes("contact") || n.includes("employee") || n.includes("recruitment") || n.includes("social") || n.includes("team")) return "bg-pink-50 dark:bg-pink-500/10";
  if (n.includes("deal") || n.includes("bill") || n.includes("blog") || n.includes("presentation") || n.includes("vendor")) return "bg-orange-50 dark:bg-orange-500/10";
  if (n.includes("quotation") || n.includes("email") || n.includes("document") || n.includes("calendar") || n.includes("timesheet") || n.includes("warehouse")) return "bg-sky-50 dark:bg-sky-500/10";
  if (n.includes("subscription") || n.includes("fleet") || n.includes("website") || n.includes("page") || n.includes("call") || n.includes("chat") || n.includes("messaging") || n.includes("discuss")) return "bg-cyan-50 dark:bg-cyan-500/10";
  if (n.includes("settings") || n.includes("profile") || n.includes("role") || n.includes("database") || n.includes("management") || n.includes("template") || n.includes("asset") || n.includes("maintenance")) return "bg-slate-100 dark:bg-slate-500/10";
  return "bg-indigo-50 dark:bg-indigo-500/10";
}

/** Gradient backgrounds for non-Odoo contexts */
export function getAppIconGradient(name: string): string {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes("account")) return "from-emerald-500 via-teal-500 to-cyan-600";
  if (lowercaseName.includes("journal")) return "from-teal-500 via-cyan-500 to-sky-600";
  if (lowercaseName.includes("expense")) return "from-rose-500 via-pink-500 to-fuchsia-600";
  if (lowercaseName.includes("payroll")) return "from-amber-500 via-orange-500 to-red-500";
  if (lowercaseName.includes("bill")) return "from-orange-500 via-red-500 to-rose-600";
  if (lowercaseName.includes("credit note")) return "from-fuchsia-500 via-purple-500 to-violet-600";
  if (lowercaseName.includes("payment")) return "from-blue-500 via-indigo-500 to-purple-600";
  if (lowercaseName.includes("lead")) return "from-indigo-500 via-purple-500 to-fuchsia-600";
  if (lowercaseName.includes("contact")) return "from-pink-500 via-rose-500 to-red-500";
  if (lowercaseName.includes("deal")) return "from-orange-500 via-red-500 to-rose-500";
  if (lowercaseName.includes("invoice")) return "from-rose-400 via-orange-500 to-red-500";
  if (lowercaseName.includes("employee")) return "from-purple-500 via-indigo-500 to-blue-600";
  if (lowercaseName.includes("project")) return "from-cyan-500 via-blue-500 to-indigo-500";
  if (lowercaseName.includes("dashboard")) return "from-violet-500 via-purple-500 to-indigo-600";
  if (lowercaseName.includes("home")) return "from-blue-500 via-indigo-500 to-purple-500";
  if (lowercaseName.includes("settings") || lowercaseName.includes("organization")) return "from-slate-500 via-slate-600 to-zinc-700";
  return "from-blue-500 via-indigo-500 to-purple-500";
}

function AppsGridIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

interface LauncherApp {
  name: string;
  href: string;
  icon: LucideIcon;
  categoryKey: string;
  tab: string;
}

/** Full-screen Odoo-style app switcher */
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
    return ["All", ...categories.map((cat: any) => cat.label)];
  }, [categories]);

  useEffect(() => {
    if (!initialCategoryKey || initialCategoryKey === "launcher") {
      setActiveTab("All");
    } else {
      const matchingCat = categories.find((cat: any) => cat.key === initialCategoryKey);
      if (matchingCat) setActiveTab(matchingCat.label);
      else setActiveTab("All");
    }
  }, [initialCategoryKey, categories]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const launcherApps = useMemo(() => {
    const apps: LauncherApp[] = [];
    categories.forEach((cat: any) => {
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
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.tab.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [launcherApps, activeTab, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Soft Odoo canvas */}
      <div
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(186, 196, 255, 0.45) 0%, transparent 60%), linear-gradient(165deg, #eef0f8 0%, #e3e6f4 42%, #ebe7f6 100%)",
        }}
      />
      <div
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%), linear-gradient(165deg, #12142a 0%, #0e1020 45%, #151228 100%)",
        }}
      />
      {/* Subtle glass blur layer */}
      <div className="absolute inset-0 -z-10 backdrop-blur-[2px]" />

      <div
        className="relative flex flex-1 min-h-0 flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-200/60 dark:border-white/10 shrink-0">
              <AppsGridIcon className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white tracking-tight truncate">
                {activeTab === "All" ? "Apps" : activeTab}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                {filteredApps.length} available
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="search"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-full border border-white/80 dark:border-white/10 bg-white/80 dark:bg-white/5 pl-9 pr-9 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-300 dark:focus:border-indigo-500/40 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-white/10 text-slate-500 dark:text-zinc-300 shadow-sm border border-slate-200/60 dark:border-white/10 hover:bg-white hover:text-slate-800 dark:hover:bg-white/15 transition-colors shrink-0"
            aria-label="Close apps menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile search */}
        <div className="px-5 pb-2 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-full border border-white/80 dark:border-white/10 bg-white/80 dark:bg-white/5 pl-9 pr-4 text-sm outline-none"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-5 sm:px-8 pb-3 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all",
                  isActive
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-500 dark:text-zinc-400 hover:bg-white/70 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Grid — min-h-0 is required for flex children to scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 md:px-12 py-6 pb-12">
          {filteredApps.length > 0 ? (
            <motion.div
              layout
              className="mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-6 gap-y-8 max-w-5xl justify-items-center"
            >
              <AnimatePresence>
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  const iconColor = getAppIconColor(app.name);
                  const softBg = getAppIconSoftBg(app.name);
                  return (
                    <motion.div
                      key={app.href}
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.18 }}
                      className="group w-full max-w-[96px] flex flex-col items-center"
                    >
                      <Link
                        href={app.href}
                        onClick={onClose}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", app.href);
                        }}
                        className="flex flex-col items-center w-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 rounded-2xl"
                      >
                        <div
                          className={cn(
                            "relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-white dark:bg-zinc-900/90",
                            "shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]",
                            "border border-white dark:border-white/10",
                            "transition-all duration-200",
                            "group-hover:-translate-y-1 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
                            "group-active:scale-[0.97]"
                          )}
                        >
                          <div className={cn("absolute inset-2 rounded-xl opacity-60 dark:opacity-40", softBg)} />
                          <Icon className={cn("relative z-10 h-8 w-8 shrink-0", iconColor)} />
                        </div>
                        <span className="mt-2.5 text-center text-[12px] font-medium leading-tight text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors line-clamp-2 w-full px-0.5">
                          {app.name}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16">
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                No applications match your search
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("All");
                }}
                className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

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

/**
 * Modern navigation (Odoo-inspired):
 * light slim rail with Apps switcher + pinned favorites
 */
function WindowsNavigation() {
  const pathname = usePathname();
  const categories = useNavigationCategories();
  const {
    activeCategory,
    setActiveCategory,
    navPosition,
    pinnedHrefs,
    addPinnedHref,
    removePinnedHref,
  } = useSidebarStore();
  const isHorizontal = navPosition === "top" || navPosition === "bottom";

  const [isDragOver, setIsDragOver] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const href = e.dataTransfer.getData("text/plain");
    if (href) {
      const app = getAppByHref(href, categories);
      if (app) addPinnedHref(href);
    }
  };

  const lastPathnameRef = useRef(pathname);

  useEffect(() => {
    const navOccurred = lastPathnameRef.current !== pathname;
    lastPathnameRef.current = pathname;

    if (navOccurred || !activeCategory) {
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

  // Close apps menu on route change
  useEffect(() => {
    setAppsOpen(false);
  }, [pathname]);

  const pinnedApps = useMemo(() => {
    return (pinnedHrefs || [])
      .map((href) => getAppByHref(href, categories))
      .filter((app): app is NonNullable<typeof app> => app !== null);
  }, [pinnedHrefs, categories]);

  const isHome = pathname === "/";

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "hidden lg:flex shrink-0 items-center justify-center relative z-30",
          isHorizontal ? "w-full h-[4.25rem]" : "h-screen",
          navPosition === "right" && "flex-row-reverse"
        )}
      >
        <motion.aside
          initial={{
            y: isHorizontal ? (navPosition === "top" ? -24 : 24) : 0,
            x: isHorizontal ? 0 : navPosition === "left" ? -24 : 24,
            opacity: 0,
          }}
          animate={{ y: 0, x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className={cn(
            // Light Odoo-like rail
            "relative select-none transition-all duration-300",
            "bg-white/90 dark:bg-[#14162a]/95 backdrop-blur-xl",
            "border border-slate-200/80 dark:border-white/10",
            "shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
            isDragOver &&
              "ring-2 ring-indigo-400/40 shadow-[0_0_24px_rgba(99,102,241,0.2)] border-indigo-300/50",
            isHorizontal
              ? cn(
                  "flex flex-row items-center justify-between px-4 h-14 rounded-2xl w-[min(96%,56rem)] mx-auto"
                )
              : cn(
                  "flex flex-col items-center justify-between py-5 w-[4.25rem] h-[calc(100vh-1.5rem)] my-3",
                  navPosition === "left" ? "ml-3 rounded-[1.35rem]" : "mr-3 rounded-[1.35rem]"
                )
          )}
        >
          {/* Logo + Apps button */}
          <div
            className={cn(
              "flex items-center shrink-0 gap-2",
              isHorizontal
                ? "flex-row pr-3 border-r border-slate-100 dark:border-white/10"
                : "flex-col pb-3 border-b border-slate-100 dark:border-white/10 w-full"
            )}
          >
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-md shadow-indigo-500/20"
                title="Home"
              >
                T
              </Link>
            </motion.div>

            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setAppsOpen(true)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                        appsOpen
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white"
                      )}
                      aria-label="Open apps menu"
                    >
                      <AppsGridIcon className="h-5 w-5" />
                    </button>
                  }
                />
                <TooltipContent side={isHorizontal ? "bottom" : navPosition === "left" ? "right" : "left"} sideOffset={10}>
                  Apps
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Pinned apps */}
          <nav
            className={cn(
              "flex items-center gap-2 overflow-y-auto scrollbar-none flex-1 w-full",
              isHorizontal
                ? "flex-row px-3 justify-center overflow-x-auto"
                : "flex-col py-3"
            )}
          >
            {pinnedApps.length === 0 ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl border border-dashed shrink-0 transition-all",
                  "w-10 h-10",
                  isDragOver
                    ? "border-indigo-400 bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10"
                    : "border-slate-200 dark:border-white/15 text-slate-300 dark:text-zinc-600"
                )}
                title="Drag apps here to pin"
              >
                <Plus className="w-4 h-4" />
              </div>
            ) : (
              pinnedApps.map((app, idx) => {
                const Icon = app.icon;
                const isActive =
                  pathname === app.href ||
                  (app.href !== "/" && pathname.startsWith(app.href));
                const iconColor = getAppIconColor(app.name);
                const softBg = getAppIconSoftBg(app.name);

                return (
                  <motion.div
                    key={`${app.href}-${idx}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02, duration: 0.18 }}
                    className="relative group shrink-0 flex items-center justify-center"
                  >
                    <TooltipProvider delay={0}>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div className="relative flex items-center justify-center">
                              <Link
                                href={app.href}
                                className={cn(
                                  "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                                  "bg-white dark:bg-zinc-900/80 border border-slate-100 dark:border-white/10",
                                  "shadow-sm hover:shadow-md hover:-translate-y-0.5",
                                  isActive &&
                                    "ring-2 ring-indigo-400/50 border-indigo-200 dark:border-indigo-500/30"
                                )}
                              >
                                <div className={cn("absolute inset-1.5 rounded-lg opacity-70", softBg)} />
                                <Icon className={cn("relative z-10 h-5 w-5", iconColor)} />
                              </Link>

                              {isActive && (
                                <span
                                  className={cn(
                                    "absolute rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)] z-20",
                                    isHorizontal
                                      ? "bottom-[-5px] left-1/2 -translate-x-1/2 w-1 h-1"
                                      : navPosition === "left"
                                        ? "right-[-5px] top-1/2 -translate-y-1/2 w-1 h-1"
                                        : "left-[-5px] top-1/2 -translate-y-1/2 w-1 h-1"
                                  )}
                                />
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removePinnedHref(app.href);
                                }}
                                className="absolute -top-1.5 -right-1.5 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 border border-white/30 transition-all shadow-sm"
                                title="Unpin"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          }
                        />
                        <TooltipContent
                          side={
                            isHorizontal
                              ? "bottom"
                              : navPosition === "left"
                                ? "right"
                                : "left"
                          }
                          sideOffset={12}
                        >
                          {app.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                );
              })
            )}
          </nav>

          {/* Footer */}
          <div
            className={cn(
              "flex justify-center shrink-0 gap-1",
              isHorizontal
                ? "pl-3 border-l border-slate-100 dark:border-white/10 h-8 items-center"
                : "pt-3 border-t border-slate-100 dark:border-white/10 w-full flex-col items-center"
            )}
          >
            {!isHome && (
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        href="/"
                        className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 transition-all"
                      >
                        <Home className="h-5 w-5" />
                      </Link>
                    }
                  />
                  <TooltipContent
                    side={isHorizontal ? "bottom" : navPosition === "left" ? "right" : "left"}
                    sideOffset={10}
                  >
                    Home
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider delay={0}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/organization/settings"
                      className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 dark:hover:text-white transition-all"
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  }
                />
                <TooltipContent
                  side={isHorizontal ? "bottom" : navPosition === "left" ? "right" : "left"}
                  sideOffset={10}
                >
                  Settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {appsOpen && (
          <ApplicationsOverlay
            onClose={() => setAppsOpen(false)}
            categories={categories}
            initialCategoryKey={activeCategory}
          />
        )}
      </AnimatePresence>
    </>
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