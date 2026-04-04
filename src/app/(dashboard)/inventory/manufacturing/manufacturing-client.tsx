"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Pencil, Trash2, Factory, ChevronDown, ChevronRight } from "lucide-react";
import {
  createManufacturingOrder, updateManufacturingOrder, updateMfgOrderStatus,
  addBOMItem, removeBOMItem, getManufacturingOrders,
} from "@/lib/actions/inventory";
import { toast } from "sonner";
import type { MfgStatus } from "@/generated/prisma/enums";

type Props = {
  initialData: Awaited<ReturnType<typeof getManufacturingOrders>>;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  QUALITY_CHECK: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusOptions: { value: MfgStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "QUALITY_CHECK", label: "Quality Check" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ManufacturingClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [bomDialogOrderId, setBomDialogOrderId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshData() {
    startTransition(async () => {
      try {
        const result = await getManufacturingOrders({
          search: search || undefined,
          status: statusFilter === "all" ? undefined : (statusFilter as MfgStatus),
        });
        setData(result);
      } catch {
        // ignore
      }
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
    startTransition(async () => {
      try {
        const result = await getManufacturingOrders({
          search: value || undefined,
          status: statusFilter === "all" ? undefined : (statusFilter as MfgStatus),
        });
        setData(result);
      } catch {
        // ignore
      }
    });
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    startTransition(async () => {
      try {
        const result = await getManufacturingOrders({
          search: search || undefined,
          status: value === "all" ? undefined : (value as MfgStatus),
        });
        setData(result);
      } catch {
        // ignore
      }
    });
  }

  async function handleCreateOrder(formData: FormData) {
    startTransition(async () => {
      try {
        await createManufacturingOrder({
          orderNo: formData.get("orderNo") as string,
          productName: formData.get("productName") as string,
          quantity: parseInt(formData.get("quantity") as string),
          startDate: (formData.get("startDate") as string) || undefined,
          endDate: (formData.get("endDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Manufacturing order created");
        setIsOpen(false);
        refreshData();
      } catch {
        toast.error("Failed to create order");
      }
    });
  }

  async function handleUpdateOrder(formData: FormData) {
    if (!editId) return;
    startTransition(async () => {
      try {
        await updateManufacturingOrder(editId, {
          productName: formData.get("productName") as string,
          quantity: parseInt(formData.get("quantity") as string),
          completedQty: parseInt(formData.get("completedQty") as string) || 0,
          startDate: (formData.get("startDate") as string) || undefined,
          endDate: (formData.get("endDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Order updated");
        setIsOpen(false);
        setEditId(null);
        refreshData();
      } catch {
        toast.error("Failed to update order");
      }
    });
  }

  async function handleStatusChange(orderId: string, newStatus: MfgStatus) {
    startTransition(async () => {
      try {
        await updateMfgOrderStatus(orderId, newStatus);
        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
        refreshData();
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  async function handleAddBOM(formData: FormData) {
    if (!bomDialogOrderId) return;
    startTransition(async () => {
      try {
        await addBOMItem(bomDialogOrderId, {
          itemName: formData.get("itemName") as string,
          quantity: parseFloat(formData.get("quantity") as string),
          unit: (formData.get("unit") as string) || "PCS",
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("BOM item added");
        setBomDialogOrderId(null);
        refreshData();
      } catch {
        toast.error("Failed to add BOM item");
      }
    });
  }

  async function handleRemoveBOM(id: string) {
    startTransition(async () => {
      try {
        await removeBOMItem(id);
        toast.success("BOM item removed");
        refreshData();
      } catch {
        toast.error("Failed to remove BOM item");
      }
    });
  }

  const editOrder = editId ? data.data.find((o) => o.id === editId) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing</h1>
          <p className="text-muted-foreground mt-1">Production orders and bill of materials</p>
        </div>
        <Button onClick={() => { setEditId(null); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or product..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => handleStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Order No</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No manufacturing orders found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((order) => {
                  const progress = order.quantity > 0 ? Math.round((order.completedQty / order.quantity) * 100) : 0;
                  const isExpanded = expandedOrder === order.id;
                  return (
                    <>
                      <TableRow key={order.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">{order.orderNo}</TableCell>
                        <TableCell className="font-medium">{order.productName}</TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(v) => handleStatusChange(order.id, v as MfgStatus)}
                          >
                            <SelectTrigger className="w-[140px] h-7">
                              <Badge className={statusColors[order.status] ?? ""}>{order.status.replace("_", " ")}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">{order.quantity}</TableCell>
                        <TableCell className="text-right">{order.completedQty}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.startDate ? new Date(order.startDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.endDate ? new Date(order.endDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditId(order.id); setIsOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setBomDialogOrderId(order.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* BOM Items */}
                      {isExpanded && (
                        <TableRow key={`${order.id}-bom`}>
                          <TableCell colSpan={10} className="bg-muted/50 p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">Bill of Materials ({order.bomItems.length} items)</h4>
                                <Button variant="outline" size="sm" onClick={() => setBomDialogOrderId(order.id)}>
                                  <Plus className="mr-1 h-3 w-3" /> Add Item
                                </Button>
                              </div>
                              {order.bomItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No BOM items added yet.</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Item</TableHead>
                                      <TableHead>Product</TableHead>
                                      <TableHead className="text-right">Quantity</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead>Notes</TableHead>
                                      <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.bomItems.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.itemName}</TableCell>
                                        <TableCell>{item.product?.name ?? "-"}</TableCell>
                                        <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{item.notes ?? "-"}</TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveBOM(item.id)}
                                            disabled={isPending}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Order Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Manufacturing Order" : "New Manufacturing Order"}</DialogTitle>
          </DialogHeader>
          <form action={editId ? handleUpdateOrder : handleCreateOrder} className="space-y-4">
            {!editId && (
              <div className="space-y-2">
                <Label htmlFor="orderNo">Order Number *</Label>
                <Input id="orderNo" name="orderNo" required placeholder="MO-001" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input id="productName" name="productName" required defaultValue={editOrder?.productName ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" name="quantity" type="number" min="1" required defaultValue={editOrder?.quantity ?? ""} />
              </div>
              {editId && (
                <div className="space-y-2">
                  <Label htmlFor="completedQty">Completed Qty</Label>
                  <Input id="completedQty" name="completedQty" type="number" min="0" defaultValue={editOrder?.completedQty ?? 0} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={editOrder?.startDate ? new Date(editOrder.startDate).toISOString().split("T")[0] : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={editOrder?.endDate ? new Date(editOrder.endDate).toISOString().split("T")[0] : ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editOrder?.notes ?? ""} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add BOM Item Dialog */}
      <Dialog open={!!bomDialogOrderId} onOpenChange={(open) => { if (!open) setBomDialogOrderId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add BOM Item</DialogTitle>
          </DialogHeader>
          <form action={handleAddBOM} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input id="itemName" name="itemName" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bomQty">Quantity *</Label>
                <Input id="bomQty" name="quantity" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bomUnit">Unit</Label>
                <Input id="bomUnit" name="unit" defaultValue="PCS" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bomNotes">Notes</Label>
              <Textarea id="bomNotes" name="notes" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
