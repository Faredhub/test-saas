import Link from "next/link";
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
  ArrowRight,
  HardHat,
  Palette,
  UtensilsCrossed,
  Hotel,
  HeartPulse,
  Store,
  Factory,
  GraduationCap,
  Briefcase,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Knnect360 | Run Your Entire Business From One Platform",
  description:
    "Complete ERP solution built for Indian businesses. GST-ready, multi-tenant, 15 modules, 308+ features.",
};

const modules: {
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
}[] = [
  {
    icon: Shield,
    title: "Auth & Security",
    description:
      "Role-based access, 2FA, session management, and audit logging.",
    count: 10,
  },
  {
    icon: Home,
    title: "Home",
    description:
      "Personalized dashboard, quick actions, and recent activity feed.",
    count: 8,
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description:
      "Real-time KPIs, interactive charts, and customizable widgets.",
    count: 24,
  },
  {
    icon: Building2,
    title: "Organization",
    description:
      "Multi-branch setup, departments, teams, and company settings.",
    count: 40,
  },
  {
    icon: ShoppingCart,
    title: "Sales & CRM",
    description:
      "Lead tracking, quotations, invoicing, and pipeline management.",
    count: 29,
  },
  {
    icon: Megaphone,
    title: "Marketing",
    description:
      "Campaigns, email templates, analytics, and audience segmentation.",
    count: 17,
  },
  {
    icon: Package,
    title: "Supply Chain",
    description:
      "Purchase orders, inventory, warehousing, and vendor management.",
    count: 23,
  },
  {
    icon: Users,
    title: "HRM",
    description:
      "Employee records, attendance, payroll with PF/ESI, and leave management.",
    count: 26,
  },
  {
    icon: Wallet,
    title: "Finance",
    description:
      "Chart of accounts, GST returns, TDS, bank reconciliation, and ledgers.",
    count: 33,
  },
  {
    icon: FolderKanban,
    title: "Projects",
    description:
      "Task boards, time tracking, milestones, and resource allocation.",
    count: 30,
  },
  {
    icon: Globe,
    title: "Website / CMS",
    description: "Page builder, blog, forms, and public ticket portal.",
    count: 16,
  },
  {
    icon: FileText,
    title: "Reports",
    description:
      "Financial statements, sales analytics, and custom report builder.",
    count: 4,
  },
  {
    icon: MessageSquare,
    title: "Office & Collab",
    description:
      "Internal chat, file sharing, calendar, and notifications.",
    count: 25,
  },
  {
    icon: Gavel,
    title: "Tenders",
    description:
      "Bid management, tender tracking, document submission, and awards.",
    count: 22,
  },
  {
    icon: Server,
    title: "REST API",
    description:
      "Full CRUD endpoints, token auth, rate limiting, and Swagger docs.",
    count: 15,
  },
];

const industries: { icon: LucideIcon; name: string }[] = [
  { icon: HardHat, name: "Construction" },
  { icon: Palette, name: "Art & Culture" },
  { icon: UtensilsCrossed, name: "Food & Beverage" },
  { icon: Hotel, name: "Hospitality" },
  { icon: HeartPulse, name: "Healthcare" },
  { icon: Store, name: "Retail" },
  { icon: Factory, name: "Manufacturing" },
  { icon: GraduationCap, name: "Education" },
  { icon: Briefcase, name: "Business Services" },
  { icon: PartyPopper, name: "Events & Clubs" },
];

const techStack = [
  "Next.js 16",
  "TypeScript",
  "PostgreSQL",
  "Redis",
  "Prisma 7",
  "Tailwind v4",
  "shadcn/ui",
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 py-20 text-white sm:py-28 lg:py-36">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(255,255,255,0.04),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge
            variant="secondary"
            className="mb-6 border-zinc-700 bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300"
          >
            Open for Early Access
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Run Your Entire Business{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              From One Platform
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            Complete ERP solution built for Indian businesses. GST-ready,
            multi-tenant, 15 modules, 308+ features.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" render={<Link href="/register" />}>
              Start Free Trial
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white"
              render={<Link href="/api/docs/ui" />}
            >
              View API Docs
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "15", label: "Modules" },
              { value: "322", label: "Features" },
              { value: "109", label: "DB Models" },
              { value: "20", label: "Industries" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur"
              >
                <p className="text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module Grid */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              15 Modules. One Platform.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Every department covered, from lead capture to financial
              statements. Each module is production-ready and tightly integrated.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {modules.map((mod) => (
              <Card
                key={mod.title}
                className="group transition-shadow hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <mod.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold">
                      {mod.title}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {mod.count}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline" render={<Link href="/site/features" />}>
              View All Features
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Section */}
      <section className="border-y border-border/40 bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for Every Industry
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Whether you run a restaurant chain or a construction firm, Knnect360
              adapts to your workflows.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {industries.map((ind) => (
              <div
                key={ind.name}
                className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-background p-5 text-center transition-shadow hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ind.icon className="size-6" />
                </div>
                <span className="text-sm font-medium">{ind.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built on a Modern Stack
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Production-grade technologies chosen for performance, developer
              experience, and long-term maintainability.
            </p>
          </div>

          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            {techStack.map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                className="px-4 py-2 text-sm"
              >
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Join businesses already running on Knnect360. Start with the free
            tier and upgrade when you need to.
          </p>
          <div className="mt-10">
            <Button size="lg" render={<Link href="/register" />}>
              Create Free Account
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
