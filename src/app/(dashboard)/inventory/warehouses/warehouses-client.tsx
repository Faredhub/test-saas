"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  Pencil,
  Warehouse,
  MapPin,
  User,
  Phone,
  Mail,
  Building2,
  Layers,
  Boxes,
  MoveHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle,
  AlertTriangle,
  Trash2,
  GitMerge,
  ArrowRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Eye,
  Settings2,
  Tags,
  Sliders,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Wrench,
  RotateCcw
} from "lucide-react";
import {
  createWarehouse,
  updateWarehouse,
  getWarehouses,
  recordStockMovement,
  deleteWarehouse,
} from "@/lib/actions/inventory";
import { toast } from "sonner";

type WarehouseData = Awaited<ReturnType<typeof getWarehouses>>;

type Props = {
  initialData: WarehouseData;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; firstName: string; lastName: string | null }>;
  products: Array<{ id: string; name: string; sku: string }>;
};

interface StorageLocation {
  id: string;
  name: string;
  code: string;
  warehouseName: string;
  type: "RACK" | "SHELF" | "BIN" | "PRODUCTION" | "QUALITY" | "SCRAP" | "TRANSIT";
  capacity: string;
  status: "ACTIVE" | "INACTIVE";
}

interface MultiStepRoute {
  id: string;
  name: string;
  category: "ONE_STEP" | "TWO_STEP" | "THREE_STEP";
  steps: string[];
  description: string;
  isActive: boolean;
}

interface OperationType {
  id: string;
  name: string;
  sequencePrefix: string;
  type: "RECEIPT" | "DELIVERY" | "INTERNAL" | "MANUFACTURING" | "REPAIR" | "RETURN";
  defaultSource: string;
  defaultDestination: string;
  reservationRule: string;
  status: "ACTIVE" | "INACTIVE";
}

interface ProductCategoryRule {
  id: string;
  name: string;
  parentCategory: string;
  costingMethod: "FIFO" | "AVCO" | "STANDARD";
  inventoryValuation: "AUTOMATED" | "MANUAL";
  incomeAccount: string;
  expenseAccount: string;
  productCount: number;
}

