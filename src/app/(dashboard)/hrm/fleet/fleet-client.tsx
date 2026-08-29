"use client";

import { useState, useEffect, useTransition, useRef, useMemo } from "react";
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
  MapPin,
  User,
  FolderKanban,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Route,
} from "lucide-react";
import Link from "next/link";
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
  getTrips,
  createTrip,
  updateTripStatus,
  deleteTrip,
} from "@/lib/actions/hrm";
import { getProjects } from "@/lib/actions/projects";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { usePermission } from "@/hooks/use-permission";

type VehiclesData = Awaited<ReturnType<typeof getVehicles>>;
type FuelLogsData = Awaited<ReturnType<typeof getFuelLogs>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type TripsData = Awaited<ReturnType<typeof getTrips>>;

const vehicleStatusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

const tripStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  COMPLETED: "bg-green-100 text-green-700 border-green-300",
};

export function FleetClient({ currentUser }: { currentUser?: any }) {
  const { isSuperOrAdmin, canCreate, canUpdate, canDelete } = usePermission();
  const allowCreate = canCreate("fleet", "hrm") || canCreate("vehicles", "hrm") || isSuperOrAdmin;
  const allowUpdate = canUpdate("fleet", "hrm") || canUpdate("vehicles", "hrm") || isSuperOrAdmin;
  const allowDelete = canDelete("fleet", "hrm") || canDelete("vehicles", "hrm") || isSuperOrAdmin;

  const isManagerOrAdmin = useMemo(() => {
    if (isSuperOrAdmin || allowUpdate || allowDelete) return true;
    if (!currentUser) return true;
    const roles = (currentUser.roles as string[]) || [];
    return roles.some((r) =>
      ["Admin", "Super Admin", "HR Admin", "HR Manager", "Manager"].includes(r)
    );
  }, [currentUser, isSuperOrAdmin, allowUpdate, allowDelete]);

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

  // Type specifications
  const [addVehicleType, setAddVehicleType] = useState("CAR");
  const [editVehicleType, setEditVehicleType] = useState("CAR");

  // Trips state
  const [trips, setTrips] = useState<TripsData | null>(null);
  const [tripOpen, setTripOpen] = useState(false);
  const [isCalendarMode, setIsCalendarMode] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [viewTripDetails, setViewTripDetails] = useState<TripsData["data"][number] | null>(null);
  
  // For selecting driver & vehicle during approval
  const [selectedDriverId, setSelectedDriverId] = useState<string>("null");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("null");

  // When viewTripDetails is set, initialize selects
  useEffect(() => {
    if (viewTripDetails) {
      setSelectedDriverId(viewTripDetails.driverId || "null");
      setSelectedVehicleId(viewTripDetails.vehicleId || "null");
    } else {
      setSelectedDriverId("null");
      setSelectedVehicleId("null");
    }
  }, [viewTripDetails]);

  const [prefilledTripDate, setPrefilledTripDate] = useState("");

  // Fuel log photos states
  const [odometerStartPhoto, setOdometerStartPhoto] = useState("");
  const [odometerEndPhoto, setOdometerEndPhoto] = useState("");
  const [fuelReceiptPhoto, setFuelReceiptPhoto] = useState("");

  const [editOdometerStartPhoto, setEditOdometerStartPhoto] = useState("");
  const [editOdometerEndPhoto, setEditOdometerEndPhoto] = useState("");
  const [editFuelReceiptPhoto, setEditFuelReceiptPhoto] = useState("");

  // Dynamic cost calculation inputs
  const [fuelLitresInput, setFuelLitresInput] = useState<number | "">("");
  const [fuelTotalCostInput, setFuelTotalCostInput] = useState<number | "">("");
  const [editFuelLitresInput, setEditFuelLitresInput] = useState<number | "">("");
  const [editFuelTotalCostInput, setEditFuelTotalCostInput] = useState<number | "">("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatDate(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Load photos into edit state when Edit Fuel Log modal opens
  useEffect(() => {
    if (editFuelLogDetails) {
      setEditOdometerStartPhoto(editFuelLogDetails.odometerStartPhoto || "");
      setEditOdometerEndPhoto(editFuelLogDetails.odometerEndPhoto || "");
      setEditFuelReceiptPhoto(editFuelLogDetails.fuelReceiptPhoto || "");
      setEditFuelLitresInput(Number(editFuelLogDetails.litres));
      setEditFuelTotalCostInput(Number(editFuelLogDetails.totalCost));
    }
  }, [editFuelLogDetails]);

  // Load type when Edit Vehicle details opens
  useEffect(() => {
    if (editVehicleDetails) {
      const type = editVehicleDetails.type;
      const isStandardType = ["CAR", "BIKE", "TRUCK", "VAN"].includes(type);
      setEditVehicleType(isStandardType ? type : "OTHER");
    }
  }, [editVehicleDetails]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const computedCostPerLitre = useMemo(() => {
    if (fuelLitresInput && fuelTotalCostInput) {
      return (Number(fuelTotalCostInput) / Number(fuelLitresInput)).toFixed(2);
    }
    return "";
  }, [fuelLitresInput, fuelTotalCostInput]);

  const computedEditCostPerLitre = useMemo(() => {
    if (editFuelLitresInput && editFuelTotalCostInput) {
      return (Number(editFuelTotalCostInput) / Number(editFuelLitresInput)).toFixed(2);
    }
    return "";
  }, [editFuelLitresInput, editFuelTotalCostInput]);

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
        const typeSelected = formData.get("type") as string;
        const type = typeSelected === "OTHER" ? (formData.get("customType") as string) : typeSelected;

        await updateVehicle(editVehicleDetails.id, {
          make: (formData.get("make") as string) || undefined,
          model: (formData.get("model") as string) || undefined,
          year: formData.get("year") ? Number(formData.get("year")) : undefined,
          type: type || "CAR",
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
        const litres = Number(formData.get("litres"));
        const costPerLitre = editFuelLitresInput && editFuelTotalCostInput ? (Number(editFuelTotalCostInput) / Number(editFuelLitresInput)) : Number(formData.get("costPerLitre"));
        
        const res = await updateFuelLog(editFuelLogDetails.id, {
          date: (formData.get("date") as string) || undefined,
          litres,
          costPerLitre,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
          fuelStation: (formData.get("fuelStation") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          odometerStartPhoto: editOdometerStartPhoto || undefined,
          odometerEndPhoto: editOdometerEndPhoto || undefined,
          fuelReceiptPhoto: editFuelReceiptPhoto || undefined,
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
        const [vData, flData, empData, projData, tData] = await Promise.all([
          getVehicles({ search: search || undefined, pageSize: 100 }),
          getFuelLogs({ vehicleId: selectedVehicle || undefined, pageSize: 100 }),
          getEmployees({ pageSize: 100, status: "ACTIVE" }),
          getProjects({ pageSize: 100 }),
          getTrips({ search: search || undefined, pageSize: 100 }),
        ]);
        setVehicles(vData);
        setFuelLogs(flData);
        setEmployees(empData);
        setProjects(projData.projects || []);
        setTrips(tData);
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
        const typeSelected = formData.get("type") as string;
        const type = typeSelected === "OTHER" ? (formData.get("customType") as string) : typeSelected;

        await createVehicle({
          registrationNo: formData.get("registrationNo") as string,
          make: (formData.get("make") as string) || undefined,
          model: (formData.get("model") as string) || undefined,
          year: formData.get("year") ? Number(formData.get("year")) : undefined,
          type: type || "CAR",
          fuelType: (formData.get("fuelType") as string) || undefined,
          assignedToId: (formData.get("assignedToId") as string) || undefined,
          projectId: vehicleLogType === "PROJECT" ? (formData.get("projectId") as string) || undefined : undefined,
          insuranceExpiry: (formData.get("insuranceExpiry") as string) || undefined,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
        });
        toast.success("Vehicle added");
        setVehicleOpen(false);
        setVehicleLogType("OFFICE");
        setAddVehicleType("CAR");
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
        const totalCost = Number(formData.get("totalCost"));
        const costPerLitre = litres > 0 ? totalCost / litres : 0;
        await createFuelLog({
          vehicleId: formData.get("vehicleId") as string,
          date: formData.get("date") as string,
          litres,
          costPerLitre,
          totalCost,
          odometerKm: formData.get("odometerKm") ? Number(formData.get("odometerKm")) : undefined,
          fuelStation: (formData.get("fuelStation") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          odometerStartPhoto: odometerStartPhoto || undefined,
          odometerEndPhoto: odometerEndPhoto || undefined,
          fuelReceiptPhoto: fuelReceiptPhoto || undefined,
        });
        toast.success("Fuel log added");
        setFuelOpen(false);
        setOdometerStartPhoto("");
        setOdometerEndPhoto("");
        setFuelReceiptPhoto("");
        setFuelLitresInput("");
        setFuelTotalCostInput("");
        loadData();
      } catch {
        toast.error("Failed to add fuel log");
      }
    });
  }

  // Trip operations
  async function handleCreateTrip(formData: FormData) {
    startTransition(async () => {
      try {
        const vehicleId = formData.get("vehicleId") as string;
        const employeeId = formData.get("employeeId") as string;
        const driverId = formData.get("driverId") as string;
        const projectId = formData.get("projectId") as string;
        const approxDistanceKm = formData.get("approxDistanceKm") ? Number(formData.get("approxDistanceKm")) : undefined;

        await createTrip({
          vehicleId: vehicleId !== "null" ? vehicleId : undefined,
          employeeId: employeeId !== "null" ? employeeId : undefined,
          driverId: driverId !== "null" ? driverId : undefined,
          projectId: projectId !== "null" ? projectId : undefined,
          purpose: formData.get("purpose") as string,
          startLocation: formData.get("startLocation") as string,
          endLocation: formData.get("endLocation") as string,
          startDate: formData.get("startDate") as string,
          endDate: formData.get("endDate") as string,
          approxDistanceKm,
        });
        toast.success("Trip request submitted");
        setTripOpen(false);
        setPrefilledTripDate("");
        loadData();
      } catch {
        toast.error("Failed to submit trip request");
      }
    });
  }

  async function handleTripStatusUpdate(tripId: string, status: string, driverId?: string, vehicleId?: string) {
    startTransition(async () => {
      try {
        const res = await updateTripStatus(tripId, status, driverId, vehicleId);
        if (res.success) {
          toast.success(`Trip request ${status.toLowerCase()}`);
          loadData();
        } else {
          toast.error(res.error || "Failed to update trip status");
        }
      } catch {
        toast.error("Failed to update trip status");
      }
    });
  }

  async function handleDeleteTrip(tripId: string) {
    if (!confirm("Are you sure you want to delete this trip request?")) return;
    startTransition(async () => {
      try {
        const res = await deleteTrip(tripId);
        if (res.success) {
          toast.success("Trip request deleted");
          loadData();
        } else {
          toast.error(res.error || "Failed to delete trip");
        }
      } catch {
        toast.error("Failed to delete trip");
      }
    });
  }

  // Monthly Calendar cells logic
  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth();

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth + 1, 1));
  };
  const goToToday = () => {
    setCurrentCalendarDate(new Date());
  };

  const calendarCells = useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    
    const prevPadding = firstDay.getDay();
    for (let i = prevPadding - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth, -i);
      cells.push({ date: d, isCurrentMonth: false });
    }
    
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(calYear, calMonth, i);
      cells.push({ date: d, isCurrentMonth: true });
    }
    
    const nextPadding = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= nextPadding; i++) {
      const d = new Date(calYear, calMonth + 1, i);
      cells.push({ date: d, isCurrentMonth: false });
    }
    
    return cells;
  }, [calYear, calMonth]);

  const calendarCellsWithTrips = useMemo(() => {
    return calendarCells.map((cell) => {
      const dateKey = formatDate(cell.date);
      const cellTrips = trips?.data.filter((t) => {
        const tripDateStr = formatDate(new Date(t.startDate));
        return tripDateStr === dateKey;
      }) ?? [];
      return { ...cell, trips: cellTrips };
    });
  }, [calendarCells, trips]);

  // Stats Calculations
  const activeVehicles = vehicles?.data.filter((v) => v.status === "ACTIVE").length ?? 0;
  const maintenanceVehicles = vehicles?.data.filter((v) => v.status === "MAINTENANCE").length ?? 0;
  const totalFuelCost = fuelLogs?.data.reduce((sum, l) => sum + Number(l.totalCost), 0) ?? 0;

  // Average Fuel Efficiency Calculation
  const avgEfficiency = useMemo(() => {
    let totalKmRun = 0;
    let totalLitresConsumed = 0;
    const vehicleOdometerMap = new Map<string, number[]>();

    fuelLogs?.data.forEach((log) => {
      if (log.odometerKm) {
        if (!vehicleOdometerMap.has(log.vehicleId)) {
          vehicleOdometerMap.set(log.vehicleId, []);
        }
        vehicleOdometerMap.get(log.vehicleId)!.push(log.odometerKm);
      }
    });

    vehicleOdometerMap.forEach((odometers) => {
      if (odometers.length > 1) {
        const minOdo = Math.min(...odometers);
        const maxOdo = Math.max(...odometers);
        totalKmRun += (maxOdo - minOdo);
      }
    });

    totalLitresConsumed = fuelLogs?.data.reduce((sum, l) => sum + Number(l.litres), 0) ?? 0;
    return totalLitresConsumed > 0 ? (totalKmRun / totalLitresConsumed) : 0;
  }, [fuelLogs]);

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
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
              <Fuel className="h-4 w-4" /> Log Fuel
            </DialogTrigger>
            <DialogContent className="max-w-lg">
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
                    <Input 
                      name="litres" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={fuelLitresInput}
                      onChange={(e) => setFuelLitresInput(e.target.value ? Number(e.target.value) : "")}
                      required 
                    />
                  </div>
                  <div>
                    <Label>Total Cost (INR) *</Label>
                    <Input 
                      name="totalCost" 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={fuelTotalCostInput}
                      onChange={(e) => setFuelTotalCostInput(e.target.value ? Number(e.target.value) : "")}
                      required 
                    />
                  </div>
                  <div>
                    <Label>Odometer (km)</Label>
                    <Input name="odometerKm" type="number" min="0" />
                  </div>
                  <div className="col-span-2">
                    <Label>Cost per Litre (Calculated automatically)</Label>
                    <Input 
                      name="costPerLitre" 
                      type="text" 
                      value={computedCostPerLitre ? `₹${computedCostPerLitre} / L` : ""} 
                      disabled 
                      className="bg-muted font-semibold text-green-600" 
                    />
                  </div>
                </div>
                <div>
                  <Label>Fuel Station</Label>
                  <Input name="fuelStation" />
                </div>
                
                {/* Odometer Photos & Fuel Receipt */}
                <div className="grid grid-cols-3 gap-2 border-t pt-2">
                  <div>
                    <Label className="text-xs">Odo Start Photo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setOdometerStartPhoto)} className="text-xs h-8 cursor-pointer" />
                    {odometerStartPhoto && <span className="text-[10px] text-green-500 font-semibold mt-1 block">Uploaded ✓</span>}
                  </div>
                  <div>
                    <Label className="text-xs">Odo End Photo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setOdometerEndPhoto)} className="text-xs h-8 cursor-pointer" />
                    {odometerEndPhoto && <span className="text-[10px] text-green-500 font-semibold mt-1 block">Uploaded ✓</span>}
                  </div>
                  <div>
                    <Label className="text-xs">Fuel Receipt</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setFuelReceiptPhoto)} className="text-xs h-8 cursor-pointer" />
                    {fuelReceiptPhoto && <span className="text-[10px] text-green-500 font-semibold mt-1 block">Uploaded ✓</span>}
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
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
                    <Select name="type" value={addVehicleType} onValueChange={(val) => setAddVehicleType(val || "CAR")}>
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
                  {addVehicleType === "OTHER" && (
                    <div>
                      <Label>Specify Type *</Label>
                      <Input name="customType" placeholder="e.g. Tractor, Crane" required />
                    </div>
                  )}
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
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
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

      {/* Stats Dashboard Grid */}
      <div className="grid gap-4 sm:grid-cols-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
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
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20 bg-blue-50/20 dark:bg-blue-950/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Avg Fuel Efficiency
            </p>
            <p className="text-3xl font-bold mt-1 text-blue-600">
              {avgEfficiency > 0 ? `${avgEfficiency.toFixed(1)} km/L` : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
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
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                              title="View Details"
                              onClick={() => setViewVehicleDetails(v)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-900 hover:text-black hover:bg-slate-100 cursor-pointer"
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
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
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

        {/* TRIPS TAB CONTENT */}
        <TabsContent value="trips" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
              <div className="flex flex-1 items-center gap-4">
                <CardTitle>Trip Requests & Assignment</CardTitle>
                <div className="flex rounded-md border p-0.5 bg-muted/40 text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-3 text-xs cursor-pointer ${!isCalendarMode ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"}`}
                    onClick={() => setIsCalendarMode(false)}
                  >
                    List View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-3 text-xs cursor-pointer ${isCalendarMode ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"}`}
                    onClick={() => setIsCalendarMode(true)}
                  >
                    Calendar View
                  </Button>
                </div>
              </div>
              <Link href="/hrm/trips">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <Route className="h-3.5 w-3.5 text-primary" /> Trip Requests Submodule
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              {isCalendarMode ? (
                /* MONTHLY CALENDAR GRID VIEW FOR TRIPS */
                <div className="space-y-4 max-w-3xl mx-auto w-full animate-in fade-in duration-200">
                  {/* Legend keys */}
                  <div className="flex flex-wrap gap-3 text-[11px] justify-end bg-muted/30 p-2 rounded-lg border border-muted-foreground/10">
                    <span className="font-semibold text-muted-foreground mr-1">Status Key:</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-100 border border-amber-300" /> Pending</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-100 border border-blue-300" /> Approved</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-100 border border-green-300" /> Completed</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-100 border border-red-300" /> Rejected</span>
                  </div>

                  {/* Calendar Navigation header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-bold text-sm min-w-[140px] text-center select-none">
                        {currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold cursor-pointer" onClick={goToToday}>
                        Today
                      </Button>
                    </div>
                  </div>

                  {/* Monthly grid columns */}
                  <div className="grid grid-cols-7 gap-1 md:gap-1.5 border-t pt-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                      <div key={dayName} className={`text-center font-bold text-[10px] md:text-xs py-1 uppercase select-none ${
                        dayName === "Sun" ? "text-red-500" : "text-muted-foreground"
                      }`}>
                        {dayName}
                      </div>
                    ))}

                    {calendarCellsWithTrips.map((cell, index) => {
                      const isToday = new Date().toDateString() === cell.date.toDateString();
                      const isCurrMonth = cell.isCurrentMonth;
                      const isSunday = cell.date.getDay() === 0;
                      const dateKey = formatDate(cell.date);

                      let cellClass = "min-h-[64px] md:min-h-[76px] flex flex-col justify-between border rounded-lg p-1.5 transition-all duration-200 relative select-none hover:shadow-xs ";
                      if (isCurrMonth) {
                        cellClass += isSunday ? "bg-red-50/10 border-red-100 text-foreground hover:bg-red-50/20" : "bg-background border-border hover:bg-muted/30";
                      } else {
                        cellClass += "bg-muted/10 border-muted text-muted-foreground/30";
                      }

                      if (isToday) {
                        cellClass += " ring-2 ring-primary ring-offset-2";
                      }

                      return (
                        <div
                          key={`${dateKey}-${index}`}
                          className={cellClass}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className={`text-[10px] md:text-xs font-bold ${
                              isToday
                                ? "bg-primary text-primary-foreground h-4 w-4 rounded-full flex items-center justify-center font-bold text-[8px]"
                                : isSunday
                                ? "text-red-500"
                                : isCurrMonth
                                ? "text-foreground"
                                : "text-muted-foreground/30"
                            }`}>
                              {cell.date.getDate()}
                            </span>
                            {isCurrMonth && (
                              <span className="text-[8px] text-muted-foreground opacity-30 hover:opacity-100 font-bold transition-opacity">
                                + Add
                              </span>
                            )}
                          </div>

                          <div className="flex-1 space-y-0.5 overflow-y-auto max-h-[48px]" onClick={(e) => e.stopPropagation()}>
                            {cell.trips.map((trip) => (
                              <div
                                key={trip.id}
                                className={`rounded px-1 py-0.5 text-[8px] border truncate leading-tight cursor-pointer font-medium hover:brightness-95 transition-all ${
                                  tripStatusColors[trip.status] || ""
                                }`}
                                onClick={() => setViewTripDetails(trip)}
                                title={`${trip.employee?.firstName || "Trip"}: ${trip.startLocation} to ${trip.endLocation}`}
                              >
                                {trip.employee?.firstName ? `${trip.employee.firstName[0]}. ` : ""}{trip.purpose}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* TRIP REQUESTS LIST VIEW */
                <div className="space-y-4">
                  {!trips ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : trips.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mb-4" />
                      <p>No trip requests found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route</TableHead>
                          <TableHead>Timings</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead>Vehicle & Driver</TableHead>
                          <TableHead>Linkings</TableHead>
                          <TableHead>Km & Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[200px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips.data.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">
                              <span className="block">{t.startLocation}</span>
                              <span className="text-[10px] text-muted-foreground block">to</span>
                              <span className="block text-primary">{t.endLocation}</span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="block">Start: {new Date(t.startDate).toLocaleString()}</span>
                              <span className="block text-muted-foreground">End: {new Date(t.endDate).toLocaleString()}</span>
                            </TableCell>
                            <TableCell>{t.employee ? `${t.employee.firstName} ${t.employee.lastName ?? ""}` : "-"}</TableCell>
                            <TableCell>
                              <span className="font-mono block text-xs">{t.vehicle?.registrationNo ?? "Unassigned"}</span>
                              <span className="text-xs text-muted-foreground block">Driver: {t.driver ? `${t.driver.firstName} ${t.driver.lastName ?? ""}` : "None"}</span>
                            </TableCell>
                            <TableCell>
                              {t.projectId ? (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700">Project: {t.project?.name}</Badge>
                              ) : (
                                <Badge variant="outline">Office</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="block">{t.approxDistanceKm ? `${t.approxDistanceKm} km` : "-"}</span>
                              <span className="block font-semibold text-green-600">
                                {t.allocatedCost ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(t.allocatedCost) : "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border ${tripStatusColors[t.status] || ""}`}>
                                {t.status}
                              </Badge>
                              {t.status === "APPROVED" && t.approvedBy && (
                                <span className="block text-[10px] text-muted-foreground mt-1 font-medium whitespace-nowrap">
                                  Approved by: {t.approvedBy.firstName} {t.approvedBy.lastName ?? ""}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 cursor-pointer"
                                  onClick={() => setViewTripDetails(t)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {t.status === "PENDING" && isManagerOrAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 cursor-pointer"
                                      onClick={() => handleTripStatusUpdate(t.id, "APPROVED")}
                                      title="Approve"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                      onClick={() => handleTripStatusUpdate(t.id, "REJECTED")}
                                      title="Reject"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 cursor-pointer"
                                  onClick={() => handleDeleteTrip(t.id)}
                                  title="Delete"
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
                </div>
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
                      <TableHead>Photos</TableHead>
                      <TableHead>Station</TableHead>
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
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {log.odometerStartPhoto && <span className="h-2 w-2 rounded-full bg-blue-500" title="Has Start Odo Photo" />}
                            {log.odometerEndPhoto && <span className="h-2 w-2 rounded-full bg-purple-500" title="Has End Odo Photo" />}
                            {log.fuelReceiptPhoto && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Has Fuel Receipt Photo" />}
                            {!log.odometerStartPhoto && !log.odometerEndPhoto && !log.fuelReceiptPhoto && <span className="text-xs text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>{log.fuelStation ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                              title="View Details"
                              onClick={() => setViewFuelLogDetails(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-900 hover:text-black hover:bg-slate-100 cursor-pointer"
                              title="Edit Fuel Log"
                              onClick={() => setEditFuelLogDetails(log)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
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
                  <Select name="type" value={editVehicleType} onValueChange={(val) => setEditVehicleType(val || "CAR")}>
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
                {editVehicleType === "OTHER" && (
                  <div>
                    <Label>Specify Type *</Label>
                    <Input name="customType" defaultValue={["CAR", "BIKE", "TRUCK", "VAN"].includes(editVehicleDetails.type) ? "" : editVehicleDetails.type} placeholder="e.g. Tractor" required />
                  </div>
                )}
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

              {/* Photo Previews */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground block">Uploaded Photo Proofs</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div>
                    <span className="block text-muted-foreground mb-1">Odometer Start</span>
                    {viewFuelLogDetails.odometerStartPhoto ? (
                      <a href={viewFuelLogDetails.odometerStartPhoto} target="_blank" rel="noreferrer" className="block border rounded p-1 hover:border-primary">
                        <img src={viewFuelLogDetails.odometerStartPhoto} alt="Odo Start" className="h-16 w-full object-cover rounded" />
                      </a>
                    ) : <span className="block p-4 border border-dashed rounded text-muted-foreground/50">None</span>}
                  </div>
                  <div>
                    <span className="block text-muted-foreground mb-1">Odometer End</span>
                    {viewFuelLogDetails.odometerEndPhoto ? (
                      <a href={viewFuelLogDetails.odometerEndPhoto} target="_blank" rel="noreferrer" className="block border rounded p-1 hover:border-primary">
                        <img src={viewFuelLogDetails.odometerEndPhoto} alt="Odo End" className="h-16 w-full object-cover rounded" />
                      </a>
                    ) : <span className="block p-4 border border-dashed rounded text-muted-foreground/50">None</span>}
                  </div>
                  <div>
                    <span className="block text-muted-foreground mb-1">Fuel Receipt</span>
                    {viewFuelLogDetails.fuelReceiptPhoto ? (
                      <a href={viewFuelLogDetails.fuelReceiptPhoto} target="_blank" rel="noreferrer" className="block border rounded p-1 hover:border-primary">
                        <img src={viewFuelLogDetails.fuelReceiptPhoto} alt="Receipt" className="h-16 w-full object-cover rounded" />
                      </a>
                    ) : <span className="block p-4 border border-dashed rounded text-muted-foreground/50">None</span>}
                  </div>
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
                  <Input 
                    name="litres" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={editFuelLitresInput}
                    onChange={(e) => setEditFuelLitresInput(e.target.value ? Number(e.target.value) : "")}
                    required 
                  />
                </div>
                <div>
                  <Label>Total Cost (INR) *</Label>
                  <Input 
                    name="totalCost" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={editFuelTotalCostInput}
                    onChange={(e) => setEditFuelTotalCostInput(e.target.value ? Number(e.target.value) : "")}
                    required 
                  />
                </div>
                <div>
                  <Label>Odometer (km)</Label>
                  <Input name="odometerKm" type="number" min="0" defaultValue={editFuelLogDetails.odometerKm ?? ""} />
                </div>
                <div className="col-span-2">
                  <Label>Cost per Litre (Calculated automatically)</Label>
                  <Input 
                    name="costPerLitre" 
                    type="text" 
                    value={computedEditCostPerLitre ? `₹${computedEditCostPerLitre} / L` : ""} 
                    disabled 
                    className="bg-muted font-semibold text-green-600" 
                  />
                </div>
              </div>
              <div>
                <Label>Fuel Station</Label>
                <Input name="fuelStation" defaultValue={editFuelLogDetails.fuelStation ?? ""} />
              </div>

              {/* Photo Proof Edits */}
              <div className="grid grid-cols-3 gap-2 border-t pt-2">
                <div>
                  <Label className="text-xs">Odo Start Photo</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditOdometerStartPhoto)} className="text-xs h-8 cursor-pointer" />
                  {editOdometerStartPhoto && <span className="text-[10px] text-green-500 font-semibold mt-1 block">Uploaded ✓</span>}
                </div>
                <div>
                  <Label className="text-xs">Odo End Photo</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditOdometerEndPhoto)} className="text-xs h-8 cursor-pointer" />
                  {editOdometerEndPhoto && <span className="text-[10px] text-green-500 font-semibold mt-1 block">Uploaded ✓</span>}
                </div>
                <div>
                  <Label className="text-xs">Fuel Receipt</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditFuelReceiptPhoto)} className="text-xs h-8 cursor-pointer" />
                  {editFuelReceiptPhoto && <span className="text-[10px] text-green-500 font-semibold mt-1 block">Uploaded ✓</span>}
                </div>
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

      {/* Dialog for Requesting Trip */}
      <Dialog open={tripOpen} onOpenChange={(open) => {
        if (!open) setPrefilledTripDate("");
        setTripOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request & Assign Trip</DialogTitle>
          </DialogHeader>
          <form action={handleCreateTrip} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle *</Label>
                <Select name="vehicleId" defaultValue="null">
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Select Vehicle (Optional)</SelectItem>
                    {vehicles?.data.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNo} - {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employee requesting trip *</Label>
                <Select name="employeeId" defaultValue="null">
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Select Employee (Optional)</SelectItem>
                    {employees?.data.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isManagerOrAdmin && (
                <div>
                  <Label>Driver assignment</Label>
                  <Select name="driverId" defaultValue="null">
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Select Driver (Optional)</SelectItem>
                      {employees?.data.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName ?? ""} (Driver)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Link to Project</Label>
                <Select name="projectId" defaultValue="null">
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">No Project Linkage (Office)</SelectItem>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.name} {proj.code ? `(${proj.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trip Start Timings *</Label>
                <Input 
                  name="startDate" 
                  type="datetime-local" 
                  defaultValue={prefilledTripDate ? `${prefilledTripDate}T09:00` : ""} 
                  required 
                />
              </div>
              <div>
                <Label>Trip End Timings *</Label>
                <Input 
                  name="endDate" 
                  type="datetime-local" 
                  defaultValue={prefilledTripDate ? `${prefilledTripDate}T18:00` : ""} 
                  required 
                />
              </div>
              <div>
                <Label>Start Location *</Label>
                <Input name="startLocation" placeholder="e.g. Office Headquarter" required />
              </div>
              <div>
                <Label>End Destination *</Label>
                <Input name="endLocation" placeholder="e.g. Project Site A" required />
              </div>
              <div>
                <Label>Approx Trip Length (Km)</Label>
                <Input name="approxDistanceKm" type="number" min="0" placeholder="e.g. 150" />
              </div>
              <div>
                <Label>Purpose of Trip *</Label>
                <Input name="purpose" placeholder="e.g. Site survey, Material delivery" required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Trip Details Dialog */}
      <Dialog open={!!viewTripDetails} onOpenChange={(open) => !open && setViewTripDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trip Request Details</DialogTitle>
          </DialogHeader>
          {viewTripDetails && (
            <div className="space-y-4">
              <button className="sr-only" autoFocus aria-hidden="true">Focus Trap Fix</button>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Start Location</span>
                  <span className="font-semibold block">{viewTripDetails.startLocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">End Destination</span>
                  <span className="font-semibold block text-primary">{viewTripDetails.endLocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">StartDate</span>
                  <span className="font-semibold">{new Date(viewTripDetails.startDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">EndDate</span>
                  <span className="font-semibold">{new Date(viewTripDetails.endDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Requester Employee</span>
                  <span className="font-medium block">
                    {viewTripDetails.employee ? `${viewTripDetails.employee.firstName} ${viewTripDetails.employee.lastName ?? ""}` : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">Assigned Driver</span>
                  {viewTripDetails.status === "PENDING" && isManagerOrAdmin ? (
                    <Select value={selectedDriverId} onValueChange={(val: string | null) => setSelectedDriverId(val ?? "null")}>
                      <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select driver" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Select Driver (Optional)</SelectItem>
                        {employees?.data.map((e) => (
                          <SelectItem key={e.id} value={e.id} className="text-xs">
                            {e.firstName} {e.lastName ?? ""} (Driver)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-medium block">
                      {viewTripDetails.driver ? `${viewTripDetails.driver.firstName} ${viewTripDetails.driver.lastName ?? ""}` : "Unassigned"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">Assigned Vehicle</span>
                  {viewTripDetails.status === "PENDING" && isManagerOrAdmin ? (
                    <Select value={selectedVehicleId} onValueChange={(val: string | null) => setSelectedVehicleId(val ?? "null")}>
                      <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Select Vehicle (Optional)</SelectItem>
                        {vehicles?.data.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.registrationNo} - {v.make} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-mono font-medium block">
                      {viewTripDetails.vehicle ? `${viewTripDetails.vehicle.registrationNo} (${viewTripDetails.vehicle.make ?? ""} ${viewTripDetails.vehicle.model ?? ""})` : "Unassigned"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Project Connection</span>
                  <span className="font-semibold block">
                    {viewTripDetails.projectId ? `Project: ${viewTripDetails.project?.name}` : "Office (Non-project)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Approx Distance</span>
                  <span className="font-medium block">{viewTripDetails.approxDistanceKm ? `${viewTripDetails.approxDistanceKm} km` : "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Allocated Cost (₹12/km)</span>
                  <span className="font-bold text-green-600 block">
                    {viewTripDetails.allocatedCost ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(viewTripDetails.allocatedCost) : "-"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Purpose of Trip</span>
                  <span className="font-medium block">{viewTripDetails.purpose}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Status</span>
                  <Badge className={`border mt-0.5 ${tripStatusColors[viewTripDetails.status] || ""}`}>
                    {viewTripDetails.status}
                  </Badge>
                </div>
                {viewTripDetails.status === "APPROVED" && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Approved By</span>
                    <span className="font-medium text-xs block">
                      {viewTripDetails.approvedBy ? `${viewTripDetails.approvedBy.firstName} ${viewTripDetails.approvedBy.lastName ?? ""}` : "System"}
                      <span className="text-muted-foreground block text-[10px]">
                        {viewTripDetails.approvedAt ? new Date(viewTripDetails.approvedAt).toLocaleDateString() : ""}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                {viewTripDetails.status === "PENDING" && isManagerOrAdmin && (
                  <>
                    <Button
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 cursor-pointer"
                      onClick={() => {
                        handleTripStatusUpdate(viewTripDetails.id, "APPROVED", selectedDriverId, selectedVehicleId);
                        setViewTripDetails(null);
                      }}
                    >
                      Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      onClick={() => {
                        handleTripStatusUpdate(viewTripDetails.id, "REJECTED");
                        setViewTripDetails(null);
                      }}
                    >
                      Reject Request
                    </Button>
                  </>
                )}
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
