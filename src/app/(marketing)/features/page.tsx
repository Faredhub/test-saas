import type { Metadata } from "next";
import {
  Shield,
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Megaphone,
  Package,
  Users,
  Wallet,
  FolderKanban,
  Globe,
  FileText,
  MessageSquare,
  Home,
  Gavel,
  Server,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "All Features",
  description:
    "322 features across 15 modules. Explore every capability TixelERP offers.",
};

interface ModuleDetail {
  icon: LucideIcon;
  number: number;
  title: string;
  count: number;
  completion: number;
  features: string[];
}

const modules: ModuleDetail[] = [
  {
    icon: Shield,
    number: 1,
    title: "Auth & Security",
    count: 10,
    completion: 100,
    features: [
      "Email/password and OAuth sign-in",
      "Two-factor authentication (TOTP)",
      "Role-based access control (RBAC)",
      "Session management with device tracking",
      "Audit logging for all actions",
      "Password reset and email verification",
      "Invite-based onboarding",
      "API key management",
    ],
  },
  {
    icon: Home,
    number: 2,
    title: "Home",
    count: 8,
    completion: 100,
    features: [
      "Personalized welcome dashboard",
      "Quick action shortcuts",
      "Recent activity timeline",
      "Pending approvals widget",
      "Upcoming events calendar",
      "Announcement banner",
      "Bookmark favorite pages",
      "Global search",
    ],
  },
  {
    icon: LayoutDashboard,
    number: 3,
    title: "Dashboard",
    count: 24,
    completion: 100,
    features: [
      "Revenue and expense KPI cards",
      "Sales pipeline funnel chart",
      "Monthly revenue trend line",
      "Top customers leaderboard",
      "Inventory alerts widget",
      "Employee attendance summary",
      "Outstanding invoices tracker",
      "Customizable widget layout",
    ],
  },
  {
    icon: Building2,
    number: 4,
    title: "Organization",
    count: 40,
    completion: 95,
    features: [
      "Multi-company and multi-branch setup",
      "Department and team hierarchy",
      "Company profile with GST, PAN, TAN",
      "Fiscal year and period configuration",
      "Tax configuration (GST slabs, TDS sections)",
      "Approval workflow builder",
      "Custom field definitions",
      "Document numbering series",
    ],
  },
  {
    icon: ShoppingCart,
    number: 5,
    title: "Sales & CRM",
    count: 29,
    completion: 95,
    features: [
      "Lead capture and scoring",
      "Contact and account management",
      "Opportunity pipeline with stages",
      "Quotation builder with PDF export",
      "Invoice generation with GST",
      "Payment tracking and receipts",
      "Credit note management",
      "Sales forecasting",
    ],
  },
  {
    icon: Megaphone,
    number: 6,
    title: "Marketing",
    count: 17,
    completion: 90,
    features: [
      "Campaign planning and tracking",
      "Email template builder",
      "Audience segmentation",
      "Landing page forms",
      "UTM tracking and attribution",
      "Campaign ROI analytics",
      "A/B testing for emails",
      "Lead nurture sequences",
    ],
  },
  {
    icon: Package,
    number: 7,
    title: "Supply Chain",
    count: 23,
    completion: 95,
    features: [
      "Purchase requisition workflow",
      "Purchase order management",
      "Vendor onboarding and rating",
      "Goods received note (GRN)",
      "Inventory with batch and serial tracking",
      "Multi-warehouse management",
      "Stock transfers between branches",
      "Barcode / QR code support",
    ],
  },
  {
    icon: Users,
    number: 8,
    title: "HRM",
    count: 26,
    completion: 95,
    features: [
      "Employee master with document uploads",
      "Attendance (biometric, manual, geofenced)",
      "Leave management with approval chains",
      "Payroll processing with PF, ESI, PT",
      "Salary slip generation (PDF)",
      "Expense claims and reimbursements",
      "Performance review cycles",
      "Exit and full-and-final settlement",
    ],
  },
  {
    icon: Wallet,
    number: 9,
    title: "Finance",
    count: 33,
    completion: 95,
    features: [
      "Chart of accounts (Indian standards)",
      "Journal entries with multi-currency",
      "Accounts payable and receivable",
      "Bank reconciliation",
      "GST return filing (GSTR-1, 3B)",
      "TDS computation and challans",
      "Fixed asset register with depreciation",
      "Trial balance, P&L, and balance sheet",
    ],
  },
  {
    icon: FolderKanban,
    number: 10,
    title: "Projects",
    count: 30,
    completion: 90,
    features: [
      "Project creation with milestones",
      "Kanban and list task views",
      "Time tracking per task",
      "Gantt chart view",
      "Resource allocation matrix",
      "Project budgeting and cost tracking",
      "Subtask and dependency management",
      "Sprint planning (agile support)",
    ],
  },
  {
    icon: Globe,
    number: 11,
    title: "Website / CMS",
    count: 16,
    completion: 85,
    features: [
      "Page builder with drag-and-drop",
      "Blog with categories and tags",
      "SEO meta fields per page",
      "Public ticket/support portal",
      "Contact form builder",
      "Navigation menu editor",
      "Media library",
      "Custom domain support",
    ],
  },
  {
    icon: FileText,
    number: 12,
    title: "Reports",
    count: 4,
    completion: 70,
    features: [
      "Pre-built financial reports",
      "Sales analytics dashboard",
      "Custom report builder (filters, grouping)",
      "Scheduled report delivery via email",
    ],
  },
  {
    icon: MessageSquare,
    number: 13,
    title: "Office & Collaboration",
    count: 25,
    completion: 90,
    features: [
      "Internal messaging / chat",
      "Channel-based conversations",
      "File sharing and document library",
      "Shared calendar with events",
      "Task assignments from chat",
      "Push and email notifications",
      "Mention and tag users",
      "Threaded replies",
    ],
  },
  {
    icon: Gavel,
    number: 14,
    title: "Tenders",
    count: 22,
    completion: 85,
    features: [
      "Tender listing and discovery",
      "Bid preparation workspace",
      "Document checklist and submission",
      "Deadline and reminder tracking",
      "Vendor pre-qualification management",
      "Award tracking and notifications",
      "Comparative bid analysis",
      "Integration with finance for costing",
    ],
  },
  {
    icon: Server,
    number: 15,
    title: "REST API",
    count: 15,
    completion: 80,
    features: [
      "Full CRUD endpoints for all modules",
      "Bearer token authentication",
      "Rate limiting and throttling",
      "Swagger / OpenAPI documentation",
      "Webhook event subscriptions",
      "Pagination, filtering, and sorting",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-zinc-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            All Features
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            322 features across 15 modules. Everything your business needs to
            operate, grow, and stay compliant.
          </p>
        </div>
      </section>

      {/* Module Sections */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
          {modules.map((mod) => (
            <Card key={mod.title} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <mod.icon className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg">
                        <span className="text-muted-foreground">
                          {String(mod.number).padStart(2, "0")}.
                        </span>{" "}
                        {mod.title}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {mod.count} features
                    </Badge>
                    <Badge
                      variant={mod.completion === 100 ? "default" : "outline"}
                      className="text-xs"
                    >
                      {mod.completion}% complete
                    </Badge>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${mod.completion}%` }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {mod.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
