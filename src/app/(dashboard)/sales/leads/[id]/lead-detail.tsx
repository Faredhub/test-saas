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
  Mail,
  Phone,
  Building2,
  Briefcase,
  IndianRupee,
  Calendar,
  Trophy,
  UserPlus,
  Plus,
  MessageSquare,
} from "lucide-react";
import { updateLead, createActivity, convertLeadToContact } from "@/lib/actions/sales";
import { toast } from "sonner";
import type { getLeadById } from "@/lib/actions/sales";

type Lead = NonNullable<Awaited<ReturnType<typeof getLeadById>>>;

const stageColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-purple-100 text-purple-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

const sourceColors: Record<string, string> = {
  MANUAL: "bg-slate-100 text-slate-700",
  WEB_FORM: "bg-cyan-100 text-cyan-700",
  EMAIL: "bg-indigo-100 text-indigo-700",
  PHONE: "bg-emerald-100 text-emerald-700",
  SOCIAL_MEDIA: "bg-pink-100 text-pink-700",
  REFERRAL: "bg-amber-100 text-amber-700",
  ADVERTISEMENT: "bg-violet-100 text-violet-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function getScoreLabel(score: number): { label: string; className: string } {
  if (score >= 76) return { label: "Very Hot", className: "bg-red-100 text-red-700" };
  if (score >= 51) return { label: "Hot", className: "bg-orange-100 text-orange-700" };
  if (score >= 26) return { label: "Warm", className: "bg-yellow-100 text-yellow-700" };
  return { label: "Cold", className: "bg-blue-100 text-blue-700" };
}

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

const dealStageLabels: Record<string, { label: string; color: string }> = {
  PROSPECTING: { label: "Prospecting", color: "bg-slate-100 text-slate-700" },
  QUALIFICATION: { label: "Qualification", color: "bg-blue-100 text-blue-700" },
  PROPOSAL: { label: "Proposal", color: "bg-amber-100 text-amber-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-100 text-orange-700" },
  CLOSED_WON: { label: "Won", color: "bg-green-100 text-green-700" },
  CLOSED_LOST: { label: "Lost", color: "bg-red-100 text-red-700" },
};

const activityTypeIcons: Record<string, string> = {
  CALL: "📞",
  EMAIL: "📧",
  MEETING: "🤝",
  NOTE: "📝",
  TASK: "✅",
  VISIT: "🏢",
};

export function LeadDetail({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [convertPending, setConvertPending] = useState(false);

  const scoreInfo = getScoreLabel(lead.score);
  const fullName = `${lead.firstName} ${lead.lastName || ""}`.trim();

  async function handleEdit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateLead(lead.id, {
          firstName: formData.get("firstName") as string,
          lastName: (formData.get("lastName") as string) || undefined,
          email: (formData.get("email") as string) || undefined,
          phone: (formData.get("phone") as string) || undefined,
          company: (formData.get("company") as string) || undefined,
          jobTitle: (formData.get("jobTitle") as string) || undefined,
          source: formData.get("source") as "MANUAL" | "WEB_FORM" | "EMAIL" | "PHONE" | "SOCIAL_MEDIA" | "REFERRAL",
          pipelineStage: formData.get("pipelineStage") as "NEW" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST",
          estimatedValue: Number(formData.get("estimatedValue")) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Lead updated successfully");
        setEditOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to update lead");
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
          leadId: lead.id,
        });
        toast.success("Activity logged");
        setActivityOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to log activity");
      }
    });
  }

  async function handleConvert() {
    setConvertPending(true);
    try {
      const contact = await convertLeadToContact(lead.id);
      toast.success("Lead converted to contact");
      router.push(`/sales/contacts/${contact.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to convert lead");
      setConvertPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales/pipeline">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
              <Badge className={`border-0 ${scoreInfo.className}`}>
                Score: {lead.score} - {scoreInfo.label}
              </Badge>
              <Badge className={`border-0 ${stageColors[lead.pipelineStage] ?? ""}`}>
                {lead.pipelineStage}
              </Badge>
              <Badge variant="outline" className={sourceColors[lead.source] ?? ""}>
                {lead.source.replace(/_/g, " ")}
              </Badge>
            </div>
            {lead.company && (
              <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lead.pipelineStage === "WON" && !lead.contactId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleConvert}
              disabled={convertPending}
            >
              {convertPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Convert to Contact
            </Button>
          )}

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
              Edit Lead
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Lead</DialogTitle>
              </DialogHeader>
              <form action={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name *</Label>
                    <Input id="editFirstName" name="firstName" defaultValue={lead.firstName} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input id="editLastName" name="lastName" defaultValue={lead.lastName ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input id="editEmail" name="email" type="email" defaultValue={lead.email ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone</Label>
                    <Input id="editPhone" name="phone" defaultValue={lead.phone ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editCompany">Company</Label>
                    <Input id="editCompany" name="company" defaultValue={lead.company ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editJobTitle">Job Title</Label>
                    <Input id="editJobTitle" name="jobTitle" defaultValue={lead.jobTitle ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editSource">Source</Label>
                    <select
                      name="source"
                      id="editSource"
                      defaultValue={lead.source}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="MANUAL">Manual</option>
                      <option value="WEB_FORM">Web Form</option>
                      <option value="EMAIL">Email</option>
                      <option value="PHONE">Phone</option>
                      <option value="SOCIAL_MEDIA">Social Media</option>
                      <option value="REFERRAL">Referral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editStage">Pipeline Stage</Label>
                    <select
                      name="pipelineStage"
                      id="editStage"
                      defaultValue={lead.pipelineStage}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="NEW">New</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="NEGOTIATION">Negotiation</option>
                      <option value="WON">Won</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editValue">Estimated Value (INR)</Label>
                  <Input
                    id="editValue"
                    name="estimatedValue"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={lead.estimatedValue ? Number(lead.estimatedValue) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea id="editNotes" name="notes" rows={3} defaultValue={lead.notes ?? ""} />
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
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{lead.email || "--"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{lead.phone || "--"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{lead.company || "--"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{lead.jobTitle || "--"}</span>
            </div>
            {lead.assignedTo && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Assigned to: </span>
                  <span className="font-medium">{lead.assignedTo.name}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated Value</p>
                <p className="text-lg font-semibold">{formatCurrency(lead.estimatedValue)}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="text-sm font-medium">{lead.currency}</p>
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
                <p className="font-medium">{formatDate(lead.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="font-medium">{formatDate(lead.updatedAt)}</p>
              </div>
            </div>
            {lead.wonDate && (
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-muted-foreground">Won Date</p>
                  <p className="font-medium text-green-700">{formatDate(lead.wonDate)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {lead.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Associated Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associated Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.deals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No deals linked to this lead</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Expected Close</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lead.deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link
                        href={`/sales/deals/${deal.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {deal.title}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(deal.value)}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${dealStageLabels[deal.stage]?.color ?? ""}`}>
                        {dealStageLabels[deal.stage]?.label ?? deal.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell>{formatDate(deal.expectedCloseDate)}</TableCell>
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
          {lead.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activities recorded yet</p>
          ) : (
            <div className="space-y-3">
              {lead.activities.map((activity) => (
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
