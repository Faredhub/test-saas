"use client";

import { useCurrentUser } from "./use-current-user";

const RESOURCE_ALIASES: Record<string, string[]> = {
  // Site Store & Inventory
  sitestore: ["sitestore", "inventory", "products", "stock", "warehouses", "deliveries", "manufacturing", "assets", "lots", "variants", "vendors", "maintenance"],
  inventory: ["sitestore", "inventory", "products", "stock", "warehouses", "deliveries", "manufacturing", "assets", "lots", "variants", "vendors", "maintenance"],
  products: ["products", "inventory", "sitestore", "variants"],
  variants: ["variants", "products", "inventory", "sitestore"],
  lots: ["lots", "stock", "inventory", "sitestore"],
  stock: ["stock", "inventory", "sitestore", "warehouses"],
  warehouses: ["warehouses", "inventory", "sitestore", "stock"],
  deliveries: ["deliveries", "inventory", "sitestore"],
  manufacturing: ["manufacturing", "inventory", "sitestore"],
  assets: ["assets", "inventory", "sitestore", "maintenance"],
  maintenance: ["assets", "maintenance", "inventory", "sitestore"],
  vendors: ["vendors", "inventory", "sitestore"],

  // HRM
  hrm: ["hrm", "employees", "recruitment", "leaves", "attendance", "fleet", "performance", "scheduling", "trips"],
  employees: ["employees", "hrm"],
  recruitment: ["recruitment", "jobs", "applicants", "hrm"],
  leaves: ["leaves", "attendance", "hrm"],
  attendance: ["attendance", "leaves", "hrm"],
  performance: ["performance", "hrm"],
  scheduling: ["scheduling", "hrm"],
  trips: ["trips", "fleet", "hrm"],
  fleet: ["fleet", "vehicles", "trips", "hrm"],

  // Finance
  finance: ["finance", "accounts", "journal", "expenses", "payroll", "bills", "credit-notes", "reports", "documents", "payments", "currency", "settle"],
  accounts: ["accounts", "journal", "finance"],
  journal: ["journal", "accounts", "finance"],
  expenses: ["expenses", "bills", "finance"],
  payroll: ["payroll", "finance", "expenses"],
  bills: ["bills", "expenses", "settle", "finance"],
  settle: ["bills", "expenses", "settle", "finance"],
  "credit-notes": ["credit-notes", "bills", "finance"],
  payments: ["payments", "finance"],
  reports: ["reports", "finance", "organization"],
  documents: ["documents", "finance", "office", "organization"],
  currency: ["currency", "finance"],

  // Sales
  sales: ["sales", "leads", "contacts", "deals", "quotations", "invoices", "orders", "visits", "subscriptions", "tenders", "cv-bank", "pricelists", "teams", "reporting", "kiosk", "waiter-calls", "table-manager", "token-points", "captain", "pos-integrations", "simulation"],
  leads: ["leads", "contacts", "deals", "sales"],
  contacts: ["contacts", "leads", "sales"],
  deals: ["deals", "leads", "sales"],
  quotations: ["quotations", "orders", "sales"],
  orders: ["orders", "quotations", "sales"],
  reporting: ["reporting", "reports", "sales"],
  pricelists: ["pricelists", "sales"],
  teams: ["teams", "sales"],
  invoices: ["invoices", "sales", "finance"],
  subscriptions: ["subscriptions", "sales"],
  visits: ["visits", "route", "sales"],
  kiosk: ["kiosk", "sales"],
  "waiter-calls": ["waiter-calls", "sales"],
  "table-manager": ["table-manager", "waiter-calls", "sales"],
  "token-points": ["token-points", "sales"],
  captain: ["captain", "sales"],
  "pos-integrations": ["pos-integrations", "sales"],
  simulation: ["simulation", "sales"],
  tenders: ["tenders", "cv-bank", "sales"],
  "cv-bank": ["cv-bank", "tenders", "sales"],

  // Civil
  civil: ["civil", "geotechnical", "survey", "design", "estimation"],
  geotechnical: ["geotechnical", "civil", "survey"],
  survey: ["survey", "civil"],
  design: ["design", "civil"],
  estimation: ["estimation", "civil"],

  // Projects
  projects: ["projects", "tasks", "timesheets", "tickets", "templates", "field-visits"],
  tasks: ["tasks", "projects"],
  templates: ["templates", "projects"],
  timesheets: ["timesheets", "projects"],
  tickets: ["tickets", "projects"],
  "field-visits": ["field-visits", "projects"],

  // Marketing
  marketing: ["marketing", "campaigns", "events", "surveys", "social", "email-builder", "sms", "whatsapp"],
  campaigns: ["campaigns", "marketing"],
  "email-builder": ["email-builder", "campaigns", "marketing"],
  social: ["social", "marketing"],
  events: ["events", "marketing"],
  surveys: ["surveys", "marketing"],
  sms: ["sms", "campaigns", "marketing"],
  whatsapp: ["whatsapp", "campaigns", "marketing"],

  // Website
  website: ["website", "pages", "templates", "blog", "forum", "faq", "chat", "ecommerce", "store", "themes", "domains"],
  pages: ["pages", "website"],
  store: ["store", "ecommerce", "website"],
  blog: ["blog", "website"],
  forum: ["forum", "website"],
  faq: ["faq", "website"],
  chat: ["chat", "website"],
  ecommerce: ["ecommerce", "store", "website"],
  themes: ["themes", "website"],
  domains: ["domains", "website"],

  // Organization
  organization: ["organization", "departments", "branches", "contracts", "signatures", "library", "notices", "calendar", "notes", "approvals", "reports", "forms", "database", "business-portal"],
  "business-portal": ["business-portal", "tenant", "organization"],
  departments: ["departments", "organization"],
  branches: ["branches", "organization"],
  contracts: ["contracts", "organization"],
  signatures: ["signatures", "organization"],
  library: ["library", "documents", "organization"],
  notices: ["notices", "announcements", "organization"],
  calendar: ["calendar", "organization"],
  notes: ["notes", "organization"],
  approvals: ["approvals", "workflows", "organization"],
  forms: ["forms", "organization"],
  database: ["database", "health", "organization"],

  // Office
  office: ["office", "workspace", "documents", "spreadsheets", "presentations", "email", "messaging", "calls"],
  spreadsheets: ["spreadsheets", "office"],
  presentations: ["presentations", "office"],
  email: ["email", "office"],
  messaging: ["messaging", "office"],
  calls: ["calls", "messaging", "office"],
};

