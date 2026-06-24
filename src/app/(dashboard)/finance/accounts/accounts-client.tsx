"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Download, Upload, Printer, Trash2, Edit3, Filter, FileSpreadsheet, Eye, ChevronDown, CheckCircle2, Clock, Wallet, FileText
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  getLedgerEntries,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  importLedgerEntries,
} from "@/lib/actions/finance-ledger";

interface AccountEntry {
  id: string;
  slNo: number;
  costType: "Office" | "Site";
  itemName: string;
  invoiceNumber: string;
  amount: number;
  deduction: number;
  date: string;
  status: "Received" | "Pending";
  paymentMode: "Bank" | "Cash";
  email: string;
  contact: string;
  fileName: string;
  fileDataUrl: string;
  remark: string;
}

const initialDemoData: AccountEntry[] = [
  {
    id: "1",
    slNo: 1,
    costType: "Office",
    itemName: "Acme Corporation (Vendor)",
    invoiceNumber: "INV-2026-001",
    amount: 45000,
    deduction: 1500,
    date: "2026-05-15",
    status: "Received",
    paymentMode: "Bank",
    email: "billing@acme.com",
    contact: "+91 98765 43210",
    fileName: "invoice_acme.pdf",
    fileDataUrl: "",
    remark: "Office server rack maintenance and setup fees."
  },
  {
    id: "2",
    slNo: 2,
    costType: "Site",
    itemName: "John Doe (Project Lead)",
    invoiceNumber: "INV-2026-002",
    amount: 12000,
    deduction: 0,
    date: "2026-05-20",
    status: "Pending",
    paymentMode: "Cash",
    email: "john.doe@tixeltech.com",
    contact: "+91 91234 56789",
    fileName: "travel_reimbursement.jpg",
    fileDataUrl: "",
    remark: "Site travel allowances and daily allowances."
  },
  {
    id: "3",
    slNo: 3,
    costType: "Office",
    itemName: "Microsoft India (Vendor)",
    invoiceNumber: "INV-2026-003",
    amount: 85000,
    deduction: 5000,
    date: "2026-05-22",
    status: "Received",
    paymentMode: "Bank",
    email: "licensing@microsoft.com",
    contact: "+91 80234 56789",
    fileName: "office365_renewal.pdf",
    fileDataUrl: "",
    remark: "Annual enterprise email and cloud license renewal."
  }
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(amount);
}

