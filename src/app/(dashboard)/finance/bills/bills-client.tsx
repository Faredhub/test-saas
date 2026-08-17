"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, CheckCircle, CreditCard, Download, Upload, Eye, Pencil, Trash2, Users, Building2, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getVendorBills, createVendorBill, approveVendorBill, payVendorBill, updateVendorBill, deleteVendorBill,
} from "@/lib/actions/finance";

import { usePermission } from "@/hooks/use-permission";

type VendorBill = Awaited<ReturnType<typeof getVendorBills>>["data"][number];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  PARTIALLY_PAID: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function formatCurrency(amount: unknown): string {
  const num = typeof amount === "object" && amount !== null && "toNumber" in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
}

function toNum(val: unknown): number {
  if (typeof val === "object" && val !== null && "toNumber" in val) return (val as { toNumber: () => number }).toNumber();
  return Number(val);
}

interface RegisteredVendor {
  id: string;
  name: string;
  code: string;
  gstNo?: string | null;
  paymentTerms?: string | null;
}

type Props = {
  registeredVendors?: RegisteredVendor[];
};

export function BillsClient({ registeredVendors = [] }: Props) {
  const { isSuperOrAdmin, canCreate, canUpdate, canDelete } = usePermission();
  const allowCreate = canCreate("bills", "finance") || canCreate("expenses", "finance") || isSuperOrAdmin;
  const allowUpdate = canUpdate("bills", "finance") || canUpdate("expenses", "finance") || isSuperOrAdmin;
  const allowDelete = canDelete("bills", "finance") || canDelete("expenses", "finance") || isSuperOrAdmin;
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [payDialogBill, setPayDialogBill] = useState<VendorBill | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [viewDialogBill, setViewDialogBill] = useState<VendorBill | null>(null);
  const [editDialogBill, setEditDialogBill] = useState<VendorBill | null>(null);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<VendorBill | null>(null);

  // Selected vendor auto-fill state
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedVendorName, setSelectedVendorName] = useState<string>("");
  const [selectedVendorGst, setSelectedVendorGst] = useState<string>("");

  // Create Bill amount & GST percentage calculation state
  const [billAmount, setBillAmount] = useState<string>("");
  const [gstPercent, setGstPercent] = useState<string>("18");

  const parsedSubtotal = parseFloat(billAmount) || 0;
  const parsedGstRate = parseFloat(gstPercent) || 0;
  const calculatedTaxAmount = Math.round(((parsedSubtotal * parsedGstRate) / 100) * 100) / 100;
  const calculatedTotalAmount = Math.round((parsedSubtotal + calculatedTaxAmount) * 100) / 100;

  // Edit Bill amount & GST percentage calculation state
  const [editAmount, setEditAmount] = useState<string>("");
  const [editGstPercent, setEditGstPercent] = useState<string>("18");

  useEffect(() => {
    if (editDialogBill) {
      const baseAmt = toNum(editDialogBill.amount);
      const taxAmt = toNum(editDialogBill.taxAmount);
      setEditAmount(String(baseAmt || ""));
      if (baseAmt > 0 && taxAmt >= 0) {
        const pct = Math.round((taxAmt / baseAmt) * 100);
        setEditGstPercent(String(pct));
      } else {
        setEditGstPercent("18");
      }
    }
  }, [editDialogBill]);

  const parsedEditSubtotal = parseFloat(editAmount) || 0;
  const parsedEditGstRate = parseFloat(editGstPercent) || 0;
  const calculatedEditTaxAmount = Math.round(((parsedEditSubtotal * parsedEditGstRate) / 100) * 100) / 100;
  const calculatedEditTotalAmount = Math.round((parsedEditSubtotal + calculatedEditTaxAmount) * 100) / 100;

  const [isPending, startTransition] = useTransition();

  function loadBills() {
    startTransition(async () => {
      try {
        const res = await getVendorBills({
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : (statusFilter as any),
        });
        setBills(res.data);
        setTotal(res.total);
      } catch (err) {
        toast.error("Failed to load vendor bills");
      }
    });
  }

  useEffect(() => {
    loadBills();
  }, [search, statusFilter]);

  function handleVendorSelect(vendorId: string | null) {
    if (!vendorId) return;
    setSelectedVendorId(vendorId);
    if (vendorId === "CUSTOM") {
      setSelectedVendorName("");
      setSelectedVendorGst("");
      return;
    }
    const found = registeredVendors.find((v) => v.id === vendorId);
    if (found) {
      setSelectedVendorName(found.name);
      setSelectedVendorGst(found.gstNo || "");
    }
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createVendorBill({
          vendorName: selectedVendorName || (formData.get("vendorName") as string),
          vendorGst: selectedVendorGst || (formData.get("vendorGst") as string) || undefined,
          description: (formData.get("description") as string) || undefined,
          amount: parseFloat(formData.get("amount") as string),
          taxAmount: formData.get("taxAmount") ? parseFloat(formData.get("taxAmount") as string) : undefined,
          dueDate: (formData.get("dueDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Vendor bill created and linked to Finance");
        setIsOpen(false);
        setSelectedVendorId("");
        setSelectedVendorName("");
        setSelectedVendorGst("");
        setBillAmount("");
        setGstPercent("18");
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create vendor bill");
      }
    });
  }

  async function handleEdit(formData: FormData) {
    if (!editDialogBill) return;
    startTransition(async () => {
      try {
        await updateVendorBill(editDialogBill.id, {
          vendorName: formData.get("vendorName") as string,
          vendorGst: (formData.get("vendorGst") as string) || undefined,
          description: (formData.get("description") as string) || undefined,
          amount: parseFloat(formData.get("amount") as string),
          taxAmount: formData.get("taxAmount") ? parseFloat(formData.get("taxAmount") as string) : undefined,
          dueDate: (formData.get("dueDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          status: formData.get("status") as any,
        });
        toast.success("Vendor bill updated");
        setEditDialogBill(null);
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update bill");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteVendorBill(id);
        toast.success("Vendor bill deleted");
        setDeleteConfirmBill(null);
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete bill");
      }
    });
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approveVendorBill(id);
        toast.success("Vendor bill approved & 3-way match verified");
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to approve bill");
      }
    });
  }

  async function handlePay() {
    if (!payDialogBill || !payAmount) return;
    startTransition(async () => {
      try {
        await payVendorBill(payDialogBill.id, parseFloat(payAmount));
        toast.success("Payment recorded successfully");
        setPayDialogBill(null);
        setPayAmount("");
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-emerald-600" /> Vendor Bills & Finance Integration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage vendor bills, 3-way matching with purchase orders, and scheduled payments ({total} total bills).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/inventory/vendors">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
              Manage Vendor Directory ({registeredVendors.length})
            </Button>
          </Link>

          <Link href="/office/spreadsheets?template=finance-bills&source=finance-bills">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors">
              <Plus className="h-4 w-4" /> Add Bill
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" /> Create Vendor Bill (Finance Integrated)
                </DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4 pt-2">
                {registeredVendors.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="vendorSelect" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Select Registered Vendor (Auto-fills Data)
                    </Label>
                    <Select value={selectedVendorId} onValueChange={handleVendorSelect}>
                      <SelectTrigger><SelectValue placeholder="Choose from Vendor Directory..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOM">-- Manual / Unregistered Vendor --</SelectItem>
                        {registeredVendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.code}) {v.gstNo ? `• GST: ${v.gstNo}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorName" className="text-xs font-semibold">Vendor Name *</Label>
                    <Input
                      id="vendorName"
                      name="vendorName"
                      required
                      value={selectedVendorName}
                      onChange={(e) => setSelectedVendorName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorGst" className="text-xs font-semibold">GST Number</Label>
                    <Input
                      id="vendorGst"
                      name="vendorGst"
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      value={selectedVendorGst}
                      onChange={(e) => setSelectedVendorGst(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-desc" className="text-xs font-semibold">Description / Purchase Order Ref</Label>
                  <Input id="bill-desc" name="description" placeholder="e.g. PO-0042 / Raw materials batch invoice" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bill-amount" className="text-xs font-semibold">Amount (INR) *</Label>
                    <Input
                      id="bill-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="e.g. 2000"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst-percent" className="text-xs font-semibold">Tax Rate (GST %)</Label>
                    <Select value={gstPercent} onValueChange={(val) => setGstPercent(val || "18")}>
                      <SelectTrigger id="gst-percent">
                        <SelectValue placeholder="Select GST %" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Nil / Exempt)</SelectItem>
                        <SelectItem value="5">5% GST</SelectItem>
                        <SelectItem value="12">12% GST</SelectItem>
                        <SelectItem value="18">18% GST</SelectItem>
                        <SelectItem value="28">28% GST</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="taxAmount" value={calculatedTaxAmount} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bill-due" className="text-xs font-semibold">Due Date</Label>
                    <Input id="bill-due" name="dueDate" type="date" />
                  </div>
                </div>

                {/* Calculation Summary Breakdown */}
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Base Subtotal:</span>
                    <span className="font-mono font-medium">{formatCurrency(parsedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>GST Tax ({gstPercent}%):</span>
                    <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">+ {formatCurrency(calculatedTaxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1.5 border-t border-emerald-200 dark:border-emerald-800/80">
                    <span>Total Amount (INR):</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300">{formatCurrency(calculatedTotalAmount)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-notes" className="text-xs font-semibold">Payment Terms / Notes</Label>
                  <Textarea id="bill-notes" name="notes" rows={2} placeholder="3-way match verified against PO & goods receipt" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Bill
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-card p-3 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search bill no, vendor, GST..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[180px] text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendor Bills Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Bill No</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Vendor</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">GST No</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Subtotal</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Tax (GST)</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Total Amount</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Paid</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Due Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                    No vendor bills found. Click "+ Add Bill" to create a new vendor bill.
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {bill.billNo}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-white">
                      {bill.vendorName}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {bill.vendorGst || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(bill.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-500">
                      {formatCurrency(bill.taxAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(bill.total)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-600">
                      {formatCurrency(bill.paidAmount)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColors[bill.status] ?? "bg-gray-100 text-gray-700"}>
                        {bill.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Button - Blue */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewDialogBill(bill)}
                          title="View Details"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Approve Button */}
                        {bill.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(bill.id)}
                            title="Approve & 3-Way Match"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Record Payment Button */}
                        {bill.status !== "PAID" && bill.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPayDialogBill(bill);
                              setPayAmount((toNum(bill.total) - toNum(bill.paidAmount)).toFixed(2));
                            }}
                            title="Record Payment"
                            className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditDialogBill(bill)}
                          title="Edit Bill"
                          className="h-8 w-8 text-slate-800 dark:text-slate-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Delete Button - Red */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmBill(bill)}
                          title="Delete Bill"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Bill Modal */}
      {viewDialogBill && (
        <Dialog open={!!viewDialogBill} onOpenChange={(open) => { if (!open) setViewDialogBill(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center justify-between">
                <span>Vendor Bill {viewDialogBill.billNo}</span>
                <Badge className={statusColors[viewDialogBill.status] ?? ""}>{viewDialogBill.status}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <p className="font-bold text-sm text-slate-900">{viewDialogBill.vendorName}</p>
                {viewDialogBill.vendorGst && <p className="text-muted-foreground">GST: {viewDialogBill.vendorGst}</p>}
                {viewDialogBill.description && <p className="text-muted-foreground mt-1">Ref: {viewDialogBill.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 border rounded">
                <div><span className="text-muted-foreground">Subtotal:</span> <p className="font-mono font-semibold">{formatCurrency(viewDialogBill.amount)}</p></div>
                <div><span className="text-muted-foreground">Tax Amount:</span> <p className="font-mono font-semibold">{formatCurrency(viewDialogBill.taxAmount)}</p></div>
                <div><span className="text-muted-foreground">Grand Total:</span> <p className="font-mono font-bold text-emerald-600">{formatCurrency(viewDialogBill.total)}</p></div>
                <div><span className="text-muted-foreground">Amount Paid:</span> <p className="font-mono font-bold text-blue-600">{formatCurrency(viewDialogBill.paidAmount)}</p></div>
              </div>

              {viewDialogBill.notes && (
                <div className="p-2 border rounded bg-slate-50">
                  <span className="font-semibold text-slate-700">Notes / 3-Way Match Log:</span>
                  <p className="text-muted-foreground mt-0.5">{viewDialogBill.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Record Payment Modal */}
      {payDialogBill && (
        <Dialog open={!!payDialogBill} onOpenChange={(open) => { if (!open) setPayDialogBill(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" /> Record Vendor Payment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2 text-xs">
              <p className="text-muted-foreground">
                Recording payment for bill <span className="font-bold text-slate-900">{payDialogBill.billNo}</span> ({payDialogBill.vendorName}).
              </p>
              <div className="space-y-1">
                <Label htmlFor="payAmount" className="font-semibold">Payment Amount (INR) *</Label>
                <Input
                  id="payAmount"
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="font-mono font-bold text-base"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button onClick={handlePay} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Bill Modal */}
      {editDialogBill && (
        <Dialog open={!!editDialogBill} onOpenChange={(open) => { if (!open) setEditDialogBill(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-emerald-600" /> Edit Vendor Bill ({editDialogBill.billNo})
              </DialogTitle>
            </DialogHeader>
            <form action={handleEdit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vendorName" className="text-xs font-semibold">Vendor Name *</Label>
                  <Input
                    id="edit-vendorName"
                    name="vendorName"
                    required
                    defaultValue={editDialogBill.vendorName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vendorGst" className="text-xs font-semibold">GST Number</Label>
                  <Input
                    id="edit-vendorGst"
                    name="vendorGst"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    defaultValue={editDialogBill.vendorGst || ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="text-xs font-semibold">Description / Purchase Order Ref</Label>
                <Input
                  id="edit-desc"
                  name="description"
                  defaultValue={editDialogBill.description || ""}
                  placeholder="e.g. PO-0042 / Raw materials batch invoice"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount" className="text-xs font-semibold">Amount (INR) *</Label>
                  <Input
                    id="edit-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gst-percent" className="text-xs font-semibold">Tax Rate (GST %)</Label>
                  <Select value={editGstPercent} onValueChange={(val) => setEditGstPercent(val || "18")}>
                    <SelectTrigger id="edit-gst-percent">
                      <SelectValue placeholder="Select GST %" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Nil / Exempt)</SelectItem>
                      <SelectItem value="5">5% GST</SelectItem>
                      <SelectItem value="12">12% GST</SelectItem>
                      <SelectItem value="18">18% GST</SelectItem>
                      <SelectItem value="28">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="taxAmount" value={calculatedEditTaxAmount} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-due" className="text-xs font-semibold">Due Date</Label>
                  <Input
                    id="edit-due"
                    name="dueDate"
                    type="date"
                    defaultValue={editDialogBill.dueDate ? new Date(editDialogBill.dueDate).toISOString().split("T")[0] : ""}
                  />
                </div>
              </div>

              {/* Dynamic Calculation Summary */}
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Base Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(parsedEditSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST Tax ({editGstPercent}%):</span>
                  <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">+ {formatCurrency(calculatedEditTaxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1.5 border-t border-emerald-200 dark:border-emerald-800/80">
                  <span>Total Amount (INR):</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300">{formatCurrency(calculatedEditTotalAmount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-xs font-semibold">Bill Status</Label>
                <Select defaultValue={editDialogBill.status} name="status">
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending Approval</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-xs font-semibold">Payment Terms / Notes</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  rows={2}
                  defaultValue={editDialogBill.notes || ""}
                  placeholder="3-way match verified against PO & goods receipt"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmBill && (
        <Dialog open={!!deleteConfirmBill} onOpenChange={(open) => { if (!open) setDeleteConfirmBill(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-red-600">Delete Vendor Bill</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete vendor bill <span className="font-mono font-bold text-slate-900">{deleteConfirmBill.billNo}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirmBill.id)} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
