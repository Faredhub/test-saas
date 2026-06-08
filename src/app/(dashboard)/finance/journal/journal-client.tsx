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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, Trash2, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  getJournalEntries, createJournalEntry, postJournalEntry, voidJournalEntry,
  getAccounts,
} from "@/lib/actions/finance";

type JournalEntry = Awaited<ReturnType<typeof getJournalEntries>>["data"][number];
type AccountOption = { id: string; code: string; name: string };

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  POSTED: "bg-green-100 text-green-700",
  VOIDED: "bg-red-100 text-red-700",
};

function formatCurrency(amount: unknown): string {
  const num = typeof amount === "object" && amount !== null && "toNumber" in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
}

type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
};

export function JournalClient() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadJournalTemplate = () => {
    const simpleSample = [
      {
        "Date": "2026-06-01",
        "Reference": "JE-001",
        "Description": "Office Rental Payment",
        "Debit Account": "Rent Expense",
        "Credit Account": "Cash",
        "Amount": 25000
      }
    ];

    const standardSample = [
      {
        "Date": "2026-06-01",
        "Reference": "JE-002",
        "Description": "Salary Payout Batch",
        "Account": "Salary Expense",
        "Debit": 50000,
        "Credit": 0,
        "Line Description": "Salary for IT Dept"
      },
      {
        "Date": "2026-06-01",
        "Reference": "JE-002",
        "Description": "Salary Payout Batch",
        "Account": "Cash",
        "Debit": 0,
        "Credit": 50000,
        "Line Description": "Salary cash withdrawal"
      }
    ];

    const workbook = XLSX.utils.book_new();
    
    const sheet1 = XLSX.utils.json_to_sheet(simpleSample);
    XLSX.utils.book_append_sheet(workbook, sheet1, "Simple Format");
    
    const sheet2 = XLSX.utils.json_to_sheet(standardSample);
    XLSX.utils.book_append_sheet(workbook, sheet2, "Standard Format");
    
    XLSX.writeFile(workbook, "journal_entries_template.xlsx");
    toast.success("Journal template downloaded!");
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

            const groupedEntries: Record<string, { date: string; reference: string; description: string; lines: any[] }> = {};
            
            let lastDate = new Date().toISOString().slice(0, 10);
            let lastRef = "";
            let lastDesc = "";
            let groupCounter = 0;

            json.forEach((row) => {
              const dateVal = String(row.date || row["Date"] || "").trim();
              const refVal = String(row.reference || row["Reference"] || row["Ref"] || "").trim();
              const descVal = String(row.description || row["Description"] || "").trim();

              const rowDate = dateVal || lastDate;
              const rowRef = refVal || lastRef;
              const rowDesc = descVal || lastDesc;

              if (dateVal) lastDate = dateVal;
              if (refVal) lastRef = refVal;
              if (descVal) lastDesc = descVal;

              // 1. Simple format (Debit Account, Credit Account, Amount)
              const simpleDebit = String(row.debitAccount || row["Debit Account"] || row["Debit Account Code"] || "").trim();
              const simpleCredit = String(row.creditAccount || row["Credit Account"] || row["Credit Account Code"] || "").trim();
              const simpleAmount = Number(row.amount || row["Amount"] || 0);

              if (simpleDebit && simpleCredit && simpleAmount > 0) {
                const debAcc = accountOptions.find(a => a.code.toLowerCase() === simpleDebit.toLowerCase() || a.name.toLowerCase() === simpleDebit.toLowerCase());
                const credAcc = accountOptions.find(a => a.code.toLowerCase() === simpleCredit.toLowerCase() || a.name.toLowerCase() === simpleCredit.toLowerCase());
                
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
              const accCode = String(row.account || row["Account"] || row["Account Code"] || "").trim();
              const lineDesc = String(row.lineDescription || row["Line Description"] || row["Comment"] || "").trim();
              const debitVal = Number(row.debit || row["Debit"] || 0);
              const creditVal = Number(row.credit || row["Credit"] || 0);

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
            const keys = Object.keys(groupedEntries);
            for (const key of keys) {
              const entry = groupedEntries[key];
              if (entry.lines.length < 2) continue;
              const totDeb = entry.lines.reduce((s, l) => s + l.debit, 0);
              const totCred = entry.lines.reduce((s, l) => s + l.credit, 0);
              if (Math.abs(totDeb - totCred) > 0.01) continue;

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
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} journal entries!`);
              loadEntries();
            } else {
              toast.error("No valid, balanced journal entries found in sheet.");
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

  // Form state for new entry
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryDesc, setEntryDesc] = useState("");
  const [entryRef, setEntryRef] = useState("");
  const [lines, setLines] = useState<JournalLineInput[]>([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" },
  ]);

  function loadEntries() {
    startTransition(async () => {
      try {
        const [res, accts] = await Promise.all([
          getJournalEntries({
            search: search || undefined,
            status: statusFilter !== "ALL" ? (statusFilter as "DRAFT" | "POSTED" | "VOIDED") : undefined,
            pageSize: 50,
          }),
          getAccounts({ pageSize: 100 }),
        ]);
        setEntries(res.data);
        setTotal(res.total);
        setAccountOptions(accts.data.map((a) => ({ id: a.id, code: a.code, name: a.name })));
      } catch {
        toast.error("Failed to load journal entries");
      }
    });
  }

  useEffect(() => { loadEntries(); }, [search, statusFilter]);

  function addLine() {
    setLines([...lines, { accountId: "", debit: 0, credit: 0, description: "" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof JournalLineInput, value: string | number) {
    setLines(lines.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function handleCreate() {
    if (!isBalanced) {
      toast.error("Debits must equal Credits");
      return;
    }
    startTransition(async () => {
      try {
        await createJournalEntry({
          date: entryDate,
          description: entryDesc || undefined,
          reference: entryRef || undefined,
          lines: lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0)).map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || undefined,
          })),
        });
        toast.success("Journal entry created");
        setIsOpen(false);
        resetForm();
        loadEntries();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create entry");
      }
    });
  }

  function resetForm() {
    setEntryDate(new Date().toISOString().slice(0, 10));
    setEntryDesc("");
    setEntryRef("");
    setLines([
      { accountId: "", debit: 0, credit: 0, description: "" },
      { accountId: "", debit: 0, credit: 0, description: "" },
    ]);
  }

  async function handlePost(id: string) {
    startTransition(async () => {
      try {
        await postJournalEntry(id);
        toast.success("Journal entry posted");
        loadEntries();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to post entry");
      }
    });
  }

  async function handleVoid(id: string) {
    startTransition(async () => {
      try {
        await voidJournalEntry(id);
        toast.success("Journal entry voided");
        loadEntries();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to void entry");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal Entries</h1>
          <p className="text-sm text-muted-foreground">Double-entry bookkeeping ({total} entries)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleDownloadJournalTemplate}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary font-medium"
          >
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary font-medium"
          >
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Plus className="h-4 w-4" /> New Entry
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Journal Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input placeholder="Invoice #, Receipt #" value={entryRef} onChange={(e) => setEntryRef(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Entry description" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lines</Label>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="mr-1 h-3 w-3" />Add Line</Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[130px] text-right">Debit</TableHead>
                        <TableHead className="w-[130px] text-right">Credit</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1">
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat pr-8 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors cursor-pointer"
                              value={line.accountId}
                              onChange={(e) => updateLine(i, "accountId", e.target.value)}
                            >
                              <option value="">Select account</option>
                              {accountOptions.map((a) => (
                                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="py-1">
                            <Input
                              className="h-8" placeholder="Description"
                              value={line.description}
                              onChange={(e) => updateLine(i, "description", e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input
                              className="h-8 text-right" type="number" min="0" step="0.01"
                              value={line.debit || ""}
                              onChange={(e) => updateLine(i, "debit", parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input
                              className="h-8 text-right" type="number" min="0" step="0.01"
                              value={line.credit || ""}
                              onChange={(e) => updateLine(i, "credit", parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => removeLine(i)} disabled={lines.length <= 2}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={2} className="text-right">Totals</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {!isBalanced && totalDebit + totalCredit > 0 && (
                  <p className="text-sm text-red-500">
                    Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))} — Debits must equal Credits
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button onClick={handleCreate} disabled={isPending || !isBalanced}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Entry
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No journal entries found.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const entryTotal = entry.lines.reduce(
                    (s, l) => s + (typeof l.debit === "object" && l.debit !== null && "toNumber" in l.debit ? (l.debit as unknown as { toNumber: () => number }).toNumber() : Number(l.debit)),
                    0
                  );
                  return (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <TableCell className="font-mono font-medium">{entry.entryNo}</TableCell>
                      <TableCell>{new Date(entry.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>{entry.description || "—"}</TableCell>
                      <TableCell>{entry.reference || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(entryTotal)}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${statusColors[entry.status] ?? ""}`}>{entry.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {entry.status === "DRAFT" && (
                            <Button variant="outline" size="sm" onClick={() => handlePost(entry.id)} disabled={isPending}>
                              Post
                            </Button>
                          )}
                          {entry.status === "POSTED" && (
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleVoid(entry.id)} disabled={isPending}>
                              Void
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Expanded Lines */}
          {expandedId && (() => {
            const entry = entries.find((e) => e.id === expandedId);
            if (!entry) return null;
            return (
              <div className="mt-4 border rounded-md p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Entry Lines — {entry.entryNo}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.account.code} - {line.account.name}</TableCell>
                        <TableCell>{line.description || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(line.debit)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(line.credit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
