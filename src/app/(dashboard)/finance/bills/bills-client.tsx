"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search, Loader2, CheckCircle, CreditCard, Download, Upload, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getVendorBills, createVendorBill, approveVendorBill, payVendorBill, updateVendorBill, deleteVendorBill,
} from "@/lib/actions/finance";

type VendorBill = Awaited<ReturnType<typeof getVendorBills>>["data"][number];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
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

export function BillsClient() {
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
  const [isPending, startTransition] = useTransition();

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

  function loadBills() {
    startTransition(async () => {
      try {
        const res = await getVendorBills({
          search: search || undefined,
          status: statusFilter !== "ALL" ? (statusFilter as "PENDING" | "APPROVED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED") : undefined,
          pageSize: 50,
        });
        setBills(res.data);
        setTotal(res.total);
      } catch {
        toast.error("Failed to load vendor bills");
      }
    });
  }

  useEffect(() => { loadBills(); }, [search, statusFilter]);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createVendorBill({
          vendorName: formData.get("vendorName") as string,
          vendorGst: (formData.get("vendorGst") as string) || undefined,
          description: (formData.get("description") as string) || undefined,
          amount: parseFloat(formData.get("amount") as string),
          taxAmount: formData.get("taxAmount") ? parseFloat(formData.get("taxAmount") as string) : undefined,
          dueDate: (formData.get("dueDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Vendor bill created");
        setIsOpen(false);
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create bill");
      }
    });
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approveVendorBill(id);
        toast.success("Bill approved");
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
        toast.success("Payment recorded");
        setPayDialogBill(null);
        setPayAmount("");
        loadBills();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Bills</h1>
          <p className="text-sm text-muted-foreground">Manage vendor bills and payments ({total} total)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/office/spreadsheets?template=finance-bills&source=finance-bills">
            <Button
              variant="outline"
              type="button"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />Add Bill
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Vendor Bill</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorName">Vendor Name *</Label>
                    <Input id="vendorName" name="vendorName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorGst">GST Number</Label>
                    <Input id="vendorGst" name="vendorGst" placeholder="e.g. 22AAAAA0000A1Z5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-desc">Description</Label>
                  <Input id="bill-desc" name="description" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bill-amount">Amount (INR) *</Label>
                    <Input id="bill-amount" name="amount" type="number" min="0.01" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bill-tax">Tax (GST) Amount</Label>
                    <Input id="bill-tax" name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bill-due">Due Date</Label>
                    <Input id="bill-due" name="dueDate" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-notes">Notes</Label>
                  <Textarea id="bill-notes" name="notes" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Bill
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search bills..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No vendor bills found.
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono font-medium">{bill.billNo}</TableCell>
                    <TableCell>{bill.vendorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{bill.vendorGst || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(bill.amount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(bill.taxAmount)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(bill.total)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(bill.paidAmount)}</TableCell>
                    <TableCell>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${statusColors[bill.status] ?? ""}`}>
                        {bill.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                          onClick={() => setViewDialogBill(bill)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                          onClick={() => setEditDialogBill(bill)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirmBill(bill)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                        {bill.status === "PENDING" && (
                          <Button variant="ghost" size="sm" className="text-blue-600 gap-1" onClick={() => handleApprove(bill.id)} disabled={isPending}>
                            <CheckCircle className="h-3.5 w-3.5" />Approve
                          </Button>
                        )}
                        {(bill.status === "APPROVED" || bill.status === "PARTIALLY_PAID") && (
                          <Button
                            variant="ghost" size="sm" className="text-green-600 gap-1"
                            onClick={() => { setPayDialogBill(bill); setPayAmount(String(toNum(bill.total) - toNum(bill.paidAmount))); }}
                            disabled={isPending}
                          >
                            <CreditCard className="h-3.5 w-3.5" />Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={!!payDialogBill} onOpenChange={(open) => { if (!open) { setPayDialogBill(null); setPayAmount(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {payDialogBill && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><strong>Bill:</strong> {payDialogBill.billNo}</p>
                <p><strong>Vendor:</strong> {payDialogBill.vendorName}</p>
                <p><strong>Total:</strong> {formatCurrency(payDialogBill.total)}</p>
                <p><strong>Already Paid:</strong> {formatCurrency(payDialogBill.paidAmount)}</p>
                <p><strong>Outstanding:</strong> {formatCurrency(toNum(payDialogBill.total) - toNum(payDialogBill.paidAmount))}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (INR)</Label>
                <Input
                  type="number" min="0.01" step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setPayDialogBill(null); setPayAmount(""); }}>Cancel</Button>
                <Button onClick={handlePay} disabled={isPending || !payAmount}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialogBill} onOpenChange={(open) => { if (!open) setViewDialogBill(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vendor Bill Details</DialogTitle></DialogHeader>
          {viewDialogBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Bill Number</span>
                  <span className="font-mono font-medium">{viewDialogBill.billNo}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Status</span>
                  <Badge className={`border-0 ${statusColors[viewDialogBill.status] ?? ""}`}>
                    {viewDialogBill.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Vendor Name</span>
                  <span className="font-medium">{viewDialogBill.vendorName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">GST Number</span>
                  <span>{viewDialogBill.vendorGst || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Amount</span>
                  <span className="font-mono">{formatCurrency(viewDialogBill.amount)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Tax Amount</span>
                  <span className="font-mono">{formatCurrency(viewDialogBill.taxAmount)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total Amount</span>
                  <span className="font-mono font-semibold">{formatCurrency(viewDialogBill.total)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Paid Amount</span>
                  <span className="font-mono">{formatCurrency(viewDialogBill.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Due Date</span>
                  <span>{viewDialogBill.dueDate ? new Date(viewDialogBill.dueDate).toLocaleDateString("en-IN") : "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Created At</span>
                  <span>{new Date(viewDialogBill.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Description</span>
                <p className="text-sm border rounded-md p-2 bg-muted/20">{viewDialogBill.description || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Notes</span>
                <p className="text-sm border rounded-md p-2 bg-muted/20 whitespace-pre-wrap">{viewDialogBill.notes || "—"}</p>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewDialogBill(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialogBill} onOpenChange={(open) => { if (!open) setEditDialogBill(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vendor Bill</DialogTitle></DialogHeader>
          {editDialogBill && (
            <form action={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vendorName">Vendor Name *</Label>
                  <Input id="edit-vendorName" name="vendorName" defaultValue={editDialogBill.vendorName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vendorGst">GST Number</Label>
                  <Input id="edit-vendorGst" name="vendorGst" defaultValue={editDialogBill.vendorGst || ""} placeholder="e.g. 22AAAAA0000A1Z5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bill-desc">Description</Label>
                <Input id="edit-bill-desc" name="description" defaultValue={editDialogBill.description || ""} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-bill-amount">Amount (INR) *</Label>
                  <Input id="edit-bill-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={toNum(editDialogBill.amount)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bill-tax">Tax (GST) Amount</Label>
                  <Input id="edit-bill-tax" name="taxAmount" type="number" min="0" step="0.01" defaultValue={toNum(editDialogBill.taxAmount)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bill-due">Due Date</Label>
                  <Input id="edit-bill-due" name="dueDate" type="date" defaultValue={editDialogBill.dueDate ? new Date(editDialogBill.dueDate).toISOString().split("T")[0] : ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bill-status">Status</Label>
                <Select name="status" defaultValue={editDialogBill.status}>
                  <SelectTrigger id="edit-bill-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bill-notes">Notes</Label>
                <Textarea id="edit-bill-notes" name="notes" rows={2} defaultValue={editDialogBill.notes || ""} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogBill(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmBill} onOpenChange={(open) => { if (!open) setDeleteConfirmBill(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Vendor Bill</DialogTitle></DialogHeader>
          {deleteConfirmBill && (
            <div className="space-y-4">
              <p>Are you sure you want to delete bill <strong className="font-mono">{deleteConfirmBill.billNo}</strong>? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmBill(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConfirmBill.id)} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
