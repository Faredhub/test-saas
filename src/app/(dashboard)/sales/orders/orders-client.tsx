"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Loader2, Truck, FileText, MessageSquare, Send, Eye, Pencil, Trash2,
} from "lucide-react";
import {
  createB2BSalesOrder,
  updateB2BSalesOrder,
  deleteB2BSalesOrder,
  convertSalesOrderToInvoice,
  getB2BSalesOrders,
} from "@/lib/actions/sales";
import { toast } from "sonner";
import { format } from "date-fns";

type B2BOrder = Awaited<ReturnType<typeof getB2BSalesOrders>>[number];

type Props = {
  initialOrders: B2BOrder[];
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

const invoiceStatusColors: Record<string, string> = {
  UNINVOICED: "bg-amber-50 text-amber-700 border-amber-300",
  PARTIALLY_INVOICED: "bg-blue-50 text-blue-700 border-blue-300",
  INVOICED: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

export function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<B2BOrder[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewDialogOrder, setViewDialogOrder] = useState<B2BOrder | null>(null);
  const [editDialogOrder, setEditDialogOrder] = useState<B2BOrder | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<B2BOrder | null>(null);
  const [chatterDrawerOrder, setChatterDrawerOrder] = useState<B2BOrder | null>(null);

  // Create Form state
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ name: string; quantity: number; unitPrice: number }>>([
    { name: "", quantity: 1, unitPrice: 0 },
  ]);

  // Edit Form state
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editStatus, setEditStatus] = useState("CONFIRMED");
  const [editNotes, setEditNotes] = useState("");

  // Chatter state
  const [chatterComments, setChatterComments] = useState<Record<string, Array<{ author: string; text: string; date: string }>>>({});
  const [newComment, setNewComment] = useState("");

  const [isPending, startTransition] = useTransition();

  async function reloadOrders() {
    startTransition(async () => {
      try {
        const data = await getB2BSalesOrders({ search: search || undefined, status: statusFilter !== "ALL" ? statusFilter : undefined });
        setOrders(data);
      } catch {
        toast.error("Failed to load Sales Orders");
      }
    });
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.name && i.unitPrice > 0);
    if (!customerName || validItems.length === 0) {
      toast.error("Please enter customer name and at least one item with unit price");
      return;
    }

    startTransition(async () => {
      try {
        await createB2BSalesOrder({
          customerName,
          items: validItems,
          notes,
        });
        toast.success("Sales Order created successfully!");
        setIsCreateOpen(false);
        setCustomerName("");
        setNotes("");
        setItems([{ name: "", quantity: 1, unitPrice: 0 }]);
        reloadOrders();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create Sales Order");
      }
    });
  }

  async function handleEditOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!editDialogOrder) return;

    startTransition(async () => {
      try {
        await updateB2BSalesOrder(editDialogOrder.id, {
          customerName: editCustomerName,
          status: editStatus,
          notes: editNotes,
        });
        toast.success("Sales Order updated!");
        setEditDialogOrder(null);
        reloadOrders();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update order");
      }
    });
  }

  async function handleDeleteOrder(id: string) {
    startTransition(async () => {
      try {
        await deleteB2BSalesOrder(id);
        toast.success("Sales Order deleted");
        setDeleteConfirmOrder(null);
        reloadOrders();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete order");
      }
    });
  }

  async function handleConvertToInvoice(orderId: string) {
    startTransition(async () => {
      try {
        await convertSalesOrderToInvoice(orderId);
        toast.success("Sales Order converted to Invoice in /sales/invoices!");
        reloadOrders();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to convert order to invoice");
      }
    });
  }

  function handleAddComment(orderId: string) {
    if (!newComment.trim()) return;
    const existing = chatterComments[orderId] || [];
    setChatterComments({
      ...chatterComments,
      [orderId]: [
        ...existing,
        { author: "Sales Rep", text: newComment.trim(), date: new Date().toLocaleString() },
      ],
    });
    setNewComment("");
    toast.success("Chatter note added");
  }

  const [categoryTab, setCategoryTab] = useState<"ALL" | "TO_INVOICE" | "TO_UPSELL">("ALL");

  const filteredOrders = orders.filter((o) => {
    const matchSearch = !search || o.orderNo.toLowerCase().includes(search.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchCategory =
      categoryTab === "ALL"
        ? true
        : categoryTab === "TO_INVOICE"
        ? o.invoiceStatus !== "INVOICED"
        : o.deliveryStatus === "DELIVERED";
    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track confirmed customer orders, delivery fulfillment, chatter follow-ups, and invoice status.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> Create Sales Order
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create B2B Sales Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Order Items</Label>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <Input
                        placeholder="Item Description"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].name = e.target.value;
                          setItems(updated);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = Number(e.target.value);
                          setItems(updated);
                        }}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price (₹)"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].unitPrice = Number(e.target.value);
                          setItems(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems([...items, { name: "", quantity: 1, unitPrice: 0 }])}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Line Item
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes / Terms</Label>
                <Textarea
                  id="notes"
                  placeholder="Special instructions or delivery notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Sales Order
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs for Invoicing & Upsell (Spreadsheet requirement) */}
      <div className="flex bg-muted p-1 rounded-lg border w-fit text-xs gap-1">
        <button
          onClick={() => setCategoryTab("ALL")}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
            categoryTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-muted-foreground hover:text-slate-900"
          }`}
        >
          All Sales Orders ({orders.length})
        </button>
        <button
          onClick={() => setCategoryTab("TO_INVOICE")}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            categoryTab === "TO_INVOICE" ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-slate-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Orders to Invoice ({orders.filter((o) => o.invoiceStatus !== "INVOICED").length})
        </button>
        <button
          onClick={() => setCategoryTab("TO_UPSELL")}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            categoryTab === "TO_UPSELL" ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-slate-900"
          }`}
        >
          <Truck className="h-3.5 w-3.5" /> Orders to Upsell ({orders.filter((o) => o.deliveryStatus === "DELIVERED").length})
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order no, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PREPARING">In Transit</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Invoice Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No sales orders found. Click &quot;Create Sales Order&quot; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono font-bold text-blue-600">{order.orderNo}</TableCell>
                    <TableCell className="font-medium">{order.customerName || "Standard Customer"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatINR(order.subtotal)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatINR(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 border-purple-200 bg-purple-50 text-purple-700">
                        <Truck className="h-3 w-3" />
                        {order.deliveryStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={invoiceStatusColors[order.invoiceStatus] || "bg-gray-100 text-gray-700"}>
                        {order.invoiceStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* VIEW button - Blue */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewDialogOrder(order)}
                          title="View Sales Order Details"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* EDIT button - Black */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditDialogOrder(order);
                            setEditCustomerName(order.customerName || "");
                            setEditStatus(order.status || "CONFIRMED");
                            setEditNotes(order.notes || "");
                          }}
                          title="Edit Sales Order"
                          className="h-8 w-8 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* DELETE button - Red */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmOrder(order)}
                          title="Delete Sales Order"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Chatter button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setChatterDrawerOrder(order)}
                          title="Activity & Chatter Tracking"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>

                        {order.invoiceStatus !== "INVOICED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToInvoice(order.id)}
                            disabled={isPending}
                            title="Convert Sales Order to Invoice"
                            className="gap-1 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                          >
                            <FileText className="h-3.5 w-3.5" /> Convert to Invoice
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

      {/* VIEW ORDER DIALOG */}
      {viewDialogOrder && (
        <Dialog open={!!viewDialogOrder} onOpenChange={(open) => { if (!open) setViewDialogOrder(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-600 flex items-center justify-between">
                <span>Sales Order {viewDialogOrder.orderNo}</span>
                <Badge variant="outline">{viewDialogOrder.status}</Badge>
              </DialogTitle>
              <DialogDescription>
                Customer: <span className="font-semibold text-slate-800">{viewDialogOrder.customerName}</span> • Date: {viewDialogOrder.createdAt ? format(new Date(viewDialogOrder.createdAt), "dd MMM yyyy") : "—"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-md border p-3 bg-muted/20 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Items Breakdown</h4>
                <div className="space-y-1.5 text-sm">
                  {viewDialogOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-1 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatINR(item.unitPrice)}</p>
                      </div>
                      <span className="font-mono font-semibold">{formatINR(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm border-t pt-2 font-bold">
                <span>Grand Total (incl. Tax):</span>
                <span className="font-mono text-lg text-emerald-600">{formatINR(viewDialogOrder.total)}</span>
              </div>

              {viewDialogOrder.notes && (
                <div className="text-xs space-y-1 border-t pt-2">
                  <span className="font-semibold text-muted-foreground">Notes:</span>
                  <p className="text-muted-foreground">{viewDialogOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT ORDER DIALOG */}
      {editDialogOrder && (
        <Dialog open={!!editDialogOrder} onOpenChange={(open) => { if (!open) setEditDialogOrder(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Sales Order {editDialogOrder.orderNo}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditOrder} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="editCustomerName">Customer Name</Label>
                <Input
                  id="editCustomerName"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editStatus">Order Status</Label>
                <Select value={editStatus} onValueChange={(v) => v && setEditStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PREPARING">In Transit / Preparing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-black text-white hover:bg-black/90">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOrder && (
        <Dialog open={!!deleteConfirmOrder} onOpenChange={(open) => { if (!open) setDeleteConfirmOrder(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Sales Order</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete order <span className="font-mono font-bold">{deleteConfirmOrder.orderNo}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmOrder && handleDeleteOrder(deleteConfirmOrder.id)}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Chatter & Activity Tracking Side Drawer */}
      {chatterDrawerOrder && (
        <Dialog open={!!chatterDrawerOrder} onOpenChange={(open) => { if (!open) setChatterDrawerOrder(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Chatter & Activity — {chatterDrawerOrder.orderNo}
              </DialogTitle>
              <DialogDescription>
                Internal discussion and follow-up notes for {chatterDrawerOrder.customerName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-3 bg-muted/20">
                {(chatterComments[chatterDrawerOrder.id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Add a follow-up note below.</p>
                ) : (
                  (chatterComments[chatterDrawerOrder.id] || []).map((c, i) => (
                    <div key={i} className="text-xs space-y-0.5 bg-background p-2 rounded border">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{c.date}</span>
                      </div>
                      <p className="text-muted-foreground">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type follow-up note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(chatterDrawerOrder.id); }}
                />
                <Button onClick={() => handleAddComment(chatterDrawerOrder.id)} className="bg-blue-600 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
