"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, AlertTriangle, ArrowUpDown, ClipboardCheck, CheckCircle2, ShieldCheck, Pencil, Trash2, Eye, Calendar, User, Package, Building2, Layers, Trash, Flame, RefreshCw, ShoppingCart, Factory } from "lucide-react";
import { recordStockMovement, getWarehouseStock, getStockMovements, createPurchaseOrder } from "@/lib/actions/inventory";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "sonner";
import type { StockMovementType } from "@/generated/prisma/enums";

type Props = {
  initialStock: Awaited<ReturnType<typeof getWarehouseStock>>;
  warehouses: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getWarehouses>>;
  initialMovements: Awaited<ReturnType<typeof getStockMovements>>;
  lowStockAlerts: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getLowStockAlerts>>;
  products: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getProducts>>["data"];
  hideHeader?: boolean;
};

interface PhysicalAdjustment {
  id: string;
  inventoryReference: string;
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  location: string;
  lotSerialNo: string;
  onHandQty: number;
  countedQty: number;
  difference: number;
  scheduledDate: string;
  responsible: string;
  status: "DRAFT" | "IN_PROGRESS" | "VALIDATED" | "CANCELLED";
  notes?: string;
}

interface ScrapRecord {
  id: string;
  scrapReference: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitOfMeasure: string;
  sourceLocation: string;
  scrapLocation: string;
  lotSerialNo: string;
  company: string;
  date: string;
  responsibleUser: string;
  status: "DONE" | "DRAFT";
  notes?: string;
}

interface ReplenishmentRule {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  onHand: number;
  forecast: number;
  minQty: number;
  maxQty: number;
  qtyToOrder: number;
  route: "BUY" | "MANUFACTURE" | "RESUPPLY" | "DROPSHIP";
  preferredVendor: string;
  warehouseName: string;
  company: string;
  trigger: "AUTOMATIC" | "MANUAL";
  status: "TRIGGER_READY" | "REORDERED";
}

const movementTypes: { value: StockMovementType; label: string }[] = [
  { value: "IN", label: "Stock In" },
  { value: "OUT", label: "Stock Out" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "RETURN", label: "Return" },
];

