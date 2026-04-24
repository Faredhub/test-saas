import type { Metadata } from "next";
import {
  Code2,
  Database,
  Server,
  Paintbrush,
  Shield,
  Zap,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about TrackePay and the team behind TixelERP, a full-stack ERP platform for Indian businesses.",
};

const stats = [
  { value: "308", label: "Features Built" },
  { value: "109", label: "Database Models" },
  { value: "15", label: "Modules" },
  { value: "10", label: "Dev Sessions" },
];

const techCards = [
  {
    icon: Code2,
    title: "Next.js 16 + TypeScript",
    description:
      "App Router with server components for fast initial loads and type safety across the entire stack.",
  },
  {
    icon: Database,
    title: "PostgreSQL + Prisma 7",
    description:
      "109 database models managed through type-safe migrations. Full relational integrity with zero raw SQL.",
  },
  {
    icon: Server,
    title: "Redis + Background Jobs",
    description:
      "Session caching, rate limiting, and async task processing for email, reports, and batch operations.",
  },
  {
    icon: Paintbrush,
    title: "Tailwind v4 + shadcn/ui",
    description:
      "Utility-first styling with a curated component library. Consistent design language across all 15 modules.",
  },
  {
    icon: Shield,
    title: "Auth + RBAC",
    description:
      "NextAuth.js with email, OAuth, and TOTP 2FA. Fine-grained role permissions down to the field level.",
  },
  {
    icon: Zap,
    title: "Docker + CI/CD",
    description:
      "Single-command deployment with Docker Compose. Automated testing and preview environments on every push.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-zinc-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Built by TrackePay
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            TixelERP exists because Indian businesses deserve enterprise-grade
            tools without enterprise-grade complexity or cost.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Our Mission
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Most ERPs are either too expensive, too rigid, or both. We set out to
            build a single platform that covers sales, HR, finance, projects,
            and more, all with GST compliance baked in from day one. TixelERP is
            designed so a five-person startup and a 500-person manufacturer can
            use the same software, each paying only for what they need.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Detail */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              The Technology Behind TixelERP
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Every technology choice was made for production readiness,
              developer velocity, and long-term stability.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {techCards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <card.icon className="size-5" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {[
              "Next.js 16",
              "TypeScript",
              "PostgreSQL",
              "Redis",
              "Prisma 7",
              "Tailwind v4",
              "shadcn/ui",
              "NextAuth.js",
              "Docker",
              "Zod",
              "React Hook Form",
              "Recharts",
            ].map((tech) => (
              <Badge key={tech} variant="outline" className="px-3 py-1 text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="border-t border-border/40 bg-muted/20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Get in Touch
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Have questions about TixelERP, need a demo, or want to discuss
                custom requirements? Drop us a message and we will respond within
                24 hours.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0 text-primary" />
                  <span>hello@trackepay.com</span>
                </div>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
