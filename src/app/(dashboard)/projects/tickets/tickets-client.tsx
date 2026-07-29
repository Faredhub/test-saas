"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
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
  Loader2,
  Eye,
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Package,
  FolderKanban,
  GripVertical,
} from "lucide-react";
import { createTicket, updateTicket } from "@/lib/actions/projects";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  WAITING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  RESOLVED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  CLOSED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const KANBAN_COLUMNS = [
  {
    id: "OPEN",
    label: "Open",
    icon: Ticket,
    accentColor: "border-t-blue-500",
    headerBg: "bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-900",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    icon: Clock,
    accentColor: "border-t-amber-500",
    headerBg: "bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
    dotColor: "bg-amber-500",
  },
  {
    id: "WAITING",
    label: "Waiting",
    icon: Clock,
    accentColor: "border-t-purple-500",
    headerBg: "bg-purple-50/70 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-900",
    badgeBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
    dotColor: "bg-purple-500",
  },
  {
    id: "RESOLVED",
    label: "Resolved",
    icon: CheckCircle2,
    accentColor: "border-t-emerald-500",
    headerBg: "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
  },
  {
    id: "CLOSED",
    label: "Closed",
    icon: XCircle,
    accentColor: "border-t-slate-400",
    headerBg: "bg-slate-100/70 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800",
    badgeBg: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    dotColor: "bg-slate-400",
  },
];

type TicketsClientProps = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/projects").getTickets>>;
};

