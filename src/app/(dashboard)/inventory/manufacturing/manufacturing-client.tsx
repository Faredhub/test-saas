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
import { Plus, Search, Loader2, Pencil, Eye, Trash2, Factory, ChevronDown, ChevronRight } from "lucide-react";
import {
  createManufacturingOrder, updateManufacturingOrder, updateMfgOrderStatus,
  deleteManufacturingOrder, addBOMItem, removeBOMItem, getManufacturingOrders,
} from "@/lib/actions/inventory";
import { toast } from "sonner";
import type { MfgStatus } from "@/generated/prisma/enums";

type Props = {
  initialData: Awaited<ReturnType<typeof getManufacturingOrders>>;
  products: { id: string; label: string; sublabel: string }[];
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  QUALITY_CHECK: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const statusOptions: { value: MfgStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "QUALITY_CHECK", label: "Quality Check" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ManufacturingClient({ initialData, products }: Props) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
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
          productId: (formData.get("productId") as string) || undefined,
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
          productId: (formData.get("productId") as string) || undefined,
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

  async function handleDeleteOrder(id: string, orderNo: string) {
    if (!confirm(`Are you sure you want to delete production order ${orderNo}?`)) return;
    startTransition(async () => {
      try {
        await deleteManufacturingOrder(id);
        toast.success(`Deleted order ${orderNo}`);
        refreshData();
      } catch {
        toast.error("Failed to delete order");
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

  async function handleAddBOMItem(formData: FormData) {
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

  async function handleRemoveBOMItem(id: string) {
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
    <div className="space-y-6 p-6 text-foreground">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Factory className="h-8 w-8 text-purple-600 dark:text-purple-400" /> Manufacturing
          </h1>
          <p className="text-muted-foreground mt-1">Production orders and bill of materials</p>
        </div>
        <Button onClick={() => { setEditId(null); setIsOpen(true); }} className="bg-blue-600 text-white">
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
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
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                <TableHead className="w-8"></TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Order No</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Component Status</TableHead>
                <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Qty</TableHead>
                <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Completed</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Progress</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Start</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">End</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Actions</TableHead>
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
                      <TableRow key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border">
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
                        <TableCell className="font-mono font-semibold text-purple-600 dark:text-purple-400">{order.orderNo}</TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white">{order.productName}</TableCell>
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
                        <TableCell>
                          {order.status === "COMPLETED" || order.status === "IN_PROGRESS" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold">
                              Not Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 dark:text-white">{order.quantity}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{order.completedQty}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {order.startDate ? new Date(order.startDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {order.endDate ? new Date(order.endDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-3">
                            {/* VIEW ICON - BLUE */}
                            <button
                              type="button"
                              title="View Details"
                              onClick={() => setViewOrder(order)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* EDIT ICON - BLACK / WHITE */}
                            <button
                              type="button"
                              title="Edit Order"
                              onClick={() => { setEditId(order.id); setIsOpen(true); }}
                              className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            {/* DELETE ICON - RED */}
                            <button
                              type="button"
                              title="Delete Order"
                              onClick={() => handleDeleteOrder(order.id, order.orderNo)}
                              disabled={isPending}
                              className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* BOM Items Expandable */}
                      {isExpanded && (
                        <TableRow key={`${order.id}-bom`}>
                          <TableCell colSpan={10} className="bg-slate-50/90 dark:bg-slate-800/80 p-4 border-b border-border">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Bill of Materials ({order.bomItems.length} items)</h4>
                                <Button variant="outline" size="sm" onClick={() => setBomDialogOrderId(order.id)} className="h-7 text-xs">
                                  <Plus className="mr-1 h-3 w-3" /> Add BOM Item
                                </Button>
                              </div>
                              {order.bomItems.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No BOM items added yet.</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-card">
                                      <TableHead className="text-xs font-bold">Item Name</TableHead>
                                      <TableHead className="text-xs font-bold text-right">Quantity</TableHead>
                                      <TableHead className="text-xs font-bold">Unit</TableHead>
                                      <TableHead className="text-xs font-bold">Notes</TableHead>
                                      <TableHead className="text-xs font-bold text-right">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.bomItems.map((bom) => (
                                      <TableRow key={bom.id} className="bg-card">
                                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">{bom.itemName}</TableCell>
                                        <TableCell className="text-xs font-bold text-right">{Number(bom.quantity)}</TableCell>
                                        <TableCell className="text-xs">{bom.unit}</TableCell>
                                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{bom.notes || "-"}</TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveBOMItem(bom.id)}
                                            className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* CREATE / EDIT ORDER DIALOG */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setEditId(null); }}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Production Order" : "New Production Order"}</DialogTitle>
          </DialogHeader>
          <form action={editId ? handleUpdateOrder : handleCreateOrder} className="space-y-4 py-2">
            {!editId && (
              <div>
                <Label htmlFor="orderNo" className="text-xs font-semibold">Order Number *</Label>
                <Input id="orderNo" name="orderNo" placeholder="MO-2026-001" required className="mt-1" />
              </div>
            )}
            <div>
              <Label htmlFor="productName" className="text-xs font-semibold">Finished Product Name *</Label>
              <Input id="productName" name="productName" defaultValue={editOrder?.productName ?? ""} placeholder="e.g. Subh" required className="mt-1" />
              <Label htmlFor="productId" className="text-xs font-semibold mt-3">Linked Product (optional)</Label>
              <select id="productId" name="productId" defaultValue={editOrder?.productId ?? ""} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">None</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}{p.sublabel ? ` (${p.sublabel})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity" className="text-xs font-semibold">Target Quantity *</Label>
                <Input id="quantity" name="quantity" type="number" min="1" defaultValue={editOrder?.quantity ?? 1} required className="mt-1" />
              </div>
              {editId && (
                <div>
                  <Label htmlFor="completedQty" className="text-xs font-semibold">Completed Qty</Label>
                  <Input id="completedQty" name="completedQty" type="number" min="0" defaultValue={editOrder?.completedQty ?? 0} className="mt-1" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-xs font-semibold">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={editOrder?.startDate ? new Date(editOrder.startDate).toISOString().split("T")[0] : ""} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-xs font-semibold">End Date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={editOrder?.endDate ? new Date(editOrder.endDate).toISOString().split("T")[0] : ""} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs font-semibold">Notes / Description</Label>
              <Textarea id="notes" name="notes" defaultValue={editOrder?.notes ?? ""} placeholder="Production notes..." className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setEditId(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 text-white">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Order" : "Create Order"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW ORDER DETAILS DIALOG */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Factory className="h-5 w-5 text-purple-600 dark:text-purple-400" /> Manufacturing Order Details
            </DialogTitle>
            <p className="font-mono text-purple-600 dark:text-purple-400 font-bold text-xs">
              {viewOrder?.orderNo}
            </p>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Finished Product:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewOrder.productName}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Target Quantity:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewOrder.quantity} units</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Completed Quantity:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewOrder.completedQty} units</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                <Badge className={statusColors[viewOrder.status] ?? ""}>
                  {viewOrder.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Start Date:</span>
                <span className="text-slate-900 dark:text-white">{viewOrder.startDate ? new Date(viewOrder.startDate).toLocaleDateString() : "-"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">End Date:</span>
                <span className="text-slate-900 dark:text-white">{viewOrder.endDate ? new Date(viewOrder.endDate).toLocaleDateString() : "-"}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Bill of Materials ({viewOrder.bomItems?.length || 0} items):</span>
                <div className="space-y-1 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded border border-border text-xs">
                  {viewOrder.bomItems && viewOrder.bomItems.length > 0 ? (
                    viewOrder.bomItems.map((b: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-slate-800 dark:text-slate-200 font-semibold">
                        <span>{b.itemName}</span>
                        <span>{b.quantity} {b.unit || "PCS"}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic">No BOM items configured</p>
                  )}
                </div>
              </div>

              {viewOrder.notes && (
                <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300">
                  <span className="font-bold block mb-0.5">Notes:</span>
                  {viewOrder.notes}
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button onClick={() => setViewOrder(null)} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD BOM ITEM DIALOG */}
      <Dialog open={!!bomDialogOrderId} onOpenChange={() => setBomDialogOrderId(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Add Bill of Materials Item</DialogTitle>
          </DialogHeader>
          <form action={handleAddBOMItem} className="space-y-4 py-2">
            <div>
              <Label htmlFor="itemName" className="text-xs font-semibold">Raw Material / Item Name *</Label>
              <Input id="itemName" name="itemName" placeholder="e.g. Steel Sheets, Screws" required className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity" className="text-xs font-semibold">Quantity Required *</Label>
                <Input id="quantity" name="quantity" type="number" step="0.01" min="0.01" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="unit" className="text-xs font-semibold">Unit of Measure</Label>
                <Input id="unit" name="unit" placeholder="PCS, KG, LTR" defaultValue="PCS" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="bomNotes" className="text-xs font-semibold">Notes</Label>
              <Input id="bomNotes" name="notes" placeholder="Specification..." className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBomDialogOrderId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 text-white">
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
