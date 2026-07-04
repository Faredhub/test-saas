"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Stock Allocation State
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocateWhId, setAllocateWhId] = useState<string | null>(null);

  // Collapsed Stock details for each card
  const [expandedWhId, setExpandedWhId] = useState<string | null>(null);

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
        toast.error(err.message || "Failed to allocate stock");
      }
    });
  }

  function handleToggleActive(wh: WarehouseData[0]) {
    startTransition(async () => {
      try {
        await updateWarehouse(wh.id, { isActive: !wh.isActive });
        toast.success(wh.isActive ? "Warehouse deactivated" : "Warehouse activated");
        refreshData();
      } catch {
        toast.error("Failed to change warehouse status");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this warehouse? All stock configurations will be removed.")) return;
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

  // Filtered warehouses
  const filteredWarehouses = data.filter((wh) => {
    const query = searchQuery.toLowerCase();
    const managerName = wh.manager ? (wh.manager.firstName + " " + (wh.manager.lastName ?? "")).toLowerCase() : "";
    const branchName = wh.branch?.name.toLowerCase() ?? "";
    const deptName = wh.department?.name.toLowerCase() ?? "";
    return (
      wh.name.toLowerCase().includes(query) ||
      wh.code.toLowerCase().includes(query) ||
      (wh.address && wh.address.toLowerCase().includes(query)) ||
      (wh.city && wh.city.toLowerCase().includes(query)) ||
      (wh.state && wh.state.toLowerCase().includes(query)) ||
      managerName.includes(query) ||
      branchName.includes(query) ||
      deptName.includes(query)
    );
  });

  // Stats calculation
  const totalWh = data.length;
  const activeWh = data.filter((w) => w.isActive).length;
  const totalStockItems = data.reduce((acc, w) => acc + w.stock.reduce((sum, s) => sum + s.quantity, 0), 0);
  const outOfStockItems = data.reduce((acc, w) => acc + w.stock.filter((s) => s.quantity <= 0).length, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Warehouses and Multi-Location Stock
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse nodes, allocate inventory stock, assign managers, and specify branch/department configurations.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Warehouses", value: totalWh, icon: Warehouse, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Active Nodes", value: activeWh, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
          { label: "Total Stock Qty", value: totalStockItems, icon: Boxes, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
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

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search warehouses..."
          className="pl-9 rounded-xl shadow-sm border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Warehouse Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredWarehouses.map((wh) => {
          const isExpanded = expandedWhId === wh.id;
          return (
            <Card
              key={wh.id}
              className={"overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-card hover:shadow-md transition-all flex flex-col justify-between " + (!wh.isActive ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : "")}
            >
              <CardContent className="p-6 space-y-4 flex-1">
                {/* Header Row */}
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

                {/* Organization Details */}
                {(wh.branch || wh.department) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {wh.branch && (
                      <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-none font-medium flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {wh.branch.name}
                      </Badge>
                    )}
                    {wh.department && (
                      <Badge className="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-none font-medium flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {wh.department.name}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Address details */}
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
                  {/* Warehouse Manager */}
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
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {wh.manager.email && (
                              <span className="flex items-center gap-0.5 truncate">
                                <Mail className="h-3 w-3" />
                                {wh.manager.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5 italic">No manager assigned</p>
                    )}
                  </div>

                  {/* Contact details */}
                  {(wh.contactPhone || wh.contactEmail) && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Warehouse Contacts
                      </span>
                      <div className="text-xs space-y-1 mt-1 text-slate-600 dark:text-slate-300">
                        {wh.contactPhone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{wh.contactPhone}</span>
                          </div>
                        )}
                        {wh.contactEmail && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{wh.contactEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock allocation info */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Boxes className="h-4 w-4 text-indigo-500" />
                      Allocated Stock ({wh.stock.length} lines)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 gap-1"
                      onClick={() => setExpandedWhId(isExpanded ? null : wh.id)}
                    >
                      {isExpanded ? "Hide Details" : "Show Details"}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Collapsible Stock Table */}
                  {isExpanded && (
                    <div className="mt-2 border rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 max-h-56 overflow-y-auto animate-in fade-in duration-200">
                      <Table>
                        <TableHeader className="bg-slate-100/55 dark:bg-slate-800/30">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs h-8 px-3 font-semibold text-slate-500">Product / SKU</TableHead>
                            <TableHead className="text-xs h-8 px-3 text-right font-semibold text-slate-500">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wh.stock.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground italic">
                                No stock items allocated yet
                              </TableCell>
                            </TableRow>
                          ) : (
                            wh.stock.map((st) => (
                              <TableRow key={st.id} className="hover:bg-slate-100/30">
                                <TableCell className="py-2 px-3 text-xs">
                                  <p className="font-medium text-slate-800 dark:text-slate-200">{st.product.name}</p>
                                  <span className="text-[10px] text-muted-foreground font-mono">{st.product.sku}</span>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-xs text-right font-bold text-slate-900 dark:text-slate-100">
                                  {st.quantity}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Action Buttons */}
              <div className="px-6 pb-6 pt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/10">
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleOpenEdit(wh)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300" onClick={() => handleDelete(wh.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleOpenAllocate(wh.id)}>
                  <MoveHorizontal className="mr-1 h-3.5 w-3.5" /> Allocate Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={"h-8 ml-auto " + (wh.isActive ? "text-amber-600 hover:text-amber-700 dark:text-amber-500" : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-500")}
                  onClick={() => handleToggleActive(wh)}
                  disabled={isPending}
                >
                  {wh.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          );
        })}

        {filteredWarehouses.length === 0 && (
          <Card className="col-span-full border-dashed border-2 py-12">
            <CardContent className="text-center text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-30 text-blue-500" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No Warehouses Found</p>
              <p className="text-sm mt-1">Try clearing your filters or create a new warehouse node to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl rounded-2xl animate-in fade-in duration-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              {editId ? "Edit Warehouse Settings" : "Register New Warehouse"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-name">Warehouse Name *</Label>
                <Input
                  id="wh-name"
                  required
                  placeholder="e.g. BBSR Hub"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-code">Code / Identifier *</Label>
                <Input
                  id="wh-code"
                  required
                  disabled={!!editId}
                  placeholder="e.g. WH-BBSR"
                  value={formValues.code}
                  onChange={(e) => setFormValues({ ...formValues, code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-branch">Affiliated Branch</Label>
                <select
                  id="wh-branch"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  value={formValues.branchId}
                  onChange={(e) => setFormValues({ ...formValues, branchId: e.target.value })}
                >
                  <option value="">No Branch Assigned</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-dept">Associated Department</Label>
                <select
                  id="wh-dept"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  value={formValues.departmentId}
                  onChange={(e) => setFormValues({ ...formValues, departmentId: e.target.value })}
                >
                  <option value="">No Department Assigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-manager">Warehouse Manager</Label>
                <select
                  id="wh-manager"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  value={formValues.managerId}
                  onChange={(e) => setFormValues({ ...formValues, managerId: e.target.value })}
                >
                  <option value="">No Manager Selected</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName ?? ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-phone">Warehouse Phone</Label>
                <Input
                  id="wh-phone"
                  placeholder="+91 98765 43210"
                  value={formValues.contactPhone}
                  onChange={(e) => setFormValues({ ...formValues, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-email">Warehouse Email</Label>
              <Input
                id="wh-email"
                type="email"
                placeholder="bbsr-hub@tixeltech.com"
                value={formValues.contactEmail}
                onChange={(e) => setFormValues({ ...formValues, contactEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-address">Street Address</Label>
              <Input
                id="wh-address"
                placeholder="123 Industrial Area, Phase II"
                value={formValues.address}
                onChange={(e) => setFormValues({ ...formValues, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-city">City</Label>
                <Input
                  id="wh-city"
                  placeholder="Bhubaneswar"
                  value={formValues.city}
                  onChange={(e) => setFormValues({ ...formValues, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-state">State</Label>
                <Input
                  id="wh-state"
                  placeholder="Odisha"
                  value={formValues.state}
                  onChange={(e) => setFormValues({ ...formValues, state: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Settings" : "Register Node"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allocate Stock Dialog */}
      <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
        <DialogContent className="max-w-md rounded-2xl animate-in fade-in duration-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-indigo-600" />
              Allocate / Transfer Inventory Stock
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAllocateSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="alloc-product">Product to Allocate *</Label>
              <select
                id="alloc-product"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={allocationValues.productId}
                onChange={(e) => setAllocationValues({ ...allocationValues, productId: e.target.value })}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alloc-type">Allocation Transaction Type *</Label>
              <select
                id="alloc-type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={allocationValues.type}
                onChange={(e) =>
                  setAllocationValues({
                    ...allocationValues,
                    type: e.target.value as "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER",
                  })
                }
              >
                <option value="IN">IN (Add Stock)</option>
                <option value="OUT">OUT (Remove Stock)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Reset Absolute Qty)</option>
                <option value="TRANSFER">TRANSFER (Send to Other Warehouse)</option>
              </select>
            </div>

            {allocationValues.type === "TRANSFER" && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label htmlFor="alloc-target-wh">Destination Warehouse *</Label>
                <select
                  id="alloc-target-wh"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  value={allocationValues.targetWarehouseId}
                  onChange={(e) =>
                    setAllocationValues({ ...allocationValues, targetWarehouseId: e.target.value })
                  }
                >
                  <option value="">Select Destination</option>
                  {data
                    .filter((w) => w.id !== allocateWhId && w.isActive)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="alloc-qty">Quantity *</Label>
              <Input
                id="alloc-qty"
                type="number"
                min={1}
                required
                value={allocationValues.quantity}
                onChange={(e) =>
                  setAllocationValues({ ...allocationValues, quantity: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alloc-ref">Reference ID / Document # (optional)</Label>
              <Input
                id="alloc-ref"
                placeholder="e.g. PO-1029, SO-4982"
                value={allocationValues.reference}
                onChange={(e) => setAllocationValues({ ...allocationValues, reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alloc-notes">Additional Notes</Label>
              <Input
                id="alloc-notes"
                placeholder="Reason for adjustment, transfer context, etc."
                value={allocationValues.notes}
                onChange={(e) => setAllocationValues({ ...allocationValues, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Allocation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