export function usePermission() {
  const { user } = useCurrentUser();

  const isSuperOrAdmin =
    (user?.roles?.some(
      (r) =>
        r.toLowerCase().includes("admin") ||
        r.toLowerCase().includes("super") ||
        r.toLowerCase().includes("owner")
    ) ?? false) ||
    ((user as any)?.role
      ? String((user as any).role).toLowerCase().includes("admin") ||
        String((user as any).role).toLowerCase().includes("super") ||
        String((user as any).role).toLowerCase().includes("owner")
      : false);

  const rawPermissions = user?.permissions || [];

  /**
   * Check if the user has permission for a specific action on a resource.
   * @param action "read" | "create" | "update" | "delete" | "export"
   * @param resource e.g. "employees", "expenses", "leads", "stock", "sitestore"
   * @param module optional module name e.g. "hrm", "finance", "sales", "inventory"
   */
  function hasPermission(
    action: string,
    resource: string,
    module?: string
  ): boolean {
    if (!user) return false;
    if (isSuperOrAdmin) return true;
    if (!rawPermissions || rawPermissions.length === 0) return false;

    const actLower = action.toLowerCase();
    const resLower = resource.toLowerCase();
    const modLower = module?.toLowerCase();

    const targetResources = RESOURCE_ALIASES[resLower] || [resLower];

    for (const rawPerm of rawPermissions) {
      if (rawPerm === "*") return true;

      let pStr = "";
      let pMod = "";
      let pAct = "";
      let pRes = "";

      if (typeof rawPerm === "string") {
        pStr = rawPerm.toLowerCase();
        if (pStr === "*") return true;
        const parts = pStr.split(":");
        if (parts.length === 3) {
          [pMod, pAct, pRes] = parts;
        } else if (parts.length === 2) {
          [pAct, pRes] = parts;
        } else {
          pRes = pStr;
        }
      } else if (typeof rawPerm === "object" && rawPerm !== null) {
        const obj = rawPerm as any;
        pMod = String(obj.module || "").toLowerCase();
        pAct = String(obj.action || "").toLowerCase();
        pRes = String(obj.resource || "").toLowerCase();
        pStr = `${pMod}:${pAct}:${pRes}`;
      }

      if (pStr === "*") return true;

      // Module match or wildcard
      const moduleMatches = !modLower || !pMod || pMod === modLower || pMod === "*";
      // Action match or wildcard
      const actionMatches = !pAct || pAct === actLower || pAct === "*" || pAct === "all" || pAct === "manage";
      // Resource match or wildcard or alias
      const resourceMatches =
        !pRes ||
        pRes === "*" ||
        pRes === "all" ||
        targetResources.includes(pRes) ||
        targetResources.some((tr) => pStr.includes(tr));

      if (moduleMatches && actionMatches && resourceMatches) {
        return true;
      }
    }

    return false;
  }

  return {
    isSuperOrAdmin,
    hasPermission,
    canCreate: (resource: string, module?: string) => hasPermission("create", resource, module),
    canRead: (resource: string, module?: string) => hasPermission("read", resource, module),
    canUpdate: (resource: string, module?: string) => hasPermission("update", resource, module),
    canDelete: (resource: string, module?: string) => hasPermission("delete", resource, module),
    canExport: (resource: string, module?: string) => hasPermission("export", resource, module),
  };
}

