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
import { Plus, Search, Loader2, Trash2, Eye, Download, Upload } from "lucide-react";
import { createInvoice, exportToTally } from "@/lib/actions/sales";
import { toast } from "sonner";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";



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
  initialContacts: Awaited<ReturnType<typeof import("@/lib/actions/sales").getContacts>>["data"];
};

export function InvoicesClient({ initialData, initialContacts }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTallyExporting, setIsTallyExporting] = useState(false);
  const [tallyFrom, setTallyFrom] = useState("");
  const [tallyTo, setTallyTo] = useState("");
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

  async function handleTallyExport() {
    setIsTallyExporting(true);
    try {
      const dateRange =
        tallyFrom || tallyTo
          ? { from: tallyFrom, to: tallyTo }
          : undefined;
      const xml = await exportToTally(dateRange);
      const today = format(new Date(), "yyyy-MM-dd");
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tally-export-${today}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Tally XML exported successfully");
    } catch {
      toast.error("Failed to export Tally XML");
    } finally {
      setIsTallyExporting(false);
    }
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
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <Download className="h-4 w-4" />
                Export to Tally
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">Tally XML Export</p>
                <p className="text-xs text-muted-foreground">
                  Export sales invoices as Tally Prime-compatible XML. Optionally filter by date range.
                </p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={tallyFrom}
                      onChange={(e) => setTallyFrom(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={tallyTo}
                      onChange={(e) => setTallyTo(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleTallyExport}
                  disabled={isTallyExporting}
                >
                  {isTallyExporting && <Loader2 className="h-3 w-3 animate-spin" />}
                  <Download className="h-3 w-3" />
                  Download XML
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Link href="/office/spreadsheets?template=sales-invoices&source=sales-invoices">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary animate-pulse"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Invoice
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight">Create Invoice</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-5">

                {/* Line Items */}
                <div className="bg-muted/30 p-4 rounded-lg border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold tracking-tight">Line Items</Label>
                    <Badge variant="outline" className="text-xs bg-background text-muted-foreground border-border">
                      {items.length} {items.length === 1 ? "Item" : "Items"}
                    </Badge>
                  </div>
                  
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Tax %</span>
                    <span />
                  </div>
                  
                  {/* Dynamic item rows */}
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-center">
                        <Input
                          placeholder="e.g. Service or product name"
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                          className="bg-background h-9"
                        />
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                          className="text-center bg-background h-9"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                          className="text-right bg-background h-9"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={(e) => updateItem(i, "taxRate", Number(e.target.value))}
                          className="text-right bg-background h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(i)}
                          disabled={items.length === 1}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-start text-sm mt-4 pt-4 border-t border-border/85">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                        className="bg-background hover:bg-accent border-border/80 text-xs gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Item
                      </Button>
                      
                      <div className="bg-background border border-border/80 rounded-lg p-3 min-w-[240px] text-right space-y-1.5 shadow-xs">
                        <div className="flex justify-between gap-6 text-xs text-muted-foreground">
                          <span>Subtotal</span>
                          <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between gap-6 text-xs text-muted-foreground">
                          <span>GST (Tax)</span>
                          <span className="font-medium text-foreground">{formatCurrency(tax)}</span>
                        </div>
                        <div className="border-t my-1" />
                        <div className="flex justify-between gap-6 font-semibold text-sm">
                          <span>Grand Total</span>
                          <span className="text-primary">{formatCurrency(subtotal + tax)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="date" className="w-full bg-background h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Input id="paymentTerms" name="paymentTerms" placeholder="e.g. Net 30" className="w-full bg-background h-9" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes & Instructions</Label>
                  <Textarea id="notes" name="notes" rows={2} placeholder="Add invoice notes, terms, bank details for payment, etc..." className="w-full bg-background resize-none" />
                </div>
                
                <div className="flex justify-end gap-2 border-t pt-4 mt-6">
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                  <Button type="submit" disabled={isPending} className="min-w-[120px]">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Invoice
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
