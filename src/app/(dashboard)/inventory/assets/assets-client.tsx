"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, Pencil, Wrench, AlertTriangle, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { createAsset, updateAsset, getAssets, createMaintenanceRequest, updateMaintenanceRequest, getMaintenanceRequests } from "@/lib/actions/inventory";
import { toast } from "sonner";

type Props = {
  initialAssets: Awaited<ReturnType<typeof getAssets>>;
  initialMaintenance: Awaited<ReturnType<typeof getMaintenanceRequests>>;
};

const assetCategories = ["MACHINERY", "VEHICLE", "EQUIPMENT", "IT", "FURNITURE"];
const assetStatuses = ["ACTIVE", "MAINTENANCE", "RETIRED", "DISPOSED"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const maintenanceStatuses = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const maintenanceTypes = ["CORRECTIVE", "PREVENTIVE"];

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  RETIRED: "bg-gray-100 text-gray-800",
  DISPOSED: "bg-red-100 text-red-800",
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export function AssetsClient({ initialAssets, initialMaintenance }: Props) {
  const [assets, setAssets] = useState(initialAssets);
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAssetOpen, setIsAssetOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editMaintenanceId, setEditMaintenanceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const sample = [
      {
        "Asset Tag": "ASSET-001",
        "Name": "Dell Latitude 5520 Laptop",
        "Category": "IT",
        "Location": "Head Office - Floor 2",
        "Serial Number": "SN-DL5520-001",
        "Assigned To": "Ravi Kumar",
        "Purchase Date": "2024-01-15",
        "Purchase Cost": 75000,
        "Current Value": 55000,
        "Warranty Expiry": "2027-01-15",
        "Notes": "Standard issue laptop for engineering team"
      },
      {
        "Asset Tag": "ASSET-002",
        "Name": "Honda Activa - Office Vehicle",
        "Category": "VEHICLE",
        "Location": "Parking Bay A",
        "Serial Number": "MH12AB1234",
        "Assigned To": "Sales Team",
        "Purchase Date": "2023-06-01",
        "Purchase Cost": 85000,
        "Current Value": 70000,
        "Warranty Expiry": "2026-06-01",
        "Notes": "Used for client visits"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "assets_template.xlsx");
    toast.success("Assets template downloaded!");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const binaryData = evt.target?.result;
            if (!binaryData) return;

            const workbook = XLSX.read(binaryData, { type: "binary" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            let successCount = 0;
            for (const row of json) {
              const assetTag = String(row["Asset Tag"] || row.assetTag || "").trim();
              const name = String(row["Name"] || row.name || "").trim();
              if (!assetTag || !name) continue;

              const purchaseDate = String(row["Purchase Date"] || row.purchaseDate || "").trim();
              const warrantyExpiry = String(row["Warranty Expiry"] || row.warrantyExpiry || "").trim();

              try {
                await createAsset({
                  assetTag,
                  name,
                  category: String(row["Category"] || row.category || "").trim() || undefined,
                  location: String(row["Location"] || row.location || "").trim() || undefined,
                  serialNumber: String(row["Serial Number"] || row.serialNumber || "").trim() || undefined,
                  assignedTo: String(row["Assigned To"] || row.assignedTo || "").trim() || undefined,
                  purchaseDate: purchaseDate || undefined,
                  purchaseCost: parseFloat(String(row["Purchase Cost"] || row.purchaseCost || "")) || undefined,
                  currentValue: parseFloat(String(row["Current Value"] || row.currentValue || "")) || undefined,
                  warrantyExpiry: warrantyExpiry || undefined,
                  notes: String(row["Notes"] || row.notes || "").trim() || undefined,
                });
                successCount++;
              } catch (err) {
                console.error(`Failed to import asset "${name}":`, err);
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} asset${successCount > 1 ? "s" : ""}!`);
              refreshAssets();
            } else {
              toast.error("No valid assets found. Make sure Asset Tag and Name columns are filled.");
            }
          } catch (err: any) {
            toast.error(`Error parsing Excel: ${err.message}`);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  function refreshAssets() {
    startTransition(async () => {
      try {
        const result = await getAssets({
          search: search || undefined,
          category: categoryFilter === "all" ? undefined : categoryFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        setAssets(result);
      } catch {
        // ignore
      }
    });
  }

  function refreshMaintenance() {
    startTransition(async () => {
      try {
        const result = await getMaintenanceRequests();
        setMaintenance(result);
      } catch {
        // ignore
      }
    });
  }

  async function handleAssetSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const payload = {
          assetTag: formData.get("assetTag") as string,
          name: formData.get("name") as string,
          category: (formData.get("category") as string) || undefined,
          location: (formData.get("location") as string) || undefined,
          purchaseDate: (formData.get("purchaseDate") as string) || undefined,
          purchaseCost: parseFloat(formData.get("purchaseCost") as string) || undefined,
          currentValue: parseFloat(formData.get("currentValue") as string) || undefined,
          warrantyExpiry: (formData.get("warrantyExpiry") as string) || undefined,
          assignedTo: (formData.get("assignedTo") as string) || undefined,
          serialNumber: (formData.get("serialNumber") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        };

        if (editAssetId) {
          await updateAsset(editAssetId, payload);
          toast.success("Asset updated");
        } else {
          await createAsset(payload);
          toast.success("Asset created");
        }
        setIsAssetOpen(false);
        setEditAssetId(null);
        refreshAssets();
      } catch {
        toast.error(editAssetId ? "Failed to update asset" : "Failed to create asset");
      }
    });
  }

  async function handleMaintenanceSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editMaintenanceId) {
          await updateMaintenanceRequest(editMaintenanceId, {
            title: formData.get("title") as string,
            description: (formData.get("description") as string) || undefined,
            priority: (formData.get("priority") as string) || "MEDIUM",
            status: (formData.get("status") as string) || "OPEN",
            type: (formData.get("type") as string) || "CORRECTIVE",
            scheduledDate: (formData.get("scheduledDate") as string) || undefined,
            cost: parseFloat(formData.get("cost") as string) || undefined,
            assignedTo: (formData.get("assignedTo") as string) || undefined,
          });
          toast.success("Request updated");
        } else {
          await createMaintenanceRequest({
            assetId: (formData.get("assetId") as string) || undefined,
            title: formData.get("title") as string,
            description: (formData.get("description") as string) || undefined,
            priority: (formData.get("priority") as string) || "MEDIUM",
            type: (formData.get("type") as string) || "CORRECTIVE",
            scheduledDate: (formData.get("scheduledDate") as string) || undefined,
            assignedTo: (formData.get("assignedTo") as string) || undefined,
          });
          toast.success("Maintenance request created");
        }
        setIsMaintenanceOpen(false);
        setEditMaintenanceId(null);
        refreshMaintenance();
      } catch {
        toast.error("Failed to save maintenance request");
      }
    });
  }

  // Warranty alerts: assets with warranty expiring within 30 days
  const warrantyAlerts = assets.data.filter((a) => {
    if (!a.warrantyExpiry) return false;
    const expiry = new Date(a.warrantyExpiry);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 30;
  });

  const editAsset = editAssetId ? assets.data.find((a) => a.id === editAssetId) : null;
  const editMaintenance = editMaintenanceId ? maintenance.data.find((m) => m.id === editMaintenanceId) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assets &amp; Maintenance</h1>
          <p className="text-muted-foreground mt-1">Track assets, equipment, and maintenance requests</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Excel
          </Button>

          <Button variant="outline" onClick={() => { setEditMaintenanceId(null); setIsMaintenanceOpen(true); }} className="gap-2">
            <Wrench className="h-4 w-4" /> New Request
          </Button>
          <Button onClick={() => { setEditAssetId(null); setIsAssetOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        </div>
      </div>

      {/* Warranty Alerts */}
      {warrantyAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Warranty Expiring Soon</h3>
            </div>
            <div className="space-y-1">
              {warrantyAlerts.map((a) => (
                <p key={a.id} className="text-sm text-orange-700">
                  <span className="font-medium">{a.name}</span> ({a.assetTag}) - expires{" "}
                  {new Date(a.warrantyExpiry!).toLocaleDateString()}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Assets ({assets.total})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({maintenance.total})</TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === "Enter") refreshAssets(); }}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? "all"); refreshAssets(); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {assetCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); refreshAssets(); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {assetStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.data.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono text-sm font-semibold">{asset.assetTag}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{asset.name}</span>
                            {asset.serialNumber && (
                              <span className="block text-xs text-muted-foreground">S/N: {asset.serialNumber}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{asset.category ?? "-"}</TableCell>
                        <TableCell>{asset.location ?? "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[asset.status] ?? ""}>{asset.status}</Badge>
                        </TableCell>
                        <TableCell>{asset.assignedTo ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {asset.currentValue ? `₹${Number(asset.currentValue).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditAssetId(asset.id); setIsAssetOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditMaintenanceId(null); setIsMaintenanceOpen(true); }}>
                              <Wrench className="h-4 w-4" />
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

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No maintenance requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenance.data.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.title}</TableCell>
                        <TableCell>{req.asset ? `${req.asset.name} (${req.asset.assetTag})` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{req.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[req.priority] ?? ""}>{req.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[req.status] ?? ""}>{req.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>{req.assignedTo ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {req.cost ? `₹${Number(req.cost).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditMaintenanceId(req.id); setIsMaintenanceOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      {/* Asset Dialog */}
      <Dialog open={isAssetOpen} onOpenChange={(open) => { setIsAssetOpen(open); if (!open) setEditAssetId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAssetId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>
          <form action={handleAssetSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assetTag">Asset Tag *</Label>
                <Input id="assetTag" name="assetTag" required defaultValue={editAsset?.assetTag ?? ""} readOnly={!!editAssetId} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetName">Name *</Label>
                <Input id="assetName" name="name" required defaultValue={editAsset?.name ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assetCategory">Category</Label>
                <select name="category" defaultValue={editAsset?.category ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  {assetCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={editAsset?.location ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" name="serialNumber" defaultValue={editAsset?.serialNumber ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input id="assignedTo" name="assignedTo" defaultValue={editAsset?.assignedTo ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={editAsset?.purchaseDate ? new Date(editAsset.purchaseDate).toISOString().split("T")[0] : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseCost">Purchase Cost</Label>
                <Input id="purchaseCost" name="purchaseCost" type="number" step="0.01" defaultValue={editAsset?.purchaseCost ? Number(editAsset.purchaseCost) : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentValue">Current Value</Label>
                <Input id="currentValue" name="currentValue" type="number" step="0.01" defaultValue={editAsset?.currentValue ? Number(editAsset.currentValue) : ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
              <Input id="warrantyExpiry" name="warrantyExpiry" type="date" defaultValue={editAsset?.warrantyExpiry ? new Date(editAsset.warrantyExpiry).toISOString().split("T")[0] : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetNotes">Notes</Label>
              <Textarea id="assetNotes" name="notes" defaultValue={editAsset?.notes ?? ""} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editAssetId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Request Dialog */}
      <Dialog open={isMaintenanceOpen} onOpenChange={(open) => { setIsMaintenanceOpen(open); if (!open) setEditMaintenanceId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMaintenanceId ? "Edit Maintenance Request" : "New Maintenance Request"}</DialogTitle>
          </DialogHeader>
          <form action={handleMaintenanceSubmit} className="space-y-4">
            {!editMaintenanceId && (
              <div className="space-y-2">
                <Label htmlFor="maintAssetId">Asset</Label>
                <select name="assetId" defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">No specific asset</option>
                  {assets.data.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="maintTitle">Title *</Label>
              <Input id="maintTitle" name="title" required defaultValue={editMaintenance?.title ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintDesc">Description</Label>
              <Textarea id="maintDesc" name="description" defaultValue={editMaintenance?.description ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintType">Type</Label>
                <select name="type" defaultValue={editMaintenance?.type ?? "CORRECTIVE"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {maintenanceTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintPriority">Priority</Label>
                <select name="priority" defaultValue={editMaintenance?.priority ?? "MEDIUM"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            {editMaintenanceId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintStatus">Status</Label>
                  <select name="status" defaultValue={editMaintenance?.status ?? "OPEN"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {maintenanceStatuses.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintCost">Cost</Label>
                  <Input id="maintCost" name="cost" type="number" step="0.01" defaultValue={editMaintenance?.cost ? Number(editMaintenance.cost) : ""} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintSchedule">Scheduled Date</Label>
                <Input id="maintSchedule" name="scheduledDate" type="date" defaultValue={editMaintenance?.scheduledDate ? new Date(editMaintenance.scheduledDate).toISOString().split("T")[0] : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintAssigned">Assigned To</Label>
                <Input id="maintAssigned" name="assignedTo" defaultValue={editMaintenance?.assignedTo ?? ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editMaintenanceId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
