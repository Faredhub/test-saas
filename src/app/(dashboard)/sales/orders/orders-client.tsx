"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  ClipboardList,
  Trash2,
  ChefHat,
  Bell,
  UtensilsCrossed,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  createOrder,
  updateOrderStatus,
  addOrderItem,
  getActiveOrders,
} from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
  sortOrder: number;
};

type Order = {
  id: string;
  orderNo: string;
  tableNumber: string | null;
  customerName: string | null;
  status: string;
  items: OrderItem[];
  subtotal: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  createdBy: { id: string; name: string | null };
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABLE_COUNT = 15;

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PREPARING: "bg-blue-100 text-blue-700",
  READY: "bg-green-100 text-green-700",
  SERVED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  PREPARING: <ChefHat className="h-3.5 w-3.5" />,
  READY: <Bell className="h-3.5 w-3.5" />,
  SERVED: <UtensilsCrossed className="h-3.5 w-3.5" />,
  COMPLETED: <CheckCircle className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
};

const nextStatus: Record<string, string> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: "COMPLETED",
};

// Table color based on order status
function tableColor(order: Order | undefined): string {
  if (!order) return "bg-muted/50 border-dashed";
  switch (order.status) {
    case "PENDING":
      return "bg-yellow-50 border-yellow-300";
    case "PREPARING":
      return "bg-blue-50 border-blue-300";
    case "READY":
      return "bg-green-50 border-green-300 animate-pulse";
    case "SERVED":
      return "bg-purple-50 border-purple-300";
    default:
      return "bg-muted/50 border-dashed";
  }
}

function timeElapsed(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

// ---------------------------------------------------------------------------
// New-item row for the order form
// ---------------------------------------------------------------------------

type DraftItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string;
};

