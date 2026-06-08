"use client";

import { useState, useEffect, useTransition, useRef } from "react";
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
import { Plus, Search, Loader2, Trash2, FileText, File, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  getFinancialDocuments, createFinancialDocument, deleteFinancialDocument,
} from "@/lib/actions/finance";

type FinancialDocument = Awaited<ReturnType<typeof getFinancialDocuments>>["data"][number];

const docTypes = ["INVOICE", "RECEIPT", "BILL", "TAX_RETURN", "BANK_STATEMENT", "OTHER"];
const docCategories = ["RECEIVABLE", "PAYABLE", "TAX", "PAYROLL", "OTHER"];

const typeIcons: Record<string, string> = {
  INVOICE: "text-blue-600",
  RECEIPT: "text-green-600",
  BILL: "text-orange-600",
  TAX_RETURN: "text-purple-600",
  BANK_STATEMENT: "text-indigo-600",
  OTHER: "text-gray-600",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentsClient() {
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tags, setTags] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const CHEVRON_SVG = "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat";
  const SELECT_CLS = `flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm appearance-none ${CHEVRON_SVG} pr-10 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors cursor-pointer`;

  const handleDownloadTemplate = () => {
    const sample = [
      {
        "Title": "Q4 2025 Invoice - Vendor A",
        "Type": "INVOICE",
        "Category": "RECEIVABLE",
        "File Name": "q4_2025_invoice_vendor_a.pdf",
        "File Size (bytes)": 204800,
        "Reference": "INV-00123",
        "Tags": "tax, 2025, quarterly"
      },
      {
        "Title": "March 2026 Bank Statement",
        "Type": "BANK_STATEMENT",
        "Category": "OTHER",
        "File Name": "bank_stmt_march_2026.pdf",
        "File Size (bytes)": 102400,
        "Reference": "HDFC-STMT-MAR26",
        "Tags": "bank, march, 2026"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "financial_documents_template.xlsx");
    toast.success("Financial documents template downloaded!");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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

            let successCount = 0;
            for (const row of json) {
              const title = String(row["Title"] || row.title || "").trim();
              const type = String(row["Type"] || row.type || "OTHER").trim().toUpperCase();
              const category = String(row["Category"] || row.category || "").trim().toUpperCase();
              const fileName = String(row["File Name"] || row.fileName || "").trim();
              const fileSize = Number(row["File Size (bytes)"] || row.fileSize || 0);
              const reference = String(row["Reference"] || row.reference || "").trim();
              const tagsRaw = String(row["Tags"] || row.tags || "").trim();
              const tagList = tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined;

              if (!title || !fileName) continue;

              const validTypes = ["INVOICE", "RECEIPT", "BILL", "TAX_RETURN", "BANK_STATEMENT", "OTHER"];
              const validCategories = ["RECEIVABLE", "PAYABLE", "TAX", "PAYROLL", "OTHER"];

              try {
                await createFinancialDocument({
                  title,
                  type: validTypes.includes(type) ? type : "OTHER",
                  category: validCategories.includes(category) ? category : undefined,
                  fileName,
                  fileSize: fileSize || undefined,
                  reference: reference || undefined,
                  tags: tagList,
                });
                successCount++;
              } catch (err) {
                console.error("Failed to create document:", err);
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} documents!`);
              loadDocuments();
            } else {
              toast.error("No valid documents found in Excel sheet.");
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

  function loadDocuments() {
    startTransition(async () => {
      try {
        const res = await getFinancialDocuments({
          search: search || undefined,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
          pageSize: 50,
        });
        setDocuments(res.data);
        setTotal(res.total);
      } catch {
        toast.error("Failed to load documents");
      }
    });
  }

  useEffect(() => { loadDocuments(); }, [search, typeFilter]);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
        await createFinancialDocument({
          title: formData.get("title") as string,
          type: formData.get("type") as string,
          category: (formData.get("category") as string) || undefined,
          fileName: formData.get("fileName") as string,
          fileSize: formData.get("fileSize") ? parseInt(formData.get("fileSize") as string) : undefined,
          reference: (formData.get("reference") as string) || undefined,
          tags: tagList.length > 0 ? tagList : undefined,
        });
        toast.success("Document created successfully");
        setIsOpen(false);
        setTags("");
        loadDocuments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create document");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteFinancialDocument(id);
        toast.success("Document deleted");
        setConfirmDeleteId(null);
        loadDocuments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete document");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Documents</h1>
          <p className="text-sm text-muted-foreground">Store and categorize financial documents ({total} total)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
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

          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setTags(""); }}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />Add Document
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Financial Document</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title *</Label>
                  <Input id="doc-title" name="title" required placeholder="e.g. Q4 2025 Invoice" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-type">Document Type *</Label>
                    <select name="type" id="doc-type" required className={SELECT_CLS}>
                      {docTypes.map((t) => (
                        <option key={t} value={t}>{t.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-category">Category</Label>
                    <select name="category" id="doc-category" className={SELECT_CLS}>
                      <option value="">None</option>
                      {docCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-fileName">File Name *</Label>
                    <Input id="doc-fileName" name="fileName" required placeholder="document.pdf" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-fileSize">File Size (bytes)</Label>
                    <Input id="doc-fileSize" name="fileSize" type="number" min="0" placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-reference">Reference</Label>
                  <Input id="doc-reference" name="reference" placeholder="e.g. INV-00123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-tags">Tags (comma-separated)</Label>
                  <Input
                    id="doc-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. tax, 2025, quarterly"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Document
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {docTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No documents found. Add your first financial document.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className={`h-4 w-4 ${typeIcons[doc.type] ?? "text-gray-600"}`} />
                        {doc.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{doc.type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.category || "—"}</TableCell>
                    <TableCell className="text-sm">{doc.fileName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell className="text-sm">{doc.reference || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(doc.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-right">
                      {confirmDeleteId === doc.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>Confirm</Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
