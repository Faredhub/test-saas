"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogClose,
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
  Settings2,
  DollarSign,
  Zap,
  Gift,
  MapPin,
  ShieldCheck,
  Navigation,
  Box
} from "lucide-react";
import { createDeliveryOrder, validateDeliveryOrder, updateDeliveryOrder, deleteDeliveryOrder } from "@/lib/actions/inventory";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-permission";

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

interface DeliveryMethod {
  id: string;
  name: string;
  carrier: string;
  scope: "Domestic" | "International" | "Global";
  pricingRule: string;
  baseCost: number;
  freeThreshold?: number;
  transitTime: string;
  trackingSupport: boolean;
  status: "ACTIVE" | "INACTIVE";
}

interface DeliveriesClientProps {
  deliveries: DeliveryOrder[];
  availableProducts?: string[];
  contacts: { id: string; label: string; sublabel: string }[];
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

export function DeliveriesClient({ deliveries, availableProducts = [], contacts }: DeliveriesClientProps) {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const allowCreate = canCreate("stock", "inventory") || canCreate("deliveries", "inventory");
  const allowUpdate = canUpdate("stock", "inventory") || canUpdate("deliveries", "inventory");
  const allowDelete = canDelete("stock", "inventory") || canDelete("deliveries", "inventory");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected delivery for View / Edit / Delete
  const [viewDelivery, setViewDelivery] = useState<DeliveryOrder | null>(null);
  const [editDelivery, setEditDelivery] = useState<DeliveryOrder | null>(null);

  // Selected Delivery Method for View / Edit
  const [viewingMethod, setViewingMethod] = useState<DeliveryMethod | null>(null);
  const [editingMethod, setEditingMethod] = useState<DeliveryMethod | null>(null);

  // New Delivery form state
  const [contactName, setContactName] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [productName, setProductName] = useState("");
  const [demandQty, setDemandQty] = useState("1");
  const [notes, setNotes] = useState("");

  // Edit Delivery form state
  const [editContactName, setEditContactName] = useState("");
  const [editContactId, setEditContactId] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editSourceDoc, setEditSourceDoc] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Delivery Methods Rules State (localStorage persistence)
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tixel_delivery_methods_list");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.some((m: any) => m.id?.startsWith("dm-"))) {
            setDeliveryMethods([]);
            localStorage.removeItem("tixel_delivery_methods_list");
            return;
          }
          setDeliveryMethods(parsed);
          return;
        } catch (e) {}
      }
      setDeliveryMethods([]);
    }
  }, []);

  const saveMethodsToStorage = (newList: DeliveryMethod[]) => {
    setDeliveryMethods(newList);
    if (typeof window !== "undefined") {
      localStorage.setItem("tixel_delivery_methods_list", JSON.stringify(newList));
    }
  };

  // Form State for Create Delivery Method
  const [methodName, setMethodName] = useState("");
  const [methodCarrier, setMethodCarrier] = useState("");
  const [methodBaseCost, setMethodBaseCost] = useState("15.00");
  const [methodFreeThreshold, setMethodFreeThreshold] = useState("500.00");
  const [methodTransitTime, setMethodTransitTime] = useState("2 - 3 Days");
  const [methodRuleType, setMethodRuleType] = useState<"FIXED" | "FREE_THRESHOLD" | "WEIGHT">("FIXED");

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
          contactId: contactId || undefined,
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
        setContactId("");
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

  const handleCreateDeliveryMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodName.trim() || !methodCarrier.trim()) {
      toast.error("Method name and carrier configuration are required");
      return;
    }

    let pricingRuleText = `Fixed Price ($${parseFloat(methodBaseCost) || 0})`;
    if (methodRuleType === "FREE_THRESHOLD") {
      pricingRuleText = `Free for Orders > $${parseFloat(methodFreeThreshold) || 500}`;
    } else if (methodRuleType === "WEIGHT") {
      pricingRuleText = `Weight-Based ($${parseFloat(methodBaseCost) || 5}/kg)`;
    }

    const newMethod: DeliveryMethod = {
      id: `dm-${Date.now()}`,
      name: methodName.trim(),
      carrier: methodCarrier.trim(),
      scope: "Domestic",
      pricingRule: pricingRuleText,
      baseCost: parseFloat(methodBaseCost) || 0,
      freeThreshold: methodRuleType === "FREE_THRESHOLD" ? parseFloat(methodFreeThreshold) || 500 : undefined,
      transitTime: methodTransitTime.trim(),
      trackingSupport: true,
      status: "ACTIVE",
    };

    const updated = [...deliveryMethods, newMethod];
    saveMethodsToStorage(updated);
    toast.success(`Delivery method "${methodName}" created with carrier pricing rules!`);
    setIsMethodModalOpen(false);
    setMethodName("");
    setMethodCarrier("");
  };

  const handleSaveEditMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    const updated = deliveryMethods.map((m) => (m.id === editingMethod.id ? editingMethod : m));
    saveMethodsToStorage(updated);
    toast.success(`Delivery method "${editingMethod.name}" updated successfully`);
    setEditingMethod(null);
  };

  const handleDeleteMethod = (method: DeliveryMethod) => {
    const updated = deliveryMethods.filter((m) => m.id !== method.id);
    saveMethodsToStorage(updated);
    toast.success(`Delivery method "${method.name}" deleted successfully`);
  };

  const handleOpenEdit = (delivery: DeliveryOrder) => {
    setEditDelivery(delivery);
    setEditContactName(delivery.contactName);
    setEditContactId((delivery as unknown as { contactId?: string }).contactId || "");
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
          contactId: editContactId || undefined,
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
            <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Deliveries & Shipping Operations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage delivery orders, stock picking, carrier configurations, and custom pricing rules.
          </p>
        </div>

        {allowCreate && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsMethodModalOpen(true)} variant="outline" className="gap-2 border-slate-300">
              <Settings2 className="h-4 w-4 text-emerald-600" /> Add Delivery Method
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2">
              <Plus className="h-4 w-4" /> Create Delivery Order
            </Button>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Delivery Methods</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{deliveryMethods.length}</p>
            </div>
            <Settings2 className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{deliveries.length}</p>
            </div>
            <Truck className="h-8 w-8 text-blue-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ready to Pick/Ship</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {deliveries.filter((d) => d.status === "READY" || d.status === "WAITING").length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Delivered Orders</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {deliveries.filter((d) => d.status === "DONE").length}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs (Delivery Orders & Delivery Methods) */}
      <Tabs defaultValue="methods" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-lg bg-muted/60 p-1">
          <TabsTrigger value="methods" className="gap-2 px-4 py-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4 text-emerald-600 shrink-0" /> Delivery Methods
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2 px-4 py-2 text-sm font-semibold">
            <Truck className="h-4 w-4 text-blue-600 shrink-0" /> Delivery Orders
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DELIVERY METHODS (SPECIFICATION IMPLEMENTATION - STANDARD, EXPRESS, SAME-DAY, FREE, PICKUP, COURIER) */}
        <TabsContent value="methods" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                    <Settings2 className="h-5 w-5 text-emerald-600" /> Configured Delivery Methods & Carrier Pricing Rules
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Define delivery methods (Standard, Express, Same-Day, Free Shipping, Local Pickup, Courier) with carrier configurations and custom pricing rules.
                  </CardDescription>
                </div>

                {allowCreate && (
                  <Button onClick={() => setIsMethodModalOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                    <Plus className="h-4 w-4" /> Add Delivery Method
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Carrier Configuration</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Pricing Rule</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Base Shipping Cost</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Estimated Transit Time</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryMethods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        No delivery methods configured. Click "Add Delivery Method" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveryMethods.map((method) => (
                      <TableRow key={method.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {method.name.includes("Standard") && <Truck className="h-4 w-4 text-blue-600" />}
                          {method.name.includes("Express") && <Zap className="h-4 w-4 text-amber-500" />}
                          {method.name.includes("Same-Day") && <Clock className="h-4 w-4 text-rose-500" />}
                          {method.name.includes("Overnight") && <Zap className="h-4 w-4 text-purple-600" />}
                          {method.name.includes("Free") && <Gift className="h-4 w-4 text-emerald-600" />}
                          {(method.name.includes("Pickup") || method.name.includes("Store")) && <MapPin className="h-4 w-4 text-indigo-600" />}
                          {method.name.includes("Courier") && <Box className="h-4 w-4 text-slate-600" />}
                          <span>{method.name}</span>
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">{method.carrier}</TableCell>

                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                            {method.pricingRule}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {method.baseCost === 0 ? <span className="text-emerald-600 font-extrabold">$0.00 (FREE)</span> : `$${method.baseCost.toFixed(2)}`}
                        </TableCell>

                        <TableCell className="text-xs font-mono text-slate-600">{method.transitTime}</TableCell>

                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800">{method.status}</Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* VIEW BUTTON (BLUE) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingMethod(method)}
                              title="View Delivery Method Details"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* EDIT BUTTON (BLACK) */}
                            {allowUpdate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMethod(method)}
                                title="Edit Delivery Method"
                                className="h-8 w-8 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}

                            {/* DELETE BUTTON (RED) */}
                            {allowDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMethod(method)}
                                title="Delete Delivery Method"
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* TAB 2: DELIVERY ORDERS */}
        <TabsContent value="orders" className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search delivery no, contact, or source..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-xs font-semibold shrink-0">Filter Status:</Label>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "ALL")}>
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="WAITING">Waiting</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery Orders Table */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                    <TableHead>Delivery Ref</TableHead>
                    <TableHead>Customer / Contact</TableHead>
                    <TableHead>Source Doc</TableHead>
                    <TableHead>Product Demand</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        No delivery orders found. Click "Create Delivery Order" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeliveries.map((delivery) => (
                      <TableRow key={delivery.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono text-sm font-bold text-blue-600">{delivery.deliveryNo}</TableCell>
                        <TableCell>
                          <div className="font-semibold">{delivery.contactName}</div>
                          {delivery.contactPhone && <div className="text-xs text-muted-foreground">{delivery.contactPhone}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">{delivery.sourceDocument || "N/A"}</TableCell>
                        <TableCell>
                          {delivery.items.map((item, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-medium">{item.productName}</span>:{" "}
                              <span className="font-bold text-blue-600">{item.doneQty}</span> / {item.demandQty} units
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{formatRelativeDate(delivery.scheduledDate)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              delivery.status === "DONE"
                                ? "bg-emerald-100 text-emerald-800"
                                : delivery.status === "READY"
                                ? "bg-blue-100 text-blue-800"
                                : delivery.status === "WAITING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                            }
                          >
                            {delivery.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewDelivery(delivery)}
                              title="View Order"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {allowUpdate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(delivery)}
                                title="Edit Order"
                                className="h-8 w-8 text-slate-900 dark:text-slate-100 hover:bg-slate-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {allowDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(delivery.id, delivery.deliveryNo)}
                                title="Delete Order"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* CREATE DELIVERY METHOD DIALOG */}
      {isMethodModalOpen && (
        <Dialog open={isMethodModalOpen} onOpenChange={setIsMethodModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                <Settings2 className="h-5 w-5 text-emerald-600" /> Create Delivery Method & Pricing Rule
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateDeliveryMethodSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Delivery Method Name *</Label>
                <Input
                  placeholder="e.g. Standard Delivery / Express Delivery / Same-Day"
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Carrier / Provider Configuration *</Label>
                <Input
                  placeholder="e.g. FedEx / DHL / In-House Fleet / BlueDart"
                  value={methodCarrier}
                  onChange={(e) => setMethodCarrier(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pricing Rule Type</Label>
                  <select
                    value={methodRuleType}
                    onChange={(e) => setMethodRuleType(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="FIXED">Fixed Shipping Rate</option>
                    <option value="FREE_THRESHOLD">Free Shipping Threshold</option>
                    <option value="WEIGHT">Weight-Based Calculation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Base Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="15.00"
                    value={methodBaseCost}
                    onChange={(e) => setMethodBaseCost(e.target.value)}
                  />
                </div>
              </div>

              {methodRuleType === "FREE_THRESHOLD" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Minimum Order Total for Free Shipping ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="500.00"
                    value={methodFreeThreshold}
                    onChange={(e) => setMethodFreeThreshold(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estimated Transit Time</Label>
                <Input
                  placeholder="e.g. 3 - 5 Days OR Same Day (4 Hours)"
                  value={methodTransitTime}
                  onChange={(e) => setMethodTransitTime(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Create Delivery Method</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* VIEW DELIVERY METHOD DIALOG */}
      {viewingMethod && (
        <Dialog open={!!viewingMethod} onOpenChange={() => setViewingMethod(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-600">
                <Eye className="h-5 w-5 text-blue-600" /> Delivery Method & Carrier Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Method Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingMethod.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Carrier Configuration:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingMethod.carrier}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Pricing Rule:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800">{viewingMethod.pricingRule}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Base Shipping Cost:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {viewingMethod.baseCost === 0 ? "$0.00 (FREE)" : `$${viewingMethod.baseCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Estimated Transit Time:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{viewingMethod.transitTime}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-emerald-100 text-emerald-800">{viewingMethod.status}</Badge>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT DELIVERY METHOD DIALOG */}
      {editingMethod && (
        <Dialog open={!!editingMethod} onOpenChange={() => setEditingMethod(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Pencil className="h-5 w-5 text-slate-800" /> Edit Delivery Method & Carrier Rules
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditMethod} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Delivery Method Name *</Label>
                <Input
                  value={editingMethod.name}
                  onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Carrier Configuration *</Label>
                <Input
                  value={editingMethod.carrier}
                  onChange={(e) => setEditingMethod({ ...editingMethod, carrier: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pricing Rule</Label>
                  <Input
                    value={editingMethod.pricingRule}
                    onChange={(e) => setEditingMethod({ ...editingMethod, pricingRule: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Base Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingMethod.baseCost}
                    onChange={(e) => setEditingMethod({ ...editingMethod, baseCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estimated Transit Time</Label>
                <Input
                  value={editingMethod.transitTime}
                  onChange={(e) => setEditingMethod({ ...editingMethod, transitTime: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 font-semibold">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE DELIVERY ORDER DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                onChange={(e) => { setContactName(e.target.value); setContactId(""); }}
                className="mt-1"
              />
              <select
                value={contactId}
                onChange={(e) => {
                  setContactId(e.target.value);
                  const c = contacts.find((x) => x.id === e.target.value);
                  if (c) setContactName(c.label);
                }}
                className="mt-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">— Link to existing client (optional) —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}{c.sublabel ? ` (${c.sublabel})` : ""}</option>
                ))}
              </select>
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
                  value={demandQty}
                  onChange={(e) => setDemandQty(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Order Notes</Label>
              <Input
                placeholder="Delivery instructions..."
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
              {isPending ? "Creating..." : "Create Delivery Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
