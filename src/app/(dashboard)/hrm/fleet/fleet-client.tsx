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
} from "lucide-react";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  getFuelLogs,
  createFuelLog,
  getEmployees,
  importVehicles,
} from "@/lib/actions/hrm";
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const [vData, flData, empData] = await Promise.all([
          getVehicles({ search: search || undefined, pageSize: 100 }),
          getFuelLogs({ vehicleId: selectedVehicle || undefined, pageSize: 100 }),
          getEmployees({ pageSize: 100, status: "ACTIVE" }),
        ]);
        setVehicles(vData);
        setFuelLogs(flData);
        setEmployees(empData);
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
          insuranceExpiry: (formData.get("insuranceExpiry") as string) || undefined,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
        });
        toast.success("Vehicle added");
        setVehicleOpen(false);
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
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
          >
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <a href={activeTab === "fuel"
            ? "/office/spreadsheets?template=fuel-logs&source=hrm-fleet"
            : "/office/spreadsheets?template=vehicles&source=hrm-fleet"
          }>
            <Button
              variant="outline"
              disabled={isPending}
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
            >
              <Upload className="h-4 w-4" /> Import Excel
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
                      <TableHead>Odometer</TableHead>
                      <TableHead>Insurance Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
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
                          <Select
                            value={v.status}
                            onValueChange={(val) => val && handleStatusChange(v.id, val)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                              <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
