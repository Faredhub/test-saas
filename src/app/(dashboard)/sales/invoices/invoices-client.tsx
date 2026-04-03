"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Plus, Search, Loader2, Trash2, Eye } from "lucide-react";
import { createInvoice } from "@/lib/actions/sales";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

type LineItem = { description: string; quantity: number; unitPrice: number; taxRate: number };

type Props = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/sales").getInvoices>>;
};

export function InvoicesClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);

  function addItem() { setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    const u = [...items]; u[i] = { ...u[i], [field]: value }; setItems(u);
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.taxRate) / 100, 0);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const validItems = items.filter((i) => i.description && i.unitPrice > 0);
        if (validItems.length === 0) { toast.error("Add at least one line item"); return; }
        await createInvoice({
          items: validItems,
          dueDate: formData.get("dueDate") as string || undefined,
          paymentTerms: formData.get("paymentTerms") as string,
          notes: formData.get("notes") as string,
        });
        toast.success("Invoice created");
        setIsOpen(false);
        setItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
      } catch { toast.error("Failed to create invoice"); }
    });
  }

  function formatCurrency(value: unknown) {
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }

  const filtered = initialData.data.filter((inv) => {
    if (!search) return true;
    return inv.invoiceNo.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Generate and track GST-compliant invoices</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Invoice
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div>
                <Label className="mb-2 block">Line Items</Label>
                <div className="text-xs text-muted-foreground grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 mb-1">
                  <span>Description</span><span>Qty</span><span>Price</span><span>Tax %</span><span />
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-end">
                      <Input placeholder="Service/Product" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                      <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                      <Input type="number" min="0" step="0.01" value={item.unitPrice || ""} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} />
                      <Input type="number" min="0" max="100" value={item.taxRate} onChange={(e) => updateItem(i, "taxRate", Number(e.target.value))} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm">
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
                    <div className="text-right space-y-1">
                      <div>Subtotal: {formatCurrency(subtotal)}</div>
                      <div>GST: {formatCurrency(tax)}</div>
                      <div className="font-semibold text-base">Total: {formatCurrency(subtotal + tax)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input id="paymentTerms" name="paymentTerms" placeholder="Net 30" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by invoice no..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No invoices found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium font-mono">{inv.invoiceNo}</TableCell>
                    <TableCell>{inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName ?? ""}` : "—"}</TableCell>
                    <TableCell>{inv._count.items}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(inv.amountPaid)}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[inv.status] ?? ""} border-0`}>{inv.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>{format(new Date(inv.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Link href={`/sales/invoices/${inv.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </div>
  );
}
