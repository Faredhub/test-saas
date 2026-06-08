"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus, Loader2, Trash2, FileText, CreditCard, Download, Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getCreditNotes, createCreditNote, updateCreditNote, deleteCreditNote,
} from "@/lib/actions/finance";
import { toast } from "sonner";

type CreditNotesData = Awaited<ReturnType<typeof getCreditNotes>>;

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  APPLIED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const typeColors: Record<string, string> = {
  CREDIT: "bg-emerald-100 text-emerald-700",
  DEBIT: "bg-orange-100 text-orange-700",
};

type LineItem = { description: string; quantity: number; rate: number; amount: number };

export function CreditNotesClient() {
  const [notes, setNotes] = useState<CreditNotesData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const sample = [
      {
        "Type": "CREDIT",
        "Reason": "Returned goods - damaged item",
        "Invoice ID": "",
        "Item Description": "Product A",
        "Quantity": 2,
        "Rate": 500,
        "Amount": 1000,
        "Tax Amount": 180,
        "Notes": "Approved by accounts team"
      },
      {
        "Type": "DEBIT",
        "Reason": "Additional service charges",
        "Invoice ID": "",
        "Item Description": "Consultation Fee",
        "Quantity": 1,
        "Rate": 2500,
        "Amount": 2500,
        "Tax Amount": 450,
        "Notes": "Extra hours billed"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "credit_notes_template.xlsx");
    toast.success("Credit notes template downloaded!");
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
              const type = String(row["Type"] || row.type || "CREDIT").trim().toUpperCase();
              const reason = String(row["Reason"] || row.reason || "").trim();
              const invoiceId = String(row["Invoice ID"] || row.invoiceId || "").trim();
              const description = String(row["Item Description"] || row.description || "").trim();
              const quantity = Number(row["Quantity"] || row.quantity || 1);
              const rate = Number(row["Rate"] || row.rate || 0);
              const amount = Number(row["Amount"] || row.amount || quantity * rate);
              const taxAmount = Number(row["Tax Amount"] || row.taxAmount || 0);
              const notes = String(row["Notes"] || row.notes || "").trim();

              if (!reason || amount <= 0) continue;

              try {
                await createCreditNote({
                  type: type === "DEBIT" ? "DEBIT" : "CREDIT",
                  reason,
                  invoiceId: invoiceId || undefined,
                  taxAmount,
                  notes: notes || undefined,
                  items: [{ description: description || reason, quantity, rate, amount }],
                });
                successCount++;
              } catch (err) {
                console.error("Failed to create credit note:", err);
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} credit/debit notes!`);
              loadData();
            } else {
              toast.error("No valid credit notes found in Excel sheet.");
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


  function loadData() {
    startTransition(async () => {
      try {
        const data = await getCreditNotes({
          type: typeFilter !== "ALL" ? typeFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          pageSize: 100,
        });
        setNotes(data);
      } catch {
        toast.error("Failed to load credit notes");
      }
    });
  }

  useEffect(() => { loadData(); }, [typeFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        item.amount = Number(item.quantity) * Number(item.rate);
      }
      updated[index] = item;
      return updated;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(formData: FormData) {
    const validItems = lineItems.filter((li) => li.description && li.amount > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    startTransition(async () => {
      try {
        await createCreditNote({
          type: formData.get("type") as string,
          reason: formData.get("reason") as string,
          invoiceId: formData.get("invoiceId") as string || undefined,
          taxAmount: Number(formData.get("taxAmount")) || 0,
          notes: formData.get("notes") as string || undefined,
          items: validItems,
        });
        toast.success("Credit note created");
        setCreateOpen(false);
        setLineItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleUpdateStatus(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateCreditNote(id, { status });
        toast.success(`Status updated to ${status}`);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCreditNote(id);
        toast.success("Credit note deleted");
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);

  return (
    <div className="space-y-6 p-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold">Credit & Debit Notes</h1>
      <p className="text-sm text-muted-foreground">Manage credit and debit notes against invoices</p>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors duration-200">
          <Plus className="h-4 w-4" />New Note
        </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Credit/Debit Note</DialogTitle></DialogHeader>
        <form action={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select name="type" defaultValue="CREDIT">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">Credit Note</SelectItem>
                  <SelectItem value="DEBIT">Debit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice ID (optional)</Label>
              <Input name="invoiceId" placeholder="Link to invoice" />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Input name="reason" placeholder="Reason for note" required />
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <span className="text-xs text-muted-foreground">Description</span>}
                  <Input
                    value={li.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <span className="text-xs text-muted-foreground">Qty</span>}
                  <Input
                    type="number"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <span className="text-xs text-muted-foreground">Rate</span>}
                  <Input
                    type="number"
                    value={li.rate}
                    onChange={(e) => updateLineItem(i, "rate", Number(e.target.value))}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <span className="text-xs text-muted-foreground">Amount</span>}
                  <Input value={li.amount.toFixed(2)} readOnly className="bg-gray-50" />
                </div>
                <div className="col-span-1">
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(i)}>
                      <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600 transition-colors duration-150" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="hover:shadow-sm transition-all duration-200">
              <Plus className="mr-1 h-3 w-3" />Add Line
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax Amount</Label>
              <Input name="taxAmount" type="number" min={0} step={0.01} defaultValue={0} />
            </div>
            <div className="flex items-end">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-right w-full hover:shadow-sm transition-all duration-200">
                <span className="text-sm text-muted-foreground">Subtotal: </span>
                <span className="text-lg font-bold">{subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" className="hover:shadow-sm transition-all duration-200" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isPending} className="hover:shadow-md transition-all duration-200">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </div>
  </div>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{notes?.total ?? 0}</div></CardContent>
    </Card>
    <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Credit Notes</CardTitle>
        <CreditCard className="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {notes?.data.filter((n) => n.type === "CREDIT").length ?? 0}
        </div>
      </CardContent>
    </Card>
    <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Debit Notes</CardTitle>
        <CreditCard className="h-4 w-4 text-orange-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {notes?.data.filter((n) => n.type === "DEBIT").length ?? 0}
        </div>
      </CardContent>
    </Card>
  </div>

  <div className="flex gap-3">
    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
      <SelectTrigger className="w-40 hover:shadow-sm transition-all duration-200"><SelectValue placeholder="Type" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All Types</SelectItem>
        <SelectItem value="CREDIT">Credit</SelectItem>
        <SelectItem value="DEBIT">Debit</SelectItem>
      </SelectContent>
    </Select>
    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
      <SelectTrigger className="w-40 hover:shadow-sm transition-all duration-200"><SelectValue placeholder="Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All Status</SelectItem>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="ISSUED">Issued</SelectItem>
        <SelectItem value="APPLIED">Applied</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <Card className="hover:shadow-md transition-all duration-200">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-muted/50 transition-colors duration-150">
          <TableHead>Note No</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes?.data.map((n) => (
          <TableRow key={n.id} className="hover:bg-muted/30 transition-colors duration-150">
            <TableCell className="font-medium">{n.noteNo}</TableCell>
            <TableCell><Badge className={typeColors[n.type] ?? ""}>{n.type}</Badge></TableCell>
            <TableCell className="max-w-[200px] truncate">{n.reason}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {(n as any).invoice?.invoiceNo ?? "--"}
            </TableCell>
            <TableCell className="text-right font-medium">
              {Number(n.total).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
            </TableCell>
            <TableCell><Badge className={statusColors[n.status] ?? ""}>{n.status}</Badge></TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(n.issueDate).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {n.status === "DRAFT" && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(n.id, "ISSUED")} className="hover:bg-primary/10 transition-colors duration-150">
                      Issue
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-150" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {n.status === "ISSUED" && (
                  <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(n.id, "APPLIED")} className="hover:bg-primary/10 transition-colors duration-150">
                    Apply
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {(!notes || notes.data.length === 0) && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              No credit/debit notes found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </Card>
</div>
  );
}