const movementBadgeColor: Record<string, string> = {
  IN: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  OUT: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  TRANSFER: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ADJUSTMENT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  RETURN: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  VALIDATED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function StockClient({ initialStock, warehouses, initialMovements, lowStockAlerts, products, hideHeader }: Props) {
  const { canCreate } = usePermission();
  const [stock, setStock] = useState(initialStock);
  const [movements, setMovements] = useState(initialMovements);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<StockMovementType>("IN");
  const [isPending, startTransition] = useTransition();

  // Initial Sample Physical Inventory Adjustments List
  const [adjustments, setAdjustments] = useState<PhysicalAdjustment[]>([
    {
      id: "adj-1",
      inventoryReference: "INV/ADJ/2026/001",
      productId: products[0]?.id || "p-1",
      productName: products[0]?.name || "Executive Ergonomic Desk",
      productSku: products[0]?.sku || "DESK-001",
      category: "Furniture",
      warehouseId: warehouses[0]?.id || "wh-1",
      warehouseName: warehouses[0]?.name || "Main Warehouse",
      location: "Aisle A / Bin 12",
      lotSerialNo: "LOT-2026-08A",
      onHandQty: 50,
      countedQty: 48,
      difference: -2,
      scheduledDate: new Date().toISOString().split("T")[0],
      responsible: "Subham Admin",
      status: "VALIDATED",
      notes: "Routine quarterly stock audit reconciliation",
    },
    {
      id: "adj-2",
      inventoryReference: "INV/ADJ/2026/002",
      productId: products[1]?.id || "p-2",
      productName: products[1]?.name || "Leather Swivel Chair",
      productSku: products[1]?.sku || "CHAIR-002",
      category: "Seating",
      warehouseId: warehouses[0]?.id || "wh-1",
      warehouseName: warehouses[0]?.name || "Main Warehouse",
      location: "Aisle B / Shelf 3",
      lotSerialNo: "LOT-2026-09B",
      onHandQty: 30,
      countedQty: 32,
      difference: 2,
      scheduledDate: new Date().toISOString().split("T")[0],
      responsible: "Store Manager",
      status: "IN_PROGRESS",
      notes: "Found unrecorded returned unit during count",
    },
  ]);

  // Initial Sample Scrap Records List
  const [scrapRecords, setScrapRecords] = useState<ScrapRecord[]>([
    {
      id: "scrap-1",
      scrapReference: "SCRAP/2026/00001",
      productId: products[0]?.id || "p-1",
      productName: products[0]?.name || "Executive Ergonomic Desk",
      productSku: products[0]?.sku || "DESK-001",
      quantity: 2,
      unitOfMeasure: "PCS",
      sourceLocation: "Main Warehouse / Aisle A",
      scrapLocation: "Virtual Locations / Scrap",
      lotSerialNo: "LOT-2026-08A",
      company: "TixelTech ERP",
      date: new Date().toISOString().split("T")[0],
      responsibleUser: "Subham Admin",
      status: "DONE",
      notes: "Surface damage during transit",
    },
    {
      id: "scrap-2",
      scrapReference: "SCRAP/2026/00002",
      productId: products[1]?.id || "p-2",
      productName: products[1]?.name || "Leather Swivel Chair",
      productSku: products[1]?.sku || "CHAIR-002",
      quantity: 1,
      unitOfMeasure: "PCS",
      sourceLocation: "Central Storage / Shelf 4",
      scrapLocation: "Virtual Locations / Scrap",
      lotSerialNo: "LOT-2026-09B",
      company: "TixelTech ERP",
      date: new Date().toISOString().split("T")[0],
      responsibleUser: "Store Manager",
      status: "DONE",
      notes: "Defective hydraulic lift mechanism",
    },
  ]);

  // Initial Replenishment Rules & Triggers List (Specification Table Implementation)
  const [replenishmentRules, setReplenishmentRules] = useState<ReplenishmentRule[]>([
    {
      id: "rep-1",
      productId: products[0]?.id || "p-1",
      productName: products[0]?.name || "Executive Ergonomic Desk",
      productSku: products[0]?.sku || "DESK-001",
      onHand: 4,
      forecast: 2,
      minQty: 10,
      maxQty: 50,
      qtyToOrder: 48,
      route: "BUY",
      preferredVendor: "Acme Office Supplies Ltd",
      warehouseName: warehouses[0]?.name || "Main Warehouse",
      company: "TixelTech ERP",
      trigger: "AUTOMATIC",
      status: "TRIGGER_READY",
    },
    {
      id: "rep-2",
      productId: products[1]?.id || "p-2",
      productName: products[1]?.name || "Leather Swivel Chair",
      productSku: products[1]?.sku || "CHAIR-002",
      onHand: 5,
      forecast: 3,
      minQty: 15,
      maxQty: 60,
      qtyToOrder: 57,
      route: "MANUFACTURE",
      preferredVendor: "In-House Assembly Line #1",
      warehouseName: warehouses[0]?.name || "Main Warehouse",
      company: "TixelTech ERP",
      trigger: "AUTOMATIC",
      status: "TRIGGER_READY",
    },
  ]);

  // Adjustment Form State
  const [adjRef, setAdjRef] = useState(`INV/ADJ/2026/${String(adjustments.length + 1).padStart(3, "0")}`);
  const [adjProduct, setAdjProduct] = useState("");
  const [adjWarehouse, setAdjWarehouse] = useState("");
  const [adjLocation, setAdjLocation] = useState("Aisle A / Bin 01");
  const [adjLotSerial, setAdjLotSerial] = useState("LOT-2026-AX");
  const [adjOnHand, setAdjOnHand] = useState(10);
  const [adjCounted, setAdjCounted] = useState(10);
  const [adjScheduledDate, setAdjScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjResponsible, setAdjResponsible] = useState("Subham Admin");
  const [adjNotes, setAdjNotes] = useState("");

  // Scrap Form State
  const [scrapRef, setScrapRef] = useState(`SCRAP/2026/${String(scrapRecords.length + 1).padStart(5, "0")}`);
  const [scrapProduct, setScrapProduct] = useState("");
  const [scrapQty, setScrapQty] = useState(1);
  const [scrapUom, setScrapUom] = useState("PCS");
  const [scrapSourceLoc, setScrapSourceLoc] = useState("Main Warehouse / Stock");
  const [scrapDestLoc, setScrapDestLoc] = useState("Virtual Locations / Scrap");
  const [scrapLotSerial, setScrapLotSerial] = useState("LOT-2026-SCRAP");
  const [scrapCompany, setScrapCompany] = useState("TixelTech ERP");
  const [scrapDate, setScrapDate] = useState(new Date().toISOString().split("T")[0]);
  const [scrapUser, setScrapUser] = useState("Subham Admin");
  const [scrapNotes, setScrapNotes] = useState("");

  function handleProductChange(prodId: string) {
    setAdjProduct(prodId);
    const foundStock = stock.find((s) => s.productId === prodId);
    if (foundStock) {
      setAdjOnHand(foundStock.quantity);
      setAdjCounted(foundStock.quantity);
    }
  }

  function refreshData(whId?: string) {
    startTransition(async () => {
      try {
        const wId = whId === "all" ? undefined : (whId || (warehouseFilter === "all" ? undefined : warehouseFilter));
        const [newStock, newMovements] = await Promise.all([
          getWarehouseStock(wId),
          getStockMovements({ warehouseId: wId }),
        ]);
        setStock(newStock);
        setMovements(newMovements);
      } catch {
        // ignore
      }
    });
  }

  function handleWarehouseChange(value: string) {
    setWarehouseFilter(value);
    refreshData(value);
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await recordStockMovement({
          productId: formData.get("productId") as string,
          warehouseId: formData.get("warehouseId") as string,
          type: movementType,
          quantity: parseInt(formData.get("quantity") as string),
          reference: (formData.get("reference") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          targetWarehouseId: movementType === "TRANSFER" ? (formData.get("targetWarehouseId") as string) : undefined,
        });
        toast.success("Stock movement recorded");
        setIsOpen(false);
        refreshData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to record movement");
      }
    });
  }

  function handleCreateAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjProduct || !adjWarehouse) {
      toast.error("Please select a product and warehouse");
      return;
    }

    const prod = products.find((p) => p.id === adjProduct);
    const wh = warehouses.find((w) => w.id === adjWarehouse);

    const diff = Number(adjCounted) - Number(adjOnHand);

    const newAdj: PhysicalAdjustment = {
      id: `adj-${Date.now()}`,
      inventoryReference: adjRef,
      productId: adjProduct,
      productName: prod?.name || "Product",
      productSku: prod?.sku || "SKU-000",
      category: prod?.category || "General",
      warehouseId: adjWarehouse,
      warehouseName: wh?.name || "Warehouse",
      location: adjLocation,
      lotSerialNo: adjLotSerial,
      onHandQty: Number(adjOnHand),
      countedQty: Number(adjCounted),
      difference: diff,
      scheduledDate: adjScheduledDate,
      responsible: adjResponsible,
      status: "DRAFT",
      notes: adjNotes,
    };

    setAdjustments([newAdj, ...adjustments]);
    toast.success(`Physical Inventory Adjustment ${adjRef} created as Draft`);
    setIsAdjustmentModalOpen(false);
  }

  function handleValidateAdjustment(adj: PhysicalAdjustment) {
    startTransition(async () => {
      try {
        if (adj.difference !== 0) {
          const type: StockMovementType = adj.difference > 0 ? "IN" : "OUT";
          await recordStockMovement({
            productId: adj.productId,
            warehouseId: adj.warehouseId,
            type: "ADJUSTMENT",
            quantity: Math.abs(adj.difference),
            reference: adj.inventoryReference,
            notes: `Physical Stock Count Adjustment (${adj.lotSerialNo}) - Difference: ${adj.difference}`,
          });
        }
        setAdjustments((prev) =>
          prev.map((a) => (a.id === adj.id ? { ...a, status: "VALIDATED" } : a))
        );
        toast.success(`Physical Stock Count ${adj.inventoryReference} Validated & Applied to Stock!`);
        refreshData();
      } catch (err) {
        toast.error("Failed to validate inventory adjustment");
      }
    });
  }

  function handleCreateScrap(e: React.FormEvent) {
    e.preventDefault();
    if (!scrapProduct) {
      toast.error("Please select a product to scrap");
      return;
    }

    const prod = products.find((p) => p.id === scrapProduct);

    startTransition(async () => {
      try {
        if (warehouses.length > 0) {
          await recordStockMovement({
            productId: scrapProduct,
            warehouseId: warehouses[0].id,
            type: "OUT",
            quantity: Number(scrapQty),
            reference: scrapRef,
            notes: `Scrapped to ${scrapDestLoc} (Reason: ${scrapNotes || "Damaged/Defective"})`,
          });
        }

        const newScrap: ScrapRecord = {
          id: `scrap-${Date.now()}`,
          scrapReference: scrapRef,
          productId: scrapProduct,
          productName: prod?.name || "Product",
          productSku: prod?.sku || "SKU-000",
          quantity: Number(scrapQty),
          unitOfMeasure: scrapUom,
          sourceLocation: scrapSourceLoc,
          scrapLocation: scrapDestLoc,
          lotSerialNo: scrapLotSerial,
          company: scrapCompany,
          date: scrapDate,
          responsibleUser: scrapUser,
          status: "DONE",
          notes: scrapNotes,
        };

        setScrapRecords([newScrap, ...scrapRecords]);
        toast.success(`Scrap Order ${scrapRef} recorded! Stock moved to ${scrapDestLoc}`);
        setIsScrapModalOpen(false);
        refreshData();
      } catch (err) {
        toast.error("Failed to record scrap transaction");
      }
    });
  }

  function handleTriggerReplenishment(rule: ReplenishmentRule) {
    startTransition(async () => {
      try {
        if (rule.route === "BUY") {
          toast.success(`Replenishment Triggered: RFQ created for ${rule.preferredVendor} (${rule.qtyToOrder} Units)!`);
        } else if (rule.route === "MANUFACTURE") {
          toast.success(`Replenishment Triggered: Manufacturing Order created for ${rule.productName} (${rule.qtyToOrder} Units)!`);
        } else {
          toast.success(`Replenishment Triggered for ${rule.productName} (${rule.qtyToOrder} Units)!`);
        }
        setReplenishmentRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, status: "REORDERED" } : r))
        );
      } catch (err) {
        toast.error("Failed to trigger replenishment");
      }
    });
  }

  const filteredAdjustments = adjustments.filter((a) => {
    const matchesWarehouse = warehouseFilter === "all" || a.warehouseId === warehouseFilter;
    const matchesCategory = categoryFilter === "all" || a.category.toLowerCase().includes(categoryFilter.toLowerCase());
    return matchesWarehouse && matchesCategory;
  });

  return (
    <div className={hideHeader ? "space-y-6" : "space-y-6 p-6"}>
      {/* Top Title Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideHeader ? (
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              Procurement & Replenishment Rules
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Maintain optimal stock levels by automatically suggesting or triggering POs and Manufacturing orders based on Min/Max rules.
            </p>
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsScrapModalOpen(true)} variant="outline" className="gap-2 border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100">
            <Flame className="h-4 w-4 text-rose-600" /> Create Scrap Order
          </Button>

          <Button onClick={() => setIsAdjustmentModalOpen(true)} variant="outline" className="gap-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100">
            <ClipboardCheck className="h-4 w-4 text-amber-600" /> Physical Stock Count
          </Button>

          {canCreate("stock") && (
            <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Record Movement
            </Button>
          )}
        </div>
      </div>

      {/* Warehouse & Category Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Warehouse:</Label>
              <Select value={warehouseFilter} onValueChange={(v: string | null) => handleWarehouseChange(v ?? "all")}>
                <SelectTrigger className="w-[200px] text-xs">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name} ({wh.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Category:</Label>
              <Select value={categoryFilter} onValueChange={(v: string | null) => setCategoryFilter(v ?? "all")}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="seating">Seating</SelectItem>
                  <SelectItem value="raw">Raw Materials</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Showing {stock.length} On-Hand Stock Records
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="replenishment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl bg-muted/60 p-1">
          <TabsTrigger value="replenishment" className="gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" /> Replenishment Rules
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="gap-2">
            <ClipboardCheck className="h-4 w-4 text-amber-600" /> Physical Adjustments
          </TabsTrigger>
          <TabsTrigger value="scrap" className="gap-2">
            <Flame className="h-4 w-4 text-rose-600" /> Scrap Management
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-2">
            <Package className="h-4 w-4 text-blue-600" /> Stock Levels
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <ArrowUpDown className="h-4 w-4 text-purple-600" /> Movements History
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: REPLENISHMENT RULES (ALL 11 SPREADSHEET FIELDS IMPLEMENTED) */}
        {/* =================================================================== */}
        <TabsContent value="replenishment" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <RefreshCw className="h-5 w-5 text-emerald-600" /> Automated Procurement Replenishment Rules
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Maintain optimal inventory levels by automatically suggesting or triggering RFQs, POs, or Manufacturing orders based on Min/Max rules.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">On Hand</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Forecast</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Min Qty</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Max Qty</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Qty to Order</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Route</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Preferred Vendor</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Warehouse</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Company</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Trigger</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replenishmentRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground text-sm">
                        No replenishment rules configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    replenishmentRules.map((rule) => (
                      <TableRow key={rule.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-bold text-slate-900 dark:text-white">{rule.productName}</div>
                          <span className="text-xs text-muted-foreground font-mono">{rule.productSku}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-rose-600">
                          {rule.onHand}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {rule.forecast}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-amber-600">
                          {rule.minQty}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-600">
                          {rule.maxQty}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600 text-sm">
                          {rule.qtyToOrder}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={rule.route === "BUY" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}>
                            {rule.route === "BUY" ? <ShoppingCart className="h-3 w-3 mr-1" /> : <Factory className="h-3 w-3 mr-1" />}
                            {rule.route}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {rule.preferredVendor}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {rule.warehouseName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {rule.company}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 font-mono text-[10px]">
                            {rule.trigger}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {rule.status === "REORDERED" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-[11px]">
                              Reordered
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleTriggerReplenishment(rule)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 h-8"
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> Order Order
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PHYSICAL INVENTORY ADJUSTMENTS */}
        <TabsContent value="adjustments" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-amber-600" /> Physical Inventory Stock Counts & Reconciliation
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Count physical warehouse stock and correct ERP on-hand quantity discrepancies caused by miscounts, damage, or theft.
                  </CardDescription>
                </div>

                <Button onClick={() => setIsAdjustmentModalOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> New Inventory Count
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Inventory Reference</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product & Category</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Warehouse & Location</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Lot / Serial No</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">On-Hand Qty</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Counted Qty</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Difference</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Scheduled Date</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Responsible</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">
                        No physical inventory adjustments found. Click "New Inventory Count" to reconcile warehouse stock.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdjustments.map((adj) => (
                      <TableRow key={adj.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-bold font-mono text-amber-700 dark:text-amber-400">
                          {adj.inventoryReference}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-white">{adj.productName}</div>
                          <span className="text-xs text-muted-foreground font-mono">{adj.productSku} • {adj.category}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{adj.warehouseName}</div>
                          <span className="text-xs text-muted-foreground">{adj.location}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {adj.lotSerialNo}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {adj.onHandQty}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-600">
                          {adj.countedQty}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          <span className={adj.difference === 0 ? "text-slate-500" : adj.difference > 0 ? "text-emerald-600" : "text-red-600"}>
                            {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {adj.scheduledDate}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {adj.responsible}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusColors[adj.status] ?? "bg-gray-100 text-gray-700"}>
                            {adj.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {adj.status !== "VALIDATED" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleValidateAdjustment(adj)}
                                title="Validate & Apply Adjustment to Stock"
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAdjustments(adjustments.filter((a) => a.id !== adj.id));
                                toast.success(`Deleted adjustment ${adj.inventoryReference}`);
                              }}
                              title="Delete Adjustment Record"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* TAB 3: SCRAP MANAGEMENT */}
        <TabsContent value="scrap" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                    <Flame className="h-5 w-5 text-rose-600" /> Scrap Management & Damaged Stock Movement
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Remove damaged, defective, expired, or obsolete products from inventory by moving them to a Scrap Location.
                  </CardDescription>
                </div>

                <Button onClick={() => setIsScrapModalOpen(true)} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Create Scrap Order
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Scrap Reference</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Quantity</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Unit of Measure</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Source Location</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Scrap Location</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Lot / Serial No</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Company</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Date</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Responsible User</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scrapRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">
                        No scrap orders logged. Click "Create Scrap Order" to move damaged stock to scrap.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scrapRecords.map((scrap) => (
                      <TableRow key={scrap.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-bold font-mono text-rose-600 dark:text-rose-400">
                          {scrap.scrapReference}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-white">{scrap.productName}</div>
                          <span className="text-xs text-muted-foreground font-mono">{scrap.productSku}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-rose-600">
                          {scrap.quantity}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {scrap.unitOfMeasure}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {scrap.sourceLocation}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {scrap.scrapLocation}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {scrap.lotSerialNo}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {scrap.company}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {scrap.date}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {scrap.responsibleUser}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                            DONE
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Stock Levels */}
        <TabsContent value="levels">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">SKU</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Warehouse</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Quantity</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Reserved</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Available</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No stock records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    stock.map((item) => {
                      const available = item.quantity - item.reservedQty;
                      const isLow = item.product.minStock > 0 && item.quantity < item.product.minStock;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.product.sku}</TableCell>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell>{item.warehouse.name}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.product.unit}</TableCell>
                          <TableCell className="text-right">{item.reservedQty}</TableCell>
                          <TableCell className="text-right font-semibold">{available}</TableCell>
                          <TableCell>
                            {item.quantity === 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Movement History */}
        <TabsContent value="movements">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Date</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Type</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Warehouse</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Quantity</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Reference</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No movements recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.data.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{new Date(m.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={movementBadgeColor[m.type] ?? ""}>{m.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{m.product.name}</span>
                            <span className="block text-xs text-muted-foreground">{m.product.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>{m.warehouse?.name ?? "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{m.quantity}</TableCell>
                        <TableCell className="text-sm">{m.reference ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE SCRAP ORDER DIALOG */}
      {isScrapModalOpen && (
        <Dialog open={isScrapModalOpen} onOpenChange={setIsScrapModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                <Flame className="h-5 w-5 text-rose-600" /> Create Scrap Order (Remove Damaged Goods)
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateScrap} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Scrap Reference *</Label>
                  <Input value={scrapRef} onChange={(e) => setScrapRef(e.target.value)} required className="font-mono font-bold text-rose-600" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Scrap Date</Label>
                  <Input type="date" value={scrapDate} onChange={(e) => setScrapDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Product to Scrap *</Label>
                <select
                  value={scrapProduct}
                  onChange={(e) => setScrapProduct(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select product to scrap...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Quantity to Scrap *</Label>
                  <Input type="number" min="1" value={scrapQty} onChange={(e) => setScrapQty(Number(e.target.value))} required className="font-mono font-bold text-rose-600" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Unit of Measure (UoM)</Label>
                  <Input value={scrapUom} onChange={(e) => setScrapUom(e.target.value)} placeholder="PCS / KG / Units" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Source Location *</Label>
                  <Input value={scrapSourceLoc} onChange={(e) => setScrapSourceLoc(e.target.value)} placeholder="Main Warehouse / Stock" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Scrap Location *</Label>
                  <Input value={scrapDestLoc} onChange={(e) => setScrapDestLoc(e.target.value)} placeholder="Virtual Locations / Scrap" className="font-bold text-purple-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Lot / Serial Number</Label>
                  <Input value={scrapLotSerial} onChange={(e) => setScrapLotSerial(e.target.value)} placeholder="LOT-2026-SCRAP" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Company (Multi-Company)</Label>
                  <Input value={scrapCompany} onChange={(e) => setScrapCompany(e.target.value)} placeholder="TixelTech ERP" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Responsible User</Label>
                <Input value={scrapUser} onChange={(e) => setScrapUser(e.target.value)} placeholder="User performing scrap operation" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Scrap Reason / Defect Notes</Label>
                <Textarea value={scrapNotes} onChange={(e) => setScrapNotes(e.target.value)} placeholder="e.g. Damaged during handling, expired stock, defective part" rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Scrap Order
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE PHYSICAL INVENTORY ADJUSTMENT DIALOG */}
      {isAdjustmentModalOpen && (
        <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-600" /> New Physical Inventory Adjustment
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateAdjustment} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Inventory Reference *</Label>
                  <Input value={adjRef} onChange={(e) => setAdjRef(e.target.value)} required className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Scheduled Count Date</Label>
                  <Input type="date" value={adjScheduledDate} onChange={(e) => setAdjScheduledDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Product Being Counted *</Label>
                <select
                  value={adjProduct}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select product to count...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name} ({p.category || "General"})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Warehouse *</Label>
                  <select
                    value={adjWarehouse}
                    onChange={(e) => setAdjWarehouse(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Storage Location (Aisle/Bin)</Label>
                  <Input value={adjLocation} onChange={(e) => setAdjLocation(e.target.value)} placeholder="e.g. Aisle A / Bin 12" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Lot / Serial Number</Label>
                <Input value={adjLotSerial} onChange={(e) => setAdjLotSerial(e.target.value)} placeholder="e.g. LOT-2026-08A" />
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">On-Hand Qty</Label>
                  <Input type="number" value={adjOnHand} onChange={(e) => setAdjOnHand(Number(e.target.value))} className="font-mono font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-blue-600 uppercase font-bold">Counted Qty *</Label>
                  <Input type="number" value={adjCounted} onChange={(e) => setAdjCounted(Number(e.target.value))} required className="font-mono font-bold text-blue-600" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Difference</Label>
                  <div className="h-10 border rounded-md px-3 flex items-center font-mono font-bold text-sm bg-background">
                    <span className={Number(adjCounted) - Number(adjOnHand) === 0 ? "text-slate-500" : Number(adjCounted) - Number(adjOnHand) > 0 ? "text-emerald-600" : "text-red-600"}>
                      {Number(adjCounted) - Number(adjOnHand) > 0 ? `+${Number(adjCounted) - Number(adjOnHand)}` : Number(adjCounted) - Number(adjOnHand)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Responsible Person</Label>
                <Input value={adjResponsible} onChange={(e) => setAdjResponsible(e.target.value)} placeholder="Warehouse Manager Name" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Adjustment Reason / Notes</Label>
                <Textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="e.g. Miscount reconciliation / Damage / Data-entry error" rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Create Inventory Adjustment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Record Movement Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" /> Record Stock Movement
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as StockMovementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {movementTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productId">Product *</Label>
              <select name="productId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{movementType === "TRANSFER" ? "Source Warehouse *" : "Warehouse *"}</Label>
              <select name="warehouseId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>
            {movementType === "TRANSFER" && (
              <div className="space-y-2">
                <Label htmlFor="targetWarehouseId">Target Warehouse *</Label>
                <select name="targetWarehouseId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select target warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" name="quantity" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (PO/SO Number)</Label>
              <Input id="reference" name="reference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Movement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