export function WarehousesClient({
  initialData,
  branches,
  departments,
  employees,
  products,
}: Props) {
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isOpTypeModalOpen, setIsOpTypeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [viewingLocation, setViewingLocation] = useState<StorageLocation | null>(null);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [viewingOpType, setViewingOpType] = useState<OperationType | null>(null);
  const [editingOpType, setEditingOpType] = useState<OperationType | null>(null);
  const [viewingCategory, setViewingCategory] = useState<ProductCategoryRule | null>(null);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryRule | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Stock Allocation State
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocateWhId, setAllocateWhId] = useState<string | null>(null);

  // Controlled Create/Edit form values
  const [formValues, setFormValues] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    managerId: "",
    contactPhone: "",
    contactEmail: "",
    branchId: "",
    departmentId: "",
  });

  // Controlled Stock Allocation form values
  const [allocationValues, setAllocationValues] = useState({
    productId: "",
    type: "IN" as "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER",
    targetWarehouseId: "",
    quantity: 1,
    reference: "",
    notes: "",
  });

  // Storage Locations State
  const primaryWhName = data[0]?.name || "Main Warehouse";
  const primaryWhCode = data[0]?.code || "WH1";

  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([
    { id: "loc-1", name: "Rack A - High Density Storage", code: `${primaryWhCode}-RACK-A`, warehouseName: primaryWhName, type: "RACK", capacity: "500 Units", status: "ACTIVE" },
    { id: "loc-2", name: "Rack B - Heavy Material Storage", code: `${primaryWhCode}-RACK-B`, warehouseName: primaryWhName, type: "RACK", capacity: "300 Units", status: "ACTIVE" },
    { id: "loc-3", name: "Production Floor Assembly Zone", code: `${primaryWhCode}-PROD-01`, warehouseName: primaryWhName, type: "PRODUCTION", capacity: "1000 Units", status: "ACTIVE" },
    { id: "loc-4", name: "Quality Assurance Inspection Bay", code: `${primaryWhCode}-QA-BAY`, warehouseName: primaryWhName, type: "QUALITY", capacity: "200 Units", status: "ACTIVE" },
    { id: "loc-5", name: "Virtual Quarantine Scrap Yard", code: `${primaryWhCode}-SCRAP-01`, warehouseName: primaryWhName, type: "SCRAP", capacity: "Unlimited", status: "ACTIVE" },
  ]);

  // Operation Types State
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([
    { id: "op-1", name: "Vendor Goods Receipts", sequencePrefix: `${primaryWhCode}/IN`, type: "RECEIPT", defaultSource: "Vendors / External", defaultDestination: `${primaryWhName} / Input Bay`, reservationRule: "IMMEDIATE", status: "ACTIVE" },
    { id: "op-2", name: "Customer Delivery Orders", sequencePrefix: `${primaryWhCode}/OUT`, type: "DELIVERY", defaultSource: `${primaryWhName} / Stock`, defaultDestination: "Customers / External", reservationRule: "AT_CONFIRMATION", status: "ACTIVE" },
    { id: "op-3", name: "Internal Warehouse Transfers", sequencePrefix: `${primaryWhCode}/INT`, type: "INTERNAL", defaultSource: `${primaryWhName} / Shelf A`, defaultDestination: "East Warehouse / Shelf B", reservationRule: "MANUAL", status: "ACTIVE" },
    { id: "op-4", name: "Manufacturing Material Issue", sequencePrefix: `${primaryWhCode}/MO`, type: "MANUFACTURING", defaultSource: `${primaryWhName} / Stock`, defaultDestination: "Production Floor Assembly", reservationRule: "IMMEDIATE", status: "ACTIVE" },
    { id: "op-5", name: "Customer Returns & Restock", sequencePrefix: `${primaryWhCode}/RET`, type: "RETURN", defaultSource: "Customers / External", defaultDestination: `${primaryWhName} / QA Bay`, reservationRule: "IMMEDIATE", status: "ACTIVE" },
    { id: "op-6", name: "Equipment Repair Maintenance", sequencePrefix: `${primaryWhCode}/REP`, type: "REPAIR", defaultSource: `${primaryWhName} / Stock`, defaultDestination: "Repair Workshop", reservationRule: "MANUAL", status: "ACTIVE" },
  ]);

  // Product Categories Rules State
  const [productCategories, setProductCategories] = useState<ProductCategoryRule[]>([
    { id: "cat-1", name: "Executive Desks & Tables", parentCategory: "All / Furniture", costingMethod: "FIFO", inventoryValuation: "AUTOMATED", incomeAccount: "4000 Sales Revenue", expenseAccount: "5000 COGS", productCount: 14 },
    { id: "cat-2", name: "Ergonomic Chairs & Seating", parentCategory: "All / Furniture", costingMethod: "AVCO", inventoryValuation: "AUTOMATED", incomeAccount: "4000 Sales Revenue", expenseAccount: "5000 COGS", productCount: 18 },
    { id: "cat-3", name: "Raw Timber & Steel Components", parentCategory: "All / Raw Materials", costingMethod: "FIFO", inventoryValuation: "AUTOMATED", incomeAccount: "4100 Material Revenue", expenseAccount: "5100 Raw Material Costs", productCount: 32 },
    { id: "cat-4", name: "Office IT Equipment", parentCategory: "All / Electronics", costingMethod: "STANDARD", inventoryValuation: "MANUAL", incomeAccount: "4200 Hardware Revenue", expenseAccount: "5200 Equipment COGS", productCount: 9 },
  ]);

  // Form States
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locWhName, setLocWhName] = useState(primaryWhName);
  const [locType, setLocType] = useState<StorageLocation["type"]>("RACK");
  const [locCapacity, setLocCapacity] = useState("500 Units");

  const [opName, setOpName] = useState("");
  const [opPrefix, setOpPrefix] = useState(`${primaryWhCode}/IN`);
  const [opType, setOpType] = useState<OperationType["type"]>("RECEIPT");
  const [opSource, setOpSource] = useState("Vendors / External");
  const [opDest, setOpDest] = useState(`${primaryWhName} / Input Bay`);

  const [catName, setCatName] = useState("");
  const [catParent, setCatParent] = useState("All / Products");
  const [catCosting, setCatCosting] = useState<ProductCategoryRule["costingMethod"]>("FIFO");
  const [catValuation, setCatValuation] = useState<ProductCategoryRule["inventoryValuation"]>("AUTOMATED");

  // Multi-Step Routes State
  const [multiStepRoutes, setMultiStepRoutes] = useState<MultiStepRoute[]>([
    {
      id: "route-1",
      name: "Standard Direct Receiving & Shipping",
      category: "ONE_STEP",
      steps: ["Supplier ➔ Stock", "Stock ➔ Customer"],
      description: "Direct 1-step receiving and delivery route.",
      isActive: true,
    },
    {
      id: "route-2",
      name: "Input Staging & Output Delivery",
      category: "TWO_STEP",
      steps: ["Supplier ➔ Input", "Input ➔ Stock", "Stock ➔ Output", "Output ➔ Customer"],
      description: "2-step receiving via Staging area and 2-step shipping.",
      isActive: true,
    },
    {
      id: "route-3",
      name: "Quality Controlled Pick-Pack-Ship",
      category: "THREE_STEP",
      steps: ["Supplier ➔ Input", "Input ➔ Quality Check", "Quality ➔ Stock", "Stock ➔ Pick", "Pick ➔ Pack", "Pack ➔ Ship"],
      description: "Complete 3-step quality inspection and pick-pack-ship route.",
      isActive: true,
    },
  ]);

  function refreshData() {
    startTransition(async () => {
      try {
        const result = await getWarehouses();
        setData(result);
      } catch {
        toast.error("Failed to load warehouses data");
      }
    });
  }

  function handleOpenCreate() {
    setEditId(null);
    setFormValues({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      managerId: "",
      contactPhone: "",
      contactEmail: "",
      branchId: "",
      departmentId: "",
    });
    setIsOpen(true);
  }

  function handleOpenEdit(wh: WarehouseData[0]) {
    setEditId(wh.id);
    setFormValues({
      name: wh.name,
      code: wh.code,
      address: wh.address ?? "",
      city: wh.city ?? "",
      state: wh.state ?? "",
      managerId: wh.managerId ?? "",
      contactPhone: wh.contactPhone ?? "",
      contactEmail: wh.contactEmail ?? "",
      branchId: wh.branchId ?? "",
      departmentId: wh.departmentId ?? "",
    });
    setIsOpen(true);
  }

  function handleOpenAllocate(whId: string) {
    setAllocateWhId(whId);
    setAllocationValues({
      productId: products[0]?.id ?? "",
      type: "IN",
      targetWarehouseId: "",
      quantity: 1,
      reference: "",
      notes: "",
    });
    setIsAllocateOpen(true);
  }

  function handleCreateLocationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) {
      toast.error("Location name and code are required");
      return;
    }

    const newLoc: StorageLocation = {
      id: `loc-${Date.now()}`,
      name: locName.trim(),
      code: locCode.trim().toUpperCase(),
      warehouseName: locWhName || primaryWhName,
      type: locType,
      capacity: locCapacity || "500 Units",
      status: "ACTIVE",
    };

    setStorageLocations([...storageLocations, newLoc]);
    toast.success(`Storage Location "${locName}" created successfully!`);
    setIsLocationModalOpen(false);
    setLocName("");
    setLocCode("");
  }

  function handleCreateOpTypeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opName.trim() || !opPrefix.trim()) {
      toast.error("Operation name and sequence prefix are required");
      return;
    }

    const newOp: OperationType = {
      id: `op-${Date.now()}`,
      name: opName.trim(),
      sequencePrefix: opPrefix.trim().toUpperCase(),
      type: opType,
      defaultSource: opSource,
      defaultDestination: opDest,
      reservationRule: "IMMEDIATE",
      status: "ACTIVE",
    };

    setOperationTypes([...operationTypes, newOp]);
    toast.success(`Operation Type "${opName}" created successfully!`);
    setIsOpTypeModalOpen(false);
    setOpName("");
  }

  function handleCreateCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const newCat: ProductCategoryRule = {
      id: `cat-${Date.now()}`,
      name: catName.trim(),
      parentCategory: catParent,
      costingMethod: catCosting,
      inventoryValuation: catValuation,
      incomeAccount: "4000 Sales Revenue",
      expenseAccount: "5000 COGS",
      productCount: 0,
    };

    setProductCategories([...productCategories, newCat]);
    toast.success(`Product Category "${catName}" created! Inherits ${catCosting} costing rule.`);
    setIsCategoryModalOpen(false);
    setCatName("");
  }

  function handleSaveEditLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLocation) return;
    setStorageLocations((prev) =>
      prev.map((l) => (l.id === editingLocation.id ? editingLocation : l))
    );
    toast.success(`Storage location "${editingLocation.name}" updated successfully`);
    setEditingLocation(null);
  }

  function handleSaveEditOpType(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOpType) return;
    setOperationTypes((prev) =>
      prev.map((o) => (o.id === editingOpType.id ? editingOpType : o))
    );
    toast.success(`Operation type "${editingOpType.name}" updated successfully`);
    setEditingOpType(null);
  }

  function handleSaveEditCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    setProductCategories((prev) =>
      prev.map((c) => (c.id === editingCategory.id ? editingCategory : c))
    );
    toast.success(`Product category "${editingCategory.name}" updated successfully`);
    setEditingCategory(null);
  }

  function handleDeleteLocation(loc: StorageLocation) {
    if (!confirm(`Are you sure you want to delete storage location "${loc.name}" (${loc.code})?`)) return;
    setStorageLocations((prev) => prev.filter((l) => l.id !== loc.id));
    toast.success(`Storage location "${loc.name}" deleted successfully`);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editId) {
          await updateWarehouse(editId, {
            name: formValues.name,
            address: formValues.address || null,
            city: formValues.city || null,
            state: formValues.state || null,
            managerId: formValues.managerId || null,
            contactPhone: formValues.contactPhone || null,
            contactEmail: formValues.contactEmail || null,
            branchId: formValues.branchId || null,
            departmentId: formValues.departmentId || null,
          });
          toast.success("Warehouse updated successfully");
        } else {
          await createWarehouse({
            name: formValues.name,
            code: formValues.code,
            address: formValues.address || undefined,
            city: formValues.city || undefined,
            state: formValues.state || undefined,
            managerId: formValues.managerId || undefined,
            contactPhone: formValues.contactPhone || undefined,
            contactEmail: formValues.contactEmail || undefined,
            branchId: formValues.branchId || undefined,
            departmentId: formValues.departmentId || undefined,
          });
          toast.success("Warehouse created successfully");
        }
        setIsOpen(false);
        refreshData();
      } catch {
        toast.error(editId ? "Failed to update warehouse" : "Failed to create warehouse");
      }
    });
  }

  async function handleAllocateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allocateWhId) return;

    if (allocationValues.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    if (allocationValues.type === "TRANSFER" && !allocationValues.targetWarehouseId) {
      toast.error("Please select a target warehouse for transfer");
      return;
    }

    startTransition(async () => {
      try {
        await recordStockMovement({
          productId: allocationValues.productId,
          warehouseId: allocateWhId,
          type: allocationValues.type,
          quantity: Number(allocationValues.quantity),
          reference: allocationValues.reference || undefined,
          notes: allocationValues.notes || undefined,
          targetWarehouseId: allocationValues.type === "TRANSFER" ? allocationValues.targetWarehouseId : undefined,
        });
        toast.success("Stock allocated successfully");
        setIsAllocateOpen(false);
        refreshData();
      } catch (err: any) {
        toast.error(err?.message || "Failed to allocate stock");
      }
    });
  }

  async function handleDeleteWarehouse(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete warehouse "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteWarehouse(id);
        toast.success("Warehouse deleted successfully");
        refreshData();
      } catch {
        toast.error("Failed to delete warehouse");
      }
    });
  }

  const filteredWarehouses = data.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.city && w.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalWarehouses = data.length;
  const activeWarehouses = data.filter((w) => w.isActive).length;

  let totalStockItems = 0;
  let outOfStockItems = 0;

  data.forEach((w) => {
    (w.stock || []).forEach((s) => {
      totalStockItems += s.quantity;
      if (s.quantity === 0) outOfStockItems++;
    });
  });

  return (
    <div className="space-y-8 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Warehouse className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Warehouse Management & Operations Configuration
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure multi-warehouses, storage locations, multi-step operation routes, operation types, and inherited product category rules.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow">
          <Plus className="h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Warehouses", value: totalWarehouses, icon: Building2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Active Warehouses", value: activeWarehouses, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
          { label: "Total Stock Items", value: totalStockItems, icon: Boxes, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
          { label: "OOS Alert Items", value: outOfStockItems, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
              </div>
              <span className={"p-3 rounded-2xl " + stat.bg + " " + stat.color}>
                <stat.icon className="h-6 w-6" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Configuration Tabs */}
      <Tabs defaultValue="warehouses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl bg-muted/60 p-1">
          <TabsTrigger value="warehouses" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-blue-600" /> Multi-Warehouses
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5 text-amber-600" /> Storage Locations
          </TabsTrigger>
          <TabsTrigger value="routes" className="gap-1.5 text-xs">
            <GitMerge className="h-3.5 w-3.5 text-purple-600" /> Multi-Step Routes
          </TabsTrigger>
          <TabsTrigger value="opTypes" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5 text-emerald-600" /> Operation Types
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 text-xs">
            <Tags className="h-3.5 w-3.5 text-indigo-600" /> Product Categories
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MULTI-WAREHOUSES */}
        <TabsContent value="warehouses" className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search warehouses..."
              className="pl-9 rounded-xl shadow-sm border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredWarehouses.map((wh) => {
              return (
                <Card
                  key={wh.id}
                  className={"overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-card hover:shadow-md transition-all flex flex-col justify-between " + (!wh.isActive ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : "")}
                >
                  <CardContent className="p-6 space-y-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <Warehouse className="h-9 w-9 text-blue-600 dark:text-blue-400 mt-1 shrink-0" />
                        <div>
                          <h3 className="font-bold text-lg text-slate-950 dark:text-slate-50 line-clamp-1">
                            {wh.name}
                          </h3>
                          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {wh.code}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={
                          wh.isActive
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        }
                        variant="outline"
                      >
                        {wh.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {wh.address ? (wh.address + ", ") : ""}
                          {[wh.city, wh.state].filter(Boolean).join(", ") || "No address specified"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Warehouse Manager
                        </span>
                        {wh.manager ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                              {wh.manager.firstName[0]}
                              {wh.manager.lastName ? wh.manager.lastName[0] : ""}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {wh.manager.firstName} {wh.manager.lastName ?? ""}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-0.5 italic">No manager assigned</p>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-t flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => handleOpenAllocate(wh.id)} className="gap-1 text-xs">
                      <MoveHorizontal className="h-3.5 w-3.5" /> Transfer / Allocate
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(wh)} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteWarehouse(wh.id, wh.name)} className="h-8 w-8 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: STORAGE LOCATIONS */}
        <TabsContent value="locations" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-amber-600" /> Internal Warehouse Storage Locations
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Organize inventory inside warehouses into Racks, Shelves, Bins, Production, Quality, and Scrap locations.
                  </CardDescription>
                </div>

                <Button onClick={() => setIsLocationModalOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Add Storage Location
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Location Code</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Location Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Warehouse</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Location Type</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Storage Capacity</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storageLocations.map((loc) => (
                    <TableRow key={loc.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-sm font-bold text-blue-600">{loc.code}</TableCell>
                      <TableCell className="font-semibold">{loc.name}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">{loc.warehouseName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {loc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{loc.capacity}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-800">{loc.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingLocation(loc)}
                            title="View Location"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingLocation(loc)}
                            title="Edit Location"
                            className="h-8 w-8 text-slate-900 dark:text-slate-100 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLocation(loc)}
                            title="Delete Location"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MULTI-STEP ROUTES */}
        <TabsContent value="routes" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <GitMerge className="h-5 w-5 text-purple-600" /> Multi-Step Warehouse Operation Routes
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Configure logistics operation flows: 1-Step (Direct), 2-Step (Input/Output Staging), and 3-Step (Quality Check & Pick-Pack-Ship).
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {multiStepRoutes.map((route) => (
                <Card key={route.id} className="border p-4 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={route.category === "ONE_STEP" ? "bg-blue-100 text-blue-800" : route.category === "TWO_STEP" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}>
                          {route.category.replace("_", " ")}
                        </Badge>
                        <h4 className="font-bold text-base">{route.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{route.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
                    {route.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs px-3 py-1 bg-background border">
                          {step}
                        </Badge>
                        {idx < route.steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: OPERATION TYPES */}
        <TabsContent value="opTypes" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <Settings2 className="h-5 w-5 text-emerald-600" /> Warehouse Operations Types Configuration
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Define and manage warehouse operation types: Receipts, Deliveries, Internal Transfers, Manufacturing Picks, Repairs, and Returns.
                  </CardDescription>
                </div>

                <Button onClick={() => setIsOpTypeModalOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Add Operation Type
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Operation Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Sequence Prefix</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Operation Category</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Default Source</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Default Destination</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationTypes.map((op) => (
                    <TableRow key={op.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-bold text-slate-900 dark:text-white">{op.name}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">{op.sequencePrefix}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {op.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{op.defaultSource}</TableCell>
                      <TableCell className="text-xs text-slate-600">{op.defaultDestination}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-800">{op.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingOpType(op)}
                            title="View Operation Type Details"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingOpType(op)}
                            title="Edit Operation Type"
                            className="h-8 w-8 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setOperationTypes(operationTypes.filter((o) => o.id !== op.id));
                              toast.success(`Deleted operation type ${op.name}`);
                            }}
                            title="Delete Operation Type"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: PRODUCT CATEGORIES RULES */}
        <TabsContent value="categories" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <Tags className="h-5 w-5 text-indigo-600" /> Product Categories & Costing / Accounting Rules
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Group products with similar characteristics and define common costing (FIFO, AVCO) and valuation rules inherited by all products in that category.
                  </CardDescription>
                </div>

                <Button onClick={() => setIsCategoryModalOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Add Category Rule
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Category Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Parent Category</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Costing Method</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Inventory Valuation</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Income Account</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Expense Account</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Inheriting Products</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productCategories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-bold text-slate-900 dark:text-white">{cat.name}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">{cat.parentCategory}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {cat.costingMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800">
                          {cat.inventoryValuation}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{cat.incomeAccount}</TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{cat.expenseAccount}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">
                        {cat.productCount} Products
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingCategory(cat)}
                            title="View Category Details"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingCategory(cat)}
                            title="Edit Category Rule"
                            className="h-8 w-8 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProductCategories(productCategories.filter((c) => c.id !== cat.id));
                              toast.success(`Deleted category rule ${cat.name}`);
                            }}
                            title="Delete Category Rule"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* VIEW OPERATION TYPE DIALOG */}
      {viewingOpType && (
        <Dialog open={!!viewingOpType} onOpenChange={() => setViewingOpType(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-600">
                <Eye className="h-5 w-5 text-blue-600" /> Operation Type Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Operation Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingOpType.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Sequence Prefix:</span>
                <span className="font-mono font-bold text-emerald-600">{viewingOpType.sequencePrefix}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Operation Category:</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">{viewingOpType.type}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Default Source:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{viewingOpType.defaultSource}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Default Destination:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{viewingOpType.defaultDestination}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-emerald-100 text-emerald-800">{viewingOpType.status}</Badge>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT OPERATION TYPE DIALOG */}
      {editingOpType && (
        <Dialog open={!!editingOpType} onOpenChange={() => setEditingOpType(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Pencil className="h-5 w-5 text-slate-800" /> Edit Operation Type
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditOpType} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Operation Name *</Label>
                <Input
                  value={editingOpType.name}
                  onChange={(e) => setEditingOpType({ ...editingOpType, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Sequence Prefix *</Label>
                  <Input
                    value={editingOpType.sequencePrefix}
                    onChange={(e) => setEditingOpType({ ...editingOpType, sequencePrefix: e.target.value })}
                    required
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <select
                    value={editingOpType.type}
                    onChange={(e) => setEditingOpType({ ...editingOpType, type: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RECEIPT">RECEIPT</option>
                    <option value="DELIVERY">DELIVERY</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="MANUFACTURING">MANUFACTURING</option>
                    <option value="REPAIR">REPAIR</option>
                    <option value="RETURN">RETURN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Source</Label>
                  <Input
                    value={editingOpType.defaultSource}
                    onChange={(e) => setEditingOpType({ ...editingOpType, defaultSource: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Destination</Label>
                  <Input
                    value={editingOpType.defaultDestination}
                    onChange={(e) => setEditingOpType({ ...editingOpType, defaultDestination: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 font-semibold">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* VIEW PRODUCT CATEGORY DIALOG */}
      {viewingCategory && (
        <Dialog open={!!viewingCategory} onOpenChange={() => setViewingCategory(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-600">
                <Eye className="h-5 w-5 text-blue-600" /> Product Category Rule Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Category Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingCategory.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Parent Category:</span>
                <span className="font-mono text-slate-600">{viewingCategory.parentCategory}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Costing Method:</span>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700">{viewingCategory.costingMethod}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Valuation Mode:</span>
                <Badge className="bg-emerald-100 text-emerald-800">{viewingCategory.inventoryValuation}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Income Account:</span>
                <span className="font-mono text-xs font-semibold">{viewingCategory.incomeAccount}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Expense Account:</span>
                <span className="font-mono text-xs font-semibold">{viewingCategory.expenseAccount}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Inherited By:</span>
                <span className="font-bold text-blue-600">{viewingCategory.productCount} Products</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT PRODUCT CATEGORY DIALOG */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Pencil className="h-5 w-5 text-slate-800" /> Edit Category & Costing Rule
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditCategory} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category Name *</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Parent Category</Label>
                <Input
                  value={editingCategory.parentCategory}
                  onChange={(e) => setEditingCategory({ ...editingCategory, parentCategory: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Costing Method</Label>
                  <select
                    value={editingCategory.costingMethod}
                    onChange={(e) => setEditingCategory({ ...editingCategory, costingMethod: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="FIFO">FIFO (First In First Out)</option>
                    <option value="AVCO">AVCO (Weighted Average)</option>
                    <option value="STANDARD">Standard Price</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inventory Valuation</Label>
                  <select
                    value={editingCategory.inventoryValuation}
                    onChange={(e) => setEditingCategory({ ...editingCategory, inventoryValuation: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="AUTOMATED">AUTOMATED (Real-Time)</option>
                    <option value="MANUAL">MANUAL (Periodic)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 font-semibold">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE OPERATION TYPE DIALOG */}
      {isOpTypeModalOpen && (
        <Dialog open={isOpTypeModalOpen} onOpenChange={setIsOpTypeModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                <Settings2 className="h-5 w-5 text-emerald-600" /> Create Operation Type
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateOpTypeSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Operation Name *</Label>
                <Input placeholder="e.g. Special Equipment Repairs" value={opName} onChange={(e) => setOpName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Sequence Prefix *</Label>
                  <Input placeholder="e.g. WH/REP" value={opPrefix} onChange={(e) => setOpPrefix(e.target.value)} required className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Operation Category</Label>
                  <select
                    value={opType}
                    onChange={(e) => setOpType(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RECEIPT">RECEIPT</option>
                    <option value="DELIVERY">DELIVERY</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="MANUFACTURING">MANUFACTURING</option>
                    <option value="REPAIR">REPAIR</option>
                    <option value="RETURN">RETURN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Source</Label>
                  <Input value={opSource} onChange={(e) => setOpSource(e.target.value)} placeholder="Default Source Location" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Destination</Label>
                  <Input value={opDest} onChange={(e) => setOpDest(e.target.value)} placeholder="Default Destination Location" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Create Operation Type</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE PRODUCT CATEGORY DIALOG */}
      {isCategoryModalOpen && (
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-600">
                <Tags className="h-5 w-5 text-indigo-600" /> Create Product Category & Costing Rule
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category Name *</Label>
                <Input placeholder="e.g. Modular Workstations" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Parent Category</Label>
                <Input value={catParent} onChange={(e) => setCatParent(e.target.value)} placeholder="All / Products" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Costing Method</Label>
                  <select
                    value={catCosting}
                    onChange={(e) => setCatCosting(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="FIFO">FIFO (First In First Out)</option>
                    <option value="AVCO">AVCO (Weighted Average)</option>
                    <option value="STANDARD">Standard Price</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inventory Valuation</Label>
                  <select
                    value={catValuation}
                    onChange={(e) => setCatValuation(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="AUTOMATED">AUTOMATED (Real-Time)</option>
                    <option value="MANUAL">MANUAL (Periodic)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Create Category Rule</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* VIEW STORAGE LOCATION DIALOG */}
      {viewingLocation && (
        <Dialog open={!!viewingLocation} onOpenChange={() => setViewingLocation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-600">
                <Eye className="h-5 w-5 text-blue-600" /> Storage Location Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Location Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingLocation.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Location Code:</span>
                <span className="font-mono font-bold text-blue-600">{viewingLocation.code}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Assigned Warehouse:</span>
                <span className="font-semibold">{viewingLocation.warehouseName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Location Type:</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700">{viewingLocation.type}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Storage Capacity:</span>
                <span className="font-mono font-semibold">{viewingLocation.capacity}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-emerald-100 text-emerald-800">{viewingLocation.status}</Badge>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT STORAGE LOCATION DIALOG */}
      {editingLocation && (
        <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Pencil className="h-5 w-5 text-slate-800" /> Edit Storage Location
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditLocation} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Location Name *</Label>
                <Input
                  value={editingLocation.name}
                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location Code *</Label>
                  <Input
                    value={editingLocation.code}
                    onChange={(e) => setEditingLocation({ ...editingLocation, code: e.target.value })}
                    required
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Warehouse</Label>
                  <select
                    value={editingLocation.warehouseName}
                    onChange={(e) => setEditingLocation({ ...editingLocation, warehouseName: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {data.map((w) => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location Type</Label>
                  <select
                    value={editingLocation.type}
                    onChange={(e) => setEditingLocation({ ...editingLocation, type: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RACK">RACK</option>
                    <option value="SHELF">SHELF</option>
                    <option value="BIN">BIN</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="QUALITY">QUALITY</option>
                    <option value="SCRAP">SCRAP</option>
                    <option value="TRANSIT">TRANSIT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Capacity</Label>
                  <Input
                    value={editingLocation.capacity}
                    onChange={(e) => setEditingLocation({ ...editingLocation, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 font-semibold">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE STORAGE LOCATION DIALOG */}
      {isLocationModalOpen && (
        <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-600" /> Create Internal Storage Location
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateLocationSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Location Name *</Label>
                <Input placeholder="e.g. Shelf A3 / Bin 12" value={locName} onChange={(e) => setLocName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location Code *</Label>
                  <Input placeholder="e.g. WH1-SHELF-A3" value={locCode} onChange={(e) => setLocCode(e.target.value)} required className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Warehouse</Label>
                  <select
                    value={locWhName}
                    onChange={(e) => setLocWhName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {data.map((w) => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location Type</Label>
                  <select
                    value={locType}
                    onChange={(e) => setLocType(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="RACK">RACK</option>
                    <option value="SHELF">SHELF</option>
                    <option value="BIN">BIN</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="QUALITY">QUALITY</option>
                    <option value="SCRAP">SCRAP</option>
                    <option value="TRANSIT">TRANSIT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Capacity</Label>
                  <Input placeholder="e.g. 500 Units" value={locCapacity} onChange={(e) => setLocCapacity(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">Create Storage Location</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE / EDIT WAREHOUSE DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Warehouse className="h-6 w-6 text-blue-600" />
              {editId ? "Edit Warehouse Node" : "Register New Warehouse"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wh-name" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Warehouse Name *
                </Label>
                <Input
                  id="wh-name"
                  placeholder="e.g. BBSR Hub"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wh-code" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Code / Identifier *
                </Label>
                <Input
                  id="wh-code"
                  placeholder="e.g. WH-BBSR"
                  value={formValues.code}
                  onChange={(e) => setFormValues({ ...formValues, code: e.target.value })}
                  required
                  disabled={!!editId}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Affiliated Branch
                </Label>
                <select
                  value={formValues.branchId}
                  onChange={(e) => setFormValues({ ...formValues, branchId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No Branch Assigned</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Associated Department
                </Label>
                <select
                  value={formValues.departmentId}
                  onChange={(e) => setFormValues({ ...formValues, departmentId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No Department Assigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Warehouse Manager
                </Label>
                <select
                  value={formValues.managerId}
                  onChange={(e) => setFormValues({ ...formValues, managerId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No Manager Selected</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName ?? ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wh-phone" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Warehouse Phone
                </Label>
                <Input
                  id="wh-phone"
                  placeholder="+91 98765 43210"
                  value={formValues.contactPhone}
                  onChange={(e) => setFormValues({ ...formValues, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-email" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Warehouse Email
              </Label>
              <Input
                id="wh-email"
                type="email"
                placeholder="bbsr-hub@tixeltech.com"
                value={formValues.contactEmail}
                onChange={(e) => setFormValues({ ...formValues, contactEmail: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wh-address" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Street Address
              </Label>
              <Input
                id="wh-address"
                placeholder="123 Industrial Area, Phase II"
                value={formValues.address}
                onChange={(e) => setFormValues({ ...formValues, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wh-city" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  City
                </Label>
                <Input
                  id="wh-city"
                  placeholder="Bhubaneswar"
                  value={formValues.city}
                  onChange={(e) => setFormValues({ ...formValues, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wh-state" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  State
                </Label>
                <Input
                  id="wh-state"
                  placeholder="Odisha"
                  value={formValues.state}
                  onChange={(e) => setFormValues({ ...formValues, state: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Node" : "Register Node"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
