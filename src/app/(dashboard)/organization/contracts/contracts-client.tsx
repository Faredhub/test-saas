"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Trash2,
  ArrowRight,
  AlertTriangle,
  MoreHorizontal,
  Download,
  Upload,
} from "lucide-react";
import {
  createContract,
  updateContract,
  deleteContract,
  importContracts,
} from "@/lib/actions/organization";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type Contract = Awaited<ReturnType<typeof import("@/lib/actions/organization").getContracts>>[number];

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
};

const CONTRACT_TYPES = [
  { value: "SERVICE", label: "Service" },
  { value: "EMPLOYMENT", label: "Employment" },
  { value: "NDA", label: "NDA" },
  { value: "VENDOR", label: "Vendor" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const CONTRACT_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "SIGNED", label: "Signed" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const STATUS_FLOW: Record<string, string> = {
  DRAFT: "SENT",
  SENT: "SIGNED",
  SIGNED: "ACTIVE",
};

const STATUS_FLOW_LABEL: Record<string, string> = {
  DRAFT: "Mark as Sent",
  SENT: "Mark as Signed",
  SIGNED: "Mark as Active",
};

function statusBadgeVariant(status: string) {
  switch (status) {
    case "DRAFT":
      return "secondary" as const;
    case "SENT":
      return "outline" as const;
    case "SIGNED":
      return "default" as const;
    case "ACTIVE":
      return "default" as const;
    case "EXPIRED":
      return "destructive" as const;
    case "CANCELLED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "SIGNED":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "";
  }
}

function typeBadgeClass(type: string) {
  switch (type) {
    case "SERVICE":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "EMPLOYMENT":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "NDA":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    case "VENDOR":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "CUSTOM":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "";
  }
}

function formatCurrency(value: unknown): string {
  if (value == null) return "-";
  const num = typeof value === "object" && "toNumber" in (value as object)
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpiringSoon(contract: Contract): boolean {
  if (!contract.endDate || contract.status === "EXPIRED" || contract.status === "CANCELLED") return false;
  const now = new Date();
  const end = new Date(contract.endDate);
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

function contactName(c: { firstName: string; lastName: string | null; company: string | null } | null): string {
  if (!c) return "-";
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return c.company ? `${name} (${c.company})` : name;
}

type ContractsClientProps = {
  initialData: Contract[];
  contacts: { data: ContactOption[] };
};

export function ContractsClient({ initialData, contacts }: ContractsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("SERVICE");
  const [formContactId, setFormContactId] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAutoRenew, setFormAutoRenew] = useState(false);
  const [formTerms, setFormTerms] = useState("");

  function resetForm() {
    setFormTitle("");
    setFormType("SERVICE");
    setFormContactId("");
    setFormValue("");
    setFormStartDate("");
    setFormEndDate("");
    setFormAutoRenew(false);
    setFormTerms("");
  }

  function handleCreate() {
    if (!formTitle.trim()) {
      toast.error("Contract title is required");
      return;
    }

    startTransition(async () => {
      try {
        await createContract({
          title: formTitle.trim(),
          type: formType,
          contactId: formContactId || undefined,
          value: formValue ? parseFloat(formValue) : undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          autoRenew: formAutoRenew,
          terms: formTerms || undefined,
        });
        toast.success("Contract created successfully");
        setIsOpen(false);
        resetForm();
      } catch {
        toast.error("Failed to create contract");
      }
    });
  }

  function handleStatusChange(id: string, newStatus: string) {
    startTransition(async () => {
      try {
        const updateData: Record<string, unknown> = { status: newStatus };
        if (newStatus === "SIGNED") {
          updateData.signedAt = new Date().toISOString();
        }
        await updateContract(id, updateData as Parameters<typeof updateContract>[1]);
        toast.success(`Contract marked as ${newStatus.toLowerCase()}`);
        setActionsOpenId(null);
      } catch {
        toast.error("Failed to update contract status");
      }
    });
  }

  function handleDownloadTemplate() {
    const headers = [
      {
        "Title": "Annual Maintenance Contract",
        "Type": "SERVICE",
        "Contact Name": "John Doe",
        "Value (INR)": 50000,
        "Start Date": "2026-01-01",
        "End Date": "2026-12-31",
        "Auto Renew": "Yes",
        "Terms": "Standard terms apply",
        "Notes": "Priority client",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts Template");
    XLSX.writeFile(workbook, "contracts_template.xlsx");
    toast.success("Contracts Excel template downloaded!");
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = evt.target?.result;
            if (!data) return;
            const workbook = XLSX.read(data, { type: "binary" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            const contractsToImport = json.map((row) => ({
              title: String(row.title || row["Title"] || "").trim(),
              type: String(row.type || row["Type"] || "SERVICE").trim(),
              contactName: String(row.contactName || row["Contact Name"] || row["Contact"] || "").trim() || undefined,
              value: row.value || row["Value (INR)"] || row["Value"] ? String(row.value || row["Value (INR)"] || row["Value"]) : undefined,
              startDate: row.startDate || row["Start Date"] ? String(row.startDate || row["Start Date"]).trim() : undefined,
              endDate: row.endDate || row["End Date"] ? String(row.endDate || row["End Date"]).trim() : undefined,
              autoRenew: row.autoRenew || row["Auto Renew"] || row["Auto-Renew"] || false,
              terms: String(row.terms || row["Terms"] || "").trim() || undefined,
              notes: String(row.notes || row["Notes"] || "").trim() || undefined,
            }));

            const res = await importContracts(contractsToImport);

            if (res && res.success) {
              if (res.errors && res.errors.length > 0) {
                toast.warning(`Imported ${res.count} contracts with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
              } else {
                toast.success(`Successfully imported ${res.count} contracts!`);
              }
            } else {
              toast.error(res?.error || "Failed to import contracts");
            }
          } catch (err: any) {
            toast.error(`Error parsing Excel: ${err.message}`);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteContract(id);
        toast.success("Contract deleted");
        setDeleteConfirmId(null);
      } catch {
        toast.error("Failed to delete contract");
      }
    });
  }

  const filtered = initialData.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(s) ||
      c.contractNo.toLowerCase().includes(s) ||
      (c.contact && contactName(c.contact).toLowerCase().includes(s))
    );
  });

  const expiringSoonCount = initialData.filter(isExpiringSoon).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Manage service agreements, NDAs, and vendor contracts
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Contract
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="contract-title">Title *</Label>
                <Input
                  id="contract-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Annual Maintenance Contract"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={(val) => setFormType(val ?? "SERVICE")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Select value={formContactId} onValueChange={(val) => setFormContactId(val ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.data.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                          {c.company ? ` (${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-value">Value (INR)</Label>
                <Input
                  id="contract-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract-start">Start Date</Label>
                  <Input
                    id="contract-start"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract-end">End Date</Label>
                  <Input
                    id="contract-end"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formAutoRenew}
                  onClick={() => setFormAutoRenew(!formAutoRenew)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                    formAutoRenew ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                      formAutoRenew ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setFormAutoRenew(!formAutoRenew)}>
                  Auto-renew
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-terms">Terms & Conditions</Label>
                <Textarea
                  id="contract-terms"
                  value={formTerms}
                  onChange={(e) => setFormTerms(e.target.value)}
                  placeholder="Enter contract terms..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Contract
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {expiringSoonCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-medium">{expiringSoonCount} contract{expiringSoonCount !== 1 ? "s" : ""}</span>{" "}
            expiring within the next 30 days. Review and renew as needed.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {CONTRACT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Contract #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No contracts found. Create your first contract to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((contract) => {
                  const expiring = isExpiringSoon(contract);
                  return (
                    <TableRow
                      key={contract.id}
                      className={expiring ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {contract.title}
                          {expiring && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{contract.contractNo}</TableCell>
                      <TableCell>{contactName(contract.contact)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadgeClass(contract.type)}>
                          {contract.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant(contract.status)}
                          className={statusBadgeClass(contract.status)}
                        >
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(contract.value)}</TableCell>
                      <TableCell>{formatDate(contract.startDate)}</TableCell>
                      <TableCell>{formatDate(contract.endDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="relative inline-block">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActionsOpenId(actionsOpenId === contract.id ? null : contract.id)
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {actionsOpenId === contract.id && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                              {STATUS_FLOW[contract.status] && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                                  onClick={() =>
                                    handleStatusChange(contract.id, STATUS_FLOW[contract.status])
                                  }
                                  disabled={isPending}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  {STATUS_FLOW_LABEL[contract.status]}
                                </button>
                              )}
                              {contract.status === "ACTIVE" && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                                  onClick={() => handleStatusChange(contract.id, "EXPIRED")}
                                  disabled={isPending}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Mark as Expired
                                </button>
                              )}
                              {contract.status !== "CANCELLED" && contract.status !== "EXPIRED" && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                                  onClick={() => handleStatusChange(contract.id, "CANCELLED")}
                                  disabled={isPending}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Cancel Contract
                                </button>
                              )}
                              <div className="my-1 h-px bg-border" />
                              {deleteConfirmId === contract.id ? (
                                <div className="flex items-center gap-1 px-2 py-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(contract.id)}
                                    disabled={isPending}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setDeleteConfirmId(null)}
                                    disabled={isPending}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                                  onClick={() => setDeleteConfirmId(contract.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
