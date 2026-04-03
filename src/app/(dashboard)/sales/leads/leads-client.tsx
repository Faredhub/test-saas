"use client";

import { useState, useTransition, useRef } from "react";
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
import { Plus, Search, Users, Target, TrendingUp, Loader2, Flame, Download, Upload } from "lucide-react";
import { createLead, deleteLead, updateLead, exportLeads, importLeads } from "@/lib/actions/sales";
import { downloadCSV, parseCSV } from "@/lib/export";
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
};

export function LeadsClient({ initialData, stats }: LeadsClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importRawCSV, setImportRawCSV] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleExport() {
    startTransition(async () => {
      try {
        const csv = await exportLeads();
        downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
        toast.success("Leads exported successfully");
      } catch {
        toast.error("Failed to export leads");
      }
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportRawCSV(text);
      const parsed = parseCSV(text);
      setImportPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 5),
      });
    };
    reader.readAsText(file);
  }

  async function handleImportConfirm() {
    if (!importRawCSV) return;
    startTransition(async () => {
      try {
        const result = await importLeads(importRawCSV);
        if (result.imported > 0) {
          toast.success(`Imported ${result.imported} leads successfully`);
        }
        if (result.errors.length > 0) {
          toast.error(`${result.errors.length} error(s): ${result.errors.slice(0, 3).join("; ")}`);
        }
        setImportOpen(false);
        setImportPreview(null);
        setImportRawCSV("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        toast.error("Failed to import leads");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage your sales pipeline</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportPreview(null); setImportRawCSV(""); } }}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Upload className="h-4 w-4" />
              Import CSV
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Leads from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select CSV file</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required column: firstName. Optional: lastName, email, phone, company, source
                  </p>
                </div>

                {importPreview && importPreview.headers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preview (first 5 rows)</Label>
                    <div className="overflow-auto rounded-md border max-h-60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {importPreview.headers.map((h, i) => (
                              <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.rows.map((row, ri) => (
                            <TableRow key={ri}>
                              {row.map((cell, ci) => (
                                <TableCell key={ci} className="text-xs py-1.5">{cell || "—"}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button onClick={handleImportConfirm} disabled={isPending || !importPreview}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Leads
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Lead
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
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
                    Create Lead
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDeals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    No leads found. Create your first lead to get started.
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(lead.id)}
                      >
                        Delete
                      </Button>
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
    </div>
  );
}
