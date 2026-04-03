"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Printer, CreditCard, Loader2, Trash2, MoreHorizontal, Send, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { recordPayment, updateInvoiceStatus, deleteInvoice } from "@/lib/actions/sales";
import type { getInvoiceById } from "@/lib/actions/sales";

type Invoice = NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>;

type TemplateStyle = "classic" | "modern" | "minimal";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "RAZORPAY", label: "Razorpay" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "Other" },
];

function formatCurrency(value: unknown) {
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Status action config
// ---------------------------------------------------------------------------

const STATUS_ACTIONS: Record<string, { label: string; status: string; icon: React.ReactNode }[]> = {
  DRAFT: [
    { label: "Mark as Sent", status: "SENT", icon: <Send className="mr-2 h-4 w-4" /> },
    { label: "Cancel Invoice", status: "CANCELLED", icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  SENT: [
    { label: "Mark as Paid", status: "PAID", icon: <CheckCircle className="mr-2 h-4 w-4" /> },
    { label: "Mark as Overdue", status: "OVERDUE", icon: <AlertTriangle className="mr-2 h-4 w-4" /> },
    { label: "Cancel Invoice", status: "CANCELLED", icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  PARTIALLY_PAID: [
    { label: "Mark as Paid", status: "PAID", icon: <CheckCircle className="mr-2 h-4 w-4" /> },
    { label: "Mark as Overdue", status: "OVERDUE", icon: <AlertTriangle className="mr-2 h-4 w-4" /> },
    { label: "Cancel Invoice", status: "CANCELLED", icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  OVERDUE: [
    { label: "Mark as Paid", status: "PAID", icon: <CheckCircle className="mr-2 h-4 w-4" /> },
    { label: "Cancel Invoice", status: "CANCELLED", icon: <XCircle className="mr-2 h-4 w-4" /> },
  ],
  PAID: [],
  CANCELLED: [],
  REFUNDED: [],
};

// ---------------------------------------------------------------------------
// Template wrapper classes
// ---------------------------------------------------------------------------

const templateClasses: Record<TemplateStyle, {
  wrapper: string;
  header: string;
  headerText: string;
  table: string;
  th: string;
  td: string;
  summaryBox: string;
  footer: string;
}> = {
  classic: {
    wrapper: "border-2 border-black bg-white",
    header: "border-b-2 border-black p-8",
    headerText: "text-black",
    table: "border-collapse w-full",
    th: "border border-black bg-gray-100 px-4 py-2 text-left text-sm font-semibold",
    td: "border border-black px-4 py-2 text-sm",
    summaryBox: "border-2 border-black",
    footer: "border-t-2 border-black",
  },
  modern: {
    wrapper: "border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm",
    header: "bg-primary p-8",
    headerText: "text-primary-foreground",
    table: "w-full",
    th: "border-b-2 border-primary/20 bg-primary/5 px-4 py-3 text-left text-sm font-semibold text-primary",
    td: "border-b border-gray-100 px-4 py-3 text-sm",
    summaryBox: "bg-primary/5 rounded-lg border border-primary/20",
    footer: "border-t border-gray-200",
  },
  minimal: {
    wrapper: "bg-white",
    header: "pb-8",
    headerText: "text-gray-900",
    table: "w-full",
    th: "border-b border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500",
    td: "border-b border-gray-50 px-4 py-4 text-sm",
    summaryBox: "border-t border-gray-200",
    footer: "",
  },
};

export function InvoiceView({ invoice }: { invoice: Invoice }) {
  const [template, setTemplate] = useState<TemplateStyle>("modern");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = templateClasses[template];

  const contact = invoice.contact;
  const tenant = invoice.tenant;

  // Determine same-state vs inter-state GST
  const isSameState =
    contact?.state && tenant?.state
      ? contact.state.toLowerCase() === tenant.state.toLowerCase()
      : true; // default to same-state if we can't determine

  const taxAmount = Number(invoice.taxAmount);
  const igstAmount = !isSameState ? taxAmount : 0;
  const cgstAmount = isSameState ? taxAmount / 2 : 0;
  const sgstAmount = isSameState ? taxAmount / 2 : 0;

  const balanceDue = Number(invoice.total) - Number(invoice.amountPaid);

  const availableActions = STATUS_ACTIONS[invoice.status] ?? [];
  const canRecordPayment = !["PAID", "CANCELLED", "REFUNDED"].includes(invoice.status) && balanceDue > 0;
  const canDelete = invoice.status === "DRAFT";

  function handleRecordPayment(formData: FormData) {
    startTransition(async () => {
      try {
        const amount = Number(formData.get("amount"));
        if (!amount || amount <= 0) {
          toast.error("Enter a valid amount");
          return;
        }
        await recordPayment(invoice.id, {
          amount,
          method: paymentMethod,
          reference: (formData.get("reference") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Payment recorded successfully");
        setPaymentOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoice.id, status as Parameters<typeof updateInvoiceStatus>[1]);
        toast.success(`Invoice marked as ${status.replace("_", " ")}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteInvoice(invoice.id);
        toast.success("Invoice deleted");
        router.push("/sales/invoices");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete invoice");
      }
    });
  }

  return (
    <>
      {/* ---- Toolbar (hidden in print) ---- */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/sales/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          {/* Template selector */}
          <div className="flex rounded-lg border bg-muted p-1">
            {(["classic", "modern", "minimal"] as TemplateStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setTemplate(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  template === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Record Payment button */}
          {canRecordPayment && (
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                <CreditCard className="h-4 w-4" />
                Record Payment
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                <form action={handleRecordPayment} className="space-y-4">
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invoice Total</span>
                      <span className="font-medium">{formatCurrency(invoice.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-medium text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Balance Due</span>
                      <span className="text-red-600">{formatCurrency(balanceDue)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={balanceDue}
                      defaultValue={balanceDue.toFixed(2)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => { if (v) setPaymentMethod(v); }}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input id="reference" name="reference" placeholder="Transaction ID, cheque no, etc." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentNotes">Notes</Label>
                    <Textarea id="paymentNotes" name="notes" rows={2} placeholder="Optional notes..." />
                  </div>

                  <div className="flex justify-end gap-2">
                    <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                    <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Record Payment
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Status actions dropdown */}
          {(availableActions.length > 0 || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableActions.map((action) => (
                  <DropdownMenuItem
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
                {canDelete && availableActions.length > 0 && <DropdownMenuSeparator />}
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Invoice
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Invoice</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete invoice <span className="font-mono font-medium">{invoice.invoiceNo}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Balance Due Banner (print:hidden) ---- */}
      {balanceDue > 0 && invoice.status !== "CANCELLED" && (
        <div className="mx-auto mb-4 max-w-4xl rounded-lg border border-red-200 bg-red-50 px-6 py-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">Balance Due</span>
            </div>
            <span className="text-lg font-bold tabular-nums text-red-600">{formatCurrency(balanceDue)}</span>
          </div>
        </div>
      )}

      {/* ---- Invoice Document ---- */}
      <div className={`mx-auto max-w-4xl ${t.wrapper} print:border-0 print:shadow-none`}>
        {/* Header */}
        <div className={t.header}>
          <div className="flex items-start justify-between">
            {/* Company info */}
            <div>
              {tenant?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo} alt={tenant.name} className="mb-3 h-12 w-auto" />
              ) : (
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold ${
                    template === "modern"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {tenant?.name?.charAt(0) ?? "T"}
                </div>
              )}
              <h1 className={`text-xl font-bold ${t.headerText}`}>{tenant?.name ?? "Company"}</h1>
              <div className={`mt-1 space-y-0.5 text-sm ${template === "modern" ? "text-primary-foreground/80" : "text-gray-500"}`}>
                {tenant?.address && <p>{tenant.address}</p>}
                {(tenant?.city || tenant?.state || tenant?.pincode) && (
                  <p>
                    {[tenant?.city, tenant?.state, tenant?.pincode].filter(Boolean).join(", ")}
                    {tenant?.country ? `, ${tenant.country}` : ""}
                  </p>
                )}
                {tenant?.phone && <p>Phone: {tenant.phone}</p>}
                {tenant?.email && <p>Email: {tenant.email}</p>}
                {tenant?.website && <p>{tenant.website}</p>}
              </div>
              {(tenant?.gst || tenant?.pan) && (
                <div className={`mt-2 space-y-0.5 text-sm font-medium ${t.headerText}`}>
                  {tenant?.gst && <p>GSTIN: {tenant.gst}</p>}
                  {tenant?.pan && <p>PAN: {tenant.pan}</p>}
                </div>
              )}
            </div>

            {/* Invoice meta */}
            <div className="text-right">
              <h2 className={`text-2xl font-bold uppercase tracking-wider ${t.headerText}`}>Invoice</h2>
              <div className={`mt-2 space-y-1 text-sm ${template === "modern" ? "text-primary-foreground/80" : "text-gray-600"}`}>
                <p>
                  <span className="font-medium">Invoice #:</span>{" "}
                  <span className="font-mono">{invoice.invoiceNo}</span>
                </p>
                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {format(new Date(invoice.createdAt), "dd MMM yyyy")}
                </p>
                {invoice.dueDate && (
                  <p>
                    <span className="font-medium">Due Date:</span>{" "}
                    {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                  </p>
                )}
              </div>
              <div className="mt-3">
                <Badge className={`${statusColors[invoice.status] ?? ""} border-0 text-xs`}>
                  {invoice.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className={`p-8 ${template === "minimal" ? "pb-6" : ""}`}>
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Bill To
            </h3>
            {contact ? (
              <div className="text-sm">
                <p className="font-semibold text-gray-900">
                  {contact.firstName} {contact.lastName ?? ""}
                </p>
                {contact.company && <p className="text-gray-600">{contact.company}</p>}
                {contact.address && <p className="text-gray-600">{contact.address}</p>}
                {(contact.city || contact.state || contact.pincode) && (
                  <p className="text-gray-600">
                    {[contact.city, contact.state, contact.pincode].filter(Boolean).join(", ")}
                    {contact.country ? `, ${contact.country}` : ""}
                  </p>
                )}
                {contact.email && <p className="text-gray-600">{contact.email}</p>}
                {contact.phone && <p className="text-gray-600">{contact.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No contact assigned</p>
            )}
          </div>

          {/* Items table */}
          <div className={`mb-8 overflow-hidden ${template === "modern" ? "rounded-lg border border-gray-200" : ""}`}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th className={`${t.th} w-12`}>#</th>
                  <th className={t.th}>Description</th>
                  <th className={`${t.th} text-right w-20`}>Qty</th>
                  <th className={`${t.th} text-right w-28`}>Rate</th>
                  <th className={`${t.th} text-right w-20`}>Tax %</th>
                  <th className={`${t.th} text-right w-32`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className={`${t.td} text-gray-500`}>{index + 1}</td>
                    <td className={`${t.td} font-medium`}>{item.description}</td>
                    <td className={`${t.td} text-right tabular-nums`}>{Number(item.quantity)}</td>
                    <td className={`${t.td} text-right tabular-nums`}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className={`${t.td} text-right tabular-nums`}>{Number(item.taxRate)}%</td>
                    <td className={`${t.td} text-right tabular-nums font-medium`}>
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className={`w-80 ${t.summaryBox} p-4`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                </div>

                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="tabular-nums text-red-600">
                      -{formatCurrency(invoice.discount)}
                    </span>
                  </div>
                )}

                {isSameState ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGST</span>
                      <span className="tabular-nums">{formatCurrency(cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SGST</span>
                      <span className="tabular-nums">{formatCurrency(sgstAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-500">IGST</span>
                    <span className="tabular-nums">{formatCurrency(igstAmount)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
                </div>

                {Number(invoice.amountPaid) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid</span>
                    <span className="tabular-nums">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                )}

                {balanceDue > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-base font-bold text-red-600">
                      <span>Balance Due</span>
                      <span className="tabular-nums">{formatCurrency(balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Payment History
              </h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-4 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {format(new Date(payment.paidAt), "dd MMM yyyy")}
                      </span>
                      <span className="ml-3 text-gray-500">
                        {payment.method.replace("_", " ")}
                      </span>
                      {payment.reference && (
                        <span className="ml-2 text-gray-400">Ref: {payment.reference}</span>
                      )}
                      {payment.notes && (
                        <span className="ml-2 text-gray-400">- {payment.notes}</span>
                      )}
                    </div>
                    <span className="font-medium tabular-nums text-green-600">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Terms */}
          {(invoice.paymentTerms || invoice.notes) && (
            <div className="mt-8 grid grid-cols-2 gap-6">
              {invoice.paymentTerms && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Payment Terms
                  </h3>
                  <p className="text-sm text-gray-600">{invoice.paymentTerms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Notes
                  </h3>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${t.footer} px-8 py-6 text-center`}>
          <p className="text-sm font-medium text-gray-500">Thank you for your business</p>
        </div>
      </div>

      {/* ---- Print-only styles ---- */}
      <style jsx global>{`
        @media print {
          /* Hide all chrome */
          nav,
          header,
          aside,
          .print\\:hidden,
          [class*="sidebar"],
          [class*="topbar"],
          [class*="Sidebar"],
          [class*="Topbar"] {
            display: none !important;
          }

          /* Reset layout so invoice fills the page */
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          main {
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          /* Let the flex layout collapse */
          .flex.h-screen {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }

          .flex-1.overflow-y-auto,
          .flex.flex-1.flex-col {
            overflow: visible !important;
            height: auto !important;
          }

          /* Remove max-width constraint for print */
          .max-w-4xl {
            max-width: 100% !important;
          }

          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}
