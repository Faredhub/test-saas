"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
  Upload,
  Pencil,
  Eye,
  Check,
  X,
  Bell,
  UserCheck,
  RefreshCw,
  FileSignature,
  CheckCircle2,
  Clock,
  Eraser,
  PenTool,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  createContract,
  updateContract,
  deleteContract,
  notifyHROfContractExpiry,
  notifyEmployeeOfContractExpiry,
  submitContractRenewalForm,
  approveContractRenewal,
  signContractWithSignature,
} from "@/lib/actions/organization";
import { getProjects } from "@/lib/actions/projects";
import { toast } from "sonner";
import Link from "next/link";

type Contract = Awaited<ReturnType<typeof import("@/lib/actions/organization").getContracts>>[number];

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
};

type SavedSignature = {
  id: string;
  name: string;
  dataUrl: string;
  isDefault: boolean;
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
  { value: "RENEWAL_REQUESTED", label: "Pending HR Approval" },
  { value: "RENEWAL_APPROVED", label: "Renewal Approved" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

function statusBadgeVariant(status: string) {
  switch (status) {
    case "DRAFT":
      return "secondary" as const;
    case "SENT":
      return "outline" as const;
    case "SIGNED":
    case "ACTIVE":
    case "RENEWAL_APPROVED":
      return "default" as const;
    case "RENEWAL_REQUESTED":
      return "outline" as const;
    case "EXPIRED":
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
    case "RENEWAL_REQUESTED":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
    case "RENEWAL_APPROVED":
      return "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300";
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

function SignaturePad({
  onSave,
  defaultDataUrl,
}: {
  onSave: (dataUrl: string) => void;
  defaultDataUrl?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (defaultDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = defaultDataUrl;
    }
  }, [defaultDataUrl]);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL());
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave("");
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 overflow-hidden relative shadow-inner">
        <canvas
          ref={canvasRef}
          width={460}
          height={160}
          className="w-full h-40 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-muted-foreground uppercase tracking-wider font-semibold opacity-60">
          Draw digital signature above
        </div>
      </div>
      <div className="flex justify-between items-center text-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          className="h-7 gap-1 text-slate-500 hover:text-slate-800"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear Signature
        </Button>
        <span className="text-muted-foreground text-[11px]">Mouse or touch canvas</span>
      </div>
    </div>
  );
}

function RenewalWorkflowStepper({ contract }: { contract: Contract }) {
  const expiring = isExpiringSoon(contract) || contract.status === "EXPIRED";
  const isRenewalRequested = contract.status === "RENEWAL_REQUESTED";
  const isApproved = contract.status === "RENEWAL_APPROVED";
  const isSignedOrActive = contract.status === "SIGNED" || contract.status === "ACTIVE";

  const steps = [
    {
      label: "1. Contract Expiry Check",
      desc: expiring ? "Expiring in < 30 Days" : "Active / Monitored",
      done: expiring || isRenewalRequested || isApproved || isSignedOrActive,
      current: expiring && !isRenewalRequested && !isApproved && !isSignedOrActive,
    },
    {
      label: "2. Notify HR (30 Days)",
      desc: "HR Expiry Warning Sent",
      done: isRenewalRequested || isApproved || isSignedOrActive,
      current: expiring && !isRenewalRequested && !isApproved && !isSignedOrActive,
    },
    {
      label: "3. Notify Employee",
      desc: "Employee Expiry Notice",
      done: isRenewalRequested || isApproved || isSignedOrActive,
      current: expiring && !isRenewalRequested && !isApproved && !isSignedOrActive,
    },
    {
      label: "4. Generate Renewal Form",
      desc: "HR Renewal Details",
      done: isRenewalRequested || isApproved || isSignedOrActive,
      current: isRenewalRequested,
    },
    {
      label: "5. HR Approval",
      desc: isApproved ? "Approved by HR" : "Pending Review",
      done: isApproved || isSignedOrActive,
      current: isRenewalRequested,
    },
    {
      label: "6. Digital Signature",
      desc: isSignedOrActive ? "Digitally Executed" : "Ready to Sign",
      done: isSignedOrActive,
      current: isApproved,
    },
  ];

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 dark:from-amber-500/20 dark:to-indigo-500/20 border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin-slow" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Contract Renewal & Expiry Lifecycle Stage
          </h4>
        </div>
        <Badge variant="outline" className="text-[10px] bg-background font-mono">
          Status: {contract.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-lg text-center border transition-all flex flex-col justify-between ${
              step.done
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                : step.current
                ? "bg-amber-500/20 border-amber-500/60 text-amber-950 dark:text-amber-100 font-semibold ring-2 ring-amber-500/30 shadow-sm"
                : "bg-muted/40 border-muted text-muted-foreground opacity-60"
            }`}
          >
            <div>
              <div className="flex justify-center mb-1">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : step.current ? (
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-current opacity-50 flex items-center justify-center text-[9px] font-bold">
                    {i + 1}
                  </div>
                )}
              </div>
              <p className="text-[11px] leading-tight font-semibold">{step.label}</p>
            </div>
            <span className="text-[9px] text-muted-foreground mt-1 block truncate">{step.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type ContractsClientProps = {
  initialData: Contract[];
  contacts: { data: ContactOption[] };
  userSignatures?: SavedSignature[];
};

export function ContractsClient({
  initialData,
  contacts,
  userSignatures = [],
}: ContractsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // View & Edit state
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("SERVICE");
  const [editContactId, setEditContactId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editProjectSearch, setEditProjectSearch] = useState("");
  const [editProjectsList, setEditProjectsList] = useState<Array<{ id: string; name: string }>>([]);
  const [editValue, setEditValue] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [editTerms, setEditTerms] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");
  const [editPdfName, setEditPdfName] = useState("");
  const [editPdfSize, setEditPdfSize] = useState<number>(0);
  const [editPdfContent, setEditPdfContent] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("SERVICE");
  const [formContactId, setFormContactId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formProjectSearch, setFormProjectSearch] = useState("");
  const [formProjectsList, setFormProjectsList] = useState<Array<{ id: string; name: string }>>([]);
  const [formValue, setFormValue] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAutoRenew, setFormAutoRenew] = useState(false);
  const [formTerms, setFormTerms] = useState("");
  const [formPdfName, setFormPdfName] = useState("");
  const [formPdfSize, setFormPdfSize] = useState<number>(0);
  const [formPdfContent, setFormPdfContent] = useState("");

  // Renewal Form Dialog state
  const [renewalModalContract, setRenewalModalContract] = useState<Contract | null>(null);
  const [renewalEndDate, setRenewalEndDate] = useState("");
  const [renewalValue, setRenewalValue] = useState("");
  const [renewalTerms, setRenewalTerms] = useState("");
  const [renewalNotes, setRenewalNotes] = useState("");

  // E-Signature Dialog state
  const [signatureModalContract, setSignatureModalContract] = useState<Contract | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [selectedSavedSigId, setSelectedSavedSigId] = useState("");

  function resetForm() {
    setFormTitle("");
    setFormType("SERVICE");
    setFormContactId("");
    setFormProjectId("");
    setFormProjectSearch("");
    setFormProjectsList([]);
    setFormValue("");
    setFormStartDate("");
    setFormEndDate("");
    setFormAutoRenew(false);
    setFormTerms("");
    setFormPdfName("");
    setFormPdfSize(0);
    setFormPdfContent("");
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
          projectId: formProjectId || undefined,
          value: formValue ? parseFloat(formValue) : undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          autoRenew: formAutoRenew,
          terms: formTerms || undefined,
          pdfName: formPdfName || undefined,
          pdfSize: formPdfSize || undefined,
          pdfContent: formPdfContent || undefined,
        });
        toast.success("Contract created successfully");
        setIsOpen(false);
        resetForm();
      } catch {
        toast.error("Failed to create contract");
      }
    });
  }

  function handleNotifyHR(contract: Contract) {
    startTransition(async () => {
      try {
        await notifyHROfContractExpiry(contract.id);
        toast.success(`HR notified before 30-day expiry of contract #${contract.contractNo}`);
      } catch {
        toast.error("Failed to notify HR");
      }
    });
  }

  function handleNotifyEmployee(contract: Contract) {
    startTransition(async () => {
      try {
        const res = await notifyEmployeeOfContractExpiry(contract.id);
        toast.success(`Expiry notice sent to ${res.recipientName}`);
      } catch {
        toast.error("Failed to notify employee");
      }
    });
  }

  function openRenewalForm(contract: Contract) {
    setRenewalModalContract(contract);
    const currEnd = contract.endDate ? new Date(contract.endDate) : new Date();
    currEnd.setFullYear(currEnd.getFullYear() + 1);
    setRenewalEndDate(currEnd.toISOString().split("T")[0]);
    setRenewalValue(contract.value ? String(contract.value) : "");
    setRenewalTerms(contract.terms || "");
    setRenewalNotes("");
  }

  function handleGenerateRenewal() {
    if (!renewalModalContract) return;
    if (!renewalEndDate) {
      toast.error("Proposed Renewal End Date is required");
      return;
    }

    startTransition(async () => {
      try {
        await submitContractRenewalForm(renewalModalContract.id, {
          proposedEndDate: renewalEndDate,
          proposedValue: renewalValue ? parseFloat(renewalValue) : undefined,
          renewalTerms: renewalTerms || undefined,
          notes: renewalNotes || undefined,
        });
        toast.success("Contract Renewal Form submitted to HR for approval");
        setRenewalModalContract(null);
      } catch {
        toast.error("Failed to submit contract renewal form");
      }
    });
  }

  function handleApproveRenewal(contractId: string, approved: boolean) {
    startTransition(async () => {
      try {
        await approveContractRenewal(contractId, approved);
        toast.success(
          approved
            ? "Contract renewal approved by HR"
            : "Contract renewal rejected"
        );
      } catch {
        toast.error("Failed to process approval");
      }
    });
  }

  function handleApplyDigitalSignature() {
    if (!signatureModalContract) return;
    if (!signatureDataUrl) {
      toast.error("Please draw or select a digital signature");
      return;
    }

    startTransition(async () => {
      try {
        await signContractWithSignature(signatureModalContract.id, signatureDataUrl);
        toast.success("Contract digitally signed & activated successfully!");
        setSignatureModalContract(null);
        setSignatureDataUrl("");
      } catch {
        toast.error("Failed to apply digital signature");
      }
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

  function handleUpdate() {
    if (!editingContract) return;
    if (!editTitle.trim()) {
      toast.error("Contract title is required");
      return;
    }

    startTransition(async () => {
      try {
        await updateContract(editingContract.id, {
          title: editTitle.trim(),
          type: editType,
          contactId: editContactId || null,
          projectId: editProjectId || null,
          value: editValue ? parseFloat(editValue) : null,
          startDate: editStartDate || null,
          endDate: editEndDate || null,
          autoRenew: editAutoRenew,
          terms: editTerms || null,
          status: editStatus,
          pdfName: editPdfName || null,
          pdfSize: editPdfSize || null,
          pdfContent: editPdfContent || null,
        });
        toast.success("Contract updated successfully");
        setEditOpen(false);
        setEditingContract(null);
      } catch {
        toast.error("Failed to update contract");
      }
    });
  }

  const filtered = initialData.filter((c) => {
    if (statusFilter === "EXPIRING") {
      return isExpiringSoon(c) || c.status === "EXPIRED";
    }
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(s) ||
      c.contractNo.toLowerCase().includes(s) ||
      c.type.toLowerCase().includes(s) ||
      (c.terms && c.terms.toLowerCase().includes(s)) ||
      (c.notes && c.notes.toLowerCase().includes(s)) ||
      (c.contact && contactName(c.contact).toLowerCase().includes(s))
    );
  });

  const expiringSoonCount = initialData.filter(isExpiringSoon).length;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage service agreements, NDAs, and vendor contracts
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Link href="/office/spreadsheets?template=contracts&source=contracts">
            <Button
              variant="outline"
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
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
                    placeholder="e.g., Service Agreement - Client Project"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formType}
                      onValueChange={(val) => setFormType(val ?? "SERVICE")}
                    >
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
                    <Select
                      value={formContactId}
                      onValueChange={(val) => setFormContactId(val ?? "")}
                    >
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
                  <Label>Project (Keyword Search)</Label>
                  {formProjectId ? (
                    <div className="flex items-center justify-between border rounded-md p-2 bg-muted/30">
                      <span className="text-sm font-medium">{formProjectSearch}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setFormProjectId("");
                          setFormProjectSearch("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Search project by name/code..."
                        value={formProjectSearch}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setFormProjectSearch(val);
                          try {
                            const res = await getProjects({ search: val, pageSize: 50 });
                            setFormProjectsList(res.projects);
                          } catch (err) {
                            console.error("Failed to search projects:", err);
                          }
                        }}
                      />
                      {formProjectSearch.trim() && formProjectsList.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 w-full max-h-[160px] overflow-y-auto bg-popover text-popover-foreground border border-input rounded-md shadow-md z-50 p-1 text-xs">
                          {formProjectsList.map((p) => (
                            <div
                              key={p.id}
                              className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm"
                              onClick={() => {
                                setFormProjectId(p.id);
                                setFormProjectSearch(p.name);
                                setFormProjectsList([]);
                              }}
                            >
                              {p.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                  <Label
                    className="cursor-pointer"
                    onClick={() => setFormAutoRenew(!formAutoRenew)}
                  >
                    Auto-renew Contract
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Contract PDF Document</Label>
                  {formPdfName ? (
                    <div className="flex items-center justify-between border rounded-md p-2 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-600 animate-pulse" />
                        <span className="text-xs font-medium truncate max-w-[200px]">
                          {formPdfName}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setFormPdfName("");
                          setFormPdfSize(0);
                          setFormPdfContent("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        className="cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.type !== "application/pdf") {
                              toast.error("Please upload a PDF file only");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setFormPdfName(file.name);
                              setFormPdfSize(file.size);
                              setFormPdfContent(event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  )}
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
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <span className="font-semibold">{expiringSoonCount} contract{expiringSoonCount !== 1 ? "s" : ""}</span>{" "}
              expiring within the next 30 days. Trigger HR notification or generate renewal forms.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("EXPIRING")}
            className="text-xs border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200"
          >
            View Expiring Contracts
          </Button>
        </div>
      )}

      {/* CONTRACT TABLE CARD */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contracts by title, #, contact..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="EXPIRING">⚠️ Expiring Soon (&lt; 30d)</SelectItem>
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
                <TableHead>Title & Workflow</TableHead>
                <TableHead>Contract #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="w-[200px] text-right">Workflow Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No contracts found. Create your first contract to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((contract) => {
                  const expiring = isExpiringSoon(contract);
                  const isRenewalRequested = contract.status === "RENEWAL_REQUESTED";
                  const isApproved = contract.status === "RENEWAL_APPROVED";
                  return (
                    <TableRow
                      key={contract.id}
                      className={
                        isRenewalRequested
                          ? "bg-purple-50/40 dark:bg-purple-950/20"
                          : isApproved
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                          : expiring
                          ? "bg-amber-50/50 dark:bg-amber-950/10"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span>{contract.title}</span>
                            {expiring && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] py-0">
                                Expiring
                              </Badge>
                            )}
                          </div>
                          {contract.renewalDate && (
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-normal">
                              Proposed Renewal: {formatDate(contract.renewalDate)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{contract.contractNo}</TableCell>
                      <TableCell>{contactName(contract.contact)}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[150px] truncate">
                        {contract.project?.name || "-"}
                      </TableCell>
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
                          {contract.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(contract.value)}</TableCell>
                      <TableCell>{formatDate(contract.startDate)}</TableCell>
                      <TableCell>{formatDate(contract.endDate)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* WORKFLOW ACTION BUTTONS */}
                          {expiring && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                                onClick={() => handleNotifyHR(contract)}
                                title="Notify HR (Before 30 Days Expiry)"
                                disabled={isPending}
                              >
                                <Bell className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400"
                                onClick={() => handleNotifyEmployee(contract)}
                                title="Notify Employee/Contact"
                                disabled={isPending}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400"
                                onClick={() => openRenewalForm(contract)}
                                title="Generate Renewal Form to HR"
                                disabled={isPending}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {isRenewalRequested && (
                            <div className="flex items-center gap-1 bg-purple-100/80 dark:bg-purple-950/60 p-1 rounded-md">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                onClick={() => handleApproveRenewal(contract.id, true)}
                                title="Approve Contract Renewal"
                                disabled={isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                                onClick={() => handleApproveRenewal(contract.id, false)}
                                title="Reject Renewal"
                                disabled={isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          {(isApproved || contract.status === "ACTIVE" || contract.status === "SIGNED") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400"
                              onClick={() => {
                                setSignatureModalContract(contract);
                                setSignatureDataUrl("");
                              }}
                              title="Digital Signature"
                              disabled={isPending}
                            >
                              <PenTool className="h-4 w-4" />
                            </Button>
                          )}

                          {/* STANDARD ACTIONS */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setViewingContract(contract)}
                            title="View Details & Workflow Stepper"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-700 hover:bg-slate-100 dark:text-slate-300"
                            onClick={() => {
                              setEditingContract(contract);
                              setEditTitle(contract.title);
                              setEditType(contract.type);
                              setEditContactId(contract.contactId || "");
                              setEditValue(contract.value ? String(contract.value) : "");
                              setEditStartDate(
                                contract.startDate
                                  ? new Date(contract.startDate).toISOString().split("T")[0]
                                  : ""
                              );
                              setEditEndDate(
                                contract.endDate
                                  ? new Date(contract.endDate).toISOString().split("T")[0]
                                  : ""
                              );
                              setEditProjectId(contract.projectId || "");
                              setEditProjectSearch(contract.project?.name || "");
                              setEditPdfName(contract.pdfName || "");
                              setEditPdfSize(contract.pdfSize || 0);
                              setEditPdfContent(contract.pdfContent || "");
                              setEditAutoRenew(contract.autoRenew);
                              setEditTerms(contract.terms || "");
                              setEditStatus(contract.status);
                              setEditOpen(true);
                            }}
                            title="Edit Contract"
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {deleteConfirmId === contract.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                                onClick={() => handleDelete(contract.id)}
                                title="Confirm Delete"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-slate-100"
                                onClick={() => setDeleteConfirmId(null)}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteConfirmId(contract.id)}
                              title="Delete"
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* RENEWAL FORM MODAL (STEP 4) */}
      <Dialog open={!!renewalModalContract} onOpenChange={(open) => { if (!open) setRenewalModalContract(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <RefreshCw className="h-5 w-5" /> Generate Renewal Form to HR
            </DialogTitle>
          </DialogHeader>

          {renewalModalContract && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 text-xs space-y-1">
                <p className="font-semibold text-purple-900 dark:text-purple-200">
                  Contract: {renewalModalContract.title} ({renewalModalContract.contractNo})
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  Current Expiry Date: {formatDate(renewalModalContract.endDate)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-date">Proposed Renewal End Date *</Label>
                <Input
                  id="renewal-date"
                  type="date"
                  value={renewalEndDate}
                  onChange={(e) => setRenewalEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-val">Proposed Revised Value (INR)</Label>
                <Input
                  id="renewal-val"
                  type="number"
                  placeholder="e.g. 75000"
                  value={renewalValue}
                  onChange={(e) => setRenewalValue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-terms">Revised Terms & Scope</Label>
                <Textarea
                  id="renewal-terms"
                  rows={3}
                  placeholder="Enter updated terms if applicable..."
                  value={renewalTerms}
                  onChange={(e) => setRenewalTerms(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-notes">Notes for HR Approval</Label>
                <Input
                  id="renewal-notes"
                  placeholder="e.g., Performance was exceptional, requesting 1 year extension."
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setRenewalModalContract(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateRenewal}
                  disabled={isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Renewal to HR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIGITAL SIGNATURE MODAL (STEP 6) */}
      <Dialog open={!!signatureModalContract} onOpenChange={(open) => { if (!open) setSignatureModalContract(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <PenTool className="h-5 w-5" /> Digital Signature Execution
            </DialogTitle>
          </DialogHeader>

          {signatureModalContract && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                  Executing Contract: {signatureModalContract.title} ({signatureModalContract.contractNo})
                </p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  Value: {formatCurrency(signatureModalContract.value)} | Valid to: {formatDate(signatureModalContract.endDate)}
                </p>
              </div>

              {userSignatures.length > 0 && (
                <div className="space-y-2">
                  <Label>Or Pick Saved Signature</Label>
                  <Select
                    value={selectedSavedSigId}
                    onValueChange={(val) => {
                      const sigId = val ?? "";
                      setSelectedSavedSigId(sigId);
                      const found = userSignatures.find((s) => s.id === sigId);
                      if (found) setSignatureDataUrl(found.dataUrl);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select saved digital signature" />
                    </SelectTrigger>
                    <SelectContent>
                      {userSignatures.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.isDefault ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Draw E-Signature</Label>
                <SignaturePad
                  onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
                  defaultDataUrl={signatureDataUrl}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setSignatureModalContract(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyDigitalSignature}
                  disabled={isPending || !signatureDataUrl}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply Signature & Activate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS & WORKFLOW STEPPER DIALOG */}
      <Dialog open={!!viewingContract} onOpenChange={(open) => { if (!open) setViewingContract(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Details & Expiry Workflow Status</DialogTitle>
          </DialogHeader>

          {viewingContract && (
            <div className="space-y-5 pt-2">
              <RenewalWorkflowStepper contract={viewingContract} />

              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Contract Title</span>
                  <span className="font-semibold text-base">{viewingContract.title}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Contract #</span>
                  <span className="font-mono text-base font-semibold">{viewingContract.contractNo}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Type</span>
                  <Badge variant="outline" className={typeBadgeClass(viewingContract.type)}>
                    {viewingContract.type}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Status</span>
                  <Badge
                    variant={statusBadgeVariant(viewingContract.status)}
                    className={statusBadgeClass(viewingContract.status)}
                  >
                    {viewingContract.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Value</span>
                  <span className="font-semibold text-base">{formatCurrency(viewingContract.value)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Start Date</span>
                  <span className="font-medium">{formatDate(viewingContract.startDate)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">End Date</span>
                  <span className="font-medium">{formatDate(viewingContract.endDate)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Renewal Date</span>
                  <span className="font-medium">{formatDate(viewingContract.renewalDate)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Contact Person</span>
                  <span className="font-medium">{contactName(viewingContract.contact)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Assigned Project</span>
                  <span className="font-semibold">{viewingContract.project?.name || "-"}</span>
                </div>
              </div>

              {viewingContract.signedAt && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold text-emerald-950 dark:text-emerald-200">
                        Digitally Signed Contract
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-300">
                        Signed on {formatDate(viewingContract.signedAt)} by {viewingContract.signedBy?.name || "Authorized Signer"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white">Verified</Badge>
                </div>
              )}

              {viewingContract.terms && (
                <div className="text-sm border-b pb-4">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Terms & Conditions</span>
                  <div className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-md border p-3 bg-muted/20 text-xs">
                    {viewingContract.terms}
                  </div>
                </div>
              )}

              {viewingContract.notes && (
                <div className="text-sm">
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Audit Notes & History</span>
                  <div className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-md border p-3 bg-muted/20 text-xs text-muted-foreground">
                    {viewingContract.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT CONTRACT DIALOG */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingContract(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
          </DialogHeader>
          {editingContract && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Contract Title *</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Employment Agreement"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contract Type *</Label>
                  <Select value={editType} onValueChange={(val) => setEditType(val || "SERVICE")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
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
                  <Label>Contract Status *</Label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val || "DRAFT")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_STATUSES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Project (Keyword Search)</Label>
                {editProjectId ? (
                  <div className="flex items-center justify-between border rounded-md p-2 bg-muted/30">
                    <span className="text-sm font-medium">{editProjectSearch}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditProjectId("");
                        setEditProjectSearch("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search project by name/code..."
                      value={editProjectSearch}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setEditProjectSearch(val);
                        try {
                          const res = await getProjects({ search: val, pageSize: 50 });
                          setEditProjectsList(res.projects);
                        } catch (err) {
                          console.error("Failed to search projects:", err);
                        }
                      }}
                    />
                    {editProjectSearch.trim() && editProjectsList.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 w-full max-h-[160px] overflow-y-auto bg-popover text-popover-foreground border border-input rounded-md shadow-md z-50 p-1 text-xs">
                        {editProjectsList.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm"
                            onClick={() => {
                              setEditProjectId(p.id);
                              setEditProjectSearch(p.name);
                              setEditProjectsList([]);
                            }}
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person (optional)</Label>
                  <Select value={editContactId} onValueChange={(val) => setEditContactId(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.data.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-value">Value (optional)</Label>
                  <Input
                    id="edit-value"
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g., 50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start-date">Start Date (optional)</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end-date">End Date (optional)</Label>
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-auto-renew"
                  checked={editAutoRenew}
                  onChange={(e) => setEditAutoRenew(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-auto-renew" className="cursor-pointer">
                  Auto Renew Contract
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Contract PDF Document</Label>
                {editPdfName ? (
                  <div className="flex items-center justify-between border rounded-md p-2 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600 animate-pulse" />
                      <span className="text-xs font-medium truncate max-w-[200px]">{editPdfName}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setEditPdfName("");
                        setEditPdfSize(0);
                        setEditPdfContent("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      className="cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== "application/pdf") {
                            toast.error("Please upload a PDF file only");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setEditPdfName(file.name);
                            setEditPdfSize(file.size);
                            setEditPdfContent(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-terms">Terms & Conditions (optional)</Label>
                <Textarea
                  id="edit-terms"
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  placeholder="Terms and conditions..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => {
                  setEditOpen(false);
                  setEditingContract(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
