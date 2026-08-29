"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  IndianRupee,
  Calendar,
  User,
  Building2,
  Plus,
  FileText,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { updateDeal, createActivity } from "@/lib/actions/sales";
import { toast } from "sonner";
import type { getDealById } from "@/lib/actions/sales";

type Deal = NonNullable<Awaited<ReturnType<typeof getDealById>>>;

const stageLabels: Record<string, { label: string; color: string }> = {
  PROSPECTING: { label: "Prospecting", color: "bg-slate-100 text-slate-700" },
  QUALIFICATION: { label: "Qualification", color: "bg-blue-100 text-blue-700" },
  PROPOSAL: { label: "Proposal", color: "bg-amber-100 text-amber-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-100 text-orange-700" },
  CLOSED_WON: { label: "Closed Won", color: "bg-green-100 text-green-700" },
  CLOSED_LOST: { label: "Closed Lost", color: "bg-red-100 text-red-700" },
};

const quotationStatusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
};

const activityTypeIcons: Record<string, string> = {
  CALL: "📞",
  EMAIL: "📧",
  MEETING: "🤝",
  NOTE: "📝",
  TASK: "✅",
  VISIT: "🏢",
};

function formatCurrency(value: unknown) {
  if (!value) return "--";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DealDetail({ deal }: { deal: Deal }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const stageInfo = stageLabels[deal.stage] ?? { label: deal.stage, color: "" };

  async function handleEdit(formData: FormData) {
    startTransition(async () => {
      try {
        const stage = formData.get("stage") as string;
        await updateDeal(deal.id, {
          title: formData.get("title") as string,
          value: Number(formData.get("value")) || undefined,
          probability: Number(formData.get("probability")) || 0,
          stage: stage as "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST",
          expectedCloseDate: (formData.get("expectedCloseDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          contactId: (formData.get("contactId") as string) || undefined,
        });
        toast.success("Deal updated successfully");
        setEditOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to update deal");
      }
    });
  }

  async function handleLogActivity(formData: FormData) {
    startTransition(async () => {
      try {
        await createActivity({
          type: formData.get("type") as "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK" | "VISIT",
          subject: formData.get("subject") as string,
          description: (formData.get("description") as string) || undefined,
          outcome: (formData.get("outcome") as string) || undefined,
          dealId: deal.id,
        });
        toast.success("Activity logged");
        setActivityOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to log activity");
      }
    });
  }

  // Build quotation creation URL with pre-filled data
  const createQuotationParams = new URLSearchParams();
  if (deal.contactId) createQuotationParams.set("contactId", deal.contactId);
  createQuotationParams.set("dealId", deal.id);
  if (deal.value) createQuotationParams.set("value", String(Number(deal.value)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales/leads-deals?tab=deals">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
              <Badge className={`border-0 ${stageInfo.color}`}>
                {stageInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(deal.value)}</span>
              <span className="text-sm text-muted-foreground">
                <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
                {deal.probability}% probability
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/sales/quotations?${createQuotationParams.toString()}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Create Quotation
            </Button>
          </Link>

          <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Plus className="h-4 w-4" />
              Log Activity
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Activity</DialogTitle>
              </DialogHeader>
              <form action={handleLogActivity} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="actType">Type</Label>
                  <select
                    name="type"
                    id="actType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    required
                  >
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="NOTE">Note</option>
                    <option value="TASK">Task</option>
                    <option value="VISIT">Visit</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actSubject">Subject *</Label>
                  <Input id="actSubject" name="subject" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actDesc">Description</Label>
                  <Textarea id="actDesc" name="description" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actOutcome">Outcome</Label>
                  <Input id="actOutcome" name="outcome" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log Activity
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Pencil className="h-4 w-4" />
              Edit Deal
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Deal</DialogTitle>
              </DialogHeader>
              <form action={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTitle">Deal Title *</Label>
                  <Input id="editTitle" name="title" defaultValue={deal.title} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editValue">Value (INR)</Label>
                    <Input
                      id="editValue"
                      name="value"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={deal.value ? Number(deal.value) : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editProbability">Probability (%)</Label>
                    <Input
                      id="editProbability"
                      name="probability"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={deal.probability}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editStage">Stage</Label>
                    <select
                      name="stage"
                      id="editStage"
                      defaultValue={deal.stage}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="PROSPECTING">Prospecting</option>
                      <option value="QUALIFICATION">Qualification</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="NEGOTIATION">Negotiation</option>
                      <option value="CLOSED_WON">Closed Won</option>
                      <option value="CLOSED_LOST">Closed Lost</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editExpectedClose">Expected Close Date</Label>
                    <Input
                      id="editExpectedClose"
                      name="expectedCloseDate"
                      type="date"
                      defaultValue={deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split("T")[0] : ""}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea id="editNotes" name="notes" rows={3} defaultValue={deal.notes ?? ""} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Financial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Deal Value</p>
                <p className="text-lg font-semibold">{formatCurrency(deal.value)}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Weighted Value</p>
              <p className="text-sm font-medium">
                {deal.value
                  ? formatCurrency(Number(deal.value) * (deal.probability / 100))
                  : "--"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="text-sm font-medium">{deal.currency}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Lead */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Related</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Contact</p>
                {deal.contact ? (
                  <Link
                    href={`/sales/contacts/${deal.contact.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {deal.contact.firstName} {deal.contact.lastName ?? ""}
                  </Link>
                ) : (
                  <p className="font-medium">--</p>
                )}
              </div>
            </div>
            {deal.contact?.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{deal.contact.company}</span>
              </div>
            )}
            {deal.lead && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Source Lead</p>
                  <Link
                    href={`/sales/leads/${deal.lead.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {deal.lead.firstName} {deal.lead.lastName ?? ""}
                  </Link>
                </div>
              </div>
            )}
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Owner: </span>
              <span className="font-medium">{deal.owner?.name ?? "--"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(deal.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Expected Close</p>
                <p className="font-medium">{formatDate(deal.expectedCloseDate)}</p>
              </div>
            </div>
            {deal.actualCloseDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-muted-foreground">Actual Close</p>
                  <p className="font-medium">{formatDate(deal.actualCloseDate)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {deal.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quotations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          {deal.quotations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No quotations linked to this deal</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deal.quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.quotationNo}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${quotationStatusColors[q.status] ?? ""}`}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(q.total)}</TableCell>
                    <TableCell>{formatDate(q.validUntil)}</TableCell>
                    <TableCell>{q.createdBy?.name ?? "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {deal.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activities recorded yet</p>
          ) : (
            <div className="space-y-3">
              {deal.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <span className="text-lg mt-0.5">{activityTypeIcons[activity.type] ?? "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{activity.subject}</p>
                      <Badge variant="outline" className="text-[10px]">{activity.type}</Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                    )}
                    {activity.outcome && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Outcome: <span className="font-medium">{activity.outcome}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