const emptyItem: DraftItem = { name: "", quantity: 1, unitPrice: 0, notes: "" };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // New Order dialog state
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderTable, setNewOrderTable] = useState("");
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [newOrderItems, setNewOrderItems] = useState<DraftItem[]>([{ ...emptyItem }]);

  // Add item dialog state
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemOrderId, setAddItemOrderId] = useState<string | null>(null);
  const [addItemData, setAddItemData] = useState<DraftItem>({ ...emptyItem });

  // Cancel dialog
  const [showCancel, setShowCancel] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  // Map table -> active order
  const tableOrderMap: Record<string, Order> = {};
  orders.forEach((o) => {
    if (o.tableNumber && !["COMPLETED", "CANCELLED"].includes(o.status)) {
      tableOrderMap[o.tableNumber] = o;
    }
  });

  const selectedOrder = selectedTable ? tableOrderMap[selectedTable] : null;

  async function refresh() {
    try {
      const fresh = await getActiveOrders();
      setOrders(fresh);
    } catch {
      // silent
    }
  }

  // -- Create Order --
  function openNewOrder(table?: string) {
    setNewOrderTable(table || "");
    setNewOrderCustomer("");
    setNewOrderNotes("");
    setNewOrderItems([{ ...emptyItem }]);
    setShowNewOrder(true);
  }

  function updateDraftItem(idx: number, field: keyof DraftItem, value: string | number) {
    setNewOrderItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  function addDraftRow() {
    setNewOrderItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeDraftRow(idx: number) {
    setNewOrderItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCreateOrder() {
    const validItems = newOrderItems.filter((i) => i.name.trim() && i.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one item with a name and price");
      return;
    }
    startTransition(async () => {
      try {
        await createOrder({
          tableNumber: newOrderTable || undefined,
          customerName: newOrderCustomer || undefined,
          notes: newOrderNotes || undefined,
          items: validItems,
        });
        toast.success("Order created");
        setShowNewOrder(false);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create order");
      }
    });
  }

  // -- Status transitions --
  function handleAdvanceStatus(orderId: string, currentStatus: string) {
    const next = nextStatus[currentStatus];
    if (!next) return;
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, next);
        toast.success(`Order moved to ${statusLabels[next]}`);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  // -- Cancel Order --
  function openCancel(orderId: string) {
    setCancelOrderId(orderId);
    setShowCancel(true);
  }

  function handleCancel() {
    if (!cancelOrderId) return;
    startTransition(async () => {
      try {
        await updateOrderStatus(cancelOrderId, "CANCELLED");
        toast.success("Order cancelled");
        setShowCancel(false);
        setCancelOrderId(null);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to cancel");
      }
    });
  }

  // -- Add item to existing order --
  function openAddItem(orderId: string) {
    setAddItemOrderId(orderId);
    setAddItemData({ ...emptyItem });
    setShowAddItem(true);
  }

  function handleAddItem() {
    if (!addItemOrderId || !addItemData.name.trim() || addItemData.unitPrice <= 0) {
      toast.error("Provide item name and price");
      return;
    }
    startTransition(async () => {
      try {
        await addOrderItem(addItemOrderId!, {
          name: addItemData.name,
          quantity: addItemData.quantity,
          unitPrice: addItemData.unitPrice,
          notes: addItemData.notes || undefined,
        });
        toast.success("Item added");
        setShowAddItem(false);
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add item");
      }
    });
  }

  // -- Running total for new order form --
  const draftSubtotal = newOrderItems.reduce(
    (s, i) => s + i.quantity * i.unitPrice,
    0
  );
  const draftTax = Math.round(draftSubtotal * 0.05 * 100) / 100;
  const draftTotal = Math.round((draftSubtotal + draftTax) * 100) / 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm">
            Captain order management &mdash; take and track table orders
          </p>
        </div>
        <Button onClick={() => openNewOrder()}>
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Table grid */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: TABLE_COUNT }, (_, i) => {
                  const tNum = String(i + 1);
                  const order = tableOrderMap[tNum];
                  const isSelected = selectedTable === tNum;
                  return (
                    <button
                      key={tNum}
                      onClick={() => setSelectedTable(isSelected ? null : tNum)}
                      className={`
                        relative flex flex-col items-center justify-center rounded-lg border-2 p-3 text-sm font-medium transition-all
                        ${tableColor(order)}
                        ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
                        hover:opacity-80 cursor-pointer
                      `}
                    >
                      <span className="text-lg font-bold">{tNum}</span>
                      {order ? (
                        <span className="text-[10px] mt-0.5 opacity-75">
                          {statusLabels[order.status]}
                        </span>
                      ) : (
                        <span className="text-[10px] mt-0.5 opacity-50">Free</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/50 border border-dashed" /> Free</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border-yellow-300 border" /> Pending</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border-blue-300 border" /> Preparing</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border-green-300 border" /> Ready</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-50 border-purple-300 border" /> Served</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Selected table order / Active orders list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Selected table detail */}
          {selectedTable && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Table {selectedTable}
                    {selectedOrder && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        &mdash; {selectedOrder.orderNo}
                      </span>
                    )}
                  </CardTitle>
                  {!selectedOrder && (
                    <Button size="sm" onClick={() => openNewOrder(selectedTable)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> New Order
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedOrder ? (
                  <div className="space-y-4">
                    {/* Order info */}
                    <div className="flex items-center gap-3 text-sm">
                      <Badge className={statusColors[selectedOrder.status]}>
                        {statusIcons[selectedOrder.status]}
                        <span className="ml-1">{statusLabels[selectedOrder.status]}</span>
                      </Badge>
                      {selectedOrder.customerName && (
                        <span className="text-muted-foreground">
                          {selectedOrder.customerName}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {timeElapsed(selectedOrder.createdAt)}
                      </span>
                    </div>

                    {/* Items table */}
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left font-medium">Item</th>
                            <th className="px-3 py-2 text-center font-medium w-16">Qty</th>
                            <th className="px-3 py-2 text-right font-medium w-24">Price</th>
                            <th className="px-3 py-2 text-right font-medium w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="px-3 py-2">
                                {item.name}
                                {item.notes && (
                                  <span className="block text-xs text-muted-foreground">
                                    {item.notes}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">
                                {Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {(item.quantity * Number(item.unitPrice)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t bg-muted/30">
                            <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-muted-foreground">Subtotal</td>
                            <td className="px-3 py-1.5 text-right text-sm">{Number(selectedOrder.subtotal).toFixed(2)}</td>
                          </tr>
                          <tr className="bg-muted/30">
                            <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-muted-foreground">Tax (5%)</td>
                            <td className="px-3 py-1.5 text-right text-sm">{Number(selectedOrder.taxAmount).toFixed(2)}</td>
                          </tr>
                          <tr className="bg-muted/30 font-semibold">
                            <td colSpan={3} className="px-3 py-1.5 text-right">Total</td>
                            <td className="px-3 py-1.5 text-right">{Number(selectedOrder.total).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {selectedOrder.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {selectedOrder.notes}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {nextStatus[selectedOrder.status] && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAdvanceStatus(selectedOrder.id, selectedOrder.status)
                          }
                          disabled={isPending}
                        >
                          {isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                          <ArrowRight className="mr-1 h-3.5 w-3.5" />
                          Move to {statusLabels[nextStatus[selectedOrder.status]]}
                        </Button>
                      )}
                      {!["COMPLETED", "CANCELLED"].includes(selectedOrder.status) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddItem(selectedOrder.id)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openCancel(selectedOrder.id)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active order for this table. Create one to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active orders list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Active Orders
                <Badge variant="secondary" className="ml-1">
                  {orders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No active orders right now.
                </p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        if (order.tableNumber) setSelectedTable(order.tableNumber);
                      }}
                      className={`
                        flex items-center justify-between rounded-lg border p-3 text-sm transition-colors
                        ${order.tableNumber ? "cursor-pointer hover:bg-muted/50" : ""}
                        ${selectedTable && order.tableNumber === selectedTable ? "ring-1 ring-primary" : ""}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {order.orderNo}
                            {order.tableNumber && (
                              <span className="text-muted-foreground font-normal">
                                {" "}&middot; Table {order.tableNumber}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            {order.customerName && ` \u00B7 ${order.customerName}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {timeElapsed(order.createdAt)}
                        </span>
                        <span className="font-medium whitespace-nowrap">
                          {Number(order.total).toFixed(2)}
                        </span>
                        <Badge className={statusColors[order.status]}>
                          {statusIcons[order.status]}
                          <span className="ml-1">{statusLabels[order.status]}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== New Order Dialog ========== */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              New Order {newOrderTable ? `\u2014 Table ${newOrderTable}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Table Number</Label>
                <Input
                  value={newOrderTable}
                  onChange={(e) => setNewOrderTable(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={newOrderCustomer}
                  onChange={(e) => setNewOrderCustomer(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <Label className="mb-2 block">Items</Label>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-2 text-left font-medium">Item Name</th>
                      <th className="px-2 py-2 text-center font-medium w-20">Qty</th>
                      <th className="px-2 py-2 text-right font-medium w-28">Price</th>
                      <th className="px-2 py-2 text-right font-medium w-24">Total</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newOrderItems.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-2 py-1.5">
                          <Input
                            value={item.name}
                            onChange={(e) => updateDraftItem(idx, "name", e.target.value)}
                            placeholder="Item name"
                            className="h-8"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateDraftItem(idx, "quantity", Math.max(1, Number(e.target.value)))
                            }
                            className="h-8 text-center"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              updateDraftItem(idx, "unitPrice", Number(e.target.value))
                            }
                            placeholder="0.00"
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted-foreground">
                          {(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5">
                          {newOrderItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeDraftRow(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addDraftRow}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
              </Button>
            </div>

            {/* Running total */}
            <div className="flex justify-end">
              <div className="text-sm space-y-1 w-48">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{draftSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (5%)</span>
                  <span>{draftTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total</span>
                  <span>{draftTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newOrderNotes}
                onChange={(e) => setNewOrderNotes(e.target.value)}
                placeholder="Special instructions..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</DialogClose>
              <Button onClick={handleCreateOrder} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Add Item Dialog ========== */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Item Name</Label>
              <Input
                value={addItemData.name}
                onChange={(e) => setAddItemData({ ...addItemData, name: e.target.value })}
                placeholder="e.g. Butter Chicken"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={addItemData.quantity}
                  onChange={(e) =>
                    setAddItemData({ ...addItemData, quantity: Math.max(1, Number(e.target.value)) })
                  }
                />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={addItemData.unitPrice || ""}
                  onChange={(e) =>
                    setAddItemData({ ...addItemData, unitPrice: Number(e.target.value) })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={addItemData.notes}
                onChange={(e) => setAddItemData({ ...addItemData, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</DialogClose>
              <Button onClick={handleAddItem} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Cancel Order Dialog ========== */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this order? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Keep Order</DialogClose>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