export function TicketsClient({ initialData }: TicketsClientProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [entityFilter, setEntityFilter] = useState<string>("ALL");

  const [entityType, setEntityType] = useState<string>("PROJECT");
  const [isOpen, setIsOpen] = useState(false);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tickets = initialData.tickets.filter((t: any) => {
    const matchesSearch =
      !search ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;

    let matchesEntity = true;
    if (entityFilter !== "ALL") {
      if (entityFilter === "PROJECT") matchesEntity = Boolean(t.projectId || t.entityType === "PROJECT");
      else if (entityFilter === "INVOICE") matchesEntity = Boolean(t.invoiceId || t.entityType === "INVOICE");
      else if (entityFilter === "QUOTATION") matchesEntity = Boolean(t.quotationId || t.entityType === "QUOTATION");
      else if (entityFilter === "TENDER") matchesEntity = Boolean(t.tenderId || t.entityType === "TENDER");
      else if (entityFilter === "STOCK") matchesEntity = Boolean(t.productId || t.entityType === "STOCK");
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesEntity;
  });

  const statusCounts = {
    OPEN: initialData.tickets.filter((t: any) => t.status === "OPEN").length,
    IN_PROGRESS: initialData.tickets.filter((t: any) => t.status === "IN_PROGRESS").length,
    RESOLVED: initialData.tickets.filter((t: any) => t.status === "RESOLVED").length,
    CLOSED: initialData.tickets.filter((t: any) => t.status === "CLOSED").length,
  };

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const selEntityType = formData.get("entityType") as string;
        const entityVal = formData.get("entityVal") as string;

        await createTicket({
          subject: formData.get("subject") as string,
          description: formData.get("description") as string,
          priority: (formData.get("priority") as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
          category: formData.get("category") as string,
          entityType: selEntityType,
          projectId: selEntityType === "PROJECT" && entityVal ? entityVal : undefined,
          invoiceId: selEntityType === "INVOICE" && entityVal ? entityVal : undefined,
          quotationId: selEntityType === "QUOTATION" && entityVal ? entityVal : undefined,
          tenderId: selEntityType === "TENDER" && entityVal ? entityVal : undefined,
          productId: selEntityType === "STOCK" && entityVal ? entityVal : undefined,
          entityId: entityVal || undefined,
        });
        toast.success("Ticket created");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create ticket");
      }
    });
  }

  async function handleStatusChange(ticketId: string, newStatus: string) {
    startTransition(async () => {
      try {
        await updateTicket(ticketId, { status: newStatus as any });
        toast.success(`Ticket status updated to ${newStatus.replace("_", " ")}`);
      } catch {
        toast.error("Failed to update ticket status");
      }
    });
  }

  const renderEntityBadge = (ticket: any) => {
    if (ticket.project) {
      return (
        <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-300 flex items-center gap-1">
          <FolderKanban className="h-3 w-3" /> {ticket.project.name}
        </Badge>
      );
    }
    if (ticket.invoice) {
      return (
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1">
          <FileText className="h-3 w-3" /> Invoice #{ticket.invoice.invoiceNo}
        </Badge>
      );
    }
    if (ticket.quotation) {
      return (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-1">
          <FileSpreadsheet className="h-3 w-3" /> Quotation #{ticket.quotation.quotationNo}
        </Badge>
      );
    }
    if (ticket.tender) {
      return (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1">
          <FileCheck className="h-3 w-3" /> Tender #{ticket.tender.referenceNo || ticket.tender.title}
        </Badge>
      );
    }
    if (ticket.product) {
      return (
        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-300 flex items-center gap-1">
          <Package className="h-3 w-3" /> Stock #{ticket.product.name} ({ticket.product.sku})
        </Badge>
      );
    }
    if (ticket.entityType) {
      return (
        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">
          {ticket.entityType}: {ticket.entityId || "General"}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets & Revision Tracking</h1>
          <p className="text-muted-foreground">Manage customer issues, revisions, and allocations across Project, Invoice, Quotation, Tenders & Stock</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="h-8 gap-1 text-xs"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 gap-1 text-xs"
            >
              <List className="h-3.5 w-3.5" /> Table
            </Button>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> New Ticket
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Ticket / Revision Request</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input id="subject" name="subject" placeholder="Issue or Revision summary..." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} placeholder="Detailed revision or ticket description..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue="MEDIUM">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" placeholder="e.g. Bug, Revision, Request" />
                  </div>
                </div>

                {/* Entity Allocation Selector */}
                <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
                  <Label className="font-semibold text-sm">Allocate Ticket To Field / Module *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Entity Type</Label>
                      <Select name="entityType" value={entityType} onValueChange={(v) => setEntityType(v ?? "PROJECT")}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROJECT">Project</SelectItem>
                          <SelectItem value="INVOICE">Invoice</SelectItem>
                          <SelectItem value="QUOTATION">Quotation</SelectItem>
                          <SelectItem value="TENDER">Tender</SelectItem>
                          <SelectItem value="STOCK">Stock / Inventory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{entityType} ID / Ref Code</Label>
                      <Input name="entityVal" placeholder={`Enter ${entityType} ID or Code`} className="h-9" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tickets will be linked to the selected {entityType} wherever revisions or customer requests are required.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Ticket
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Ticket className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.OPEN}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.IN_PROGRESS}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.RESOLVED}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <XCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.CLOSED}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="All Field Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Field Entities</SelectItem>
            <SelectItem value="PROJECT">Projects</SelectItem>
            <SelectItem value="INVOICE">Invoices</SelectItem>
            <SelectItem value="QUOTATION">Quotations</SelectItem>
            <SelectItem value="TENDER">Tenders</SelectItem>
            <SelectItem value="STOCK">Stock / Inventory</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="WAITING">Waiting</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "ALL")}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Views */}
      {viewMode === "kanban" ? (
        /* Drag & Drop Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTickets = tickets.filter((t: any) => t.status === col.id);
            const IconComponent = col.icon;
            const isTarget = dragOverColumnId === col.id;

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-2xl border bg-card/60 dark:bg-card/40 backdrop-blur-xs min-w-[290px] w-[290px] flex-shrink-0 transition-all duration-200 ${col.accentColor} border-t-4 shadow-xs ${isTarget ? "ring-2 ring-primary/50 bg-primary/5 scale-[1.01]" : ""
                  }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
                }}
                onDragLeave={() => {
                  if (dragOverColumnId === col.id) setDragOverColumnId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(null);
                  if (draggedTicketId) {
                    handleStatusChange(draggedTicketId, col.id);
                    setDraggedTicketId(null);
                  }
                }}
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-xl flex items-center justify-between border-b ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <span className="font-bold text-sm tracking-tight">{col.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className={`font-bold text-xs ${col.badgeBg}`}>
                      {colTickets.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-background/60"
                      onClick={() => setIsOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 min-h-[480px] max-h-[680px] overflow-y-auto pr-1.5">
                  {colTickets.length === 0 ? (
                    <div className="h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground/70 bg-muted/10">
                      <IconComponent className="h-6 w-6 mb-2 opacity-40" />
                      <p className="font-medium">No {col.label.toLowerCase()} tickets</p>
                      <p className="text-[11px] opacity-60">Drag cards here</p>
                    </div>
                  ) : (
                    colTickets.map((ticket: any) => (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={() => setDraggedTicketId(ticket.id)}
                        className="bg-card hover:shadow-md border rounded-xl p-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2.5 group hover:border-primary/40 relative"
                      >
                        {/* Top row */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-muted-foreground flex items-center gap-1.5 text-[11px]">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                            {ticket.ticketNo}
                          </span>
                          <Badge className={`${priorityColors[ticket.priority] || ""} text-[10px] px-2 py-0.5 font-bold`} variant="secondary">
                            {ticket.priority}
                          </Badge>
                        </div>

                        {/* Title */}
                        <Link href={`/projects/tickets/${ticket.id}`} className="block">
                          <h4 className="font-semibold text-sm leading-snug text-foreground hover:text-primary transition-colors line-clamp-2">
                            {ticket.subject}
                          </h4>
                        </Link>

                        {ticket.description && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 font-normal">
                            {ticket.description}
                          </p>
                        )}

                        {/* Footer Badges */}
                        <div className="pt-2 flex items-center justify-between gap-1 border-t border-border/50 text-xs">
                          <div className="flex-1 truncate">
                            {renderEntityBadge(ticket)}
                          </div>

                          {/* Status Shift Selector for touch/click accessibility */}
                          <Select
                            value={ticket.status}
                            onValueChange={(val) => handleStatusChange(ticket.id, val as string)}
                          >
                            <SelectTrigger className="h-6 text-[10px] px-1.5 py-0 border-none bg-muted/50 hover:bg-muted font-medium w-auto gap-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KANBAN_COLUMNS.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Allocated Field Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No tickets found
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">{ticket.ticketNo}</TableCell>
                      <TableCell className="font-medium max-w-[280px] truncate">
                        <div className="flex items-center gap-2">
                          {ticket.priority === "URGENT" && (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          {ticket.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderEntityBadge(ticket) || <span className="text-xs text-muted-foreground">General</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ticket.status] || ""} variant="secondary">
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[ticket.priority] || ""} variant="secondary">
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.category || "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/projects/tickets/${ticket.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
