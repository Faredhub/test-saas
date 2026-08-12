"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  DollarSign,
  Building2,
  UserCircle,
  Target,
  TrendingUp,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import {
  createDeal,
  updateDeal,
  getDeals,
} from "@/lib/actions/sales";
import { toast } from "sonner";

type DealData = Awaited<ReturnType<typeof getDeals>>;
type Deal = DealData["data"][number];

interface PipelineClientProps {
  deals: Deal[];
  stats: {
    totalLeads: number;
    newLeads: number;
    openDeals: number;
    wonDeals: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalContacts: number;
  };
}

const PIPELINE_STAGES = [
  { key: "PROSPECTING", label: "New" },
  { key: "QUALIFICATION", label: "Qualified" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "CLOSED_WON", label: "Closed Won" },
  { key: "CLOSED_LOST", label: "Closed Lost" },
] as const;

const STAGE_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  PROSPECTING: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-300 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  QUALIFICATION: {
    bg: "bg-cyan-50 dark:bg-cyan-950/20",
    border: "border-cyan-300 dark:border-cyan-800",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  },
  PROPOSAL: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-300 dark:border-purple-800",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  NEGOTIATION: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-300 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  CLOSED_WON: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-300 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  CLOSED_LOST: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-300 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  const num = Number(value);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

export function PipelineClient({ deals: initialDeals, stats }: PipelineClientProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const groupedDeals = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    deals: deals.filter((d) => d.stage === stage.key),
  }));

  const totalValue = deals.reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);
  const wonValue = deals
    .filter((d) => d.stage === "CLOSED_WON")
    .reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0);
  const totalClosed = deals.filter((d) =>
    ["CLOSED_WON", "CLOSED_LOST"].includes(d.stage)
  ).length;
  const totalWon = deals.filter((d) => d.stage === "CLOSED_WON").length;
  const winRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 0;

  function loadDeals() {
    startTransition(async () => {
      try {
        const data = await getDeals({ pageSize: 500 });
        setDeals(data.data);
      } catch {
        toast.error("Failed to load deals");
      }
    });
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createDeal({
          title: formData.get("title") as string,
          value: formData.get("value") ? Number(formData.get("value")) : undefined,
          stage: (formData.get("stage") as string) as any,
          expectedCloseDate: (formData.get("expectedCloseDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Deal created");
        setDialogOpen(false);
        loadDeals();
      } catch {
        toast.error("Failed to create deal");
      }
    });
  }

  async function handleStageChange(id: string, stage: string) {
    startTransition(async () => {
      try {
        await updateDeal(id, { stage: stage as any });
        toast.success("Deal stage updated");
        loadDeals();
      } catch {
        toast.error("Failed to update stage");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Kanban view of your sales pipeline
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-1 h-4 w-4" /> Add Deal
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Deal Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expectedCloseDate">Expected Close</Label>
                  <Input
                    id="expectedCloseDate"
                    name="expectedCloseDate"
                    type="date"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stage">Stage</Label>
                <Select name="stage" defaultValue="PROSPECTING">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  )}
                  Create Deal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deals
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Won Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(wonValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {groupedDeals.map((column) => {
          const style = STAGE_STYLES[column.key] ?? STAGE_STYLES.PROSPECTING;
          return (
            <div
              key={column.key}
              className={`flex-1 min-w-[240px] rounded-lg border ${style.border} ${style.bg}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b bg-background/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Badge className={style.badge}>{column.label}</Badge>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {column.deals.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-2 min-h-[120px]">
                {column.deals.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No deals
                  </p>
                ) : (
                  column.deals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer transition-shadow hover:shadow-md"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/sales/deals/${deal.id}`}
                              className="block text-sm font-medium hover:text-primary truncate"
                            >
                              {deal.title}
                            </Link>
                            {deal.contact && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {deal.contact.company ?? deal.contact.firstName}{" "}
                                  {deal.contact.lastName ?? ""}
                                </span>
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-semibold">
                                {formatCurrency(deal.value ? Number(deal.value) : null)}
                              </span>
                              {deal.owner && (
                                <div
                                  className="flex items-center gap-1 text-xs text-muted-foreground"
                                  title={deal.owner.name ?? ""}
                                >
                                  <UserCircle className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[80px]">
                                    {deal.owner.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <Select
                                value={deal.stage}
                                onValueChange={(val) => {
                                  if (val) handleStageChange(deal.id, val);
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PIPELINE_STAGES.map((s) => (
                                    <SelectItem key={s.key} value={s.key}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
