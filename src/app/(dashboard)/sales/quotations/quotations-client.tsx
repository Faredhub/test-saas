"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Loader2, Trash2, MoreHorizontal, Send, CheckCircle,
  XCircle, Clock, FileText, FileDown, ImagePlus, X,
} from "lucide-react";
import { createQuotation, updateQuotationStatus, deleteQuotation, convertQuotationToInvoice } from "@/lib/actions/sales";
import { toast } from "sonner";
import { format } from "date-fns";

const LETTERHEAD_KEY = "quotation_letterhead";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
};

type LineItem = { description: string; quantity: number; unitPrice: number; taxRate: number };

type Props = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/sales").getQuotations>>;
};

// Status transitions allowed
const STATUS_ACTIONS: Record<string, { label: string; status: string; icon: React.ReactNode }[]> = {
  DRAFT: [
    { label: "Mark as Sent", status: "SENT", icon: <Send className="mr-2 h-4 w-4" /> },
  ],
  SENT: [
    { label: "Mark as Accepted", status: "ACCEPTED", icon: <CheckCircle className="mr-2 h-4 w-4" /> },
    { label: "Mark as Rejected", status: "REJECTED", icon: <XCircle className="mr-2 h-4 w-4" /> },
    { label: "Mark as Expired", status: "EXPIRED", icon: <Clock className="mr-2 h-4 w-4" /> },
  ],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

export function QuotationsClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; no: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);
  const [letterheadName, setLetterheadName] = useState<string | null>(null);

  const letterheadInputRef = useRef<HTMLInputElement>(null);

  // Load saved letterhead from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LETTERHEAD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLetterheadUrl(parsed.url ?? null);
        setLetterheadName(parsed.name ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleLetterheadUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      localStorage.setItem(LETTERHEAD_KEY, JSON.stringify({ url, name: file.name }));
      setLetterheadUrl(url);
      setLetterheadName(file.name);
      toast.success("Letterhead uploaded and saved!");
    };
    reader.readAsDataURL(file);
    if (letterheadInputRef.current) letterheadInputRef.current.value = "";
  }

  function handleRemoveLetterhead() {
    localStorage.removeItem(LETTERHEAD_KEY);
    setLetterheadUrl(null);
    setLetterheadName(null);
    toast.success("Letterhead removed");
  }

  // ── PDF Generation ──────────────────────────────────────────────────────────
  function handleDownloadPDF(q: Props["initialData"]["data"][number]) {
    const lhUrl = letterheadUrl;

    const contactName = q.contact
      ? `${q.contact.firstName} ${q.contact.lastName ?? ""}`.trim()
      : "—";

    const validUntilStr = (q as any).validUntil
      ? format(new Date((q as any).validUntil), "dd MMM yyyy")
      : "—";

    const subtotal = Number(q.total) - Number((q as any).taxAmount ?? 0);
    const taxAmt = Number((q as any).taxAmount ?? 0);
    const grandTotal = Number(q.total);

    // Build line items rows — we only have counts at list level, show a note
    const itemCountNote = q._count.items > 0
      ? `<p style="margin:8px 0;font-size:13px;color:#555;">(${q._count.items} line item${q._count.items > 1 ? "s" : ""} — open detail view for full breakdown)</p>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Quotation ${q.quotationNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 0; }
    .page { width: 794px; margin: 0 auto; padding: 0; }

    /* Letterhead */
    .letterhead { width: 100%; }
    .letterhead img { width: 100%; max-height: 160px; object-fit: cover; display: block; }
    .letterhead-text {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      color: #fff; padding: 28px 40px; display: flex; align-items: center; justify-content: space-between;
    }
    .letterhead-text h1 { font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
    .letterhead-text span { font-size: 12px; opacity: 0.75; }

    /* Body content */
    .body { padding: 32px 40px 40px; }

    /* Header row */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .doc-title { font-size: 28px; font-weight: 700; color: #0f3460; letter-spacing: -0.5px; }
    .doc-meta { text-align: right; font-size: 13px; color: #555; line-height: 1.7; }
    .doc-meta strong { color: #1a1a2e; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .info-box { background: #f7f9fc; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #0f3460; }
    .info-box label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; display: block; margin-bottom: 4px; }
    .info-box p { font-size: 14px; color: #1a1a2e; font-weight: 500; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    thead tr { background: #0f3460; color: #fff; }
    thead th { padding: 11px 14px; text-align: left; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #f7f9fc; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #eef0f4; color: #333; }
    tbody td:last-child { text-align: right; font-weight: 500; }

    /* Totals */
    .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-box { min-width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 9px 16px; font-size: 13px; }
    .totals-row:nth-child(even) { background: #f7f9fc; }
    .totals-row.grand { background: #0f3460; color: #fff; font-weight: 700; font-size: 15px; }

    /* Notes / Terms */
    .section { margin-bottom: 20px; }
    .section h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0f3460; margin-bottom: 6px; }
    .section p { font-size: 13px; color: #444; line-height: 1.6; white-space: pre-wrap; }

    /* Footer */
    .footer { border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #aaa; }

    /* Badge */
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .badge-sent { background: #dbeafe; color: #1d4ed8; }
    .badge-accepted { background: #dcfce7; color: #15803d; }
    .badge-rejected { background: #fee2e2; color: #b91c1c; }
    .badge-expired { background: #fef3c7; color: #b45309; }

    @media print {
      @page { size: A4; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Letterhead -->
  <div class="letterhead">
    ${lhUrl
      ? `<img src="${lhUrl}" alt="Company Letterhead" />`
      : `<div class="letterhead-text">
           <div>
             <h1>Your Company Name</h1>
             <span>Professional Quotation</span>
           </div>
           <div style="text-align:right;font-size:12px;opacity:0.8;">
             <div>Upload a letterhead to customise this header</div>
           </div>
         </div>`
    }
  </div>

  <div class="body">
    <!-- Document Header -->
    <div class="doc-header">
      <div>
        <div class="doc-title">QUOTATION</div>
        <div style="margin-top:6px;">
          <span class="badge badge-${q.status.toLowerCase()}">${q.status}</span>
        </div>
      </div>
      <div class="doc-meta">
        <div><strong>Quotation No:</strong> ${q.quotationNo}</div>
        <div><strong>Date:</strong> ${format(new Date(q.createdAt), "dd MMM yyyy")}</div>
        <div><strong>Valid Until:</strong> ${validUntilStr}</div>
        ${q.createdBy?.name ? `<div><strong>Created By:</strong> ${q.createdBy.name}</div>` : ""}
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-box">
        <label>Billed To</label>
        <p>${contactName}</p>
        ${q.contact?.company ? `<p style="color:#666;font-size:12px;margin-top:2px;">${q.contact.company}</p>` : ""}
      </div>
      <div class="info-box">
        <label>Summary</label>
        <p>${q._count.items} line item${q._count.items !== 1 ? "s" : ""}</p>
      </div>
    </div>

    <!-- Line Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width:50%;">Description</th>
          <th style="width:10%;text-align:center;">Qty</th>
          <th style="width:15%;text-align:right;">Unit Price</th>
          <th style="width:10%;text-align:right;">Tax %</th>
          <th style="width:15%;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="5" style="text-align:center;color:#888;padding:20px 14px;font-style:italic;">
            ${q._count.items} line item${q._count.items !== 1 ? "s" : ""} included in this quotation.
            Open the quotation detail for the full line-by-line breakdown.
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row">
          <span>Tax</span>
          <span>₹${taxAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row grand">
          <span>Grand Total</span>
          <span>₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    ${(q as any).notes ? `
    <div class="section">
      <h3>Notes</h3>
      <p>${(q as any).notes}</p>
    </div>` : ""}

    ${(q as any).terms ? `
    <div class="section">
      <h3>Terms &amp; Conditions</h3>
      <p>${(q as any).terms}</p>
    </div>` : ""}

    <div class="footer">
      This is a computer-generated quotation and does not require a physical signature.
    </div>
  </div>

</div>
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 500);
  };
</script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Please allow pop-ups to download the PDF.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // ── Line Item Helpers ────────────────────────────────────────────────────────
  function addItem() {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice * i.taxRate) / 100, 0);

  // ── Server Actions ───────────────────────────────────────────────────────────
  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const validItems = items.filter((i) => i.description && i.unitPrice > 0);
        if (validItems.length === 0) {
          toast.error("Add at least one line item");
          return;
        }
        await createQuotation({
          items: validItems,
          validUntil: formData.get("validUntil") as string || undefined,
          notes: formData.get("notes") as string,
          terms: formData.get("terms") as string,
        });
        toast.success("Quotation created");
        setIsOpen(false);
        setItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
      } catch {
        toast.error("Failed to create quotation");
      }
    });
  }

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateQuotationStatus(id, status as Parameters<typeof updateQuotationStatus>[1]);
        toast.success(`Quotation marked as ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteQuotation(id);
        toast.success("Quotation deleted");
        setDeleteTarget(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete quotation");
      }
    });
  }

  function handleConvertToInvoice(id: string) {
    startTransition(async () => {
      try {
        const invoice = await convertQuotationToInvoice(id);
        toast.success(`Converted to invoice ${invoice.invoiceNo}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to convert quotation");
      }
    });
  }

  function formatCurrency(value: unknown) {
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }

  const filtered = initialData.data.filter((q) => {
    if (!search) return true;
    return q.quotationNo.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">Create and manage quotations</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden letterhead file input */}
          <input
            type="file"
            ref={letterheadInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleLetterheadUpload}
          />

          {/* Letterhead status chip */}
          {letterheadUrl ? (
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <ImagePlus className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{letterheadName ?? "Letterhead"}</span>
              <button
                onClick={handleRemoveLetterhead}
                className="ml-1 rounded-full p-0.5 hover:bg-emerald-200 transition-colors"
                title="Remove letterhead"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => letterheadInputRef.current?.click()}
              className="gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Upload Letterhead
            </Button>
          )}

          {/* Change letterhead button (shown when one exists) */}
          {letterheadUrl && (
            <Button
              variant="outline"
              onClick={() => letterheadInputRef.current?.click()}
              className="gap-2 text-xs"
              size="sm"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Change
            </Button>
          )}

          {/* New Quotation Dialog */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              New Quotation
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Quotation</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-5">

                {/* Line Items */}
                <div>
                  <Label className="mb-3 block text-sm font-semibold">Line Items</Label>

                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_72px_100px_72px_32px] gap-2 mb-1 px-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Qty</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Unit Price</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Tax %</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_72px_100px_72px_32px] gap-2 items-center">
                        <Input
                          placeholder="e.g. Web design services"
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                        />
                        <Input
                          type="number" min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                          className="text-center"
                        />
                        <Input
                          type="number" min="0" step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                          className="text-right"
                        />
                        <Input
                          type="number" min="0" max="100"
                          value={item.taxRate}
                          onChange={(e) => updateItem(i, "taxRate", Number(e.target.value))}
                          className="text-right"
                        />
                        <Button
                          type="button" variant="ghost" size="icon"
                          onClick={() => removeItem(i)}
                          disabled={items.length === 1}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </Button>
                    <div className="text-right text-sm space-y-0.5">
                      <div className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span></div>
                      <div className="text-muted-foreground">Tax: <span className="font-medium text-foreground">{formatCurrency(tax)}</span></div>
                      <div className="font-semibold">Total: {formatCurrency(subtotal + tax)}</div>
                    </div>
                  </div>
                </div>

                {/* Valid Until */}
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input id="validUntil" name="validUntil" type="date" />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} placeholder="Internal notes or message to client…" />
                </div>

                {/* Terms */}
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms &amp; Conditions</Label>
                  <Textarea id="terms" name="terms" rows={2} placeholder="Payment terms, warranty, validity…" />
                </div>

                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Quotation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Quotation</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete quotation{" "}
            <span className="font-mono font-medium">{deleteTarget?.no}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quotations Table ── */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by quotation no…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No quotations found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((q) => {
                  const actions = STATUS_ACTIONS[q.status] ?? [];
                  const canDelete = q.status === "DRAFT";
                  const canConvert = q.status === "DRAFT" || q.status === "SENT";
                  const hasActions = actions.length > 0 || canDelete || canConvert;

                  return (
                    <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium font-mono">{q.quotationNo}</TableCell>
                      <TableCell>
                        {q.contact
                          ? `${q.contact.firstName} ${q.contact.lastName ?? ""}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell>{q._count.items}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(q.total)}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[q.status] ?? ""} border-0`}>{q.status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(q.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>{q.createdBy?.name ?? "—"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
                            disabled={isPending}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Always available: Download PDF */}
                            <DropdownMenuItem onClick={() => handleDownloadPDF(q)}>
                              <FileDown className="mr-2 h-4 w-4 text-blue-600" />
                              Download PDF
                            </DropdownMenuItem>

                            {(hasActions) && <DropdownMenuSeparator />}

                            {canConvert && (
                              <DropdownMenuItem onClick={() => handleConvertToInvoice(q.id)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Convert to Invoice
                              </DropdownMenuItem>
                            )}
                            {canConvert && actions.length > 0 && <DropdownMenuSeparator />}
                            {actions.map((action) => (
                              <DropdownMenuItem
                                key={action.status}
                                onClick={() => handleStatusChange(q.id, action.status)}
                              >
                                {action.icon}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            {canDelete && (actions.length > 0 || canConvert) && <DropdownMenuSeparator />}
                            {canDelete && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget({ id: q.id, no: q.quotationNo })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
