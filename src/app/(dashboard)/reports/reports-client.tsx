"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Trash2,
  Loader2,
  LayoutTemplate,
} from "lucide-react";
import {
  createGeneratedReport,
  deleteGeneratedReport,
} from "@/lib/actions/reports";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportsData = Awaited<
  ReturnType<typeof import("@/lib/actions/reports").getGeneratedReports>
>;
type Template = Awaited<
  ReturnType<typeof import("@/lib/actions/reports").getReportTemplates>
>[number];

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  FINAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

const typeColors: Record<string, string> = {
  SURVEY: "bg-blue-100 text-blue-700",
  GEOTECHNICAL: "bg-amber-100 text-amber-700",
  DESIGN: "bg-purple-100 text-purple-700",
  CUSTOM: "bg-slate-100 text-slate-700",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ReportsClientProps = {
  initialData: ReportsData;
  templates: Template[];
};

export function ReportsClient({ initialData, templates }: ReportsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reports = initialData.reports.filter((r) => {
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.clientName && r.clientName.toLowerCase().includes(search.toLowerCase())) ||
      (r.projectRef && r.projectRef.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    DRAFT: initialData.reports.filter((r) => r.status === "DRAFT").length,
    FINAL: initialData.reports.filter((r) => r.status === "FINAL").length,
    APPROVED: initialData.reports.filter((r) => r.status === "APPROVED").length,
    ARCHIVED: initialData.reports.filter((r) => r.status === "ARCHIVED").length,
  };

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteGeneratedReport(id);
        toast.success("Report deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete report"
        );
      }
    });
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createGeneratedReport({
          templateId: formData.get("templateId") as string,
          title: formData.get("title") as string,
          clientName: (formData.get("clientName") as string) || undefined,
          location: (formData.get("location") as string) || undefined,
          projectRef: (formData.get("projectRef") as string) || undefined,
        });
        toast.success("Report created");
        setCreateOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create report"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate, manage, and export professional reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports/templates">
            <Button variant="outline">
              <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
            </Button>
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            { key: "DRAFT", label: "Draft", color: "text-slate-600" },
            { key: "FINAL", label: "Final", color: "text-blue-600" },
            { key: "APPROVED", label: "Approved", color: "text-green-600" },
            { key: "ARCHIVED", label: "Archived", color: "text-amber-600" },
          ] as const
        ).map((s) => (
          <Card key={s.key}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>
                {statusCounts[s.key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="FINAL">Final</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Report table */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reports found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Generate your first report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={typeColors[report.template.type]}
                    >
                      {report.template.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.clientName || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.location || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[report.status]}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/reports/${report.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {report.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(report.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create report dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateId">Template *</Label>
              <Select name="templateId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Report Title *</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" name="clientName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectRef">Project Reference</Label>
                <Input id="projectRef" name="projectRef" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
