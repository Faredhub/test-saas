"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Table2,
  Loader2,
  MoreVertical,
  Trash2,
  Pencil,
  ArrowLeft,
  Save,
  PlusCircle,
  MinusCircle,
  Download,
  Package,
} from "lucide-react";
import { createProduct, createAsset, createMaintenanceRequestWithAssetTag } from "@/lib/actions/inventory";
import { importEmployees, createJobPosting, createApplicantWithJobTitle, importVehicles, importFuelLogs } from "@/lib/actions/hrm";
import { toast } from "sonner";
import {
  createSpreadsheet,
  updateSpreadsheet,
  deleteSpreadsheet,
} from "@/lib/actions/office";

type SheetData = {
  name: string;
  data: string[][];
  columns: string[];
};

type Spreadsheet = {
  id: string;
  title: string;
  sheets: unknown;
  sharedWith: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string | null };
};

// Inventory column headers matching the Product model
const INVENTORY_HEADERS = [
  "SKU", "Name", "Description", "Category", "Unit",
  "HSN Code", "Cost Price", "Selling Price", "Tax Rate (%)",
  "Barcode", "Min Stock", "Max Stock",
];

// Assets column headers matching the Asset model
const ASSETS_HEADERS = [
  "Asset Tag", "Name", "Category", "Location", "Serial Number",
  "Assigned To", "Purchase Date", "Purchase Cost", "Current Value",
  "Warranty Expiry", "Notes",
];

// Maintenance column headers matching the MaintenanceRequest model
const MAINTENANCE_HEADERS = [
  "Asset Tag", "Title", "Description", "Type", "Priority",
  "Scheduled Date", "Assigned To",
];

// Employees column headers matching the Employee model
const EMPLOYEES_HEADERS = [
  "Employee ID", "First Name", "Middle Name", "Last Name", "Email",
  "Phone", "Designation", "Department ID", "Date of Joining",
  "Employment Type", "CTC",
];

// Job Postings column headers matching the JobPosting create action
const JOB_POSTINGS_HEADERS = [
  "Title", "Department", "Location", "Type", "Experience Required",
  "Salary Range", "Description", "Requirements", "No. of Openings", "Closing Date"
];

// Applicants column headers matching the Applicant create action
const APPLICANTS_HEADERS = [
  "Name", "Email", "Phone", "Job Title (for reference)", "Resume URL", "Cover Letter", "Notes"
];

// Vehicles column headers matching the Vehicle model
const VEHICLES_HEADERS = [
  "Registration No.", "Make", "Model", "Year", "Type", "Fuel Type",
  "Assigned To (ID or Email)", "Insurance Expiry", "Odometer (km)"
];

// Fuel Logs column headers matching the FuelLog model
const FUEL_LOGS_HEADERS = [
  "Registration No.", "Date", "Litres", "Cost per Litre", "Odometer (km)", "Fuel Station", "Notes"
];



type Props = {
  initialSheets: Spreadsheet[];
  templateType?: string;
  sourceRoute?: string;
};

function getColumnLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function SpreadsheetsClient({ initialSheets, templateType, sourceRoute }: Props) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initialSheets);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isImportingToInventory, setIsImportingToInventory] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Editor state
  const [editing, setEditing] = useState<Spreadsheet | null>(null);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto-create template when navigated from modules
  useEffect(() => {
    if (!templateType || !["inventory", "assets", "maintenance", "employees", "job-postings", "applicants", "vehicles", "fuel-logs"].includes(templateType)) return;
    
    let title = "";
    let headers: string[] = [];
    let sheetName = "";
    let successMsg = "";
    let failMsg = "";

    if (templateType === "inventory") {
      title = `Inventory Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = INVENTORY_HEADERS;
      sheetName = "Products";
      successMsg = 'Inventory template created — fill in your data and click "Import to Inventory".';
      failMsg = "Failed to create inventory template.";
    } else if (templateType === "assets") {
      title = `Assets Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = ASSETS_HEADERS;
      sheetName = "Assets";
      successMsg = 'Assets template created — fill in your data and click "Import to Assets".';
      failMsg = "Failed to create assets template.";
    } else if (templateType === "maintenance") {
      title = `Maintenance Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = MAINTENANCE_HEADERS;
      sheetName = "Maintenance";
      successMsg = 'Maintenance template created — fill in your data and click "Import to Maintenance".';
      failMsg = "Failed to create maintenance template.";
    } else if (templateType === "employees") {
      title = `Employees Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = EMPLOYEES_HEADERS;
      sheetName = "Employees";
      successMsg = 'Employees template created — fill in your data and click "Import to Employees".';
      failMsg = "Failed to create employees template.";
    } else if (templateType === "job-postings") {
      title = `Job Postings Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = JOB_POSTINGS_HEADERS;
      sheetName = "Job Postings";
      successMsg = 'Job Postings template created — fill in your data and click "Import to Job Postings".';
      failMsg = "Failed to create Job Postings template.";
    } else if (templateType === "applicants") {
      title = `Applicants Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = APPLICANTS_HEADERS;
      sheetName = "Applicants";
      successMsg = 'Applicants template created — fill in your data and click "Import to Applicants".';
      failMsg = "Failed to create Applicants template.";
    } else if (templateType === "vehicles") {
      title = `Vehicles Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = VEHICLES_HEADERS;
      sheetName = "Vehicles";
      successMsg = 'Vehicles template created — fill in your data and click "Import to Vehicles".';
      failMsg = "Failed to create Vehicles template.";
    } else if (templateType === "fuel-logs") {
      title = `Fuel Logs Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FUEL_LOGS_HEADERS;
      sheetName = "Fuel Logs";
      successMsg = 'Fuel Logs template created — fill in your data and click "Import to Fuel Logs".';
      failMsg = "Failed to create Fuel Logs template.";
    }

    const headerRow = headers;
    const emptyRows = Array.from({ length: 20 }, () => Array(headers.length).fill(""));
    const createdSheetData: SheetData[] = [
      {
        name: sheetName,
        columns: headers,
        data: [headerRow, ...emptyRows],
      },
    ];

    startTransition(async () => {
      try {
        const created = await createSpreadsheet({ title, sheets: createdSheetData });
        const newSheet: Spreadsheet = {
          ...created,
          createdBy: { id: created.createdById, name: "You", email: null },
        };
        setSheets((prev) => [newSheet, ...prev]);
        // Open editor immediately
        setEditing(newSheet);
        setEditorTitle(title);
        setSheetData(createdSheetData);
        setActiveSheetIdx(0);
        toast.success(successMsg);
      } catch {
        toast.error(failMsg);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType]);

  // Auto-save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const filteredSheets = sheets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      try {
        const sheet = await createSpreadsheet({ title: newTitle });
        setSheets((prev) => [
          { ...sheet, createdBy: { id: sheet.createdById, name: "You", email: null } } as Spreadsheet,
          ...prev,
        ]);
        setCreateOpen(false);
        setNewTitle("");
        toast.success("Spreadsheet created");
      } catch {
        toast.error("Failed to create spreadsheet");
      }
    });
  }

  function openEditor(spreadsheet: Spreadsheet) {
    setEditing(spreadsheet);
    setEditorTitle(spreadsheet.title);
    const parsed = spreadsheet.sheets as SheetData[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure each sheet has at least 20 rows and 10 columns
      const normalized = parsed.map((s) => {
        const rows = Math.max(s.data?.length ?? 0, 20);
        const cols = Math.max(s.columns?.length ?? 0, 10);
        const data = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => s.data?.[r]?.[c] ?? "")
        );
        const columns = Array.from({ length: cols }, (_, i) =>
          s.columns?.[i] ?? getColumnLabel(i)
        );
        return { name: s.name ?? `Sheet${parsed.indexOf(s) + 1}`, data, columns };
      });
      setSheetData(normalized);
    } else {
      setSheetData([
        {
          name: "Sheet1",
          data: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => "")),
          columns: Array.from({ length: 10 }, (_, i) => getColumnLabel(i)),
        },
      ]);
    }
    setActiveSheetIdx(0);
  }

  function updateCellValue(row: number, col: number, value: string) {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      const data = sheet.data.map((r) => [...r]);
      data[row][col] = value;
      sheet.data = data;
      updated[activeSheetIdx] = sheet;
      return updated;
    });

    // Debounced auto-save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  }

  const autoSave = useCallback(() => {
    if (!editing) return;
    startTransition(async () => {
      try {
        await updateSpreadsheet(editing.id, { sheets: sheetData });
      } catch {
        // Silent fail for auto-save
      }
    });
  }, [editing, sheetData]);

  function handleSave() {
    if (!editing) return;
    setIsSaving(true);
    startTransition(async () => {
      try {
        await updateSpreadsheet(editing.id, { title: editorTitle, sheets: sheetData });
        setSheets((prev) =>
          prev.map((s) => (s.id === editing.id ? { ...s, title: editorTitle } : s))
        );
        toast.success("Spreadsheet saved");
      } catch {
        toast.error("Failed to save");
      } finally {
        setIsSaving(false);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSpreadsheet(id);
        setSheets((prev) => prev.filter((s) => s.id !== id));
        if (editing?.id === id) setEditing(null);
        toast.success("Spreadsheet deleted");
      } catch {
        toast.error("Failed to delete spreadsheet");
      }
    });
  }

  function addRow() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      const cols = sheet.columns.length;
      sheet.data = [...sheet.data, Array.from({ length: cols }, () => "")];
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function addColumn() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      const newColIdx = sheet.columns.length;
      sheet.columns = [...sheet.columns, getColumnLabel(newColIdx)];
      sheet.data = sheet.data.map((row) => [...row, ""]);
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function removeLastRow() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      if (sheet.data.length <= 1) return prev;
      sheet.data = sheet.data.slice(0, -1);
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function removeLastColumn() {
    setSheetData((prev) => {
      const updated = [...prev];
      const sheet = { ...updated[activeSheetIdx] };
      if (sheet.columns.length <= 1) return prev;
      sheet.columns = sheet.columns.slice(0, -1);
      sheet.data = sheet.data.map((row) => row.slice(0, -1));
      updated[activeSheetIdx] = sheet;
      return updated;
    });
  }

  function addSheet() {
    const newName = `Sheet${sheetData.length + 1}`;
    setSheetData((prev) => [
      ...prev,
      {
        name: newName,
        data: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => "")),
        columns: Array.from({ length: 10 }, (_, i) => getColumnLabel(i)),
      },
    ]);
    setActiveSheetIdx(sheetData.length);
  }

  function renameSheet(idx: number) {
    const name = prompt("Sheet name:", sheetData[idx].name);
    if (!name) return;
    setSheetData((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], name };
      return updated;
    });
  }

  const activeSheet = sheetData[activeSheetIdx];

  // Editor view
  if (editing && activeSheet) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 p-3 border-b bg-background shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Input
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            className="max-w-md font-semibold"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addRow} title="Add row">
              <PlusCircle className="h-4 w-4 mr-1" /> Row
            </Button>
            <Button variant="outline" size="sm" onClick={addColumn} title="Add column">
              <PlusCircle className="h-4 w-4 mr-1" /> Column
            </Button>
            <Button variant="outline" size="sm" onClick={removeLastRow} title="Remove last row">
              <MinusCircle className="h-4 w-4 mr-1" /> Row
            </Button>
            <Button variant="outline" size="sm" onClick={removeLastColumn} title="Remove last column">
              <MinusCircle className="h-4 w-4 mr-1" /> Col
            </Button>
            <a
              href={`/api/office/export/spreadsheet?id=${editing.id}`}
              download
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" type="button">
                <Download className="h-4 w-4 mr-1" /> XLSX
              </Button>
            </a>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>

            {/* Import to Inventory button – shown when opened from inventory products */}
            {(templateType === "inventory" || sourceRoute === "inventory-products") && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row (matches INVENTORY_HEADERS)
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    INVENTORY_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index using the first row (or INVENTORY_HEADERS order)
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "SKU") || get(r, "Name"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least SKU and Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  let ok = 0; let fail = 0;
                  for (const row of filled) {
                    const sku = get(row, "SKU");
                    const name = get(row, "Name");
                    if (!sku || !name) { fail++; continue; }
                    try {
                      await createProduct({
                        sku, name,
                        description: get(row, "Description") || undefined,
                        category: get(row, "Category") || undefined,
                        unit: get(row, "Unit") || "PCS",
                        hsnCode: get(row, "HSN Code") || undefined,
                        costPrice: parseFloat(get(row, "Cost Price")) || 0,
                        sellingPrice: parseFloat(get(row, "Selling Price")) || 0,
                        taxRate: parseFloat(get(row, "Tax Rate (%)")) || 0,
                        barcode: get(row, "Barcode") || undefined,
                        minStock: parseInt(get(row, "Min Stock")) || 0,
                        maxStock: parseInt(get(row, "Max Stock")) || undefined,
                      });
                      ok++;
                    } catch { fail++; }
                  }
                  setIsImportingToInventory(false);
                  if (ok > 0) toast.success(`Imported ${ok} product${ok > 1 ? "s" : ""} to Inventory!`);
                  if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed (missing SKU or Name).`);
                  if (ok > 0) router.push("/inventory/products");
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Inventory</>
                )}
              </Button>
            )}

            {/* Import to Assets button */}
            {(templateType === "assets" || (sourceRoute === "inventory-assets" && activeSheet.name === "Assets")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    ASSETS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Asset Tag") || get(r, "Name"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Asset Tag and Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  let ok = 0; let fail = 0;
                  for (const row of filled) {
                    const assetTag = get(row, "Asset Tag");
                    const name = get(row, "Name");
                    if (!assetTag || !name) { fail++; continue; }
                    try {
                      await createAsset({
                        assetTag,
                        name,
                        category: get(row, "Category") || undefined,
                        location: get(row, "Location") || undefined,
                        serialNumber: get(row, "Serial Number") || undefined,
                        assignedTo: get(row, "Assigned To") || undefined,
                        purchaseDate: get(row, "Purchase Date") || undefined,
                        purchaseCost: parseFloat(get(row, "Purchase Cost")) || undefined,
                        currentValue: parseFloat(get(row, "Current Value")) || undefined,
                        warrantyExpiry: get(row, "Warranty Expiry") || undefined,
                        notes: get(row, "Notes") || undefined,
                      });
                      ok++;
                    } catch { fail++; }
                  }
                  setIsImportingToInventory(false);
                  if (ok > 0) toast.success(`Imported ${ok} asset${ok > 1 ? "s" : ""} successfully!`);
                  if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                  if (ok > 0) router.push("/inventory/assets");
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Assets</>
                )}
              </Button>
            )}

            {/* Import to Maintenance button */}
            {(templateType === "maintenance" || (sourceRoute === "inventory-assets" && activeSheet.name === "Maintenance")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    MAINTENANCE_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Title"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Title.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  let ok = 0; let fail = 0;
                  for (const row of filled) {
                    const title = get(row, "Title");
                    if (!title) { fail++; continue; }
                    try {
                      await createMaintenanceRequestWithAssetTag({
                        assetTag: get(row, "Asset Tag") || undefined,
                        title,
                        description: get(row, "Description") || undefined,
                        type: get(row, "Type") || undefined,
                        priority: get(row, "Priority") || undefined,
                        scheduledDate: get(row, "Scheduled Date") || undefined,
                        assignedTo: get(row, "Assigned To") || undefined,
                      });
                      ok++;
                    } catch { fail++; }
                  }
                  setIsImportingToInventory(false);
                  if (ok > 0) toast.success(`Imported ${ok} maintenance request${ok > 1 ? "s" : ""} successfully!`);
                  if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                  if (ok > 0) router.push("/inventory/assets");
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Maintenance</>
                )}
              </Button>
            )}

            {/* Import to Employees button */}
            {(templateType === "employees" || (sourceRoute === "hrm-employees" && activeSheet.name === "Employees")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    EMPLOYEES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Employee ID") || get(r, "First Name") || get(r, "Email"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Employee ID, First Name, and Email.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  
                  const employeesToImport = filled.map((row) => ({
                    employeeId: get(row, "Employee ID"),
                    firstName: get(row, "First Name"),
                    middleName: get(row, "Middle Name") || undefined,
                    lastName: get(row, "Last Name") || undefined,
                    email: get(row, "Email"),
                    phone: get(row, "Phone") || undefined,
                    designation: get(row, "Designation") || undefined,
                    departmentId: get(row, "Department ID") || undefined,
                    dateOfJoining: get(row, "Date of Joining") || undefined,
                    employmentType: get(row, "Employment Type") || undefined,
                    ctc: get(row, "CTC") ? Number(get(row, "CTC")) : undefined,
                  }));

                  try {
                    const res = await importEmployees(employeesToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} employees with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} employees!`);
                      }
                      router.push("/hrm/employees");
                    } else {
                      toast.error(res?.error || "Failed to import employees");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing employees: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Employees</>
                )}
              </Button>
            )}

            {/* Import to Job Postings button */}
            {(templateType === "job-postings" || (sourceRoute === "hrm-recruitment" && activeSheet.name === "Job Postings")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    JOB_POSTINGS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Title"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Title.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  let ok = 0; let fail = 0;
                  for (const row of filled) {
                    const title = get(row, "Title");
                    if (!title) { fail++; continue; }
                    try {
                      await createJobPosting({
                        title,
                        department: get(row, "Department") || undefined,
                        location: get(row, "Location") || undefined,
                        type: get(row, "Type") || "FULL_TIME",
                        experience: get(row, "Experience Required") || undefined,
                        salary: get(row, "Salary Range") || undefined,
                        description: get(row, "Description") || "No description provided",
                        requirements: get(row, "Requirements") || undefined,
                        openings: parseInt(get(row, "No. of Openings")) || 1,
                        closingDate: get(row, "Closing Date") || undefined,
                        status: "OPEN",
                      });
                      ok++;
                    } catch (err) {
                      console.error("Failed to create job posting:", err);
                      fail++;
                    }
                  }
                  setIsImportingToInventory(false);
                  if (ok > 0) toast.success(`Imported ${ok} job posting${ok > 1 ? "s" : ""} successfully!`);
                  if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                  if (ok > 0) router.push("/hrm/recruitment");
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Job Postings</>
                )}
              </Button>
            )}

            {/* Import to Applicants button */}
            {(templateType === "applicants" || (sourceRoute === "hrm-recruitment" && activeSheet.name === "Applicants")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    APPLICANTS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Name") && get(r, "Email"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Name and Email.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  let ok = 0; let fail = 0;
                  for (const row of filled) {
                    const name = get(row, "Name");
                    const email = get(row, "Email");
                    if (!name || !email) { fail++; continue; }
                    try {
                      await createApplicantWithJobTitle({
                        name,
                        email,
                        phone: get(row, "Phone") || undefined,
                        jobTitle: get(row, "Job Title (for reference)") || undefined,
                        resumeUrl: get(row, "Resume URL") || undefined,
                        coverLetter: get(row, "Cover Letter") || undefined,
                        notes: get(row, "Notes") || undefined,
                      });
                      ok++;
                    } catch (err) {
                      console.error("Failed to create applicant:", err);
                      fail++;
                    }
                  }
                  setIsImportingToInventory(false);
                  if (ok > 0) toast.success(`Imported ${ok} applicant${ok > 1 ? "s" : ""} successfully!`);
                  if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                  if (ok > 0) router.push("/hrm/recruitment");
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Applicants</>
                )}
              </Button>
            )}

            {/* Import to Vehicles button */}
            {(templateType === "vehicles" || (sourceRoute === "hrm-fleet" && activeSheet.name === "Vehicles")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    VEHICLES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Registration No."));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Registration No.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  
                  const vehiclesToImport = filled.map((row) => ({
                    registrationNo: get(row, "Registration No."),
                    make: get(row, "Make") || undefined,
                    model: get(row, "Model") || undefined,
                    year: get(row, "Year") ? Number(get(row, "Year")) : undefined,
                    type: get(row, "Type") || "CAR",
                    fuelType: get(row, "Fuel Type") || undefined,
                    assignedToIdOrEmail: get(row, "Assigned To (ID or Email)") || undefined,
                    insuranceExpiry: get(row, "Insurance Expiry") || undefined,
                    odometerKm: get(row, "Odometer (km)") ? Number(get(row, "Odometer (km)")) : undefined,
                  }));

                  try {
                    const res = await importVehicles(vehiclesToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} vehicles with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} vehicles!`);
                      }
                      router.push("/hrm/fleet");
                    } else {
                      toast.error(res?.error || "Failed to import vehicles");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing vehicles: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Vehicles</>
                )}
              </Button>
            )}

            {/* Import to Fuel Logs button */}
            {(templateType === "fuel-logs" || (sourceRoute === "hrm-fleet" && activeSheet.name === "Fuel Logs")) && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isImportingToInventory}
                onClick={async () => {
                  const sheet = sheetData[activeSheetIdx];
                  if (!sheet) return;

                  // Determine if first row is the header row
                  const firstRow = sheet.data[0] ?? [];
                  const isHeaderRow = firstRow.some((cell) =>
                    FUEL_LOGS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Registration No.") && get(r, "Litres") && get(r, "Cost per Litre"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in Registration No., Litres, and Cost per Litre.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  
                  const logsToImport = filled.map((row) => ({
                    registrationNo: get(row, "Registration No."),
                    date: get(row, "Date") || undefined,
                    litres: parseFloat(get(row, "Litres")) || 0,
                    costPerLitre: parseFloat(get(row, "Cost per Litre")) || 0,
                    odometerKm: get(row, "Odometer (km)") ? Number(get(row, "Odometer (km)")) : undefined,
                    fuelStation: get(row, "Fuel Station") || undefined,
                    notes: get(row, "Notes") || undefined,
                  }));

                  try {
                    const res = await importFuelLogs(logsToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} fuel logs with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} fuel logs!`);
                      }
                      router.push("/hrm/fleet");
                    } else {
                      toast.error(res?.error || "Failed to import fuel logs");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing fuel logs: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Import to Fuel Logs</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Spreadsheet grid */}
        <div className="flex-1 overflow-auto">
          <table className="border-collapse w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted">
                <th className="border border-border p-1 w-12 text-center text-xs font-medium text-muted-foreground bg-muted sticky left-0 z-20">
                  #
                </th>
                {activeSheet.columns.map((col, ci) => (
                  <th
                    key={ci}
                    className="border border-border p-1 min-w-[100px] text-center text-xs font-medium text-muted-foreground bg-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSheet.data.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/30">
                  <td className="border border-border p-1 text-center text-xs text-muted-foreground bg-muted sticky left-0">
                    {ri + 1}
                  </td>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-border p-0 relative"
                      onClick={() => {
                        setEditingCell({ row: ri, col: ci });
                        setCellValue(cell);
                      }}
                    >
                      {editingCell?.row === ri && editingCell?.col === ci ? (
                        <input
                          autoFocus
                          value={cellValue}
                          onChange={(e) => setCellValue(e.target.value)}
                          onBlur={() => {
                            updateCellValue(ri, ci, cellValue);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateCellValue(ri, ci, cellValue);
                              // Move to next row
                              if (ri < activeSheet.data.length - 1) {
                                setEditingCell({ row: ri + 1, col: ci });
                                setCellValue(activeSheet.data[ri + 1][ci]);
                              } else {
                                setEditingCell(null);
                              }
                            }
                            if (e.key === "Tab") {
                              e.preventDefault();
                              updateCellValue(ri, ci, cellValue);
                              if (ci < activeSheet.columns.length - 1) {
                                setEditingCell({ row: ri, col: ci + 1 });
                                setCellValue(activeSheet.data[ri][ci + 1]);
                              } else {
                                setEditingCell(null);
                              }
                            }
                            if (e.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full h-full px-2 py-1 text-sm border-2 border-blue-500 outline-none bg-white absolute inset-0"
                        />
                      ) : (
                        <div className="px-2 py-1 text-sm min-h-[28px] truncate">
                          {cell}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sheet tabs */}
        <div className="flex items-center gap-1 p-2 border-t bg-muted/50 shrink-0">
          {sheetData.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheetIdx(idx)}
              onDoubleClick={() => renameSheet(idx)}
              className={`px-3 py-1 text-sm rounded-t border border-b-0 ${
                idx === activeSheetIdx
                  ? "bg-background font-medium border-border"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            >
              {s.name}
            </button>
          ))}
          <button
            onClick={addSheet}
            className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
            title="Add sheet"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spreadsheets</h1>
          <p className="text-muted-foreground">Create and edit spreadsheets</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Spreadsheet
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Spreadsheet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Spreadsheet title"
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending || !newTitle.trim()}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spreadsheets..."
          className="pl-9"
        />
      </div>

      {filteredSheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Table2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No spreadsheets found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "Try a different search term" : "Create your first spreadsheet to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSheets.map((sheet) => (
            <Card
              key={sheet.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openEditor(sheet)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Table2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base truncate">{sheet.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(sheet);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(sheet.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {(sheet.sheets as SheetData[])?.length ?? 1} sheet(s) &middot; By{" "}
                  {sheet.createdBy.name ?? sheet.createdBy.email} &middot;{" "}
                  <span suppressHydrationWarning>{new Date(sheet.updatedAt).toLocaleDateString()}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
