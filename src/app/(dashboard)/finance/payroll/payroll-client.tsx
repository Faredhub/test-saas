"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Plus, Search, Loader2, Play, CheckCircle, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import {
  getSalaryStructures, createSalaryStructure,
  getPayslips, generatePayslips, approvePayslip, markPayslipPaid,
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
  const [isPending, startTransition] = useTransition();

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
        await createSalaryStructure({
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
        toast.success("Salary structure created");
        setStructureOpen(false);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create structure");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll Management</h1>
          <p className="text-sm text-muted-foreground">Salary structures, payslip generation, and payment</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={structureOpen} onOpenChange={setStructureOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Plus className="h-4 w-4" />Structure
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Salary Structure</DialogTitle></DialogHeader>
              <form action={handleCreateStructure} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="struct-name">Structure Name *</Label>
                  <Input id="struct-name" name="name" required placeholder="e.g. Junior Engineer" />
                </div>
                <div className="border rounded-md p-4 space-y-3">
                  <h4 className="font-medium text-sm">Earnings (% of Monthly CTC)</h4>
                  <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-3">
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

          <a href={`/api/finance/bank-transfer?month=${selectedMonth}&year=${selectedYear}`} download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Bank Transfer File
            </Button>
          </a>
        </div>
      </div>

      <Tabs defaultValue="payslips">
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="structures">Salary Structures ({structures.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by employee..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={String(selectedMonth)} onValueChange={(v) => v && setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="GENERATED">Generated</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payslip summary */}
          {payslips.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
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
              <Card>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Structure</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">HRA</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
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
                        <TableCell className="font-medium">
                          {slip.employee.firstName} {slip.employee.lastName ?? ""}
                          <div className="text-xs text-muted-foreground">{slip.employee.employeeId}</div>
                        </TableCell>
                        <TableCell className="text-sm">{slip.structure?.name || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.basicPay)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.hra)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.grossEarnings)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.pfEmployee)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(slip.tds)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatCurrency(slip.netPay)}</TableCell>
                        <TableCell>
                          <Badge className={`border-0 ${statusColors[slip.status] ?? ""}`}>{slip.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(slip.status === "GENERATED" || slip.status === "DRAFT") && (
                              <Button variant="ghost" size="sm" className="text-green-600 gap-1" onClick={() => handleApprove(slip.id)} disabled={isPending}>
                                <CheckCircle className="h-3.5 w-3.5" />Approve
                              </Button>
                            )}
                            {slip.status === "APPROVED" && (
                              <Button variant="ghost" size="sm" className="text-purple-600 gap-1" onClick={() => handleMarkPaid(slip.id)} disabled={isPending}>
                                <CreditCard className="h-3.5 w-3.5" />Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Basic %</TableHead>
                    <TableHead className="text-right">HRA %</TableHead>
                    <TableHead className="text-right">DA %</TableHead>
                    <TableHead className="text-right">Special %</TableHead>
                    <TableHead className="text-right">PF (Emp) %</TableHead>
                    <TableHead className="text-right">ESI (Emp) %</TableHead>
                    <TableHead className="text-right">TDS %</TableHead>
                    <TableHead className="text-right">PT (INR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No salary structures. Create one to start generating payslips.
                      </TableCell>
                    </TableRow>
                  ) : (
                    structures.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{toNum(s.basic)}%</TableCell>
                        <TableCell className="text-right">{toNum(s.hra)}%</TableCell>
                        <TableCell className="text-right">{toNum(s.da)}%</TableCell>
                        <TableCell className="text-right">{toNum(s.specialAllowance)}%</TableCell>
                        <TableCell className="text-right">{toNum(s.pfEmployee)}%</TableCell>
                        <TableCell className="text-right">{toNum(s.esiEmployee)}%</TableCell>
                        <TableCell className="text-right">{toNum(s.tds)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.professionalTax)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
