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
  XCircle, Clock, FileText, FileDown, ImagePlus, X, FileSignature, Printer, Mail, Upload, Eye, Pencil, ArrowLeft
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { createQuotation, updateQuotationStatus, deleteQuotation, convertQuotationToInvoice, updateQuotationNotes, updateQuotation } from "@/lib/actions/sales";
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
  initialSignatures: Awaited<ReturnType<typeof import("@/lib/actions/organization").getSignatures>>;
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

type FormField = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  width?: number; // col-span 1 to 4
  options?: string[];
  formula?: string;
  isEmployeeEditable?: boolean;
};

export function QuotationsClient({ initialData, initialSignatures }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; no: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  const [companyFormatUrl, setCompanyFormatUrl] = useState<string | null>(null);
  const [companyFormatName, setCompanyFormatName] = useState<string | null>(null);
  const [selectedSignatures, setSelectedSignatures] = useState<Record<string, string>>({});
  const [signingQuotation, setSigningQuotation] = useState<Props["initialData"]["data"][number] | null>(null);
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [pdfDocDialogOpen, setPdfDocDialogOpen] = useState(false);
  const [pdfDocQuotation, setPdfDocQuotation] = useState<Props["initialData"]["data"][number] | null>(null);
  const [viewQuotation, setViewQuotation] = useState<Props["initialData"]["data"][number] | null>(null);
  const [editQuotation, setEditQuotation] = useState<Props["initialData"]["data"][number] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);

  // Form Builder states
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<"admin" | "employee">("admin");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTemplate, setActiveTemplate] = useState("Sales Quotation");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  // Offline & capturing simulation details
  const [offlineMode, setOfflineMode] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [customImageGeotagged, setCustomImageGeotagged] = useState<string | null>(null);
  
  // Default checklist components
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", type: "customer", label: "Select Customer / Lead", width: 2, required: true },
    { id: "2", type: "date", label: "Quotation Date", width: 2, required: true },
    { id: "3", type: "product_table", label: "Quotation Items Table", width: 4, required: true },
    { id: "4", type: "textarea", label: "Terms & Conditions", placeholder: "Enter terms here...", width: 4 },
  ]);

  const [fillerResponses, setFillerResponses] = useState<Record<string, string>>({});



  const letterheadInputRef = useRef<HTMLInputElement>(null);

  // Load saved company format from localStorage on mount
  useEffect(() => {
    try {
      let saved = localStorage.getItem("quotation_company_format");
      if (!saved) {
        saved = localStorage.getItem(LETTERHEAD_KEY);
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompanyFormatUrl(parsed.url ?? null);
        setCompanyFormatName(parsed.name ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleCompanyFormatUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    if (!isImage && !isPdf) {
      toast.error("Please upload an image (PNG, JPG) or PDF file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      localStorage.setItem("quotation_company_format", JSON.stringify({ url, name: file.name }));
      setCompanyFormatUrl(url);
      setCompanyFormatName(file.name);
      toast.success("Company format uploaded and saved!");
    };
    reader.readAsDataURL(file);
    if (letterheadInputRef.current) letterheadInputRef.current.value = "";
  }

  function handleRemoveCompanyFormat() {
    localStorage.removeItem("quotation_company_format");
    localStorage.removeItem(LETTERHEAD_KEY);
    setCompanyFormatUrl(null);
    setCompanyFormatName(null);
    toast.success("Company format removed");
  }

  // Form Builder Helper Functions
  function addFormField(type: string, label: string) {
    const id = Date.now().toString();
    const newField: FormField = {
      id,
      type,
      label,
      placeholder: `Enter ${label.toLowerCase()}...`,
      width: 4,
      required: false,
      isEmployeeEditable: true,
    };
    
    if (type === "dropdown" || type === "radio" || type === "checkbox") {
      newField.options = ["Option 1", "Option 2", "Option 3"];
    }
    
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);
    toast.success(`Component '${label}' added to template`);
  }

  function duplicateFormField(id: string) {
    const target = fields.find((f) => f.id === id);
    if (!target) return;
    const duplicated = {
      ...target,
      id: Date.now().toString(),
      label: `${target.label} (Copy)`,
    };
    setFields((prev) => [...prev, duplicated]);
    toast.success("Field duplicated successfully");
  }

  function deleteFormField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    toast.success("Field deleted from template");
  }

  function updateFieldProperty(id: string, prop: keyof FormField, value: any) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [prop]: value } : f))
    );
  }

  function handlePublishTemplate() {
    localStorage.setItem(`quotation_template_${activeTemplate}`, JSON.stringify(fields));
    toast.success(`Template '${activeTemplate}' published successfully!`);
  }

  function loadTemplate(templateName: string) {
    setActiveTemplate(templateName);
    const saved = localStorage.getItem(`quotation_template_${templateName}`);
    if (saved) {
      setFields(JSON.parse(saved));
    } else {
      // Set some default templates
      if (templateName === "Sales Quotation") {
        setFields([
          { id: "1", type: "customer", label: "Select Customer / Lead", width: 2, required: true },
          { id: "2", type: "date", label: "Quotation Date", width: 2, required: true },
          { id: "3", type: "product_table", label: "Quotation Items Table", width: 4, required: true },
          { id: "4", type: "textarea", label: "Terms & Conditions", placeholder: "Enter terms here...", width: 4 },
        ]);
      } else if (templateName === "Construction Quotation") {
        setFields([
          { id: "c1", type: "customer", label: "Contractor / Customer", width: 2, required: true },
          { id: "c2", type: "text", label: "Site Address Location", width: 2, required: true },
          { id: "c3", type: "product_table", label: "Materials Estimations Table", width: 4 },
          { id: "c4", type: "image", label: "Site Inspection Capture Photo", width: 2 },
          { id: "c5", type: "gps", label: "Site GPS Coordinates Geotagging", width: 2 },
        ]);
      } else {
        setFields([
          { id: "t1", type: "text", label: "Project Title", width: 3, required: true },
          { id: "t2", type: "date", label: "Estimate Date", width: 1, required: true },
          { id: "t3", type: "product_table", label: "Estimate Line Items", width: 4 },
        ]);
      }
    }
    toast.success(`Loaded template '${templateName}'`);
  }

  function handleSaveResponses() {
    toast.success("Quotation responses draft saved locally!");
  }

  // Submit quotation driven by dynamic form
  async function handleSubmitQuotation() {
    startTransition(async () => {
      try {
        const responseJson = JSON.stringify({
          templateName: activeTemplate,
          gps: gpsCoordinates,
          image: customImageGeotagged,
          responses: fillerResponses,
        });

        // Store dynamic form payload inside notes property
        await createQuotation({
          notes: `[DYNAMIC_FORM_RESPONSE]:${responseJson}`,
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          })),
        });
        
        toast.success("Quotation submitted successfully!");
        setIsBuilderOpen(false);
        setFillerResponses({});
        setGpsCoordinates(null);
        setCustomImageGeotagged(null);
      } catch {
        toast.error("Failed to submit Quotation");
      }
    });
  }

  function triggerMobileCapture() {
    // Mock geotagged photo capture details
    setCustomImageGeotagged("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop&q=60");
    setGpsCoordinates({
      lat: 12.9716,
      lng: 77.5946,
      address: "TixelTech HQ, Mahatma Gandhi Road, Bengaluru, Karnataka 560001, India",
    });
    toast.success("Geotagged photo captured with GPS coordinates metadata!");
  }

  // ── PDF Generation ──────────────────────────────────────────────────────────
  function handleDownloadPDF(q: Props["initialData"]["data"][number]) {
    const lhUrl = companyFormatUrl;
    const appliedSigUrl = selectedSignatures[q.id];

    if (q.notes?.startsWith("[UPLOADED_FILE]:")) {
      const parts = q.notes.split("||");
      const fileUrl = parts[0].substring("[UPLOADED_FILE]:".length);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow pop-ups to view the quotation.");
        return;
      }
      let content = "";
      if (fileUrl.startsWith("data:application/pdf")) {
        content = `<object data="${fileUrl}" type="application/pdf" style="width:100%; height:80vh; border:none;"></object>`;
      } else {
        content = `<img src="${fileUrl}" style="max-width:100%; max-height:80vh; display:block; margin:auto;" />`;
      }
      printWindow.document.write(`
        <html>
        <head><title>Quotation ${q.quotationNo}</title></head>
        <body style="margin:0; padding:20px; font-family: sans-serif; display:flex; flex-direction:column; align-items:center; background:#f0f0f0;">
          <div style="background:#fff; padding:20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; width:100%; max-width:800px;">
            <h2 style="margin-top:0; color:#0f3460; border-bottom:1px solid #eee; padding-bottom:10px;">Quotation ${q.quotationNo}</h2>
            ${content}
            ${appliedSigUrl ? `
              <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 24px; border-top: 1px solid #eef0f4; padding-top: 12px; text-align: right;">
                <div>
                  <p style="font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.5px;">Digitally Signed By</p>
                  ${appliedSigUrl.startsWith("data:application/pdf")
            ? `<object data="${appliedSigUrl}" type="application/pdf" style="height: 50px; width: 140px; border: none;"></object>`
            : `<img src="${appliedSigUrl}" style="max-height: 50px; max-width: 140px; object-fit: contain;" />`
          }
                  <p style="font-size: 12px; font-weight: 600; color: #1a1a2e; margin-top: 4px;">${q.createdBy?.name || "Authorized Signatory"}</p>
                </div>
              </div>`
          : ""}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }

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
        ? (lhUrl.startsWith("data:application/pdf")
          ? `<object data="${lhUrl}" type="application/pdf" style="width:100%; height:160px; border:none; overflow:hidden;"></object>`
          : `<img src="${lhUrl}" alt="Company Format" />`
        )
        : `<div class="letterhead-text">
           <div>
             <h1>Your Company Name</h1>
             <span>Professional Quotation</span>
           </div>
           <div style="text-align:right;font-size:12px;opacity:0.8;">
             <div>Upload a company format to customise this header</div>
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
      ${appliedSigUrl
        ? `<div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 24px; border-top: 1px solid #eef0f4; padding-top: 12px; text-align: right;">
             <div>
               <p style="font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.5px;">Digitally Signed By</p>
               ${appliedSigUrl.startsWith("data:application/pdf")
          ? `<object data="${appliedSigUrl}" type="application/pdf" style="height: 50px; width: 140px; border: none;"></object>`
          : `<img src="${appliedSigUrl}" style="max-height: 50px; max-width: 140px; object-fit: contain;" />`
        }
               <p style="font-size: 12px; font-weight: 600; color: #1a1a2e; margin-top: 4px;">${q.createdBy?.name || "Authorized Signatory"}</p>
             </div>
           </div>`
        : `This is a computer-generated quotation and does not require a physical signature.`
      }
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

  function addEditItem() {
    setEditItems([...editItems, { description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  }

  function removeEditItem(index: number) {
    setEditItems(editItems.filter((_, i) => i !== index));
  }

  function updateEditItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...editItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditItems(updated);
  }

  const editSubtotal = editItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const editTax = editItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice * i.taxRate) / 100, 0);

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

  async function handleUpdate(formData: FormData) {
    if (!editQuotation) return;
    startTransition(async () => {
      try {
        const validItems = editItems.filter((i) => i.description && i.unitPrice > 0);
        if (validItems.length === 0) {
          toast.error("Add at least one line item");
          return;
        }
        await updateQuotation(editQuotation.id, {
          items: validItems,
          validUntil: formData.get("validUntil") as string || undefined,
          notes: formData.get("notes") as string,
          terms: formData.get("terms") as string,
        });
        toast.success("Quotation updated successfully");
        setEditOpen(false);
        setEditQuotation(null);
      } catch {
        toast.error("Failed to update quotation");
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

  function handleApplySignature(signatureDataUrl: string) {
    if (!signingQuotation) return;
    setSelectedSignatures((prev) => ({
      ...prev,
      [signingQuotation.id]: signatureDataUrl,
    }));
    toast.success(`Signature applied to quotation ${signingQuotation.quotationNo}`);
    setSigDialogOpen(false);
    setSigningQuotation(null);
  }

  function handleRemoveSignature(quotationId: string) {
    setSelectedSignatures((prev) => {
      const copy = { ...prev };
      delete copy[quotationId];
      return copy;
    });
    toast.success("Signature removed from quotation");
  }

  function handleSendMail(q: Props["initialData"]["data"][number]) {
    const contactName = q.contact
      ? `${q.contact.firstName} ${q.contact.lastName ?? ""}`.trim()
      : "Valued Customer";
    const email = (q.contact as any)?.email || "";
    const subject = `Quotation ${q.quotationNo} - TixelTech ERP`;
    const body = `Dear ${contactName},

Please find our quotation details below:

Quotation No: ${q.quotationNo}
Amount: ₹${Number(q.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
Valid Until: ${q.validUntil ? format(new Date(q.validUntil), "dd MMM yyyy") : "N/A"}

You can view the full quotation on our portal or contact us directly if you have any questions.

Best Regards,
${q.createdBy?.name || "Digital Sales Team"}`;

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  const filtered = initialData.data.filter((q) => {
    if (!search) return true;
    return q.quotationNo.toLowerCase().includes(search.toLowerCase());
  });

  if (isBuilderOpen) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100/60 overflow-hidden font-sans select-none animate-in fade-in duration-200">
        
        {/* Builder Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 hover:bg-slate-100 text-orange-600 font-semibold" onClick={() => setIsBuilderOpen(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            
            <div className="flex items-center gap-2 border-l pl-3">
              <span className="text-xs text-muted-foreground font-medium">Template:</span>
              <Select value={activeTemplate} onValueChange={(val) => loadTemplate(val || "")}>
                <SelectTrigger className="w-48 h-7 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Sales Quotation", "Construction Quotation", "Purchase Estimate", "Field Visit Form"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs font-semibold">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 border-l pl-3 text-xs">
              <span className="text-muted-foreground">Mode:</span>
              <div className="flex bg-muted p-0.5 rounded-lg border">
                <button
                  onClick={() => setBuilderMode("admin")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    builderMode === "admin" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin (Builder)
                </button>
                <button
                  onClick={() => setBuilderMode("employee")}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    builderMode === "employee" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Employee (Filler)
                </button>
              </div>
            </div>

            {/* Offline Simulation */}
            <div className="flex items-center gap-2 border-l pl-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offlineMode}
                  onChange={(e) => {
                    setOfflineMode(e.target.checked);
                    if (e.target.checked) toast.warning("Offline mode active! Responses will sync on reconnection.");
                  }}
                  className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-[10px] font-semibold text-muted-foreground">Offline Mode</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live previews */}
            <div className="flex bg-muted p-0.5 rounded-lg border">
              {(["desktop", "tablet", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPreviewDevice(d)}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                    previewDevice === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>

            {builderMode === "admin" ? (
              <Button
                size="sm"
                className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white font-normal"
                onClick={handlePublishTemplate}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Publish Template
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-normal animate-pulse"
                onClick={handleSubmitQuotation}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Submit Quotation
              </Button>
            )}
          </div>
        </div>

        {/* Builder Panels Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left panel - components list toolbox */}
          {builderMode === "admin" && (
            <div className="w-[240px] border-r bg-background shrink-0 flex flex-col justify-start select-none shadow-sm z-10">
              <div className="p-3 border-b flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Components Toolbox</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search fields..." className="pl-8 h-7 text-xs" />
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4 pb-8">
                  {/* Basic section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Basic Components</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "text", label: "Text Field" },
                        { type: "textarea", label: "Text Area" },
                        { type: "number", label: "Number Input" },
                        { type: "email", label: "Email Address" },
                        { type: "phone", label: "Phone Field" },
                        { type: "date", label: "Date Picker" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addFormField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selection section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Selection Fields</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "dropdown", label: "Dropdown Select" },
                        { type: "radio", label: "Radio Buttons" },
                        { type: "checkbox", label: "Checkbox List" },
                        { type: "toggle", label: "Toggle Switch" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addFormField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Media section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Capture Media</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "file", label: "File Upload" },
                        { type: "image", label: "Image Capture" },
                        { type: "signature", label: "Signature Pad" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addFormField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location section */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Geotagging</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "gps", label: "GPS Coordinates" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addFormField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quotation Components */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Quotation Features</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "customer", label: "Client Selector" },
                        { type: "product_table", label: "Quotation Table" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addFormField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Center Form Canvas */}
          <div className="flex-1 flex overflow-y-auto bg-slate-200/40 p-6 items-center justify-start flex-col relative select-text">
            {/* Device preview wrapper */}
            <div
              style={{
                width: previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
                maxWidth: "960px",
              }}
              className="bg-background border rounded-xl shadow-xl flex flex-col min-h-[500px] p-6 transition-all duration-300 relative"
            >
              <div className="border-b pb-3 mb-5 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{activeTemplate} Template Canvas</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">Grid Layout (4 Cols)</span>
              </div>

              {/* Grid Drop Zone */}
              <div className="grid grid-cols-4 gap-4 flex-1 items-start content-start">
                {fields.map((field) => {
                  const isSelected = selectedFieldId === field.id;
                  const colSpanClass =
                    field.width === 1 ? "col-span-1" :
                    field.width === 2 ? "col-span-2" :
                    field.width === 3 ? "col-span-3" : "col-span-4";

                  return (
                    <div
                      key={field.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFieldId(field.id);
                      }}
                      className={`${colSpanClass} p-3 border rounded-lg relative transition-all group select-none ${
                        isSelected ? "border-orange-500 bg-orange-50/5 ring-1 ring-orange-200" : "hover:border-orange-300 hover:bg-slate-50/40 bg-white"
                      }`}
                    >
                      {/* Admin drag/move & duplicate/delete controls header overlay */}
                      {builderMode === "admin" && (
                        <div className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateFormField(field.id);
                            }}
                            className="p-1 rounded bg-white hover:bg-slate-100 border text-[9px] font-bold"
                            title="Duplicate Field"
                          >
                            Copy
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFormField(field.id);
                            }}
                            className="p-1 rounded bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700 text-[9px] font-bold"
                            title="Delete Field"
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {/* Field Label */}
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-800 font-sans">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </span>
                        {field.formula && (
                          <span className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-mono font-semibold">
                            fx: {field.formula}
                          </span>
                        )}
                      </div>

                      {/* Form Field Render Previews */}
                      {builderMode === "admin" ? (
                        <div className="text-xs text-muted-foreground/60 border border-dashed rounded px-3 py-1.5 bg-slate-50 select-none font-sans font-medium">
                          {field.placeholder || `[${field.type.toUpperCase()} PREVIEW]`}
                        </div>
                      ) : (
                        // Filler mode interactives
                        <div className="w-full text-xs font-sans text-foreground">
                          {(field.type === "text" || field.type === "email" || field.type === "phone") && (
                            <Input
                              placeholder={field.placeholder}
                              className="text-xs h-8"
                              value={fillerResponses[field.id] ?? ""}
                              onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                            />
                          )}
                          {field.type === "textarea" && (
                            <Textarea
                              placeholder={field.placeholder}
                              className="text-xs h-16 resize-none"
                              value={fillerResponses[field.id] ?? ""}
                              onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                            />
                          )}
                          {field.type === "date" && (
                            <Input
                              type="date"
                              className="text-xs h-8"
                              value={fillerResponses[field.id] ?? ""}
                              onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                            />
                          )}
                          {field.type === "number" && (
                            <Input
                              type="number"
                              placeholder={field.placeholder}
                              className="text-xs h-8"
                              value={fillerResponses[field.id] ?? ""}
                              onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                            />
                          )}
                          {field.type === "dropdown" && (
                            <Select
                              value={fillerResponses[field.id] ?? ""}
                              onValueChange={(val) => setFillerResponses({ ...fillerResponses, [field.id]: val || "" })}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue placeholder={field.placeholder ?? "Select option"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options || []).map((opt) => (
                                  <SelectItem key={opt} value={opt} className="text-xs font-semibold">{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === "radio" && (
                            <div className="flex items-center gap-4 py-1">
                              {(field.options || []).map((opt) => (
                                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`radio-${field.id}`}
                                    checked={fillerResponses[field.id] === opt}
                                    onChange={() => setFillerResponses({ ...fillerResponses, [field.id]: opt })}
                                    className="text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {field.type === "checkbox" && (
                            <div className="flex flex-col gap-1.5 py-1">
                              {(field.options || []).map((opt) => (
                                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="rounded border-orange-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {field.type === "toggle" && (
                            <label className="flex items-center gap-2 cursor-pointer py-1">
                              <input type="checkbox" className="rounded-full h-4 w-7 cursor-pointer" />
                              <span className="text-[10px] text-muted-foreground font-semibold">Enable configuration</span>
                            </label>
                          )}
                          {field.type === "customer" && (
                            <Select
                              value={fillerResponses[field.id] ?? ""}
                              onValueChange={(val) => setFillerResponses({ ...fillerResponses, [field.id]: val || "" })}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue placeholder="Search corporate client..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1" className="text-xs font-semibold">Acme Corporation (Corporate)</SelectItem>
                                <SelectItem value="2" className="text-xs font-semibold">Global Enterprises (Corporate)</SelectItem>
                                <SelectItem value="3" className="text-xs font-semibold">John Doe (Individual)</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          {/* Geotagged Camera Photo Simulation filler */}
                          {field.type === "image" && (
                            <div className="flex flex-col gap-2 border rounded-lg bg-slate-50/50 p-2.5 shadow-inner">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Mobile Camera Capture Field</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                                  onClick={triggerMobileCapture}
                                >
                                  <Upload className="h-3 w-3" /> Capture Geotagged Photo
                                </Button>
                              </div>
                              
                              {customImageGeotagged && (
                                <div className="border rounded-lg bg-white overflow-hidden flex flex-col relative max-w-[280px] shadow-md transition-all duration-200 animate-in zoom-in-95">
                                  <img src={customImageGeotagged} alt="Geotagged Camera" className="h-28 w-full object-cover" />
                                  <div className="p-1.5 bg-black/80 text-white text-[7.5px] leading-relaxed absolute bottom-0 left-0 right-0 font-mono">
                                    <div>📍 Coordinates: {gpsCoordinates?.lat.toFixed(4)}° N, {gpsCoordinates?.lng.toFixed(4)}° E</div>
                                    <div className="truncate">🏠 Addr: {gpsCoordinates?.address}</div>
                                    <div>📱 Device: Samsung S24 Ultra &middot; 08 Jul 2026</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* GPS Location Field */}
                          {field.type === "gps" && (
                            <div className="flex items-center justify-between p-2 border rounded-lg bg-slate-50">
                              <span className="text-[10.5px] font-semibold text-slate-700 font-mono">
                                {gpsCoordinates ? `Lat: ${gpsCoordinates.lat.toFixed(4)}, Lng: ${gpsCoordinates.lng.toFixed(4)}` : "GPS Location: Empty"}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9.5px] text-blue-600 hover:underline"
                                onClick={() => {
                                  setGpsCoordinates({
                                    lat: 12.9716,
                                    lng: 77.5946,
                                    address: "Mahatma Gandhi Road, Bengaluru, Karnataka, India",
                                  });
                                  toast.success("GPS location tagged");
                                }}
                              >
                                Tag Location
                              </Button>
                            </div>
                          )}

                          {/* Product Items calculation table */}
                          {field.type === "product_table" && (
                            <div className="border rounded-lg bg-slate-50/50 p-2 overflow-x-auto">
                              <div className="grid grid-cols-[1.5fr_60px_80px_60px_90px] gap-2 mb-1 px-1 border-b pb-1 font-bold text-[9px] text-muted-foreground uppercase">
                                <span>Product / Service description</span>
                                <span className="text-center">Qty</span>
                                <span className="text-right">Rate</span>
                                <span className="text-right">Tax %</span>
                                <span className="text-right">Total Amount</span>
                              </div>
                              <div className="space-y-1.5">
                                {items.map((item, idx) => {
                                  const itemTotal = item.quantity * item.unitPrice * (1 + item.taxRate / 100);
                                  return (
                                    <div key={idx} className="grid grid-cols-[1.5fr_60px_80px_60px_90px] gap-2 items-center text-xs">
                                      <input
                                        type="text"
                                        placeholder="Service info"
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                                        className="p-1 border rounded text-[10.5px] bg-background w-full"
                                      />
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                                        className="p-1 border rounded text-center text-[10.5px] bg-background w-full"
                                      />
                                      <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                                        className="p-1 border rounded text-right text-[10.5px] bg-background w-full"
                                      />
                                      <input
                                        type="number"
                                        value={item.taxRate}
                                        onChange={(e) => updateItem(idx, "taxRate", Number(e.target.value))}
                                        className="p-1 border rounded text-right text-[10.5px] bg-background w-full"
                                      />
                                      <span className="text-right font-mono text-[10.5px] font-semibold text-slate-800 pr-1">
                                        {formatCurrency(itemTotal)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex justify-between items-center mt-2.5 pt-2 border-t text-[10px] text-muted-foreground">
                                <button
                                  type="button"
                                  onClick={addItem}
                                  className="text-orange-600 font-bold hover:underline"
                                >
                                  + Add Item Row
                                </button>
                                <div className="text-right font-semibold text-foreground">
                                  Grand Total: {formatCurrency(items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (1 + i.taxRate / 100), 0))}
                                </div>
                              </div>
                            </div>
                          )}

                          {field.type === "signature" && (
                            <div className="border border-dashed rounded-lg bg-slate-50 h-16 flex items-center justify-center relative cursor-text text-muted-foreground/60 select-none">
                              Click here to sign using Signature Pad simulation
                            </div>
                          )}

                          {/* Help text */}
                          {field.helpText && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium italic">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right properties format editor side control panel */}
          {builderMode === "admin" && (
            <div className="w-[240px] border-l bg-background shrink-0 flex flex-col select-none p-3.5 shadow-sm z-10 gap-4 overflow-y-auto animate-in slide-in-from-right duration-200">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase border-b pb-1.5">Properties Panel</span>
              
              {selectedFieldId ? (() => {
                const target = fields.find((f) => f.id === selectedFieldId);
                if (!target) return null;

                return (
                  <div className="flex flex-col gap-3.5 text-xs">
                    {/* General configurations */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Field Label Title</Label>
                      <Input
                        value={target.label}
                        onChange={(e) => updateFieldProperty(target.id, "label", e.target.value)}
                        className="h-8 text-xs font-semibold text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Field Placeholder Text</Label>
                      <Input
                        value={target.placeholder ?? ""}
                        onChange={(e) => updateFieldProperty(target.id, "placeholder", e.target.value)}
                        className="h-8 text-xs text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Help Description Text</Label>
                      <Input
                        value={target.helpText ?? ""}
                        onChange={(e) => updateFieldProperty(target.id, "helpText", e.target.value)}
                        className="h-8 text-xs text-foreground"
                      />
                    </div>

                    {/* Width sizing */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                        <span>Column Width Grid Span</span>
                        <span className="font-bold text-orange-600 font-mono">{target.width ?? 4} / 4 Cols</span>
                      </div>
                      <input
                        type="range" min="1" max="4" step="1"
                        value={target.width ?? 4}
                        onChange={(e) => updateFieldProperty(target.id, "width", parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600 mt-1"
                      />
                    </div>

                    {/* Validations check lists */}
                    <div className="space-y-2 border-t pt-3 mt-1.5">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block">Validations & Behavior</span>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!target.required}
                          onChange={(e) => updateFieldProperty(target.id, "required", e.target.checked)}
                          className="rounded border-orange-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10.5px] text-slate-700">Required Validation Field</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!target.disabled}
                          onChange={(e) => updateFieldProperty(target.id, "disabled", e.target.checked)}
                          className="rounded border-orange-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10.5px] text-slate-700">Disabled Component Input</span>
                      </label>
                    </div>

                    {/* Calculations formulas */}
                    <div className="space-y-1 border-t pt-3 mt-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Calculated Value Formula</Label>
                      <Input
                        placeholder="e.g. Quantity * Rate"
                        value={target.formula ?? ""}
                        onChange={(e) => updateFieldProperty(target.id, "formula", e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Options list for selection */}
                    {(target.type === "dropdown" || target.type === "radio" || target.type === "checkbox") && (
                      <div className="space-y-1.5 border-t pt-3 mt-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Selectable Options List</Label>
                        <textarea
                          rows={3}
                          value={(target.options || []).join("\n")}
                          onChange={(e) => updateFieldProperty(target.id, "options", e.target.value.split("\n"))}
                          className="w-full text-xs font-mono border rounded p-1.5 focus:outline-none"
                          placeholder="One option per line..."
                        />
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="text-center text-muted-foreground/60 text-xs py-12">
                  Select any component field card on the builder canvas to configure properties details.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Response values debugger bottom bar */}
        <div className="h-7 bg-orange-600 text-white shrink-0 flex items-center justify-between px-4 text-[10.5px] font-mono select-none">
          <span>Quotation Responses: {Object.keys(fillerResponses).length} fields entered</span>
          <span className="hover:underline cursor-pointer">Live Preview debug sync: Active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">Create and manage quotations using dynamic form templates</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Configure Templates (Admin) */}
          <Button
            onClick={() => {
              setBuilderMode("admin");
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
            size="sm"
          >
            <Pencil className="h-4 w-4" /> Configure Templates
          </Button>

          {/* Fill Quotation (Employee) */}
          <Button
            onClick={() => {
              setBuilderMode("employee");
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4" /> New Quotation
          </Button>

          <Link href="/office/spreadsheets?template=sales-quotations&source=sales-quotations">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>

          {/* New Quotation Dialog */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                <TableHead className="w-[180px] text-right">Actions</TableHead>
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
                        <div className="flex flex-col gap-1">
                          <Badge className={`${statusColors[q.status] ?? ""} border-0 w-fit`}>{q.status}</Badge>
                          {selectedSignatures[q.id] && (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-emerald-700 w-fit text-[10px] gap-1 px-1.5 py-0">
                              <FileSignature className="h-3 w-3" /> Signed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(q.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>{q.createdBy?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewQuotation(q)}
                            title="View Details"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            disabled={isPending}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Edit button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditQuotation(q);
                              setEditItems(q.items ? q.items.map((i: any) => ({
                                description: i.description,
                                quantity: Number(i.quantity),
                                unitPrice: Number(i.unitPrice),
                                taxRate: Number(i.taxRate),
                              })) : [{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
                              setEditOpen(true);
                            }}
                            title="Edit Quotation"
                            className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* PDF & Image button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPdfDocQuotation(q);
                              setPdfDocDialogOpen(true);
                            }}
                            title="Quotation PDF & Image"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            disabled={isPending}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          {/* Digital Signature button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSigningQuotation(q);
                              setSigDialogOpen(true);
                            }}
                            title="Apply Digital Signature"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            disabled={isPending}
                          >
                            <FileSignature className="h-4 w-4" />
                          </Button>

                          {/* Print/Send via Mail button menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              disabled={isPending}
                              title="Print or Email"
                              className="inline-flex items-center justify-center rounded-md h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                            >
                              <Printer className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownloadPDF(q)}>
                                <Printer className="mr-2 h-4 w-4 text-slate-600" />
                                Print Quotation
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendMail(q)}>
                                <Mail className="mr-2 h-4 w-4 text-orange-600" />
                                Send via Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Administrative Dropdown */}
                          {hasActions && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                disabled={isPending}
                                className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-muted transition-colors disabled:opacity-50"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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

      {/* ── Signature Selection Dialog ── */}
      <Dialog open={sigDialogOpen} onOpenChange={(open) => { setSigDialogOpen(open); if (!open) setSigningQuotation(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Digital Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select one of your saved signatures to apply to quotation <span className="font-mono font-medium">{signingQuotation?.quotationNo}</span>.
            </p>

            {signingQuotation && selectedSignatures[signingQuotation.id] && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  handleRemoveSignature(signingQuotation.id);
                  setSigDialogOpen(false);
                }}
              >
                Remove Applied Signature
              </Button>
            )}

            {initialSignatures.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FileSignature className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
                <h3 className="mt-2 text-sm font-medium">No signatures saved</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a signature first in Organization &gt; Signatures.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
                {initialSignatures.map((sig) => (
                  <button
                    key={sig.id}
                    onClick={() => handleApplySignature(sig.dataUrl)}
                    className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors group"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{sig.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sig.isDefault ? "Default Signature" : `Created on ${format(new Date(sig.createdAt), "dd MMM yyyy")}`}
                      </p>
                    </div>
                    <div className="h-12 w-28 bg-white border rounded p-1 flex items-center justify-center overflow-hidden relative">
                      {sig.dataUrl.startsWith("data:application/pdf") ? (
                        <div className="flex flex-col items-center justify-center gap-0.5 text-[9px] text-muted-foreground font-medium">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span>PDF Signature</span>
                        </div>
                      ) : (
                        <img
                          src={sig.dataUrl}
                          alt={sig.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PDF & Image Upload/View Dialog ── */}
      <Dialog open={pdfDocDialogOpen} onOpenChange={(open) => { setPdfDocDialogOpen(open); if (!open) setPdfDocQuotation(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Document (PDF & Image)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pdfDocQuotation && (
              <>
                <p className="text-sm text-muted-foreground">
                  Manage the PDF/Image document for quotation <span className="font-mono font-medium">{pdfDocQuotation.quotationNo}</span>.
                </p>

                {/* If a custom file is already uploaded */}
                {pdfDocQuotation.notes?.startsWith("[UPLOADED_FILE]:") ? (() => {
                  const parts = pdfDocQuotation.notes.split("||");
                  const fileUrl = parts[0].substring("[UPLOADED_FILE]:".length);
                  const userNotes = parts[1] || "";
                  const isPdf = fileUrl.startsWith("data:application/pdf");

                  return (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded Quotation File</span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const win = window.open("", "_blank");
                                if (win) {
                                  if (isPdf) {
                                    win.document.write(`<object data="${fileUrl}" type="application/pdf" style="width:100%; height:100vh; border:none;"></object>`);
                                  } else {
                                    win.document.write(`<img src="${fileUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                  }
                                  win.document.close();
                                }
                              }}
                              className="text-xs h-8"
                            >
                              Open in New Tab
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await updateQuotationNotes(pdfDocQuotation.id, userNotes);
                                    toast.success("Uploaded file removed. System format will be used.");
                                    setPdfDocDialogOpen(false);
                                    setPdfDocQuotation(null);
                                  } catch {
                                    toast.error("Failed to remove file");
                                  }
                                });
                              }}
                              className="text-xs h-8"
                              disabled={isPending}
                            >
                              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                              Remove Custom File
                            </Button>
                          </div>
                        </div>

                        {/* File Preview */}
                        <div className="border rounded bg-white overflow-hidden flex items-center justify-center min-h-[250px] max-h-[350px]">
                          {isPdf ? (
                            <object data={fileUrl} type="application/pdf" className="w-full h-[300px] border-none"></object>
                          ) : (
                            <img src={fileUrl} alt="Quotation preview" className="max-h-[300px] max-w-full object-contain" />
                          )}
                        </div>
                      </div>

                      {/* Replace file */}
                      <div className="space-y-2 border-t pt-4">
                        <Label className="text-sm font-semibold">Change / Upload New Quotation File (PDF or Image)</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const newUrl = evt.target?.result as string;
                                startTransition(async () => {
                                  try {
                                    await updateQuotationNotes(pdfDocQuotation.id, `[UPLOADED_FILE]:${newUrl}||${userNotes}`);
                                    toast.success("Quotation file updated!");
                                    setPdfDocDialogOpen(false);
                                    setPdfDocQuotation(null);
                                  } catch {
                                    toast.error("Failed to update quotation file");
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                            disabled={isPending}
                            className="cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Upload Completed Quotation File (PDF or Image)</Label>
                      <p className="text-xs text-muted-foreground">
                        If you have already created the quotation externally, upload the PDF or image file here.
                      </p>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const newUrl = evt.target?.result as string;
                            startTransition(async () => {
                              try {
                                const existingNotes = pdfDocQuotation.notes || "";
                                await updateQuotationNotes(pdfDocQuotation.id, `[UPLOADED_FILE]:${newUrl}||${existingNotes}`);
                                toast.success("Quotation file uploaded!");
                                setPdfDocDialogOpen(false);
                                setPdfDocQuotation(null);
                              } catch {
                                toast.error("Failed to upload quotation file");
                              }
                            });
                          };
                          reader.readAsDataURL(file);
                        }}
                        disabled={isPending}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t pt-3 mt-2">
            <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Quotation Dialog */}
      <Dialog open={!!viewQuotation} onOpenChange={(open) => { if (!open) setViewQuotation(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Details — {viewQuotation?.quotationNo}</DialogTitle>
          </DialogHeader>
          {viewQuotation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Billed To</span>
                  <span className="font-medium text-base">
                    {viewQuotation.contact ? `${viewQuotation.contact.firstName} ${viewQuotation.contact.lastName ?? ""}`.trim() : "—"}
                  </span>
                  {viewQuotation.contact?.company && (
                    <span className="text-xs text-muted-foreground block">{viewQuotation.contact.company}</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-medium">Quotation Info</span>
                  <span className="block"><strong>Date:</strong> {format(new Date(viewQuotation.createdAt), "dd MMM yyyy")}</span>
                  <span className="block">
                    <strong>Valid Until:</strong> {viewQuotation.validUntil ? format(new Date(viewQuotation.validUntil), "dd MMM yyyy") : "—"}
                  </span>
                  <span className="block"><strong>Status:</strong> {viewQuotation.status}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground block uppercase font-medium">Line Items</span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center w-[80px]">Qty</TableHead>
                      <TableHead className="text-right w-[120px]">Unit Price</TableHead>
                      <TableHead className="text-right w-[80px]">Tax %</TableHead>
                      <TableHead className="text-right w-[120px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewQuotation.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-center">{Number(item.quantity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{Number(item.taxRate)}%</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals & Notes/Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                <div className="space-y-4">
                  {viewQuotation.notes && (
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase font-medium mb-1">Notes</span>
                      <p className="text-sm bg-muted/30 p-2.5 rounded border whitespace-pre-wrap">{viewQuotation.notes}</p>
                    </div>
                  )}
                  {viewQuotation.terms && (
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase font-medium mb-1">Terms & Conditions</span>
                      <p className="text-sm bg-muted/30 p-2.5 rounded border whitespace-pre-wrap">{viewQuotation.terms}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <div className="w-full max-w-[280px] border rounded overflow-hidden h-fit">
                    <div className="flex justify-between p-2.5 text-sm border-b">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(viewQuotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 text-sm border-b">
                      <span className="text-muted-foreground">Tax Amount:</span>
                      <span>{formatCurrency(viewQuotation.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 font-semibold bg-muted/40">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(viewQuotation.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Close</DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quotation Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditQuotation(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quotation — {editQuotation?.quotationNo}</DialogTitle>
          </DialogHeader>
          {editQuotation && (
            <form action={handleUpdate} className="space-y-5">
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
                  {editItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_72px_100px_72px_32px] gap-2 items-center">
                      <Input
                        placeholder="e.g. Web design services"
                        value={item.description}
                        onChange={(e) => updateEditItem(i, "description", e.target.value)}
                        required
                      />
                      <Input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={(e) => updateEditItem(i, "quantity", Number(e.target.value))}
                        className="text-center"
                        required
                      />
                      <Input
                        type="number" min="0" step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateEditItem(i, "unitPrice", Number(e.target.value))}
                        className="text-right"
                        required
                      />
                      <Input
                        type="number" min="0" max="100"
                        value={item.taxRate}
                        onChange={(e) => updateEditItem(i, "taxRate", Number(e.target.value))}
                        className="text-right"
                        required
                      />
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => removeEditItem(i)}
                        disabled={editItems.length === 1}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-3">
                  <Button type="button" variant="outline" size="sm" onClick={addEditItem} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                  <div className="text-right text-sm space-y-0.5">
                    <div className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatCurrency(editSubtotal)}</span></div>
                    <div className="text-muted-foreground">Tax: <span className="font-medium text-foreground">{formatCurrency(editTax)}</span></div>
                    <div className="font-semibold">Total: {formatCurrency(editSubtotal + editTax)}</div>
                  </div>
                </div>
              </div>

              {/* Valid Until */}
              <div className="space-y-2">
                <Label htmlFor="edit-validUntil">Valid Until</Label>
                <Input
                  id="edit-validUntil" name="validUntil" type="date"
                  defaultValue={editQuotation.validUntil ? new Date(editQuotation.validUntil).toISOString().split("T")[0] : ""}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes" name="notes" rows={2} placeholder="Internal notes or message to client…"
                  defaultValue={editQuotation.notes || ""}
                />
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <Label htmlFor="edit-terms">Terms &amp; Conditions</Label>
                <Textarea
                  id="edit-terms" name="terms" rows={2} placeholder="Payment terms, warranty, validity…"
                  defaultValue={editQuotation.terms || ""}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setEditOpen(false);
                  setEditQuotation(null);
                }}>Cancel</Button>
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
