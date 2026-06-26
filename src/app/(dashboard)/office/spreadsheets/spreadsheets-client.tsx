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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileSpreadsheet,
  Share2,
  FolderOpen,
  PencilLine,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createProduct, createAsset, createMaintenanceRequestWithAssetTag } from "@/lib/actions/inventory";
import { importEmployees, createJobPosting, createApplicantWithJobTitle, importVehicles, importFuelLogs, importLeaveTypes, importPerformanceReviews, importGoals, importHolidays } from "@/lib/actions/hrm";
import { importLedgerEntries } from "@/lib/actions/finance-ledger";
import { createJournalEntry, getAccounts, createExpense, getExpenseCategories, createSalaryStructure, createVendorBill, createCreditNote, createFinancialDocument } from "@/lib/actions/finance";
import { toast } from "sonner";
import {
  createSpreadsheet,
  updateSpreadsheet,
  deleteSpreadsheet,
} from "@/lib/actions/office";
import { createLead, createContact, createDeal, createQuotation, createInvoice, createVisit } from "@/lib/actions/sales";
import { createProject } from "@/lib/actions/projects";
import { createBranch, importBranches, importContracts } from "@/lib/actions/organization";

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

// Leave Types column headers matching the LeaveType model
const LEAVE_TYPES_HEADERS = [
  "Name", "Code", "Annual Quota", "Carry Forward", "Max Carry", "Paid Leave"
];

// Holidays column headers matching the Holiday model
const HOLIDAYS_HEADERS = [
  "Date", "Holiday Name", "Type", "Optional"
];

// Performance Reviews column headers matching the PerformanceReview model
const PERFORMANCE_REVIEWS_HEADERS = [
  "Employee Name", "Reviewer Name", "Period", "Type", "Overall Rating", "Status"
];

// Goals column headers matching the Goal model
const GOALS_HEADERS = [
  "Employee Name", "Title", "Description", "Category", "Priority", "Target Date", "Progress", "Status"
];

// Finance Ledger column headers matching the FinanceLedger model
const FINANCE_LEDGER_HEADERS = [
  "Cost", "Item Name", "Invoice Number", "Amount", "Deduction", "Date", "Status", "Payment Mode", "Email", "Contact", "File Name", "Remark"
];

// Finance Journal column headers matching the JournalEntry model
const FINANCE_JOURNAL_HEADERS = [
  "Date", "Reference", "Description", "Account", "Debit", "Credit", "Line Description"
];

// Finance Expenses column headers matching the Expense model
const FINANCE_EXPENSES_HEADERS = [
  "Date", "Category", "Description", "Amount", "Notes"
];

// Finance Payroll column headers matching the SalaryStructure model
const FINANCE_PAYROLL_HEADERS = [
  "Structure Name", "Basic %", "HRA %", "DA %", "Special Allowance %", "PF Employee %", "PF Employer %", "ESI Employee %", "ESI Employer %", "TDS %", "Professional Tax (INR)"
];

// Finance Bills column headers matching the VendorBill model
const FINANCE_BILLS_HEADERS = [
  "Vendor Name", "GST Number", "Description", "Amount", "Tax Amount", "Due Date", "Notes"
];

// Finance Credit & Debit Notes column headers matching the CreditNote model
const FINANCE_CREDIT_NOTES_HEADERS = [
  "Type", "Reason", "Invoice ID", "Item Description", "Quantity", "Rate", "Amount", "Tax Amount", "Notes"
];

// Finance Documents column headers matching the FinancialDocument model
const FINANCE_DOCUMENTS_HEADERS = [
  "Title", "Type", "Category", "File Name", "File Size (bytes)", "Reference", "Tags"
];

// Sales Leads column headers matching the Lead model
const SALES_LEADS_HEADERS = [
  "First Name", "Last Name", "Email", "Phone", "Company", "Source", "Notes"
];

// Sales Contacts column headers matching the Contact model
const SALES_CONTACTS_HEADERS = [
  "First Name", "Last Name", "Email", "Phone", "Company", "Job Title", "City", "State", "Country", "Notes"
];

// Sales Deals column headers matching the Deal model
const SALES_DEALS_HEADERS = [
  "Title", "Value (INR)", "Probability (%)", "Expected Close Date", "Stage", "Notes"
];

// Sales Quotations column headers matching the Quotation model
const SALES_QUOTATIONS_HEADERS = [
  "Reference", "Valid Until", "Item Description", "Quantity", "Unit Price", "Tax Rate (%)", "Notes", "Terms"
];

// Sales Invoices column headers matching the Invoice model
const SALES_INVOICES_HEADERS = [
  "Reference", "Due Date", "Payment Terms", "Item Description", "Quantity", "Unit Price", "Tax Rate (%)", "Notes"
];

// Sales Visits column headers matching the Visit model
const SALES_VISITS_HEADERS = [
  "Purpose", "Location", "Notes"
];

// Projects column headers matching the Project model
const PROJECTS_HEADERS = [
  "Project Name", "Project Code", "Description", "Priority", "Start Date", "End Date", "Budget", "Client Name"
];

// Branches column headers matching the Branch model
const BRANCHES_HEADERS = [
  "Branch Name", "Address", "City", "State", "Phone", "Email", "Head Office"
];

// Contracts column headers matching the Contract model
const CONTRACTS_HEADERS = [
  "Title", "Type", "Contact Name", "Value (INR)", "Start Date", "End Date", "Auto Renew", "Terms", "Notes"
];




type User = { id: string; name: string | null; email: string | null; image?: string | null };

