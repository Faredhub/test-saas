"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
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
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Search, Loader2, Play, CheckCircle, CreditCard, Download, Upload, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  getSalaryStructures, createSalaryStructure, updateSalaryStructure, deleteSalaryStructure,
  getPayslips, generatePayslips, approvePayslip, markPayslipPaid, updatePayslip, deletePayslip,
  getPayrollSessionInfo,
} from "@/lib/actions/finance";

type SalaryStructure = Awaited<ReturnType<typeof getSalaryStructures>>[number];
type Payslip = Awaited<ReturnType<typeof getPayslips>>["data"][number];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  GENERATED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  PAID: "bg-purple-100 text-purple-700",
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: unknown): string {
  const num = typeof amount === "object" && amount !== null && "toNumber" in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

function toNum(val: unknown): number {
  if (typeof val === "object" && val !== null && "toNumber" in val) return (val as { toNumber: () => number }).toNumber();
  return Number(val);
}

export function PayrollClient() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipTotal, setPayslipTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [structureOpen, setStructureOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [isPending, startTransition] = useTransition();
  const [viewPayslip, setViewPayslip] = useState<Payslip | null>(null);
  const [editPayslip, setEditPayslip] = useState<Payslip | null>(null);
  const [deleteConfirmPayslip, setDeleteConfirmPayslip] = useState<Payslip | null>(null);
  const [viewStructure, setViewStructure] = useState<SalaryStructure | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ isHROrManager: boolean; employeeId: string | null } | null>(null);

  useEffect(() => {
    getPayrollSessionInfo().then((info) => {
      if (info) {
        setSessionInfo({ isHROrManager: info.isHROrManager, employeeId: info.employeeId });
      }
    });
  }, []);

  const isManagerOrHR = sessionInfo ? sessionInfo.isHROrManager : true;

  async function handleEditPayslip(formData: FormData) {
    if (!editPayslip) return;
    startTransition(async () => {
      try {
        await updatePayslip(editPayslip.id, {
          basicPay: parseFloat(formData.get("basicPay") as string),
          hra: parseFloat(formData.get("hra") as string),
          da: parseFloat(formData.get("da") as string),
          specialAllowance: parseFloat(formData.get("specialAllowance") as string),
          pfEmployee: parseFloat(formData.get("pfEmployee") as string),
          pfEmployer: parseFloat(formData.get("pfEmployer") as string),
          esiEmployee: parseFloat(formData.get("esiEmployee") as string),
          esiEmployer: parseFloat(formData.get("esiEmployer") as string),
          tds: parseFloat(formData.get("tds") as string),
          professionalTax: parseFloat(formData.get("professionalTax") as string),
        });
        toast.success("Payslip updated successfully");
        setEditPayslip(null);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update payslip");
      }
    });
  }

  async function handleDeletePayslip(id: string) {
    startTransition(async () => {
      try {
        await deletePayslip(id);
        toast.success("Payslip deleted successfully");
        setDeleteConfirmPayslip(null);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete payslip");
      }
    });
  }



  function loadData() {
    startTransition(async () => {
      try {
        const [structs, slips] = await Promise.all([
          getSalaryStructures(),
          getPayslips({
            month: selectedMonth,
            year: selectedYear,
            status: statusFilter !== "ALL" ? (statusFilter as "DRAFT" | "GENERATED" | "APPROVED" | "PAID") : undefined,
            search: search || undefined,
            pageSize: 100,
          }),
        ]);
        setStructures(structs);
        setPayslips(slips.data);
        setPayslipTotal(slips.total);
      } catch {
        toast.error("Failed to load payroll data");
      }
    });
  }

  useEffect(() => { loadData(); }, [search, statusFilter, selectedMonth, selectedYear]);

  async function handleCreateStructure(formData: FormData) {
    startTransition(async () => {
      try {
        const res = await createSalaryStructure({
          name: formData.get("name") as string,
          basic: parseFloat(formData.get("basic") as string),
          hra: parseFloat(formData.get("hra") as string) || 0,
          da: parseFloat(formData.get("da") as string) || 0,
          specialAllowance: parseFloat(formData.get("specialAllowance") as string) || 0,
          pfEmployee: parseFloat(formData.get("pfEmployee") as string) || 12,
          pfEmployer: parseFloat(formData.get("pfEmployer") as string) || 12,
          esiEmployee: parseFloat(formData.get("esiEmployee") as string) || 0.75,
          esiEmployer: parseFloat(formData.get("esiEmployer") as string) || 3.25,
          tds: parseFloat(formData.get("tds") as string) || 0,
          professionalTax: parseFloat(formData.get("professionalTax") as string) || 0,
        });
        if (!res.success) {
          toast.error(res.error || "Failed to create structure");
          return;
        }
        toast.success("Salary structure created");
        setStructureOpen(false);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create structure");
      }
    });
  }

  async function handleUpdateStructure(formData: FormData) {
    if (!editingStructure) return;
    startTransition(async () => {
      try {
        const res = await updateSalaryStructure(editingStructure.id, {
          name: formData.get("name") as string,
          basic: parseFloat(formData.get("basic") as string),
          hra: parseFloat(formData.get("hra") as string) || 0,
          da: parseFloat(formData.get("da") as string) || 0,
          specialAllowance: parseFloat(formData.get("specialAllowance") as string) || 0,
          pfEmployee: parseFloat(formData.get("pfEmployee") as string) || 12,
          pfEmployer: parseFloat(formData.get("pfEmployer") as string) || 12,
          esiEmployee: parseFloat(formData.get("esiEmployee") as string) || 0.75,
          esiEmployer: parseFloat(formData.get("esiEmployer") as string) || 3.25,
          tds: parseFloat(formData.get("tds") as string) || 0,
          professionalTax: parseFloat(formData.get("professionalTax") as string) || 0,
        });
        if (!res.success) {
          toast.error(res.error || "Failed to update structure");
          return;
        }
        toast.success("Salary structure updated");
        setEditOpen(false);
        setEditingStructure(null);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update structure");
      }
    });
  }

  async function handleDeleteStructure(id: string) {
    if (!confirm("Are you sure you want to delete this salary structure?")) return;
    startTransition(async () => {
      try {
        const res = await deleteSalaryStructure(id);
        if (!res.success) {
          toast.error(res.error || "Failed to delete structure");
          return;
        }
        toast.success("Salary structure deleted");
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete structure");
      }
    });
  }

  async function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await generatePayslips(selectedMonth, selectedYear);
        toast.success(`Generated ${result.generated} payslip(s)${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}`);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate payslips");
      }
    });
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approvePayslip(id);
        toast.success("Payslip approved");
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to approve payslip");
      }
    });
  }

  async function handleMarkPaid(id: string) {
    startTransition(async () => {
      try {
        await markPayslipPaid(id);
        toast.success("Payslip marked as paid");
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark payslip as paid");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll Management</h1>
          <p className="text-sm text-muted-foreground">Salary structures, payslip generation, and payment</p>
        </div>
        {isManagerOrHR && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/office/spreadsheets?template=finance-payroll&source=finance-payroll">
              <Button
                variant="outline"
                type="button"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
            </Link>

            <Dialog open={structureOpen} onOpenChange={setStructureOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                <Plus className="h-4 w-4" />Structure
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Salary Structure</DialogTitle></DialogHeader>
                <form action={handleCreateStructure} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="struct-name">Structure Name *</Label>
                    <Input id="struct-name" name="name" required placeholder="e.g. Junior Engineer" />
                  </div>
                  <div className="border rounded-md p-4 space-y-3">
                    <h4 className="font-medium text-sm">Earnings (% of Monthly CTC)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="basic" className="text-xs">Basic (%)</Label>
                        <Input id="basic" name="basic" type="number" step="0.01" defaultValue="50" required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hra" className="text-xs">HRA (%)</Label>
                        <Input id="hra" name="hra" type="number" step="0.01" defaultValue="20" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="da" className="text-xs">DA (%)</Label>
                        <Input id="da" name="da" type="number" step="0.01" defaultValue="5" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="specialAllowance" className="text-xs">Special Allowance (%)</Label>
                        <Input id="specialAllowance" name="specialAllowance" type="number" step="0.01" defaultValue="25" />
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-md p-4 space-y-3">
                    <h4 className="font-medium text-sm">Deductions (Indian Statutory)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="pfEmployee" className="text-xs">PF Employee (%)</Label>
                        <Input id="pfEmployee" name="pfEmployee" type="number" step="0.01" defaultValue="12" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pfEmployer" className="text-xs">PF Employer (%)</Label>
                        <Input id="pfEmployer" name="pfEmployer" type="number" step="0.01" defaultValue="12" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="esiEmployee" className="text-xs">ESI Employee (%)</Label>
                        <Input id="esiEmployee" name="esiEmployee" type="number" step="0.01" defaultValue="0.75" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="esiEmployer" className="text-xs">ESI Employer (%)</Label>
                        <Input id="esiEmployer" name="esiEmployer" type="number" step="0.01" defaultValue="3.25" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tds" className="text-xs">TDS (%)</Label>
                        <Input id="tds" name="tds" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="professionalTax" className="text-xs">Professional Tax (INR/month)</Label>
                        <Input id="professionalTax" name="professionalTax" type="number" step="1" defaultValue="200" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Structure
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={handleGenerate} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Generate Payslips
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="payslips">
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-wrap h-auto justify-start">
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          {isManagerOrHR && <TabsTrigger value="structures">Salary Structures ({structures.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="payslips" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by employee..." className="pl-9 w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(selectedMonth)} onValueChange={(v) => v && setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[120px] sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => v && setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
                <SelectTrigger className="w-[120px] sm:w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="GENERATED">Generated</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payslip summary */}
          {payslips.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Gross</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {formatCurrency(payslips.reduce((s, p) => s + toNum(p.grossEarnings), 0))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(payslips.reduce((s, p) => s + toNum(p.totalDeductions), 0))}
                  </div>
                </CardContent>
              </Card>
              <Card className="sm:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Net Pay</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(payslips.reduce((s, p) => s + toNum(p.netPay), 0))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Structure</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Basic</TableHead>
                      <TableHead className="text-right whitespace-nowrap">HRA</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Gross</TableHead>
                      <TableHead className="text-right whitespace-nowrap">PF</TableHead>
                      <TableHead className="text-right whitespace-nowrap">TDS</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No payslips for {months[selectedMonth - 1]} {selectedYear}. Click &quot;Generate Payslips&quot; to create.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payslips.map((slip) => (
                        <TableRow key={slip.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {slip.employee.firstName} {slip.employee.lastName ?? ""}
                            <div className="text-xs text-muted-foreground">{slip.employee.employeeId}</div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{slip.structure?.name || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.basicPay)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.hra)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.grossEarnings)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.pfEmployee)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.tds)}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{formatCurrency(slip.netPay)}</TableCell>
                          <TableCell>
                            <Badge className={`border-0 whitespace-nowrap ${statusColors[slip.status] ?? ""}`}>{slip.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                onClick={() => setViewPayslip(slip)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                              <a
                                href={`/api/finance/payroll/payslips/${slip.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download PDF</span>
                              </a>
                              {isManagerOrHR && (
                                <>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                                    onClick={() => setEditPayslip(slip)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    onClick={() => setDeleteConfirmPayslip(slip)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                  {(slip.status === "GENERATED" || slip.status === "DRAFT") && (
                                    <Button variant="ghost" size="sm" className="text-green-600 gap-1 whitespace-nowrap" onClick={() => handleApprove(slip.id)} disabled={isPending}>
                                      <CheckCircle className="h-3.5 w-3.5" />Approve
                                    </Button>
                                  )}
                                  {slip.status === "APPROVED" && (
                                    <Button variant="ghost" size="sm" className="text-purple-600 gap-1 whitespace-nowrap" onClick={() => handleMarkPaid(slip.id)} disabled={isPending}>
                                      <CreditCard className="h-3.5 w-3.5" />Pay
                                    </Button>
                                  )}
                                </>
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
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Name</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Basic %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">HRA %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">DA %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Special %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">PF (Emp) %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">ESI (Emp) %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">TDS %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">PT (INR)</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No salary structures. Create one to start generating payslips.
                        </TableCell>
                      </TableRow>
                    ) : (
                      structures.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                          <TableCell className="text-right">{toNum(s.basic)}%</TableCell>
                          <TableCell className="text-right">{toNum(s.hra)}%</TableCell>
                          <TableCell className="text-right">{toNum(s.da)}%</TableCell>
                          <TableCell className="text-right">{toNum(s.specialAllowance)}%</TableCell>
                          <TableCell className="text-right">{toNum(s.pfEmployee)}%</TableCell>
                          <TableCell className="text-right">{toNum(s.esiEmployee)}%</TableCell>
                          <TableCell className="text-right">{toNum(s.tds)}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.professionalTax)}</TableCell>
                           <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                  onClick={() => setViewStructure(s)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                                  onClick={() => {
                                    setEditingStructure(s);
                                    setEditOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                  onClick={() => handleDeleteStructure(s.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) setEditingStructure(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Salary Structure</DialogTitle></DialogHeader>
          {editingStructure && (
            <form action={handleUpdateStructure} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-struct-name">Structure Name *</Label>
                <Input id="edit-struct-name" name="name" required defaultValue={editingStructure.name} />
              </div>
              <div className="border rounded-md p-4 space-y-3">
                <h4 className="font-medium text-sm">Earnings (% of Monthly CTC)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-basic" className="text-xs">Basic (%)</Label>
                    <Input id="edit-basic" name="basic" type="number" step="0.01" defaultValue={toNum(editingStructure.basic)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-hra" className="text-xs">HRA (%)</Label>
                    <Input id="edit-hra" name="hra" type="number" step="0.01" defaultValue={toNum(editingStructure.hra)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-da" className="text-xs">DA (%)</Label>
                    <Input id="edit-da" name="da" type="number" step="0.01" defaultValue={toNum(editingStructure.da)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-specialAllowance" className="text-xs">Special Allowance (%)</Label>
                    <Input id="edit-specialAllowance" name="specialAllowance" type="number" step="0.01" defaultValue={toNum(editingStructure.specialAllowance)} />
                  </div>
                </div>
              </div>
              <div className="border rounded-md p-4 space-y-3">
                <h4 className="font-medium text-sm">Deductions (Indian Statutory)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-pfEmployee" className="text-xs">PF Employee (%)</Label>
                    <Input id="edit-pfEmployee" name="pfEmployee" type="number" step="0.01" defaultValue={toNum(editingStructure.pfEmployee)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-pfEmployer" className="text-xs">PF Employer (%)</Label>
                    <Input id="edit-pfEmployer" name="pfEmployer" type="number" step="0.01" defaultValue={toNum(editingStructure.pfEmployer)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-esiEmployee" className="text-xs">ESI Employee (%)</Label>
                    <Input id="edit-esiEmployee" name="esiEmployee" type="number" step="0.01" defaultValue={toNum(editingStructure.esiEmployee)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-esiEmployer" className="text-xs">ESI Employer (%)</Label>
                    <Input id="edit-esiEmployer" name="esiEmployer" type="number" step="0.01" defaultValue={toNum(editingStructure.esiEmployer)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-tds" className="text-xs">TDS (%)</Label>
                    <Input id="edit-tds" name="tds" type="number" step="0.01" defaultValue={toNum(editingStructure.tds)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-professionalTax" className="text-xs">Professional Tax (INR/month)</Label>
                    <Input id="edit-professionalTax" name="professionalTax" type="number" step="1" defaultValue={toNum(editingStructure.professionalTax)} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditOpen(false);
                  setEditingStructure(null);
                }}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Salary Structure Dialog */}
      <Dialog open={!!viewStructure} onOpenChange={(open) => { if (!open) setViewStructure(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Salary Structure Details</DialogTitle></DialogHeader>
          {viewStructure && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block">Structure Name</span>
                <span className="font-semibold text-lg">{viewStructure.name}</span>
              </div>
              <div className="border rounded-md p-4 space-y-2 bg-muted/10">
                <h4 className="font-medium text-sm border-b pb-1 mb-2">Earnings (% of CTC)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Basic: <span className="font-semibold">{toNum(viewStructure.basic)}%</span></div>
                  <div>HRA: <span className="font-semibold">{toNum(viewStructure.hra)}%</span></div>
                  <div>DA: <span className="font-semibold">{toNum(viewStructure.da)}%</span></div>
                  <div>Special Allowance: <span className="font-semibold">{toNum(viewStructure.specialAllowance)}%</span></div>
                </div>
              </div>
              <div className="border rounded-md p-4 space-y-2 bg-muted/10">
                <h4 className="font-medium text-sm border-b pb-1 mb-2">Deductions</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>PF Employee: <span className="font-semibold">{toNum(viewStructure.pfEmployee)}%</span></div>
                  <div>PF Employer: <span className="font-semibold">{toNum(viewStructure.pfEmployer)}%</span></div>
                  <div>ESI Employee: <span className="font-semibold">{toNum(viewStructure.esiEmployee)}%</span></div>
                  <div>ESI Employer: <span className="font-semibold">{toNum(viewStructure.esiEmployer)}%</span></div>
                  <div>TDS: <span className="font-semibold">{toNum(viewStructure.tds)}%</span></div>
                  <div>PT: <span className="font-semibold">{formatCurrency(viewStructure.professionalTax)}</span></div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewStructure(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Payslip Dialog */}
      <Dialog open={!!viewPayslip} onOpenChange={(open) => { if (!open) setViewPayslip(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Payslip Details</DialogTitle></DialogHeader>
          {viewPayslip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Employee</span>
                  <span className="font-medium">{viewPayslip.employee.firstName} {viewPayslip.employee.lastName ?? ""}</span>
                  <span className="text-xs text-muted-foreground block">ID: {viewPayslip.employee.employeeId}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Month / Year</span>
                  <span className="font-medium">{months[viewPayslip.month - 1]} {viewPayslip.year}</span>
                  <span className="text-xs text-muted-foreground block">Status: {viewPayslip.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm border-b pb-1 text-green-700">Earnings</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <div className="flex justify-between"><span>Basic:</span><span>{formatCurrency(viewPayslip.basicPay)}</span></div>
                    <div className="flex justify-between"><span>HRA:</span><span>{formatCurrency(viewPayslip.hra)}</span></div>
                    <div className="flex justify-between"><span>DA:</span><span>{formatCurrency(viewPayslip.da)}</span></div>
                    <div className="flex justify-between"><span>Special:</span><span>{formatCurrency(viewPayslip.specialAllowance)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1 text-foreground"><span>Gross:</span><span>{formatCurrency(viewPayslip.grossEarnings)}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm border-b pb-1 text-red-700">Deductions</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <div className="flex justify-between"><span>PF (Emp):</span><span>{formatCurrency(viewPayslip.pfEmployee)}</span></div>
                    <div className="flex justify-between"><span>ESI (Emp):</span><span>{formatCurrency(viewPayslip.esiEmployee)}</span></div>
                    <div className="flex justify-between"><span>TDS:</span><span>{formatCurrency(viewPayslip.tds)}</span></div>
                    <div className="flex justify-between"><span>PT:</span><span>{formatCurrency(viewPayslip.professionalTax)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1 text-foreground"><span>Total:</span><span>{formatCurrency(viewPayslip.totalDeductions)}</span></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <div className="text-sm font-semibold">Net Salary Payable:</div>
                <div className="text-xl font-bold text-green-700 font-mono">{formatCurrency(viewPayslip.netPay)}</div>
              </div>
              <div className="flex justify-end gap-2">
                <a
                  href={`/api/finance/payroll/payslips/${viewPayslip.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
                <Button variant="outline" onClick={() => setViewPayslip(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payslip Dialog */}
      <Dialog open={!!editPayslip} onOpenChange={(open) => { if (!open) setEditPayslip(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Payslip Values</DialogTitle></DialogHeader>
          {editPayslip && (
            <form action={handleEditPayslip} className="space-y-4 pt-1">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><strong>Employee:</strong> {editPayslip.employee.firstName} {editPayslip.employee.lastName ?? ""}</p>
                <p><strong>Period:</strong> {months[editPayslip.month - 1]} {editPayslip.year}</p>
              </div>
              <div className="border rounded-md p-4 space-y-3">
                <h4 className="font-semibold text-sm border-b pb-1 text-green-700">Earnings (INR)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-basic" className="text-xs">Basic Pay</Label>
                    <Input id="edit-payslip-basic" name="basicPay" type="number" step="0.01" defaultValue={toNum(editPayslip.basicPay)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-hra" className="text-xs">HRA</Label>
                    <Input id="edit-payslip-hra" name="hra" type="number" step="0.01" defaultValue={toNum(editPayslip.hra)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-da" className="text-xs">DA</Label>
                    <Input id="edit-payslip-da" name="da" type="number" step="0.01" defaultValue={toNum(editPayslip.da)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-special" className="text-xs">Special Allowance</Label>
                    <Input id="edit-payslip-special" name="specialAllowance" type="number" step="0.01" defaultValue={toNum(editPayslip.specialAllowance)} />
                  </div>
                </div>
              </div>
              <div className="border rounded-md p-4 space-y-3">
                <h4 className="font-semibold text-sm border-b pb-1 text-red-700">Deductions (INR)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-pfEmp" className="text-xs">PF Employee</Label>
                    <Input id="edit-payslip-pfEmp" name="pfEmployee" type="number" step="0.01" defaultValue={toNum(editPayslip.pfEmployee)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-pfEsr" className="text-xs">PF Employer</Label>
                    <Input id="edit-payslip-pfEsr" name="pfEmployer" type="number" step="0.01" defaultValue={toNum(editPayslip.pfEmployer)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-esiEmp" className="text-xs">ESI Employee</Label>
                    <Input id="edit-payslip-esiEmp" name="esiEmployee" type="number" step="0.01" defaultValue={toNum(editPayslip.esiEmployee)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-esiEsr" className="text-xs">ESI Employer</Label>
                    <Input id="edit-payslip-esiEsr" name="esiEmployer" type="number" step="0.01" defaultValue={toNum(editPayslip.esiEmployer)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-tds" className="text-xs">TDS</Label>
                    <Input id="edit-payslip-tds" name="tds" type="number" step="0.01" defaultValue={toNum(editPayslip.tds)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-payslip-pt" className="text-xs">Professional Tax</Label>
                    <Input id="edit-payslip-pt" name="professionalTax" type="number" step="1" defaultValue={toNum(editPayslip.professionalTax)} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditPayslip(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Payslip Confirmation */}
      <Dialog open={!!deleteConfirmPayslip} onOpenChange={(open) => { if (!open) setDeleteConfirmPayslip(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Payslip</DialogTitle></DialogHeader>
          {deleteConfirmPayslip && (
            <div className="space-y-4">
              <p>Are you sure you want to delete the payslip of <strong>{deleteConfirmPayslip.employee.firstName} {deleteConfirmPayslip.employee.lastName ?? ""}</strong> for {months[deleteConfirmPayslip.month - 1]} {deleteConfirmPayslip.year}? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmPayslip(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDeletePayslip(deleteConfirmPayslip.id)} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
