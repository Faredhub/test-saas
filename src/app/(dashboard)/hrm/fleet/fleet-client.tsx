"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Loader2,
  Car,
  Fuel,
  Upload,
  Download,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getFuelLogs,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
  getEmployees,
  importVehicles,
} from "@/lib/actions/hrm";
import { getProjects } from "@/lib/actions/projects";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type VehiclesData = Awaited<ReturnType<typeof getVehicles>>;
type FuelLogsData = Awaited<ReturnType<typeof getFuelLogs>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;

const vehicleStatusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export function FleetClient() {
  const [vehicles, setVehicles] = useState<VehiclesData | null>(null);
  const [fuelLogs, setFuelLogs] = useState<FuelLogsData | null>(null);
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [search, setSearch] = useState("");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState("vehicles");
  const [projects, setProjects] = useState<any[]>([]);
  const [vehicleLogType, setVehicleLogType] = useState<"OFFICE" | "PROJECT">("OFFICE");
  const [editVehicleLogType, setEditVehicleLogType] = useState<"OFFICE" | "PROJECT">("OFFICE");

  const [viewVehicleDetails, setViewVehicleDetails] = useState<VehiclesData["data"][number] | null>(null);
  const [editVehicleDetails, setEditVehicleDetails] = useState<VehiclesData["data"][number] | null>(null);
  const [viewFuelLogDetails, setViewFuelLogDetails] = useState<FuelLogsData["data"][number] | null>(null);
  const [editFuelLogDetails, setEditFuelLogDetails] = useState<FuelLogsData["data"][number] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDeleteVehicle(id: string) {
    if (!confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) return;
    startTransition(async () => {
      try {
        const res = await deleteVehicle(id);
        if (res.success) {
          toast.success("Vehicle deleted successfully");
          loadData();
        } else {
          toast.error(res.error || "Failed to delete vehicle");
        }
      } catch {
        toast.error("Failed to delete vehicle");
      }
    });
  }

  function handleDeleteFuelLog(id: string) {
    if (!confirm("Are you sure you want to delete this fuel log? This action cannot be undone.")) return;
    startTransition(async () => {
      try {
        const res = await deleteFuelLog(id);
        if (res.success) {
          toast.success("Fuel log deleted successfully");
          loadData();
        } else {
          toast.error(res.error || "Failed to delete fuel log");
        }
      } catch {
        toast.error("Failed to delete fuel log");
      }
    });
  }

  async function handleEditVehicle(formData: FormData) {
    if (!editVehicleDetails) return;
    startTransition(async () => {
      try {
        await updateVehicle(editVehicleDetails.id, {
          make: (formData.get("make") as string) || undefined,
          model: (formData.get("model") as string) || undefined,
          year: formData.get("year") ? Number(formData.get("year")) : undefined,
          type: (formData.get("type") as string) || "CAR",
          fuelType: (formData.get("fuelType") as string) || undefined,
          assignedToId: (formData.get("assignedToId") as string) || null,
          projectId: editVehicleLogType === "PROJECT" ? (formData.get("projectId") as string) || null : null,
          insuranceExpiry: (formData.get("insuranceExpiry") as string) || undefined,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
          status: (formData.get("status") as string) || undefined,
        });
        toast.success("Vehicle updated successfully");
        setEditVehicleDetails(null);
        loadData();
      } catch {
        toast.error("Failed to update vehicle");
      }
    });
  }

  async function handleEditFuelLog(formData: FormData) {
    if (!editFuelLogDetails) return;
    startTransition(async () => {
      try {
        const res = await updateFuelLog(editFuelLogDetails.id, {
          date: (formData.get("date") as string) || undefined,
          litres: formData.get("litres") ? Number(formData.get("litres")) : undefined,
          costPerLitre: formData.get("costPerLitre") ? Number(formData.get("costPerLitre")) : undefined,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
          fuelStation: (formData.get("fuelStation") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        if (res.success) {
          toast.success("Fuel log updated successfully");
          setEditFuelLogDetails(null);
          loadData();
        } else {
          toast.error(res.error || "Failed to update fuel log");
        }
      } catch {
        toast.error("Failed to update fuel log");
      }
    });
  }

  function handleDownloadTemplate() {
    if (activeTab === "fuel") {
      const headers = [
        {
          "Registration No.": "KA-01-AB-1234",
          "Date": "2026-06-23",
          "Litres": 45.5,
          "Cost per Litre": 96.5,
          "Odometer (km)": 15050,
          "Fuel Station": "Shell Bunk",
          "Notes": "Regular diesel fill"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fuel Logs Template");
      XLSX.writeFile(workbook, "fuel_logs_template.xlsx");
      toast.success("Fuel Logs Excel template downloaded!");
    } else {
      const headers = [
        {
          "Registration No.": "KA-01-AB-1234",
          "Make": "Toyota",
          "Model": "Innova",
          "Year": 2024,
          "Type": "CAR",
          "Fuel Type": "DIESEL",
          "Assigned To (ID or Email)": "EMP-001",
          "Insurance Expiry": "2027-12-31",
          "Odometer (km)": 15000
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles Template");
      XLSX.writeFile(workbook, "vehicles_template.xlsx");
      toast.success("Vehicles Excel template downloaded!");
    }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = evt.target?.result;
            if (!data) return;
            const workbook = XLSX.read(data, { type: "binary" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            const vehiclesToImport = json.map((row) => ({
              registrationNo: String(row.registrationNo || row["Registration No."] || row["Registration Number"] || row["Reg No"] || "").trim(),
              make: String(row.make || row["Make"] || "").trim() || undefined,
              model: String(row.model || row["Model"] || "").trim() || undefined,
              year: row.year || row["Year"] ? Number(row.year || row["Year"]) : undefined,
              type: String(row.type || row["Type"] || "CAR").trim(),
              fuelType: String(row.fuelType || row["Fuel Type"] || "").trim() || undefined,
              assignedToIdOrEmail: String(row.assignedToIdOrEmail || row["Assigned To (ID or Email)"] || row["Assigned To"] || "").trim() || undefined,
              insuranceExpiry: row.insuranceExpiry || row["Insurance Expiry"] ? String(row.insuranceExpiry || row["Insurance Expiry"]).trim() : undefined,
              odometerKm: row.odometerKm || row["Odometer (km)"] || row["Odometer"] ? Number(row.odometerKm || row["Odometer (km)"] || row["Odometer"]) : undefined,
            }));

            const res = await importVehicles(vehiclesToImport);

            if (res && res.success) {
              if (res.errors && res.errors.length > 0) {
                toast.warning(`Imported ${res.count} vehicles with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
              } else {
                toast.success(`Successfully imported ${res.count} vehicles!`);
              }
              loadData();
            } else {
              toast.error(res?.error || "Failed to import vehicles");
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
  }

  function loadData() {
    startTransition(async () => {
      try {
        const [vData, flData, empData, projData] = await Promise.all([
          getVehicles({ search: search || undefined, pageSize: 100 }),
          getFuelLogs({ vehicleId: selectedVehicle || undefined, pageSize: 100 }),
          getEmployees({ pageSize: 100, status: "ACTIVE" }),
          getProjects({ pageSize: 100 }),
        ]);
        setVehicles(vData);
        setFuelLogs(flData);
        setEmployees(empData);
        setProjects(projData.projects || []);
      } catch {
        toast.error("Failed to load fleet data");
      }
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle]);

  async function handleCreateVehicle(formData: FormData) {
    startTransition(async () => {
      try {
        await createVehicle({
          registrationNo: formData.get("registrationNo") as string,
          make: (formData.get("make") as string) || undefined,
          model: (formData.get("model") as string) || undefined,
          year: formData.get("year") ? Number(formData.get("year")) : undefined,
          type: (formData.get("type") as string) || "CAR",
          fuelType: (formData.get("fuelType") as string) || undefined,
          assignedToId: (formData.get("assignedToId") as string) || undefined,
          projectId: vehicleLogType === "PROJECT" ? (formData.get("projectId") as string) || undefined : undefined,
          insuranceExpiry: (formData.get("insuranceExpiry") as string) || undefined,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
        });
        toast.success("Vehicle added");
        setVehicleOpen(false);
        setVehicleLogType("OFFICE");
        loadData();
      } catch {
        toast.error("Failed to add vehicle");
      }
    });
  }

  async function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateVehicle(id, { status });
        toast.success("Status updated");
        loadData();
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  async function handleCreateFuelLog(formData: FormData) {
    startTransition(async () => {
      try {
        const litres = Number(formData.get("litres"));
        const costPerLitre = Number(formData.get("costPerLitre"));
        await createFuelLog({
          vehicleId: formData.get("vehicleId") as string,
          date: formData.get("date") as string,
          litres,
          costPerLitre,
          totalCost: Math.round(litres * costPerLitre * 100) / 100,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
          fuelStation: (formData.get("fuelStation") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Fuel log added");
        setFuelOpen(false);
        loadData();
      } catch {
        toast.error("Failed to add fuel log");
      }
    });
  }

  // Stats
  const activeVehicles = vehicles?.data.filter((v) => v.status === "ACTIVE").length ?? 0;
  const maintenanceVehicles = vehicles?.data.filter((v) => v.status === "MAINTENANCE").length ?? 0;
  const totalFuelCost = fuelLogs?.data.reduce((sum, l) => sum + Number(l.totalCost), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <p className="text-muted-foreground">
            Manage vehicles, assignments, and fuel logs
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          {/* <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Download className="h-4 w-4" /> Download Template
          </Button> */}
          <a href={activeTab === "fuel"
            ? "/office/spreadsheets?template=fuel-logs&source=hrm-fleet"
            : "/office/spreadsheets?template=vehicles&source=hrm-fleet"
          }>
            <Button
              variant="outline"
              disabled={isPending}
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </a>
          <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <Fuel className="h-4 w-4" /> Log Fuel
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Fuel Entry</DialogTitle>
              </DialogHeader>
              <form action={handleCreateFuelLog} className="space-y-4">
                <div>
                  <Label>Vehicle *</Label>
                  <Select name="vehicleId" required>
                    <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles?.data.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registrationNo} - {v.make} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  </div>
                  <div>
                    <Label>Litres *</Label>
                    <Input name="litres" type="number" step="0.01" min="0" required />
                  </div>
                  <div>
                    <Label>Cost per Litre *</Label>
                    <Input name="costPerLitre" type="number" step="0.01" min="0" required />
                  </div>
                  <div>
                    <Label>Odometer (km)</Label>
                    <Input name="odometerKm" type="number" min="0" />
                  </div>
                </div>
                <div>
                  <Label>Fuel Station</Label>
                  <Input name="fuelStation" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log Fuel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Vehicle
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Vehicle</DialogTitle>
              </DialogHeader>
              <form action={handleCreateVehicle} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Registration No. *</Label>
                    <Input name="registrationNo" placeholder="e.g. KA-01-AB-1234" required />
                  </div>
                  <div>
                    <Label>Make</Label>
                    <Input name="make" placeholder="e.g. Toyota" />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input name="model" placeholder="e.g. Innova" />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input name="year" type="number" min="1990" max="2030" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select name="type" defaultValue="CAR">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAR">Car</SelectItem>
                        <SelectItem value="BIKE">Bike</SelectItem>
                        <SelectItem value="TRUCK">Truck</SelectItem>
                        <SelectItem value="VAN">Van</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fuel Type</Label>
                    <Select name="fuelType">
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PETROL">Petrol</SelectItem>
                        <SelectItem value="DIESEL">Diesel</SelectItem>
                        <SelectItem value="ELECTRIC">Electric</SelectItem>
                        <SelectItem value="CNG">CNG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Select name="assignedToId">
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees?.data.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.firstName} {e.lastName ?? ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Log For *</Label>
                    <Select 
                      value={vehicleLogType} 
                      onValueChange={(val) => setVehicleLogType(val as "OFFICE" | "PROJECT")}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFFICE">Office</SelectItem>
                        <SelectItem value="PROJECT">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {vehicleLogType === "PROJECT" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label>Project Name *</Label>
                      <Select name="projectId" required>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                        <SelectContent>
                          {projects.map((proj) => (
                            <SelectItem key={proj.id} value={proj.id}>
                              {proj.name} {proj.code ? `(${proj.code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Insurance Expiry</Label>
                    <Input name="insuranceExpiry" type="date" />
                  </div>
                  <div>
                    <Label>Odometer (km)</Label>
                    <Input name="odometerKm" type="number" min="0" defaultValue={0} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Vehicle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Vehicles</p>
            <p className="text-3xl font-bold mt-1">{vehicles?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{activeVehicles}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Maintenance</p>
            <p className="text-3xl font-bold mt-1 text-amber-600">{maintenanceVehicles}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fuel Cost (shown)</p>
            <p className="text-3xl font-bold mt-1">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalFuelCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vehicles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadData()}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={loadData} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!vehicles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : vehicles.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Car className="h-12 w-12 mb-4" />
                  <p>No vehicles found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration No.</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Insurance Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[280px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.data.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono font-medium">{v.registrationNo}</TableCell>
                        <TableCell>
                          {v.make ?? ""} {v.model ?? ""}
                          {v.year ? ` (${v.year})` : ""}
                        </TableCell>
                        <TableCell><Badge variant="outline">{v.type}</Badge></TableCell>
                        <TableCell>{v.fuelType ?? "-"}</TableCell>
                        <TableCell>
                          {v.assignedTo
                            ? `${v.assignedTo.firstName} ${v.assignedTo.lastName ?? ""}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.projectId ? "secondary" : "outline"} className={v.projectId ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20" : ""}>
                            {v.projectId ? `Project: ${v.project?.name || "Unknown"}` : "Office"}
                          </Badge>
                        </TableCell>
                        <TableCell>{v.odometerKm.toLocaleString()} km</TableCell>
                        <TableCell>
                          {v.insuranceExpiry
                            ? new Date(v.insuranceExpiry).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={vehicleStatusColors[v.status] ?? ""}>
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Details"
                              onClick={() => setViewVehicleDetails(v)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-900 hover:text-black hover:bg-slate-100"
                              title="Edit Vehicle"
                              onClick={() => {
                                setEditVehicleDetails(v);
                                setEditVehicleLogType(v.projectId ? "PROJECT" : "OFFICE");
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Vehicle"
                              onClick={() => handleDeleteVehicle(v.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Select
                              value={v.status}
                              onValueChange={(val) => val && handleStatusChange(v.id, val)}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs ml-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle>Fuel Logs</CardTitle>
                <Select value={selectedVehicle} onValueChange={(v) => setSelectedVehicle(v === "all" ? "" : v ?? "")}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="All Vehicles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    {vehicles?.data.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNo} - {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!fuelLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : fuelLogs.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Fuel className="h-12 w-12 mb-4" />
                  <p>No fuel logs found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Litres</TableHead>
                      <TableHead>Cost/Litre</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelLogs.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          {log.vehicle.registrationNo}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {log.vehicle.make} {log.vehicle.model}
                          </span>
                        </TableCell>
                        <TableCell>{Number(log.litres).toFixed(2)}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(log.costPerLitre))}
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(log.totalCost))}
                        </TableCell>
                        <TableCell>{log.odometerKm ? `${log.odometerKm.toLocaleString()} km` : "-"}</TableCell>
                        <TableCell>{log.fuelStation ?? "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{log.notes ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Details"
                              onClick={() => setViewFuelLogDetails(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-900 hover:text-black hover:bg-slate-100"
                              title="Edit Fuel Log"
                              onClick={() => setEditFuelLogDetails(log)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Fuel Log"
                              onClick={() => handleDeleteFuelLog(log.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Vehicle Details Dialog */}
      <Dialog open={!!viewVehicleDetails} onOpenChange={(open) => !open && setViewVehicleDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
          </DialogHeader>
          {viewVehicleDetails && (
            <div className="space-y-4">
              {/* Autofocus dummy button to prevent scrolling to bottom of modal */}
              <button className="sr-only" autoFocus aria-hidden="true">Focus Trap Fix</button>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Registration No.</span>
                  <span className="font-mono font-semibold">{viewVehicleDetails.registrationNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Status</span>
                  <Badge className={vehicleStatusColors[viewVehicleDetails.status] ?? ""}>
                    {viewVehicleDetails.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Make & Model</span>
                  <span className="font-medium">
                    {viewVehicleDetails.make ?? "-"} {viewVehicleDetails.model ?? ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Year</span>
                  <span className="font-medium">{viewVehicleDetails.year ?? "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Type</span>
                  <span className="font-medium">{viewVehicleDetails.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Fuel Type</span>
                  <span className="font-medium">{viewVehicleDetails.fuelType ?? "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Odometer Reading</span>
                  <span className="font-medium">{viewVehicleDetails.odometerKm.toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Insurance Expiry</span>
                  <span className="font-medium">
                    {viewVehicleDetails.insuranceExpiry
                      ? new Date(viewVehicleDetails.insuranceExpiry).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Assigned To</span>
                  <span className="font-medium">
                    {viewVehicleDetails.assignedTo
                      ? `${viewVehicleDetails.assignedTo.firstName} ${viewVehicleDetails.assignedTo.lastName ?? ""}`
                      : "Unassigned"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Usage Assignment</span>
                  <span className="font-medium">
                    {viewVehicleDetails.projectId
                      ? `Project: ${viewVehicleDetails.project?.name || "Unknown"}`
                      : "Office"}
                  </span>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Details Dialog */}
      <Dialog open={!!editVehicleDetails} onOpenChange={(open) => !open && setEditVehicleDetails(null)}>
        <DialogContent className="sm:max-w-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vehicle - {editVehicleDetails?.registrationNo}</DialogTitle>
          </DialogHeader>
          {editVehicleDetails && (
            <form action={handleEditVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Registration No.</Label>
                  <Input value={editVehicleDetails.registrationNo} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Make</Label>
                  <Input name="make" defaultValue={editVehicleDetails.make ?? ""} placeholder="e.g. Toyota" />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input name="model" defaultValue={editVehicleDetails.model ?? ""} placeholder="e.g. Innova" />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input name="year" type="number" min="1990" max="2030" defaultValue={editVehicleDetails.year ?? ""} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select name="type" defaultValue={editVehicleDetails.type}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAR">Car</SelectItem>
                      <SelectItem value="BIKE">Bike</SelectItem>
                      <SelectItem value="TRUCK">Truck</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuel Type</Label>
                  <Select name="fuelType" defaultValue={editVehicleDetails.fuelType ?? undefined}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PETROL">Petrol</SelectItem>
                      <SelectItem value="DIESEL">Diesel</SelectItem>
                      <SelectItem value="ELECTRIC">Electric</SelectItem>
                      <SelectItem value="CNG">CNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Select name="assignedToId" defaultValue={editVehicleDetails.assignedToId ?? "null"}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Unassigned</SelectItem>
                      {employees?.data.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName ?? ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Log For *</Label>
                  <Select 
                    value={editVehicleLogType} 
                    onValueChange={(val) => setEditVehicleLogType(val as "OFFICE" | "PROJECT")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OFFICE">Office</SelectItem>
                      <SelectItem value="PROJECT">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editVehicleLogType === "PROJECT" && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label>Project Name *</Label>
                    <Select name="projectId" defaultValue={editVehicleDetails.projectId ?? undefined} required>
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            {proj.name} {proj.code ? `(${proj.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Insurance Expiry</Label>
                  <Input
                    name="insuranceExpiry"
                    type="date"
                    defaultValue={
                      editVehicleDetails.insuranceExpiry
                        ? new Date(editVehicleDetails.insuranceExpiry).toISOString().slice(0, 10)
                        : ""
                    }
                  />
                </div>
                <div>
                  <Label>Odometer (km)</Label>
                  <Input name="odometerKm" type="number" min="0" defaultValue={editVehicleDetails.odometerKm} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editVehicleDetails.status}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setEditVehicleDetails(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Fuel Log Details Dialog */}
      <Dialog open={!!viewFuelLogDetails} onOpenChange={(open) => !open && setViewFuelLogDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fuel Log Details</DialogTitle>
          </DialogHeader>
          {viewFuelLogDetails && (
            <div className="space-y-4">
              {/* Autofocus dummy button to prevent scrolling to bottom of modal */}
              <button className="sr-only" autoFocus aria-hidden="true">Focus Trap Fix</button>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Vehicle</span>
                  <span className="font-semibold block">{viewFuelLogDetails.vehicle.registrationNo}</span>
                  <span className="text-xs text-muted-foreground">
                    {viewFuelLogDetails.vehicle.make} {viewFuelLogDetails.vehicle.model}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Date</span>
                  <span className="font-semibold">{new Date(viewFuelLogDetails.date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Litres</span>
                  <span className="font-medium">{Number(viewFuelLogDetails.litres).toFixed(2)} L</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Cost per Litre</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(viewFuelLogDetails.costPerLitre))}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Total Cost</span>
                  <span className="font-bold text-green-600">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(viewFuelLogDetails.totalCost))}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Odometer Reading</span>
                  <span className="font-medium">
                    {viewFuelLogDetails.odometerKm ? `${viewFuelLogDetails.odometerKm.toLocaleString()} km` : "-"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Fuel Station</span>
                  <span className="font-medium">{viewFuelLogDetails.fuelStation ?? "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Notes</span>
                  <span className="font-medium block whitespace-pre-wrap">{viewFuelLogDetails.notes ?? "-"}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Fuel Log Details Dialog */}
      <Dialog open={!!editFuelLogDetails} onOpenChange={(open) => !open && setEditFuelLogDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fuel Log - {editFuelLogDetails?.vehicle.registrationNo}</DialogTitle>
          </DialogHeader>
          {editFuelLogDetails && (
            <form action={handleEditFuelLog} className="space-y-4">
              <div>
                <Label>Vehicle</Label>
                <Input value={`${editFuelLogDetails.vehicle.registrationNo} - ${editFuelLogDetails.vehicle.make ?? ""} ${editFuelLogDetails.vehicle.model ?? ""}`} disabled className="bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input name="date" type="date" defaultValue={new Date(editFuelLogDetails.date).toISOString().slice(0, 10)} required />
                </div>
                <div>
                  <Label>Litres *</Label>
                  <Input name="litres" type="number" step="0.01" min="0" defaultValue={Number(editFuelLogDetails.litres)} required />
                </div>
                <div>
                  <Label>Cost per Litre *</Label>
                  <Input name="costPerLitre" type="number" step="0.01" min="0" defaultValue={Number(editFuelLogDetails.costPerLitre)} required />
                </div>
                <div>
                  <Label>Odometer (km)</Label>
                  <Input name="odometerKm" type="number" min="0" defaultValue={editFuelLogDetails.odometerKm ?? ""} />
                </div>
              </div>
              <div>
                <Label>Fuel Station</Label>
                <Input name="fuelStation" defaultValue={editFuelLogDetails.fuelStation ?? ""} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={editFuelLogDetails.notes ?? ""} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setEditFuelLogDetails(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
