"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Plus, Search, Loader2, CheckCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import {
  getVendorBills, createVendorBill, approveVendorBill, payVendorBill,
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
  const [isPending, startTransition] = useTransition();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Bills</h1>
          <p className="text-sm text-muted-foreground">Manage vendor bills and payments ({total} total)</p>
        </div>
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
    </div>
  );
}