// Stateful character CSV parser
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [search, setSearch] = useState("");
  const [costFilter, setCostFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AccountEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // File Upload states
  const [fileName, setFileName] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [previewFile, setPreviewFile] = useState<{ name: string; dataUrl: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const fileEditUploadRef = useRef<HTMLInputElement>(null);

  // Load from Database (with LocalStorage fail-safe backup)
  useEffect(() => {
    async function loadData() {
      try {
        const dbEntries = await getLedgerEntries();
        if (dbEntries && dbEntries.length > 0) {
          setAccounts(dbEntries);
          localStorage.setItem("tixel-finance-accounts", JSON.stringify(dbEntries));
        } else {
          // If DB is completely empty, populate from localStorage or Demo Data
          const saved = localStorage.getItem("tixel-finance-accounts");
          if (saved) {
            const parsed = JSON.parse(saved);
            setAccounts(parsed);
            await importLedgerEntries(parsed);
          } else {
            setAccounts(initialDemoData);
            localStorage.setItem("tixel-finance-accounts", JSON.stringify(initialDemoData));
            await importLedgerEntries(initialDemoData);
          }
        }
      } catch (error) {
        console.warn("Database fetch failed, falling back to LocalStorage:", error);
        const saved = localStorage.getItem("tixel-finance-accounts");
        if (saved) {
          try {
            setAccounts(JSON.parse(saved));
          } catch {
            setAccounts(initialDemoData);
          }
        } else {
          setAccounts(initialDemoData);
        }
      }
    }
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error("File size exceeds 1.5MB limit. Please select a smaller receipt file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileBase64(event.target?.result as string);
        setFileName(file.name);
        toast.info(`Attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const costType = formData.get("costType") as "Office" | "Site";
    const itemName = formData.get("itemName") as string;
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const amount = Number(formData.get("amount"));
    const deduction = Number(formData.get("deduction") || 0);
    const date = formData.get("date") as string;
    const status = formData.get("status") as "Received" | "Pending";
    const paymentMode = formData.get("paymentMode") as "Bank" | "Cash";
    const email = formData.get("email") as string;
    const contact = formData.get("contact") as string;
    const remark = formData.get("remark") as string;

    const currentMaxSl = accounts.reduce((max, a) => Math.max(max, Number(a.slNo) || 0), 0);
    const nextSl = currentMaxSl + 1;

    const newEntry: AccountEntry = {
      id: crypto.randomUUID(),
      slNo: nextSl,
      costType,
      itemName,
      invoiceNumber,
      amount,
      deduction,
      date,
      status,
      paymentMode,
      email,
      contact,
      fileName: fileName || "receipt.pdf",
      fileDataUrl: fileBase64 || "",
      remark,
    };

    const updated = [...accounts, newEntry];
    setAccounts(updated);
    localStorage.setItem("tixel-finance-accounts", JSON.stringify(updated));

    try {
      await createLedgerEntry({
        costType,
        itemName,
        invoiceNumber,
        amount,
        deduction,
        date,
        status,
        paymentMode,
        email,
        contact,
        fileName: fileName || "receipt.pdf",
        fileDataUrl: fileBase64 || "",
        remark,
      });
      toast.success("Transaction successfully saved to database!");
    } catch (err) {
      console.error(err);
      toast.warning("Saved locally (offline mode)");
    }

    setIsOpen(false);
    setFileName("");
    setFileBase64("");
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editEntry) return;

    const formData = new FormData(e.currentTarget);
    const costType = formData.get("costType") as "Office" | "Site";
    const itemName = formData.get("itemName") as string;
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const amount = Number(formData.get("amount"));
    const deduction = Number(formData.get("deduction") || 0);
    const date = formData.get("date") as string;
    const status = formData.get("status") as "Received" | "Pending";
    const paymentMode = formData.get("paymentMode") as "Bank" | "Cash";
    const email = formData.get("email") as string;
    const contact = formData.get("contact") as string;
    const remark = formData.get("remark") as string;

    const finalFileName = fileName || editEntry.fileName;
    const finalFileDataUrl = fileBase64 || editEntry.fileDataUrl;

    const updated = accounts.map((a) => {
      if (a.id === editEntry.id) {
        return {
          ...a,
          costType,
          itemName,
          invoiceNumber,
          amount,
          deduction,
          date,
          status,
          paymentMode,
          email,
          contact,
          fileName: finalFileName,
          fileDataUrl: finalFileDataUrl,
          remark,
        };
      }
      return a;
    });

    setAccounts(updated);
    localStorage.setItem("tixel-finance-accounts", JSON.stringify(updated));

    try {
      await updateLedgerEntry(editEntry.id, {
        costType,
        itemName,
        invoiceNumber,
        amount,
        deduction,
        date,
        status,
        paymentMode,
        email,
        contact,
        fileName: finalFileName,
        fileDataUrl: finalFileDataUrl,
        remark,
      });
      toast.success("Transaction updated in database!");
    } catch (err) {
      console.error(err);
      toast.warning("Updated locally (offline mode)");
    }

    setEditEntry(null);
    setFileName("");
    setFileBase64("");
  };

  const handleDelete = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    const reindexed = updated.map((entry, idx) => ({
      ...entry,
      slNo: idx + 1,
    }));
    setAccounts(reindexed);
    localStorage.setItem("tixel-finance-accounts", JSON.stringify(reindexed));

    try {
      await deleteLedgerEntry(id);
      toast.success("Transaction deleted and ledger re-indexed!");
    } catch (err) {
      console.error(err);
      toast.warning("Deleted locally (offline mode)");
    }
    setConfirmDeleteId(null);
  };

  // CSV Import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        if (lines.length < 2) {
          toast.error("Invalid CSV structure. Header required.");
          return;
        }

        const newEntries: AccountEntry[] = [];
        const currentMaxSl = accounts.reduce((max, a) => Math.max(max, Number(a.slNo) || 0), 0);
        let nextSl = currentMaxSl + 1;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const matches = parseCSVLine(line);
          if (matches.length < 5) continue;

          const clean = (val: string) => val ? val.replace(/^["']|["']$/g, '').trim() : "";

          const entry: AccountEntry = {
            id: crypto.randomUUID(),
            slNo: nextSl++,
            costType: clean(matches[1]) === "Site" ? "Site" : "Office",
            itemName: clean(matches[2]) || "Imported Item",
            invoiceNumber: clean(matches[3]) || `INV-IMPORT-${Date.now()}-${i}`,
            amount: Number(clean(matches[4])) || 0,
            deduction: Number(clean(matches[5])) || 0,
            date: clean(matches[6]) || new Date().toISOString().split('T')[0],
            status: clean(matches[7]) === "Pending" ? "Pending" : "Received",
            paymentMode: clean(matches[8]) === "Cash" ? "Cash" : "Bank",
            email: clean(matches[9]) || "",
            contact: clean(matches[10]) || "",
            fileName: clean(matches[11]) || "receipt.pdf",
            fileDataUrl: "",
            remark: clean(matches[12]) || "Imported via CSV file"
          };
          newEntries.push(entry);
        }

        if (newEntries.length === 0) {
          toast.error("No valid CSV rows parsed.");
          return;
        }

        const updated = [...accounts, ...newEntries];
        setAccounts(updated);
        localStorage.setItem("tixel-finance-accounts", JSON.stringify(updated));

        try {
          await importLedgerEntries(newEntries);
          toast.success(`Successfully imported ${newEntries.length} transactions to database!`);
        } catch (err) {
          console.error(err);
          toast.warning(`Imported ${newEntries.length} entries locally (offline)`);
        }
      } catch {
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        const currentMaxSl = accounts.reduce((max, a) => Math.max(max, Number(a.slNo) || 0), 0);
        let nextSl = currentMaxSl + 1;

        const newEntries: AccountEntry[] = json.map((row, i) => {
          const costTypeVal = String(row.costType || row["Cost"] || row["Cost Type"] || "").trim();
          const clean = (val: any) => val ? String(val).trim() : "";

          return {
            id: crypto.randomUUID(),
            slNo: nextSl++,
            costType: costTypeVal.toLowerCase() === "site" ? "Site" : "Office",
            itemName: clean(row.itemName || row["Item Name"] || row["Item"] || row["Name"] || "Imported Item"),
            invoiceNumber: clean(row.invoiceNumber || row["Invoice Number"] || row["Invoice No"] || `INV-IMPORT-${Date.now()}-${i}`),
            amount: Number(row.amount || row["Amount"] || 0),
            deduction: Number(row.deduction || row["Deduction"] || 0),
            date: clean(row.date || row["Date"] || new Date().toISOString().split('T')[0]),
            status: String(row.status || row["Status"] || "").trim().toLowerCase() === "pending" ? "Pending" : "Received",
            paymentMode: String(row.paymentMode || row["Payment Mode"] || "").trim().toLowerCase() === "cash" ? "Cash" : "Bank",
            email: clean(row.email || row["Email"] || row["Mail"] || ""),
            contact: clean(row.contact || row["Contact"] || row["Phone"] || ""),
            fileName: clean(row.fileName || row["File"] || row["File Name"] || "receipt.pdf"),
            fileDataUrl: "",
            remark: clean(row.remark || row["Remark"] || row["Description"] || "Imported via Excel file")
          };
        });

        const updated = [...accounts, ...newEntries];
        setAccounts(updated);
        localStorage.setItem("tixel-finance-accounts", JSON.stringify(updated));

        try {
          await importLedgerEntries(newEntries);
          toast.success(`Successfully imported ${newEntries.length} transactions to database!`);
        } catch (err) {
          console.error(err);
          toast.warning(`Imported ${newEntries.length} entries locally (offline)`);
        }
      } catch (err: any) {
        toast.error(`Error parsing Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleDownloadAccountsTemplate = () => {
    const headers = [
      {
        "Cost": "Office",
        "Item Name": "Acme Corporation (Vendor)",
        "Invoice Number": "INV-2026-001",
        "Amount": 45000,
        "Deduction": 1500,
        "Date": "2026-05-15",
        "Status": "Received",
        "Payment Mode": "Bank",
        "Email": "billing@acme.com",
        "Contact": "+91 98765 43210",
        "File Name": "invoice_acme.pdf",
        "Remark": "Office server rack maintenance and setup fees."
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "finance_accounts_template.xlsx");
    toast.success("Accounts Excel template downloaded!");
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Sl. No.",
      "Cost (Office/Site)",
      "Item (Project/Employee/Vendor - Name)",
      "Invoice Number",
      "Amount",
      "Deduction",
      "Date",
      "Status (Received/Pending)",
      "Payment Mode (Bank/Cash)",
      "Mail (Employee/Vendor)",
      "Contact (Employee/Vendor)",
      "File Upload",
      "Remark"
    ];

    const csvRows = [
      headers.join(","),
      ...accounts.map((a) => [
        a.slNo,
        `"${a.costType}"`,
        `"${a.itemName}"`,
        `"${a.invoiceNumber}"`,
        a.amount,
        a.deduction,
        a.date,
        `"${a.status}"`,
        `"${a.paymentMode}"`,
        `"${a.email}"`,
        `"${a.contact}"`,
        `"${a.fileName}"`,
        `"${a.remark.replace(/"/g, '""')}"`
      ].join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `finance_accounts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report exported successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredEntries = accounts.filter((a) => {
    const matchesSearch = 
      a.itemName.toLowerCase().includes(search.toLowerCase()) ||
      a.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.contact.toLowerCase().includes(search.toLowerCase()) ||
      a.remark.toLowerCase().includes(search.toLowerCase());

    const matchesCost = costFilter === "ALL" || a.costType === costFilter;
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchesPayment = paymentFilter === "ALL" || a.paymentMode === paymentFilter;

    return matchesSearch && matchesCost && matchesStatus && matchesPayment;
  });

  // KPI Statistics
  const totalAmount = filteredEntries.reduce((sum, a) => sum + a.amount, 0);
  const totalDeduction = filteredEntries.reduce((sum, a) => sum + a.deduction, 0);
  const netLedger = totalAmount - totalDeduction;
  const receivedCount = filteredEntries.filter(a => a.status === "Received").length;
  const pendingCount = filteredEntries.filter(a => a.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Dynamic inline print styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden,
          aside,
          nav,
          header,
          footer,
          button,
          .no-print,
          div[role="dialog"] {
            display: none !important;
          }
          main,
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px !important;
            font-size: 11px !important;
            color: black !important;
          }
        }
      `}} />

      {/* Print-only layout header */}
      <div className="hidden print:block mb-6 border-b pb-4 text-center">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">TixelTech ERP</h1>
        <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">General Ledger & Accounts Transaction Report</p>
        <p className="text-xs text-slate-400 mt-1">Date Printed: {new Date().toLocaleDateString("en-IN")} | Net Sum: {formatCurrency(netLedger)}</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your general ledger accounts ({accounts.length} total)</p>
        </div>

        {/* Action button bar */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Hidden Import file inputs */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={excelInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          {/* <Button
            variant="outline"
            onClick={handleDownloadAccountsTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary font-medium"
          >
            <Download className="h-4 w-4" /> Template
          </Button>
          <Button
            variant="outline"
            onClick={() => excelInputRef.current?.click()}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary font-medium"
          >
            <Upload className="h-4 w-4" /> Import Excel
          </Button> */}

          <Link href="/office/spreadsheets?template=finance-ledger&source=finance-accounts">
            <Button
              variant="outline"
              type="button"
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary font-medium"
            >
              <Upload className="h-4 w-4" /> Import Excel
            </Button>
          </Link>
          
          {/* <DropdownMenu>
            <DropdownMenuTrigger 
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer font-medium"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50">
              <DropdownMenuItem 
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 cursor-pointer flex items-center px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                <span>Import CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleExportCSV}
                className="gap-2 cursor-pointer flex items-center px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 mt-0.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handlePrint}
                className="gap-2 cursor-pointer flex items-center px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 mt-0.5"
              >
                <Printer className="h-4 w-4 text-blue-600" />
                <span>PDF / Print</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}

          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if(!val) { setFileName(""); setFileBase64(""); }
          }}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Plus className="h-4 w-4" /> Add Account
            </DialogTrigger>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
              <DialogHeader><DialogTitle>New Ledger Transaction</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costType">Cost - Office/Site *</Label>
                    <select name="costType" id="costType" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none">
                      <option value="Office">Office</option>
                      <option value="Site">Site</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item - Project/Employee/Vendor - Name *</Label>
                    <Input id="itemName" name="itemName" placeholder="Enter name details" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <Input id="invoiceNumber" name="invoiceNumber" placeholder="e.g. INV-2026-004" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (INR) *</Label>
                    <Input id="amount" name="amount" type="number" min="0" step="0.01" placeholder="e.g. 50000" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deduction">Deduction (INR)</Label>
                    <Input id="deduction" name="deduction" type="number" min="0" step="0.01" placeholder="e.g. 1000" defaultValue="0" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status - Received/Pending *</Label>
                    <select name="status" id="status" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none">
                      <option value="Received">Received</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMode">Payment Mode - Bank/Cash *</Label>
                    <select name="paymentMode" id="paymentMode" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none">
                      <option value="Bank">Bank</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Mail - Employee/Vendor</Label>
                    <Input id="email" name="email" type="email" placeholder="vendor@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact - Employee/Vendor</Label>
                    <Input id="contact" name="contact" type="tel" placeholder="+91 99999 88888" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload - Image/PDF</Label>
                  <div 
                    onClick={() => fileUploadRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <input 
                      type="file" 
                      ref={fileUploadRef}
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <Upload className="h-6 w-6 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {fileName ? `Selected: ${fileName}` : "Click to select or drag & drop Image / PDF"}
                    </span>
                    <span className="text-[10px] text-slate-400">Supports PDF, JPG, PNG up to 1.5MB</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remark">Remark - Description</Label>
                  <Textarea id="remark" name="remark" rows={3} placeholder="Add detailed transaction remarks" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                    Cancel
                  </DialogClose>
                  <Button type="submit">Add Account</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats Panel */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/50 dark:border-indigo-800/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Net Ledger Balance</span>
              <Wallet className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-black mt-2 font-mono tracking-tight text-slate-800 dark:text-slate-100">{formatCurrency(netLedger)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total assets - deductions applied</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received Entries</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black mt-2 font-mono tracking-tight text-slate-800 dark:text-slate-100">{receivedCount} Received</p>
            <p className="text-[10px] text-slate-400 mt-1">Cleared ledger records</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200/50 dark:border-amber-800/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Clearings</span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black mt-2 font-mono tracking-tight text-slate-800 dark:text-slate-100">{pendingCount} Pending</p>
            <p className="text-[10px] text-slate-400 mt-1">Awaiting cleared funds</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-red-500/10 border-rose-200/50 dark:border-rose-800/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Deductions</span>
              <Trash2 className="h-5 w-5 text-rose-500" />
            </div>
            <p className="text-2xl font-black mt-2 font-mono tracking-tight text-slate-800 dark:text-slate-100">{formatCurrency(totalDeduction)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Withholdings applied</p>
          </CardContent>
        </Card>
      </div> */}

      {/* Filters (print:hidden) */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Search Query</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search item, invoice, remark..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Cost Center</Label>
              <Select value={costFilter} onValueChange={(val) => val && setCostFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Costs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Costs</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Site">Site</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <Select value={paymentFilter} onValueChange={(val) => val && setPaymentFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Modes</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card className="overflow-hidden shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full divide-y divide-border">
              <TableHeader className="bg-slate-50 dark:bg-slate-800/40">
                <TableRow>
                  <TableHead className="w-12 text-center">Sl. No.</TableHead>
                  <TableHead className="w-24">Cost Center</TableHead>
                  <TableHead className="min-w-[180px]">Item / Account Name</TableHead>
                  <TableHead className="w-32">Invoice Number</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-24 text-right">Deduction</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Payment Mode</TableHead>
                  <TableHead className="min-w-[150px] print:hidden">Contact Info</TableHead>
                  <TableHead className="w-28 print:hidden">Attachment</TableHead>
                  <TableHead className="min-w-[180px]">Remark</TableHead>
                  <TableHead className="w-24 text-right print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground py-12">
                      No accounts ledger entries found. Click "Add Account" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((account) => (
                    <TableRow key={account.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <TableCell className="font-mono text-center font-bold text-slate-500">{account.slNo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={account.costType === "Office" ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"}>
                          {account.costType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{account.itemName}</TableCell>
                      <TableCell className="font-mono text-xs">{account.invoiceNumber}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(account.amount)}</TableCell>
                      <TableCell className="text-right font-mono text-red-500 dark:text-red-400">{account.deduction > 0 ? formatCurrency(account.deduction) : "—"}</TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">{new Date(account.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge className={account.status === "Received" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{account.paymentMode}</TableCell>
                      <TableCell className="text-xs print:hidden">
                        <div className="flex flex-col gap-0.5 max-w-[150px] truncate">
                          {account.email && <span className="text-slate-500 truncate" title={account.email}>{account.email}</span>}
                          {account.contact && <span className="text-slate-400 truncate" title={account.contact}>{account.contact}</span>}
                          {!account.email && !account.contact && <span className="text-slate-300">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs print:hidden">
                        {account.fileDataUrl ? (
                          <div 
                            onClick={() => setPreviewFile({ name: account.fileName, dataUrl: account.fileDataUrl })}
                            className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 hover:underline cursor-pointer"
                          >
                            <Eye className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[80px] font-semibold">{account.fileName}</span>
                          </div>
                        ) : account.fileName ? (
                          <span className="text-slate-400 truncate" title={account.fileName}>{account.fileName}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={account.remark}>
                        {account.remark || "—"}
                      </TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-slate-500 hover:text-slate-800"
                            onClick={() => {
                              setEditEntry(account);
                              setFileName(account.fileName);
                              setFileBase64(account.fileDataUrl);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          {confirmDeleteId === account.id ? (
                            <div className="flex items-center gap-1 z-50">
                              <Button variant="destructive" size="sm" className="h-7 text-[10px] px-2" onClick={() => handleDelete(account.id)}>Confirm</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 cursor-pointer text-red-500 hover:text-red-700"
                              onClick={() => setConfirmDeleteId(account.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Receipt Preview */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
          <DialogContent className="max-w-3xl flex flex-col items-center">
            <DialogHeader className="w-full">
              <DialogTitle className="truncate">{previewFile.name}</DialogTitle>
            </DialogHeader>
            <div className="w-full max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border">
              {previewFile.dataUrl.startsWith("data:image/") ? (
                <img src={previewFile.dataUrl} alt={previewFile.name} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md" />
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                  <FileText className="h-16 w-16 text-indigo-500 animate-bounce" />
                  <span className="text-sm font-semibold">Document Attached (PDF/Other)</span>
                  <a href={previewFile.dataUrl} download={previewFile.name} className="mt-2 text-xs font-semibold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                    Download File
                  </a>
                </div>
              )}
            </div>
            <div className="flex justify-end w-full">
              <Button onClick={() => setPreviewFile(null)}>Close Preview</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => {
        if(!open) { setEditEntry(null); setFileName(""); setFileBase64(""); }
      }}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Transaction Entry</DialogTitle></DialogHeader>
          {editEntry && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-costType">Cost - Office/Site *</Label>
                  <select name="costType" id="edit-costType" required defaultValue={editEntry.costType} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none">
                    <option value="Office">Office</option>
                    <option value="Site">Site</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-itemName">Item - Project/Employee/Vendor - Name *</Label>
                  <Input id="edit-itemName" name="itemName" defaultValue={editEntry.itemName} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-invoiceNumber">Invoice Number *</Label>
                  <Input id="edit-invoiceNumber" name="invoiceNumber" defaultValue={editEntry.invoiceNumber} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date *</Label>
                  <Input id="edit-date" name="date" type="date" defaultValue={editEntry.date} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount (INR) *</Label>
                  <Input id="edit-amount" name="amount" type="number" min="0" step="0.01" defaultValue={editEntry.amount} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-deduction">Deduction (INR)</Label>
                  <Input id="edit-deduction" name="deduction" type="number" min="0" step="0.01" defaultValue={editEntry.deduction} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status - Received/Pending *</Label>
                  <select name="status" id="edit-status" required defaultValue={editEntry.status} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none">
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paymentMode">Payment Mode - Bank/Cash *</Label>
                  <select name="paymentMode" id="edit-paymentMode" required defaultValue={editEntry.paymentMode} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none">
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Mail - Employee/Vendor</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={editEntry.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact">Contact - Employee/Vendor</Label>
                  <Input id="edit-contact" name="contact" type="tel" defaultValue={editEntry.contact} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload - Image/PDF</Label>
                <div 
                  onClick={() => fileEditUploadRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <input 
                    type="file" 
                    ref={fileEditUploadRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <Upload className="h-6 w-6 text-indigo-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {fileName ? `Selected: ${fileName}` : editEntry.fileName ? `Currently: ${editEntry.fileName}` : "Click to select or drop new Image/PDF"}
                  </span>
                  <span className="text-[10px] text-slate-400">Supports PDF, JPG, PNG up to 1.5MB</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-remark">Remark - Description</Label>
                <Textarea id="edit-remark" name="remark" defaultValue={editEntry.remark} rows={3} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditEntry(null);
                  setFileName("");
                  setFileBase64("");
                }}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
