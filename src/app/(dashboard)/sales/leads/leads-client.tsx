"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Target, TrendingUp, Loader2, Flame, Upload, List, Columns3, Eye, Pencil, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import { LeadsKanban } from "./leads-kanban";
import { createLead, deleteLead, updateLead } from "@/lib/actions/sales";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "sonner";


function getScoreLabel(score: number): { label: string; className: string } {
  if (score >= 76) return { label: "Very Hot", className: "bg-red-100 text-red-700" };
  if (score >= 51) return { label: "Hot", className: "bg-orange-100 text-orange-700" };
  if (score >= 26) return { label: "Warm", className: "bg-yellow-100 text-yellow-700" };
  return { label: "Cold", className: "bg-blue-100 text-blue-700" };
}

const stageColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-purple-100 text-purple-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

type LeadsClientProps = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/sales").getLeads>>;
  stats: Awaited<ReturnType<typeof import("@/lib/actions/sales").getSalesStats>>;
  hideHeader?: boolean;
};

export function LeadsClient({ initialData, stats, hideHeader }: LeadsClientProps) {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const leadsLabel = "Leads";

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<any | null>(null);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createLead({
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          company: formData.get("company") as string,
          source: (formData.get("source") as string) as "MANUAL" | "WEB_FORM" | "EMAIL" | "PHONE" | "SOCIAL_MEDIA" | "REFERRAL",
          notes: formData.get("notes") as string,
        });
        toast.success("Lead created successfully");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create lead");
      }
    });
  }

  async function handleStageChange(id: string, stage: string) {
    startTransition(async () => {
      try {
        await updateLead(id, { pipelineStage: stage as "NEW" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" });
        toast.success("Lead updated");
      } catch {
        toast.error("Failed to update lead");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteLead(id);
        toast.success("Lead deleted");
      } catch {
        toast.error("Failed to delete lead");
      }
    });
  }

  async function handleEdit(formData: FormData) {
    if (!editingLead) return;
    startTransition(async () => {
      try {
        await updateLead(editingLead.id, {
          firstName: formData.get("firstName") as string,
          lastName: (formData.get("lastName") as string) || undefined,
          email: (formData.get("email") as string) || undefined,
          phone: (formData.get("phone") as string) || undefined,
          company: (formData.get("company") as string) || undefined,
          source: formData.get("source") as "MANUAL" | "WEB_FORM" | "EMAIL" | "PHONE" | "SOCIAL_MEDIA" | "REFERRAL",
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Lead updated successfully");
        setEditingLead(null);
      } catch {
        toast.error("Failed to update lead");
      }
    });
  }

  const filtered = initialData.data.filter((lead) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      lead.firstName.toLowerCase().includes(s) ||
      (lead.lastName?.toLowerCase().includes(s) ?? false) ||
      (lead.email?.toLowerCase().includes(s) ?? false) ||
      (lead.company?.toLowerCase().includes(s) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${hideHeader ? "justify-end" : "justify-between"}`}>
        {!hideHeader && (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{leadsLabel}</h1>
            <p className="text-sm text-muted-foreground">Manage your sales pipeline</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Table</span>
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => setViewMode("kanban")}
            >
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Kanban</span>
            </Button>
          </div>

          {canCreate("leads") && (
            <>
              <Link href="/office/spreadsheets?template=sales-leads&source=sales-leads">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
                >
                  <Upload className="h-4 w-4" /> Bulk Upload
                </Button>
              </Link>

              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Add {leadsLabel}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New {leadsLabel}</DialogTitle>
                  </DialogHeader>
                  <form action={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input id="firstName" name="firstName" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" name="phone" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" name="company" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="source">Source</Label>
                        <select name="source" id="source" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                          <option value="MANUAL">Manual</option>
                          <option value="WEB_FORM">Web Form</option>
                          <option value="EMAIL">Email</option>
                          <option value="PHONE">Phone</option>
                          <option value="SOCIAL_MEDIA">Social Media</option>
                          <option value="REFERRAL">Referral</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea id="notes" name="notes" rows={3} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                        Cancel
                      </DialogClose>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create {leadsLabel}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total {leadsLabel}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New {leadsLabel}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newLeads}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDeals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${leadsLabel.toLowerCase()}...`}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <LeadsKanban leads={filtered} onStageChange={handleStageChange} />
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No {leadsLabel.toLowerCase()} found. Create your first {leadsLabel.toLowerCase().replace(/s$/, "")} to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{lead.firstName} {lead.lastName}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 leading-4 font-medium border-0 ${getScoreLabel(lead.score).className}`}>
                            {getScoreLabel(lead.score).label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Flame className={`h-3.5 w-3.5 ${lead.score >= 76 ? "text-red-500" : lead.score >= 51 ? "text-orange-500" : lead.score >= 26 ? "text-yellow-500" : "text-blue-500"}`} />
                          <span className="text-sm font-medium">{lead.score}</span>
                        </div>
                      </TableCell>
                      <TableCell>{lead.company ?? "—"}</TableCell>
                      <TableCell>{lead.email ?? "—"}</TableCell>
                      <TableCell>{lead.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.source.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <select
                          value={lead.pipelineStage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer ${stageColors[lead.pipelineStage] ?? ""}`}
                        >
                          <option value="NEW">New</option>
                          <option value="QUALIFIED">Qualified</option>
                          <option value="PROPOSAL">Proposal</option>
                          <option value="NEGOTIATION">Negotiation</option>
                          <option value="WON">Won</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/sales/leads/${lead.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canUpdate("leads") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                              onClick={() => setEditingLead(lead)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete("leads") && (
                            confirmDeleteId === lead.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => { handleDelete(lead.id); setConfirmDeleteId(null); }}
                                  title="Confirm Delete"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:bg-slate-100"
                                  onClick={() => setConfirmDeleteId(null)}
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={() => setConfirmDeleteId(lead.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {initialData.totalPages > 1 && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Page {initialData.page} of {initialData.totalPages} ({initialData.total} total)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => { if (!open) setEditingLead(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {leadsLabel}</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <form action={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input id="edit-firstName" name="firstName" defaultValue={editingLead.firstName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input id="edit-lastName" name="lastName" defaultValue={editingLead.lastName ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={editingLead.email ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input id="edit-phone" name="phone" defaultValue={editingLead.phone ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company</Label>
                  <Input id="edit-company" name="company" defaultValue={editingLead.company ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source</Label>
                  <select
                    name="source"
                    id="edit-source"
                    defaultValue={editingLead.source}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" name="notes" rows={3} defaultValue={editingLead.notes ?? ""} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingLead(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
