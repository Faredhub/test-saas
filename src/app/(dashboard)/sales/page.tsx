import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileSearch,
  Gavel,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLeads } from "@/lib/actions/sales";
import { getActiveEMDs, getTenders } from "@/lib/actions/tenders";
import { getCVRecords } from "@/lib/actions/cv-bank";
import { getNavigationPreferences } from "@/lib/actions/user";

export const metadata = { title: "Sales CRM" };

function asNumber(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return Number(value) || 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SalesPage() {
  const [prefs, leads, tenders, emds, cvs] = await Promise.all([
    getNavigationPreferences(),
    getLeads({ pageSize: 8 }),
    getTenders({ pageSize: 8 }),
    getActiveEMDs(),
    getCVRecords({ pageSize: 8, isActive: true }),
  ]);

  const t = prefs.terminology ?? {};
  const labels = {
    sales: t.sales ?? "Sales & CRM",
    leads: t.leads ?? "Leads",
    tenders: t.tenders ?? "Tender Register",
    contacts: t.contacts ?? "Clients / Vendors",
    deals: t.deals ?? "Opportunities",
    cvBank: t.cvBank ?? "CV Bank",
  };
  const showTenderTools = Boolean(
    t.tenders ||
      t.cvBank ||
      t.sales?.toLowerCase().includes("tender") ||
      String((prefs.industryTemplate as { industry?: string } | null)?.industry ?? "")
        .toLowerCase()
        .includes("construction")
  );

  const activeTenderCount = tenders.data.filter((tender) =>
    ["IDENTIFIED", "EVALUATING", "PRE_QUALIFIED", "BID_PREPARING", "BID_SUBMITTED"].includes(tender.status)
  ).length;
  const tenderPipelineValue = tenders.data.reduce(
    (sum, tender) => sum + asNumber(tender.estimatedValue),
    0
  );
  const emdExposure = emds.reduce((sum, emd) => sum + asNumber(emd.amount), 0);

  const workflows = [
    {
      title: labels.leads,
      description: "Capture and qualify incoming opportunities.",
      href: "/sales/leads",
      icon: FileSearch,
      metric: leads.total,
    },
    {
      title: labels.contacts,
      description: "Maintain client, consultant, vendor, and authority records.",
      href: "/sales/contacts",
      icon: Users,
      metric: "CRM",
    },
    ...(showTenderTools
      ? [
          {
            title: labels.tenders,
            description: "Import, analyze, schedule, bid, and track tender records.",
            href: "/tenders",
            icon: Gavel,
            metric: activeTenderCount,
          },
          {
            title: labels.cvBank,
            description: "Find project CVs by skills, roles, certificates, and keywords.",
            href: "/tenders/cv-bank",
            icon: BriefcaseBusiness,
            metric: cvs.total,
          },
          {
            title: "EMD / Bond",
            description: "Track active EMDs, BGs, recovery, expiry, and forfeiture risk.",
            href: "/tenders",
            icon: ShieldCheck,
            metric: emds.length,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{labels.sales}</h1>
        <p className="text-sm text-muted-foreground">
          One workspace for leads, opportunities, clients, vendors, and industry-specific tender workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{labels.leads}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Tenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenderCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tenderPipelineValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active EMD/BG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(emdExposure)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {workflows.map((workflow) => (
          <Link key={workflow.title} href={workflow.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <workflow.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">{workflow.metric}</Badge>
                </div>
                <div className="space-y-1">
                  <h2 className="font-medium">{workflow.title}</h2>
                  <p className="text-sm text-muted-foreground">{workflow.description}</p>
                </div>
                <ArrowRight className="mt-auto h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Tender Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenders.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tender records yet.</p>
          ) : (
            tenders.data.slice(0, 6).map((tender) => (
              <div key={tender.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tender.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {tender.referenceNo} · {tender.issuingAuth ?? "No authority"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums">{formatCurrency(asNumber(tender.estimatedValue))}</span>
                  <Badge variant="secondary">{tender.status.replaceAll("_", " ")}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
