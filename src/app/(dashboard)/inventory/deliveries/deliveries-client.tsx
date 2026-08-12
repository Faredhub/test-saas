"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Package,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react";
import { createDeliveryOrder, validateDeliveryOrder, updateDeliveryOrder, deleteDeliveryOrder } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface DeliveryItem {
  id: string;
  productName: string;
  demandQty: number;
  doneQty: number;
}

interface DeliveryOrder {
  id: string;
  deliveryNo: string;
  sourceDocument?: string | null;
  contactName: string;
  contactPhone?: string | null;
  scheduledDate: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  notes?: string | null;
  items: DeliveryItem[];
}

interface DeliveriesClientProps {
  deliveries: DeliveryOrder[];
  availableProducts?: string[];
}

function formatRelativeDate(isoDate: string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffTime = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
}

export function DeliveriesClient({ deliveries, availableProducts = [] }: DeliveriesClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected delivery for View / Edit / Delete
  const [viewDelivery, setViewDelivery] = useState<DeliveryOrder | null>(null);
  const [editDelivery, setEditDelivery] = useState<DeliveryOrder | null>(null);

  // New Delivery form state
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [productName, setProductName] = useState("");
  const [demandQty, setDemandQty] = useState("1");
  const [notes, setNotes] = useState("");

  // Edit Delivery form state
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editSourceDoc, setEditSourceDoc] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.deliveryNo.toLowerCase().includes(search.toLowerCase()) ||
      d.contactName.toLowerCase().includes(search.toLowerCase()) ||
      (d.sourceDocument && d.sourceDocument.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDelivery = () => {
    if (!contactName.trim() || !productName.trim()) {
      toast.error("Contact name and product name are required");
      return;
    }

    startTransition(async () => {
      try {
        await createDeliveryOrder({
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || undefined,
          sourceDocument: sourceDocument.trim() || undefined,
          notes: notes.trim() || undefined,
          items: [
            {
              productName: productName.trim(),
              demandQty: parseInt(demandQty) || 1,
            },
          ],
        });
        toast.success("Delivery Order created successfully!");
        setIsModalOpen(false);
        setContactName("");
        setContactPhone("");
        setSourceDocument("");
        setProductName("");
        setDemandQty("1");
        setNotes("");
      } catch (err: any) {
        toast.error(err?.message || "Failed to create delivery order");
      }
    });
  };

  const handleOpenEdit = (delivery: DeliveryOrder) => {
    setEditDelivery(delivery);
    setEditContactName(delivery.contactName);
    setEditContactPhone(delivery.contactPhone || "");
    setEditSourceDoc(delivery.sourceDocument || "");
    setEditNotes(delivery.notes || "");
  };

  const handleSaveEdit = () => {
    if (!editDelivery) return;
    startTransition(async () => {
      try {
        await updateDeliveryOrder(editDelivery.id, {
          contactName: editContactName.trim(),
          contactPhone: editContactPhone.trim() || undefined,
          sourceDocument: editSourceDoc.trim() || undefined,
          notes: editNotes.trim() || undefined,
        });
        toast.success(`Updated ${editDelivery.deliveryNo}`);
        setEditDelivery(null);
      } catch (err: any) {
        toast.error(err?.message || "Failed to update delivery order");
      }
    });
  };

  const handleDelete = (id: string, deliveryNo: string) => {
    if (!confirm(`Are you sure you want to delete delivery order ${deliveryNo}?`)) return;

    startTransition(async () => {
      try {
        await deleteDeliveryOrder(id);
        toast.success(`Deleted delivery order ${deliveryNo}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete delivery order");
      }
    });
  };

  return (
    <div className="p-6 space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Deliveries & Order Shipping
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Automated delivery order creation on Sales Order confirmation with stock picking & tracking.
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
              <Plus className="h-4 w-4 mr-2" /> Create Delivery Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
            <DialogHeader>
              <DialogTitle>New Delivery Order</DialogTitle>
              <DialogDescription>
                Create a delivery order for stock picking and shipping.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold">Contact / Customer Name *</Label>
                <Input
                  placeholder="e.g. John Doe / Acma Ltd"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Source Document</Label>
                <Input
                  placeholder="e.g. SO-1002 / STORE-ONLINE"
                  value={sourceDocument}
                  onChange={(e) => setSourceDocument(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold">Product Name *</Label>
                  <Select value={productName} onValueChange={(val) => setProductName(val ?? "")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select product item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((prod) => (
                        <SelectItem key={prod} value={prod}>
                          {prod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Demand Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={demandQty}
                    onChange={(e) => setDemandQty(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Shipping Notes</Label>
                <Input
                  placeholder="Express delivery / Gate #2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDelivery} disabled={isPending} className="bg-blue-600 text-white">
                Create Delivery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search reference no, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {["ALL", "WAITING", "READY", "DONE"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="text-xs"
              >
                {st}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Delivery Orders ({filteredDeliveries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Reference No</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Contact / Customer</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Schedule Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Source Document</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Items Demanded</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No delivery orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border">
                    <TableCell className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      {delivery.deliveryNo}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{delivery.contactName}</div>
                      {delivery.contactPhone && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">{delivery.contactPhone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border">
                        <Clock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                        {formatRelativeDate(delivery.scheduledDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-border">
                        {delivery.sourceDocument || "DIRECT"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {delivery.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Package className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                            <span>{it.productName}</span>
                            <span className="font-bold text-slate-900 dark:text-white">({it.doneQty}/{it.demandQty})</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {delivery.status === "DONE" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> DONE
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-semibold">
                          {delivery.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* VIEW ICON - BLUE */}
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => setViewDelivery(delivery)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* EDIT ICON - BLACK / WHITE */}
                        <button
                          type="button"
                          title="Edit Delivery"
                          onClick={() => handleOpenEdit(delivery)}
                          className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* DELETE ICON - RED */}
                        <button
                          type="button"
                          title="Delete Delivery"
                          onClick={() => handleDelete(delivery.id, delivery.deliveryNo)}
                          disabled={isPending}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIEW DELIVERY DETAILS MODAL */}
      <Dialog open={!!viewDelivery} onOpenChange={() => setViewDelivery(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Delivery Order Details
            </DialogTitle>
            <DialogDescription className="font-mono text-blue-600 dark:text-blue-400 font-bold text-xs">
              {viewDelivery?.deliveryNo}
            </DialogDescription>
          </DialogHeader>

          {viewDelivery && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Customer / Contact:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewDelivery.contactName}</span>
              </div>
              {viewDelivery.contactPhone && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Phone:</span>
                  <span className="text-slate-900 dark:text-white">{viewDelivery.contactPhone}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Source Document:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewDelivery.sourceDocument || "DIRECT"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Scheduled Date:</span>
                <span className="text-slate-900 dark:text-white">{formatRelativeDate(viewDelivery.scheduledDate)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                <Badge variant={viewDelivery.status === "DONE" ? "default" : "secondary"}>
                  {viewDelivery.status}
                </Badge>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Items Demanded:</span>
                <div className="space-y-1 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded border border-border">
                  {viewDelivery.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>{it.productName}</span>
                      <span>Done: {it.doneQty} / Demand: {it.demandQty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewDelivery.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-0.5">Notes:</span>
                  {viewDelivery.notes}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewDelivery(null)} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DELIVERY ORDER MODAL */}
      <Dialog open={!!editDelivery} onOpenChange={() => setEditDelivery(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Edit Delivery Order
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {editDelivery?.deliveryNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Contact / Customer Name</Label>
              <Input
                value={editContactName}
                onChange={(e) => setEditContactName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Contact Phone</Label>
              <Input
                value={editContactPhone}
                onChange={(e) => setEditContactPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Source Document</Label>
              <Input
                value={editSourceDoc}
                onChange={(e) => setEditSourceDoc(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Shipping Notes</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDelivery(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isPending} className="bg-blue-600 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