type Props = {
  initialSheets: Spreadsheet[];
  users: User[];
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

function detectTemplateType(sheetsJson: unknown): string {
  try {
    const sheets = sheetsJson as SheetData[];
    if (!sheets || sheets.length === 0) return "General";
    
    // Check if it matches a known structure or has a specific sheet name
    const firstSheetName = sheets[0]?.name?.toLowerCase() || "";
    if (firstSheetName.includes("bill")) return "Finance Bills";
    if (firstSheetName.includes("payroll")) return "Payroll";
    if (firstSheetName.includes("employee")) return "Employees";
    if (firstSheetName.includes("applicant")) return "Applicants";
    if (firstSheetName.includes("posting") || firstSheetName.includes("job")) return "Job Postings";
    if (firstSheetName.includes("project")) return "Projects";
    if (firstSheetName.includes("contact")) return "Contacts";
    if (firstSheetName.includes("deal")) return "Deals";
    if (firstSheetName.includes("expense")) return "Expenses";
    if (firstSheetName.includes("inventory") || firstSheetName.includes("product")) return "Inventory";
    if (firstSheetName.includes("asset")) return "Assets";
    if (firstSheetName.includes("maintenance")) return "Maintenance";
    if (firstSheetName.includes("lead")) return "Leads";
    if (firstSheetName.includes("invoice")) return "Invoices";
    if (firstSheetName.includes("quotation")) return "Quotations";
    
    return "Rich Sheet";
  } catch {
    return "Rich Sheet";
  }
}

export function SpreadsheetsClient({ initialSheets, users, templateType, sourceRoute }: Props) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initialSheets);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSheetId, setShareSheetId] = useState<string | null>(null);
  const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSheetId, setRenameSheetId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
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
    if (!templateType || !["inventory", "assets", "maintenance", "employees", "job-postings", "applicants", "vehicles", "fuel-logs", "leave-types", "holidays", "performance-reviews", "goals", "finance-ledger", "finance-journal", "finance-expenses", "finance-payroll", "finance-bills", "finance-credit-notes", "finance-documents", "sales-leads", "sales-contacts", "sales-deals", "sales-quotations", "sales-invoices", "sales-visits", "projects", "branches", "contracts"].includes(templateType)) return;

    let title = "";
    let headers: string[] = [];
    let sheetName = "";
    let successMsg = "";
    let failMsg = "";

    if (templateType === "inventory") {
      title = `Inventory Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = INVENTORY_HEADERS;
      sheetName = "Products";
      successMsg = 'Inventory template created — fill in your data and click "Bulk Upload to Inventory".';
      failMsg = "Failed to create inventory template.";
    } else if (templateType === "assets") {
      title = `Assets Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = ASSETS_HEADERS;
      sheetName = "Assets";
      successMsg = 'Assets template created — fill in your data and click "Bulk Upload to Assets".';
      failMsg = "Failed to create assets template.";
    } else if (templateType === "maintenance") {
      title = `Maintenance Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = MAINTENANCE_HEADERS;
      sheetName = "Maintenance";
      successMsg = 'Maintenance template created — fill in your data and click "Bulk Upload to Maintenance".';
      failMsg = "Failed to create maintenance template.";
    } else if (templateType === "employees") {
      title = `Employees Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = EMPLOYEES_HEADERS;
      sheetName = "Employees";
      successMsg = 'Employees template created — fill in your data and click "Bulk Upload to Employees".';
      failMsg = "Failed to create employees template.";
    } else if (templateType === "job-postings") {
      title = `Job Postings Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = JOB_POSTINGS_HEADERS;
      sheetName = "Job Postings";
      successMsg = 'Job Postings template created — fill in your data and click "Bulk Upload to Job Postings".';
      failMsg = "Failed to create Job Postings template.";
    } else if (templateType === "applicants") {
      title = `Applicants Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = APPLICANTS_HEADERS;
      sheetName = "Applicants";
      successMsg = 'Applicants template created — fill in your data and click "Bulk Upload to Applicants".';
      failMsg = "Failed to create Applicants template.";
    } else if (templateType === "vehicles") {
      title = `Vehicles Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = VEHICLES_HEADERS;
      sheetName = "Vehicles";
      successMsg = 'Vehicles template created — fill in your data and click "Bulk Upload to Vehicles".';
      failMsg = "Failed to create Vehicles template.";
    } else if (templateType === "fuel-logs") {
      title = `Fuel Logs Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FUEL_LOGS_HEADERS;
      sheetName = "Fuel Logs";
      successMsg = 'Fuel Logs template created — fill in your data and click "Bulk Upload to Fuel Logs".';
      failMsg = "Failed to create Fuel Logs template.";
    } else if (templateType === "leave-types") {
      title = `Leave Types Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = LEAVE_TYPES_HEADERS;
      sheetName = "Leave Types";
      successMsg = 'Leave Types template created — fill in your data and click "Bulk Upload to Leave Types".';
      failMsg = "Failed to create Leave Types template.";
    } else if (templateType === "holidays") {
      title = `Holidays Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = HOLIDAYS_HEADERS;
      sheetName = "Holidays";
      successMsg = 'Holidays template created — fill in your data and click "Bulk Upload to Holidays".';
      failMsg = "Failed to create Holidays template.";
    } else if (templateType === "performance-reviews") {
      title = `Reviews Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = PERFORMANCE_REVIEWS_HEADERS;
      sheetName = "Reviews";
      successMsg = 'Performance Reviews template created — fill in your data and click "Bulk Upload to Performance Reviews".';
      failMsg = "Failed to create Performance Reviews template.";
    } else if (templateType === "goals") {
      title = `Goals Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = GOALS_HEADERS;
      sheetName = "Goals";
      successMsg = 'Goals template created — fill in your data and click "Bulk Upload to Goals".';
      failMsg = "Failed to create Goals template.";
    } else if (templateType === "finance-ledger") {
      title = `Ledger Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_LEDGER_HEADERS;
      sheetName = "Accounts";
      successMsg = 'Finance Ledger template created — fill in your data and click "Bulk Upload to Finance Accounts".';
      failMsg = "Failed to create Finance Ledger template.";
    } else if (templateType === "finance-journal") {
      title = `Journal Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_JOURNAL_HEADERS;
      sheetName = "Journal";
      successMsg = 'Journal template created — fill in your data and click "Bulk Upload to Journal Entries".';
      failMsg = "Failed to create Journal template.";
    } else if (templateType === "finance-expenses") {
      title = `Expenses Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_EXPENSES_HEADERS;
      sheetName = "Expenses";
      successMsg = 'Finance Expenses template created — fill in your data and click "Bulk Upload to Expenses".';
      failMsg = "Failed to create Finance Expenses template.";
    } else if (templateType === "finance-payroll") {
      title = `Payroll Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_PAYROLL_HEADERS;
      sheetName = "Salary Structures";
      successMsg = 'Salary Structures template created — fill in your data and click "Bulk Upload to Salary Structures".';
      failMsg = "Failed to create Salary Structures template.";
    } else if (templateType === "finance-bills") {
      title = `Vendor Bills Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_BILLS_HEADERS;
      sheetName = "Vendor Bills";
      successMsg = 'Vendor Bills template created — fill in your data and click "Bulk Upload to Vendor Bills".';
      failMsg = "Failed to create Vendor Bills template.";
    } else if (templateType === "finance-credit-notes") {
      title = `Credit & Debit Notes Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_CREDIT_NOTES_HEADERS;
      sheetName = "Credit & Debit Notes";
      successMsg = 'Credit & Debit Notes template created — fill in your data and click "Bulk Upload to Credit & Debit Notes".';
      failMsg = "Failed to create Credit & Debit Notes template.";
    } else if (templateType === "finance-documents") {
      title = `Financial Documents Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = FINANCE_DOCUMENTS_HEADERS;
      sheetName = "Financial Documents";
      successMsg = 'Financial Documents template created — fill in your data and click "Bulk Upload to Financial Documents".';
      failMsg = "Failed to create Financial Documents template.";
    } else if (templateType === "sales-leads") {
      title = `Sales Leads Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = SALES_LEADS_HEADERS;
      sheetName = "Sales Leads";
      successMsg = 'Sales Leads template created — fill in your data and click "Bulk Upload to Sales Leads".';
      failMsg = "Failed to create Sales Leads template.";
    } else if (templateType === "sales-contacts") {
      title = `Sales Contacts Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = SALES_CONTACTS_HEADERS;
      sheetName = "Sales Contacts";
      successMsg = 'Sales Contacts template created — fill in your data and click "Bulk Upload to Sales Contacts".';
      failMsg = "Failed to create Sales Contacts template.";
    } else if (templateType === "sales-deals") {
      title = `Sales Deals Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = SALES_DEALS_HEADERS;
      sheetName = "Sales Deals";
      successMsg = 'Sales Deals template created — fill in your data and click "Bulk Upload to Sales Deals".';
      failMsg = "Failed to create Sales Deals template.";
    } else if (templateType === "sales-quotations") {
      title = `Sales Quotations Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = SALES_QUOTATIONS_HEADERS;
      sheetName = "Sales Quotations";
      successMsg = 'Sales Quotations template created — fill in your data and click "Bulk Upload to Sales Quotations".';
      failMsg = "Failed to create Sales Quotations template.";
    } else if (templateType === "sales-invoices") {
      title = `Sales Invoices Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = SALES_INVOICES_HEADERS;
      sheetName = "Sales Invoices";
      successMsg = 'Sales Invoices template created — fill in your data and click "Bulk Upload to Sales Invoices".';
      failMsg = "Failed to create Sales Invoices template.";
    } else if (templateType === "sales-visits") {
      title = `Sales Visits Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = SALES_VISITS_HEADERS;
      sheetName = "Sales Visits";
      successMsg = 'Sales Visits template created — fill in your data and click "Bulk Upload to Sales Visits".';
      failMsg = "Failed to create Sales Visits template.";
    } else if (templateType === "projects") {
      title = `Projects Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = PROJECTS_HEADERS;
      sheetName = "Projects";
      successMsg = 'Projects template created — fill in your data and click "Bulk Upload to Projects".';
      failMsg = "Failed to create Projects template.";
    } else if (templateType === "branches") {
      title = `Branches Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = BRANCHES_HEADERS;
      sheetName = "Branches";
      successMsg = 'Branches template created — fill in your data and click "Bulk Upload to Branches".';
      failMsg = "Failed to create Branches template.";
    } else if (templateType === "contracts") {
      title = `Contracts Import – ${new Date().toLocaleDateString("en-IN")}`;
      headers = CONTRACTS_HEADERS;
      sheetName = "Contracts";
      successMsg = 'Contracts template created — fill in your data and click "Bulk Upload to Contracts".';
      failMsg = "Failed to create Contracts template.";
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

  function handleRename() {
    if (!renameSheetId || !renameTitle.trim()) return;
    startTransition(async () => {
      try {
        await updateSpreadsheet(renameSheetId, { title: renameTitle });
        setSheets((prev) =>
          prev.map((s) => (s.id === renameSheetId ? { ...s, title: renameTitle } : s))
        );
        setRenameOpen(false);
        setRenameSheetId(null);
        setRenameTitle("");
        toast.success("Spreadsheet renamed successfully");
      } catch {
        toast.error("Failed to rename spreadsheet");
      }
    });
  }

  function handleShare() {
    if (!shareSheetId) return;
    startTransition(async () => {
      try {
        const sharedWith = selectedShareUsers.map((uid) => ({ userId: uid, permission: "read" }));
        await updateSpreadsheet(shareSheetId, { sharedWith });
        setSheets((prev) =>
          prev.map((s) => (s.id === shareSheetId ? { ...s, sharedWith } : s))
        );
        setShareOpen(false);
        setShareSheetId(null);
        setSelectedShareUsers([]);
        toast.success("Sharing updated");
      } catch {
        toast.error("Failed to update sharing");
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

            {/* Bulk Upload to Inventory button – shown when opened from inventory products */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Inventory</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Assets button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Assets</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Maintenance button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Maintenance</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Employees button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Employees</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Job Postings button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Job Postings</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Applicants button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Applicants</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Vehicles button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Vehicles</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Fuel Logs button */}
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
                  <><Package className="h-4 w-4" /> Bulk Upload to Fuel Logs</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Leave Types button */}
            {(templateType === "leave-types" || (sourceRoute === "hrm-leaves" && activeSheet.name === "Leave Types")) && (
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
                    LEAVE_TYPES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Name") && get(r, "Code"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Name and Code.");
                    return;
                  }

                  setIsImportingToInventory(true);

                  const leaveTypesToImport = filled.map((row) => {
                    const cfStr = get(row, "Carry Forward").toLowerCase();
                    const carryForward = cfStr === "yes" || cfStr === "true" || cfStr === "y";
                    const paidStr = get(row, "Paid Leave").toLowerCase();
                    const isPaid = paidStr === "" || paidStr === "yes" || paidStr === "true" || paidStr === "y"; // default to true if empty or yes/true
                    return {
                      name: get(row, "Name"),
                      code: get(row, "Code"),
                      annualQuota: get(row, "Annual Quota") ? Number(get(row, "Annual Quota")) : 0,
                      carryForward,
                      maxCarry: get(row, "Max Carry") ? Number(get(row, "Max Carry")) : 0,
                      isPaid,
                    };
                  });

                  try {
                    const res = await importLeaveTypes(leaveTypesToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} leave types with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} leave types!`);
                      }
                      router.push("/hrm/leaves?tab=types");
                    } else {
                      toast.error(res?.error || "Failed to import leave types");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing leave types: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Leave Types</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Holidays button */}
            {(templateType === "holidays" || (sourceRoute === "hrm-leaves" && activeSheet.name === "Holidays")) && (
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
                    HOLIDAYS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Date") && get(r, "Holiday Name"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Date and Holiday Name.");
                    return;
                  }

                  setIsImportingToInventory(true);

                  const holidaysToImport = filled.map((row) => {
                    const optStr = get(row, "Optional").toLowerCase();
                    const isOptional = optStr === "yes" || optStr === "true" || optStr === "y";
                    return {
                      date: get(row, "Date"),
                      name: get(row, "Holiday Name"),
                      type: get(row, "Type") || "PUBLIC",
                      isOptional,
                    };
                  });

                  try {
                    const res = await importHolidays(holidaysToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} holidays with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} holidays!`);
                      }
                      router.push("/hrm/leaves?tab=holidays");
                    } else {
                      toast.error(res?.error || "Failed to import holidays");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing holidays: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Holidays</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Performance Reviews button */}
            {(templateType === "performance-reviews" || (sourceRoute === "hrm-performance" && activeSheet.name === "Reviews")) && (
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
                    PERFORMANCE_REVIEWS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => (get(r, "Employee Name") || get(r, "Employee ID or Email")) && (get(r, "Reviewer Name") || get(r, "Reviewer Email or ID")) && get(r, "Period"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Employee Name, Reviewer Name, and Period.");
                    return;
                  }

                  setIsImportingToInventory(true);

                  const reviewsToImport = filled.map((row) => ({
                    employeeName: get(row, "Employee Name") || get(row, "Employee ID or Email"),
                    reviewerName: get(row, "Reviewer Name") || get(row, "Reviewer Email or ID"),
                    period: get(row, "Period"),
                    type: get(row, "Type") || "ANNUAL",
                    overallRating: get(row, "Overall Rating") ? Number(get(row, "Overall Rating")) : undefined,
                    status: get(row, "Status") || "DRAFT",
                  }));

                  try {
                    const res = await importPerformanceReviews(reviewsToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} reviews with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} reviews!`);
                      }
                      router.push("/hrm/performance");
                    } else {
                      toast.error(res?.error || "Failed to import reviews");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing reviews: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Performance Reviews</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Goals button */}
            {(templateType === "goals" || (sourceRoute === "hrm-performance" && activeSheet.name === "Goals")) && (
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
                    GOALS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => (get(r, "Employee Name") || get(r, "Employee ID or Email")) && get(r, "Title"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Employee Name and Title.");
                    return;
                  }

                  setIsImportingToInventory(true);

                  const goalsToImport = filled.map((row) => ({
                    employeeName: get(row, "Employee Name") || get(row, "Employee ID or Email"),
                    title: get(row, "Title"),
                    description: get(row, "Description") || undefined,
                    category: get(row, "Category") || "PERFORMANCE",
                    priority: get(row, "Priority") || "MEDIUM",
                    targetDate: get(row, "Target Date") || undefined,
                    progress: get(row, "Progress") ? Number(get(row, "Progress")) : undefined,
                    status: get(row, "Status") || "NOT_STARTED",
                  }));

                  try {
                    const res = await importGoals(goalsToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} goals with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} goals!`);
                      }
                      router.push("/hrm/performance");
                    } else {
                      toast.error(res?.error || "Failed to import goals");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing goals: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Goals</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Finance Accounts button */}
            {(templateType === "finance-ledger" || (sourceRoute === "finance-accounts" && activeSheet.name === "Accounts")) && (
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
                    FINANCE_LEDGER_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Cost") && get(r, "Item Name") && get(r, "Invoice Number"));
                  if (filled.length === 0) {
                    toast.error("No data rows found. Fill in at least Cost, Item Name, and Invoice Number.");
                    return;
                  }

                  setIsImportingToInventory(true);

                  const entriesToImport = filled.map((row, i) => {
                    const costVal = get(row, "Cost").toLowerCase();
                    const costType = costVal === "site" ? ("Site" as const) : ("Office" as const);
                    const statusVal = get(row, "Status").toLowerCase();
                    const status = statusVal === "pending" ? ("Pending" as const) : ("Received" as const);
                    const paymentVal = get(row, "Payment Mode").toLowerCase();
                    const paymentMode = paymentVal === "cash" ? ("Cash" as const) : ("Bank" as const);
                    return {
                      costType,
                      itemName: get(row, "Item Name") || "Imported Item",
                      invoiceNumber: get(row, "Invoice Number") || `INV-IMPORT-${Date.now()}-${i}`,
                      amount: Number(get(row, "Amount")) || 0,
                      deduction: Number(get(row, "Deduction")) || 0,
                      date: get(row, "Date") || new Date().toISOString().split('T')[0],
                      status,
                      paymentMode,
                      email: get(row, "Email"),
                      contact: get(row, "Contact"),
                      fileName: get(row, "File Name") || "receipt.pdf",
                      remark: get(row, "Remark") || "Imported via Spreadsheets",
                    };
                  });

                  try {
                    const res = await importLedgerEntries(entriesToImport);
                    setIsImportingToInventory(false);
                    if (res && res.count > 0) {
                      toast.success(`Successfully imported ${res.count} transactions!`);
                      router.push("/finance/accounts");
                    } else {
                      toast.error("Failed to import transactions");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing transactions: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Finance Accounts</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Journal Entries button */}
            {(templateType === "finance-journal" || (sourceRoute === "finance-journal" && activeSheet.name === "Journal")) && (
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
                    FINANCE_JOURNAL_HEADERS.includes(cell) || cell.trim() === "Debit Account"
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  // Filter out empty rows
                  const filledRows = dataRows.filter((row) => {
                    const d = get(row, "Date");
                    const ref = get(row, "Reference");
                    const desc = get(row, "Description");
                    const acc = get(row, "Account") || get(row, "Debit Account") || get(row, "Credit Account");
                    return d || ref || desc || acc;
                  });

                  if (filledRows.length === 0) {
                    toast.error("No data rows found in sheet.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    // Fetch accounts to map code or name to ID
                    const acctsRes = await getAccounts({ pageSize: 150 });
                    const accountOptions = acctsRes.data.map((a) => ({ id: a.id, code: a.code, name: a.name }));

                    const groupedEntries: Record<string, { date: string; reference: string; description: string; lines: any[] }> = {};

                    let lastDate = new Date().toISOString().slice(0, 10);
                    let lastRef = "";
                    let lastDesc = "";
                    let groupCounter = 0;

                    filledRows.forEach((row) => {
                      const dateVal = get(row, "Date");
                      const refVal = get(row, "Reference");
                      const descVal = get(row, "Description");

                      const rowDate = dateVal || lastDate;
                      const rowRef = refVal || lastRef;
                      const rowDesc = descVal || lastDesc;

                      if (dateVal) lastDate = dateVal;
                      if (refVal) lastRef = refVal;
                      if (descVal) lastDesc = descVal;

                      // 1. Simple format (Debit Account, Credit Account, Amount)
                      const simpleDebit = get(row, "Debit Account");
                      const simpleCredit = get(row, "Credit Account");
                      const simpleAmount = Number(get(row, "Amount"));

                      if (simpleDebit && simpleCredit && simpleAmount > 0) {
                        const debAcc = accountOptions.find(
                          (a) => a.code.toLowerCase() === simpleDebit.toLowerCase() || a.name.toLowerCase() === simpleDebit.toLowerCase()
                        );
                        const credAcc = accountOptions.find(
                          (a) => a.code.toLowerCase() === simpleCredit.toLowerCase() || a.name.toLowerCase() === simpleCredit.toLowerCase()
                        );

                        if (debAcc && credAcc) {
                          const groupKey = `simple_${groupCounter++}`;
                          groupedEntries[groupKey] = {
                            date: rowDate,
                            reference: rowRef,
                            description: rowDesc || `Transfer: ${credAcc.name} -> ${debAcc.name}`,
                            lines: [
                              { accountId: debAcc.id, debit: simpleAmount, credit: 0, description: rowDesc || undefined },
                              { accountId: credAcc.id, debit: 0, credit: simpleAmount, description: rowDesc || undefined }
                            ]
                          };
                        }
                        return;
                      }

                      // 2. Standard format (Account, Debit, Credit)
                      const accCode = get(row, "Account");
                      const lineDesc = get(row, "Line Description");
                      const debitVal = Number(get(row, "Debit")) || 0;
                      const creditVal = Number(get(row, "Credit")) || 0;

                      if (accCode && (debitVal > 0 || creditVal > 0)) {
                        const account = accountOptions.find(
                          (a) => a.code.toLowerCase() === accCode.toLowerCase() || a.name.toLowerCase() === accCode.toLowerCase()
                        );

                        if (account) {
                          const groupKey = rowRef ? `ref_${rowRef}` : `dt_desc_${rowDate}_${rowDesc.replace(/\s+/g, '_')}`;
                          if (!groupedEntries[groupKey]) {
                            groupedEntries[groupKey] = {
                              date: rowDate,
                              reference: rowRef,
                              description: rowDesc,
                              lines: []
                            };
                          }
                          groupedEntries[groupKey].lines.push({
                            accountId: account.id,
                            debit: debitVal,
                            credit: creditVal,
                            description: lineDesc || undefined
                          });
                        }
                      }
                    });

                    let successCount = 0;
                    let failCount = 0;
                    const keys = Object.keys(groupedEntries);

                    for (const key of keys) {
                      const entry = groupedEntries[key];
                      if (entry.lines.length < 2) {
                        failCount++;
                        continue;
                      }
                      const totDeb = entry.lines.reduce((s, l) => s + l.debit, 0);
                      const totCred = entry.lines.reduce((s, l) => s + l.credit, 0);
                      if (Math.abs(totDeb - totCred) > 0.01) {
                        failCount++;
                        continue;
                      }

                      try {
                        await createJournalEntry({
                          date: entry.date,
                          description: entry.description || undefined,
                          reference: entry.reference || undefined,
                          lines: entry.lines
                        });
                        successCount++;
                      } catch (err) {
                        console.error("Failed to create entry:", err);
                        failCount++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (successCount > 0) {
                      toast.success(`Successfully imported ${successCount} journal entries!`);
                      if (failCount > 0) {
                        toast.warning(`${failCount} entry groups skipped (unbalanced or less than 2 lines).`);
                      }
                      router.push("/finance/journal");
                    } else {
                      toast.error("No valid, balanced journal entries found or imported.");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing journal entries: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Journal Entries</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Expenses button */}
            {(templateType === "finance-expenses" || (sourceRoute === "finance-expenses" && activeSheet.name === "Expenses")) && (
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
                    FINANCE_EXPENSES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Description") && Number(get(r, "Amount")) > 0);
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in Description and Amount.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    // Fetch categories to match name or code
                    const categories = await getExpenseCategories();

                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const description = get(row, "Description");
                      const amount = parseFloat(get(row, "Amount")) || 0;
                      const date = get(row, "Date") || new Date().toISOString().split('T')[0];
                      const notes = get(row, "Notes");
                      const catName = get(row, "Category");

                      const category = categories.find(
                        (c) => c.name.toLowerCase() === catName.toLowerCase() || (c.code && c.code.toLowerCase() === catName.toLowerCase())
                      );

                      try {
                        await createExpense({
                          categoryId: category?.id,
                          description,
                          amount,
                          date,
                          notes: notes || undefined,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} expense${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/finance/expenses");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing expenses: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Expenses</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Salary Structures button */}
            {(templateType === "finance-payroll" || (sourceRoute === "finance-payroll" && activeSheet.name === "Salary Structures")) && (
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
                    FINANCE_PAYROLL_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Structure Name") && Number(get(r, "Basic %")) > 0);
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in Structure Name and Basic %.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const name = get(row, "Structure Name");
                      const basic = parseFloat(get(row, "Basic %")) || 0;
                      const hra = parseFloat(get(row, "HRA %")) || 0;
                      const da = parseFloat(get(row, "DA %")) || 0;
                      const specialAllowance = parseFloat(get(row, "Special Allowance %")) || 0;
                      const pfEmployee = parseFloat(get(row, "PF Employee %")) || 12;
                      const pfEmployer = parseFloat(get(row, "PF Employer %")) || 12;
                      const esiEmployee = parseFloat(get(row, "ESI Employee %")) || 0.75;
                      const esiEmployer = parseFloat(get(row, "ESI Employer %")) || 3.25;
                      const tds = parseFloat(get(row, "TDS %")) || 0;
                      const professionalTax = parseFloat(get(row, "Professional Tax (INR)")) || 0;

                      try {
                        const res = await createSalaryStructure({
                          name,
                          basic,
                          hra,
                          da,
                          specialAllowance,
                          pfEmployee,
                          pfEmployer,
                          esiEmployee,
                          esiEmployer,
                          tds,
                          professionalTax,
                        });
                        if (res && !res.success) {
                          fail++;
                        } else {
                          ok++;
                        }
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} salary structure${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/finance/payroll");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing salary structures: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Salary Structures</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Vendor Bills button */}
            {(templateType === "finance-bills" || (sourceRoute === "finance-bills" && activeSheet.name === "Vendor Bills")) && (
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
                    FINANCE_BILLS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Vendor Name") && Number(get(r, "Amount")) > 0);
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in Vendor Name and Amount.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const vendorName = get(row, "Vendor Name");
                      const vendorGst = get(row, "GST Number") || undefined;
                      const description = get(row, "Description") || undefined;
                      const amount = parseFloat(get(row, "Amount")) || 0;
                      const taxAmount = parseFloat(get(row, "Tax Amount")) || 0;
                      const dueDate = get(row, "Due Date") || undefined;
                      const notes = get(row, "Notes") || undefined;

                      try {
                        await createVendorBill({
                          vendorName,
                          vendorGst,
                          description,
                          amount,
                          taxAmount,
                          dueDate,
                          notes,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} vendor bill${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/finance/bills");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing vendor bills: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Vendor Bills</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Credit & Debit Notes button */}
            {(templateType === "finance-credit-notes" || (sourceRoute === "finance-credit-notes" && activeSheet.name === "Credit & Debit Notes")) && (
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
                    FINANCE_CREDIT_NOTES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Reason") && Number(get(r, "Amount")) > 0);
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in Reason and Amount.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const type = get(row, "Type").toUpperCase();
                      const reason = get(row, "Reason");
                      const invoiceId = get(row, "Invoice ID") || undefined;
                      const description = get(row, "Item Description") || reason;
                      const quantity = parseFloat(get(row, "Quantity")) || 1;
                      const rate = parseFloat(get(row, "Rate")) || 0;
                      const amount = parseFloat(get(row, "Amount")) || (quantity * rate);
                      const taxAmount = parseFloat(get(row, "Tax Amount")) || 0;
                      const notes = get(row, "Notes") || undefined;

                      try {
                        await createCreditNote({
                          type: type === "DEBIT" ? "DEBIT" : "CREDIT",
                          reason,
                          invoiceId,
                          taxAmount,
                          notes,
                          items: [{ description, quantity, rate, amount }],
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} credit/debit note${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/finance/credit-notes");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing credit/debit notes: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Credit & Debit Notes</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Financial Documents button */}
            {(templateType === "finance-documents" || (sourceRoute === "finance-documents" && activeSheet.name === "Financial Documents")) && (
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
                    FINANCE_DOCUMENTS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Title") && get(r, "File Name"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in Title and File Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    const validTypes = ["INVOICE", "RECEIPT", "BILL", "TAX_RETURN", "BANK_STATEMENT", "OTHER"];
                    const validCategories = ["RECEIVABLE", "PAYABLE", "TAX", "PAYROLL", "OTHER"];

                    for (const row of filled) {
                      const title = get(row, "Title");
                      const type = get(row, "Type").toUpperCase();
                      const category = get(row, "Category").toUpperCase();
                      const fileName = get(row, "File Name");
                      const fileSize = parseInt(get(row, "File Size (bytes)")) || 0;
                      const reference = get(row, "Reference") || undefined;
                      const tagsRaw = get(row, "Tags");
                      const tagList = tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined;

                      try {
                        await createFinancialDocument({
                          title,
                          type: validTypes.includes(type) ? type : "OTHER",
                          category: validCategories.includes(category) ? category : undefined,
                          fileName,
                          fileSize: fileSize || undefined,
                          reference,
                          tags: tagList,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} document${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/finance/documents");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing financial documents: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Financial Documents</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Sales Leads button */}
            {(templateType === "sales-leads" || (sourceRoute === "sales-leads" && activeSheet.name === "Sales Leads")) && (
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
                    SALES_LEADS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "First Name"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least First Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    const validSources = ["MANUAL", "WEB_FORM", "EMAIL", "PHONE", "SOCIAL_MEDIA", "REFERRAL"];

                    for (const row of filled) {
                      const firstName = get(row, "First Name");
                      const lastName = get(row, "Last Name") || undefined;
                      const email = get(row, "Email") || undefined;
                      const phone = get(row, "Phone") || undefined;
                      const company = get(row, "Company") || undefined;
                      const sourceVal = get(row, "Source").toUpperCase();
                      const source = validSources.includes(sourceVal) ? (sourceVal as any) : undefined;
                      const notes = get(row, "Notes") || undefined;

                      try {
                        await createLead({
                          firstName,
                          lastName,
                          email,
                          phone,
                          company,
                          source,
                          notes,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} lead${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/sales/leads");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing sales leads: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Sales Leads</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Sales Contacts button */}
            {(templateType === "sales-contacts" || (sourceRoute === "sales-contacts" && activeSheet.name === "Sales Contacts")) && (
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
                    SALES_CONTACTS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "First Name"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least First Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const firstName = get(row, "First Name");
                      const lastName = get(row, "Last Name") || undefined;
                      const email = get(row, "Email") || undefined;
                      const phone = get(row, "Phone") || undefined;
                      const company = get(row, "Company") || undefined;
                      const jobTitle = get(row, "Job Title") || undefined;
                      const city = get(row, "City") || undefined;
                      const state = get(row, "State") || undefined;
                      const country = get(row, "Country") || undefined;
                      const notes = get(row, "Notes") || undefined;

                      try {
                        await createContact({
                          firstName,
                          lastName,
                          email,
                          phone,
                          company,
                          jobTitle,
                          city,
                          state,
                          country,
                          notes,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} contact${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/sales/contacts");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing sales contacts: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Sales Contacts</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Sales Deals button */}
            {(templateType === "sales-deals" || (sourceRoute === "sales-deals" && activeSheet.name === "Sales Deals")) && (
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
                    SALES_DEALS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Title"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least Title.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    const validStages = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

                    for (const row of filled) {
                      const title = get(row, "Title");
                      const value = parseFloat(get(row, "Value (INR)")) || undefined;
                      const probability = parseInt(get(row, "Probability (%)")) || 0;
                      const expectedCloseDate = get(row, "Expected Close Date") || undefined;
                      const stageVal = get(row, "Stage").toUpperCase();
                      const stage = validStages.includes(stageVal) ? (stageVal as any) : undefined;
                      const notes = get(row, "Notes") || undefined;

                      try {
                        await createDeal({
                          title,
                          value,
                          probability,
                          expectedCloseDate,
                          stage,
                          notes,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} deal${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/sales/deals");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing sales deals: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Sales Deals</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Sales Quotations button */}
            {(templateType === "sales-quotations" || (sourceRoute === "sales-quotations" && activeSheet.name === "Sales Quotations")) && (
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
                    SALES_QUOTATIONS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  // Filter out rows without item description
                  const filledRows = dataRows.filter((r) => get(r, "Item Description"));
                  if (filledRows.length === 0) {
                    toast.error("No valid data rows found with Item Description.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    const groupedQuotations: Record<string, { validUntil?: string; notes?: string; terms?: string; items: any[] }> = {};

                    let lastRef = "";
                    let groupCounter = 0;

                    filledRows.forEach((row) => {
                      const refVal = get(row, "Reference");
                      const desc = get(row, "Item Description");
                      const quantity = parseFloat(get(row, "Quantity")) || 1;
                      const unitPrice = parseFloat(get(row, "Unit Price")) || 0;
                      const taxRate = parseFloat(get(row, "Tax Rate (%)")) || 18;

                      const rowRef = refVal || lastRef || `group_${groupCounter}`;
                      if (refVal) lastRef = refVal;
                      else if (!lastRef) {
                        lastRef = rowRef;
                        groupCounter++;
                      }

                      if (!groupedQuotations[rowRef]) {
                        groupedQuotations[rowRef] = {
                          validUntil: get(row, "Valid Until") || undefined,
                          notes: get(row, "Notes") || undefined,
                          terms: get(row, "Terms") || undefined,
                          items: []
                        };
                      }

                      if (desc) {
                        groupedQuotations[rowRef].items.push({
                          description: desc,
                          quantity,
                          unitPrice,
                          taxRate,
                        });
                      }
                    });

                    let ok = 0; let fail = 0;
                    const keys = Object.keys(groupedQuotations);
                    for (const key of keys) {
                      const qData = groupedQuotations[key];
                      if (qData.items.length === 0) {
                        fail++;
                        continue;
                      }
                      try {
                        await createQuotation({
                          items: qData.items,
                          validUntil: qData.validUntil,
                          notes: qData.notes,
                          terms: qData.terms,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} quotation${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} quotation group${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/sales/quotations");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing sales quotations: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Sales Quotations</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Sales Invoices button */}
            {(templateType === "sales-invoices" || (sourceRoute === "sales-invoices" && activeSheet.name === "Sales Invoices")) && (
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
                    SALES_INVOICES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  // Filter out rows without item description
                  const filledRows = dataRows.filter((r) => get(r, "Item Description"));
                  if (filledRows.length === 0) {
                    toast.error("No valid data rows found with Item Description.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    const groupedInvoices: Record<string, { dueDate?: string; paymentTerms?: string; notes?: string; items: any[] }> = {};

                    let lastRef = "";
                    let groupCounter = 0;

                    filledRows.forEach((row) => {
                      const refVal = get(row, "Reference");
                      const desc = get(row, "Item Description");
                      const quantity = parseFloat(get(row, "Quantity")) || 1;
                      const unitPrice = parseFloat(get(row, "Unit Price")) || 0;
                      const taxRate = parseFloat(get(row, "Tax Rate (%)")) || 18;

                      const rowRef = refVal || lastRef || `group_${groupCounter}`;
                      if (refVal) lastRef = refVal;
                      else if (!lastRef) {
                        lastRef = rowRef;
                        groupCounter++;
                      }

                      if (!groupedInvoices[rowRef]) {
                        groupedInvoices[rowRef] = {
                          dueDate: get(row, "Due Date") || undefined,
                          paymentTerms: get(row, "Payment Terms") || undefined,
                          notes: get(row, "Notes") || undefined,
                          items: []
                        };
                      }

                      if (desc) {
                        groupedInvoices[rowRef].items.push({
                          description: desc,
                          quantity,
                          unitPrice,
                          taxRate,
                        });
                      }
                    });

                    let ok = 0; let fail = 0;
                    const keys = Object.keys(groupedInvoices);
                    for (const key of keys) {
                      const invData = groupedInvoices[key];
                      if (invData.items.length === 0) {
                        fail++;
                        continue;
                      }
                      try {
                        await createInvoice({
                          items: invData.items,
                          dueDate: invData.dueDate,
                          paymentTerms: invData.paymentTerms,
                          notes: invData.notes,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} invoice${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} invoice group${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/sales/invoices");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing sales invoices: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Sales Invoices</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Sales Visits button */}
            {(templateType === "sales-visits" || (sourceRoute === "sales-visits" && activeSheet.name === "Sales Visits")) && (
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
                    SALES_VISITS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Purpose"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least Purpose.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const purpose = get(row, "Purpose");
                      const location = get(row, "Location") || undefined;
                      const notes = get(row, "Notes") || undefined;

                      try {
                        await createVisit({
                          purpose,
                          location,
                          notes,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} visit${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/sales/visits");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing sales visits: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Sales Visits</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Projects button */}
            {(templateType === "projects" || (sourceRoute === "projects" && activeSheet.name === "Projects")) && (
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
                    PROJECTS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Project Name"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least Project Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  try {
                    let ok = 0; let fail = 0;
                    for (const row of filled) {
                      const name = get(row, "Project Name");
                      const code = get(row, "Project Code") || undefined;
                      const description = get(row, "Description") || undefined;
                      const priority = (get(row, "Priority").toUpperCase() || "MEDIUM");
                      const startDate = get(row, "Start Date") || undefined;
                      const endDate = get(row, "End Date") || undefined;
                      const budget = parseFloat(get(row, "Budget")) || undefined;
                      const clientName = get(row, "Client Name") || undefined;

                      try {
                        await createProject({
                          name,
                          code,
                          description,
                          priority,
                          startDate,
                          endDate,
                          budget,
                          clientName,
                        });
                        ok++;
                      } catch {
                        fail++;
                      }
                    }

                    setIsImportingToInventory(false);
                    if (ok > 0) toast.success(`Imported ${ok} project${ok > 1 ? "s" : ""} successfully!`);
                    if (fail > 0) toast.error(`${fail} row${fail > 1 ? "s" : ""} failed.`);
                    if (ok > 0) router.push("/projects");
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing projects: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Projects</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Branches button */}
            {(templateType === "branches" || (sourceRoute === "branches" && activeSheet.name === "Branches")) && (
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
                    BRANCHES_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Branch Name"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least Branch Name.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  const branchesToImport = filled.map((row) => ({
                    name: get(row, "Branch Name"),
                    address: get(row, "Address") || undefined,
                    city: get(row, "City") || undefined,
                    state: get(row, "State") || undefined,
                    phone: get(row, "Phone") || undefined,
                    email: get(row, "Email") || undefined,
                    isHeadOffice: get(row, "Head Office") || false,
                  }));

                  try {
                    const res = await importBranches(branchesToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} branches with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} branches!`);
                      }
                      router.push("/organization/branches");
                    } else {
                      toast.error(res?.error || "Failed to import branches");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing branches: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Branches</>
                )}
              </Button>
            )}

            {/* Bulk Upload to Contracts button */}
            {(templateType === "contracts" || (sourceRoute === "contracts" && activeSheet.name === "Contracts")) && (
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
                    CONTRACTS_HEADERS.includes(cell)
                  );
                  const dataRows = isHeaderRow ? sheet.data.slice(1) : sheet.data;
                  // Map column header → index
                  const headerMap: Record<string, number> = {};
                  const headerSource = isHeaderRow ? firstRow : sheet.columns;
                  headerSource.forEach((h, i) => { headerMap[h.trim()] = i; });
                  const get = (row: string[], key: string) => (row[headerMap[key]] ?? "").trim();

                  const filled = dataRows.filter((r) => get(r, "Title"));
                  if (filled.length === 0) {
                    toast.error("No valid data rows found. Fill in at least Title.");
                    return;
                  }

                  setIsImportingToInventory(true);
                  const contractsToImport = filled.map((row) => ({
                    title: get(row, "Title"),
                    type: get(row, "Type") || undefined,
                    contactName: get(row, "Contact Name") || undefined,
                    value: get(row, "Value (INR)") || undefined,
                    startDate: get(row, "Start Date") || undefined,
                    endDate: get(row, "End Date") || undefined,
                    autoRenew: get(row, "Auto Renew") || false,
                    terms: get(row, "Terms") || undefined,
                    notes: get(row, "Notes") || undefined,
                  }));

                  try {
                    const res = await importContracts(contractsToImport);
                    setIsImportingToInventory(false);
                    if (res && res.success) {
                      if (res.errors && res.errors.length > 0) {
                        toast.warning(`Imported ${res.count} contracts with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                      } else {
                        toast.success(`Successfully imported ${res.count} contracts!`);
                      }
                      router.push("/organization/contracts");
                    } else {
                      toast.error(res?.error || "Failed to import contracts");
                    }
                  } catch (err: any) {
                    setIsImportingToInventory(false);
                    toast.error(`Error importing contracts: ${err.message}`);
                  }
                }}
              >
                {isImportingToInventory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Package className="h-4 w-4" /> Bulk Upload to Contracts</>
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
              className={`px-3 py-1 text-sm rounded-t border border-b-0 ${idx === activeSheetIdx
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
          {filteredSheets.map((sheet) => {
            const sheetCount = (sheet.sheets as SheetData[])?.length ?? 1;
            const templateType = detectTemplateType(sheet.sheets);
            const creatorName = sheet.createdBy.name || sheet.createdBy.email || "Unknown";
            const formattedDate = new Date(sheet.updatedAt).toLocaleDateString("en-US");

            return (
              <Card
                key={sheet.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openEditor(sheet)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <CardTitle className="text-base truncate max-w-[200px]" title={sheet.title}>
                      {sheet.title}
                    </CardTitle>
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
                        <FolderOpen className="h-4 w-4 mr-2" /> Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditor(sheet);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameSheetId(sheet.id);
                          setRenameTitle(sheet.title);
                          setRenameOpen(true);
                        }}
                      >
                        <PencilLine className="h-4 w-4 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareSheetId(sheet.id);
                          const shared = sheet.sharedWith as Array<{ userId: string }>;
                          setSelectedShareUsers(
                            Array.isArray(shared) ? shared.map((s) => s.userId) : []
                          );
                          setShareOpen(true);
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{templateType}</Badge>
                    <span>v{sheetCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    By {creatorName} &middot; {formattedDate}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select users to share with:</p>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {users && users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShareUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedShareUsers((prev) => [...prev, user.id]);
                        } else {
                          setSelectedShareUsers((prev) => prev.filter((id) => id !== user.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{user.name ?? user.email}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShareOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Spreadsheet title"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={isPending || !renameTitle.trim()}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
