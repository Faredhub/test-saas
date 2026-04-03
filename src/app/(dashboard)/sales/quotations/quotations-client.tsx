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
import { Plus, Search, Loader2, Trash2 } from "lucide-react";
import { createQuotation } from "@/lib/actions/sales";
import { toast } from "sonner";
import { format } from "date-fns";

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

export function QuotationsClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);

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

  function formatCurrency(value: unknown) {
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }

  const filtered = initialData.data.filter((q) => {
    if (!search) return true;
    return q.quotationNo.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">Create and manage quotations</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Quotation
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Quotation</DialogTitle></DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div>
                <Label className="mb-2 block">Line Items</Label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-end">
                      <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                      <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                      <Input type="number" min="0" step="0.01" placeholder="Price" value={item.unitPrice || ""} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} />
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
                      <div>Tax: {formatCurrency(tax)}</div>
                      <div className="font-semibold">Total: {formatCurrency(subtotal + tax)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input id="validUntil" name="validUntil" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea id="terms" name="terms" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Quotation
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
            <Input placeholder="Search by quotation no..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No quotations found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium font-mono">{q.quotationNo}</TableCell>
                    <TableCell>{q.contact ? `${q.contact.firstName} ${q.contact.lastName ?? ""}` : "—"}</TableCell>
                    <TableCell>{q._count.items}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(q.total)}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[q.status] ?? ""} border-0`}>{q.status}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(q.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>{q.createdBy?.name ?? "—"}</TableCell>
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
