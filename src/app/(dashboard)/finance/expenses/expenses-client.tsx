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
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Search, Loader2, CheckCircle, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  getExpenses, createExpense, approveExpense, rejectExpense,
  getExpenseCategories, createExpenseCategory,
} from "@/lib/actions/finance";

type Expense = Awaited<ReturnType<typeof getExpenses>>["data"][number];
type Category = Awaited<ReturnType<typeof getExpenseCategories>>[number];

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  REIMBURSED: "bg-purple-100 text-purple-700",
};

function formatCurrency(amount: unknown): string {
  const num = typeof amount === "object" && amount !== null && "toNumber" in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
}

export function ExpensesClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();



  function loadData() {
    startTransition(async () => {
      try {
        const [res, cats] = await Promise.all([
          getExpenses({
            search: search || undefined,
            status: statusFilter !== "ALL" ? (statusFilter as "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "REIMBURSED") : undefined,
            pageSize: 50,
          }),
          getExpenseCategories(),
        ]);
        setExpenses(res.data);
        setTotal(res.total);
        setCategories(cats);
      } catch {
        toast.error("Failed to load expenses");
      }
    });
  }

  useEffect(() => { loadData(); }, [search, statusFilter]);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createExpense({
          categoryId: (formData.get("categoryId") as string) || undefined,
          description: formData.get("description") as string,
          amount: parseFloat(formData.get("amount") as string),
          date: formData.get("date") as string,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Expense submitted successfully");
        setIsOpen(false);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create expense");
      }
    });
  }

  async function handleCreateCategory(formData: FormData) {
    startTransition(async () => {
      try {
        await createExpenseCategory({
          name: formData.get("name") as string,
          code: (formData.get("code") as string) || undefined,
          monthlyLimit: formData.get("monthlyLimit") ? parseFloat(formData.get("monthlyLimit") as string) : undefined,
        });
        toast.success("Category created");
        setCatOpen(false);
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create category");
      }
    });
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approveExpense(id);
        toast.success("Expense approved");
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to approve expense");
      }
    });
  }

  async function handleReject() {
    if (!rejectId) return;
    startTransition(async () => {
      try {
        await rejectExpense(rejectId, rejectReason || undefined);
        toast.success("Expense rejected");
        setRejectId(null);
        setRejectReason("");
        loadData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reject expense");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Management</h1>
          <p className="text-sm text-muted-foreground">Submit and manage expenses ({total} total)</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/office/spreadsheets?template=finance-expenses&source=finance-expenses">
            <Button
              variant="outline"
              type="button"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              import
            </Button>
          </Link>

          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Plus className="h-4 w-4" />Category
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader><DialogTitle>Create Expense Category</DialogTitle></DialogHeader>
              <form action={handleCreateCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Category Name *</Label>
                  <Input id="cat-name" name="name" required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cat-code">Code</Label>
                    <Input id="cat-code" name="code" placeholder="e.g. TRAVEL" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-limit">Monthly Limit (INR)</Label>
                    <Input id="cat-limit" name="monthlyLimit" type="number" min="0" step="0.01" />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <DialogClose className="order-2 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted sm:order-1">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending} className="order-1 sm:order-2">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />Submit Expense
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader><DialogTitle>Submit New Expense</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-category">Category</Label>
                  <select
                    name="categoryId"
                    id="exp-category"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors cursor-pointer"
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-desc">Description *</Label>
                  <Input id="exp-desc" name="description" required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="exp-amount">Amount (INR) *</Label>
                    <Input id="exp-amount" name="amount" type="number" min="0.01" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exp-date">Date *</Label>
                    <Input id="exp-date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-notes">Notes</Label>
                  <Textarea id="exp-notes" name="notes" rows={2} />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <DialogClose className="order-2 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted sm:order-1">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending} className="order-1 sm:order-2">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Expense
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search expenses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="REIMBURSED">Reimbursed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <div className="min-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Expense No</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Category</TableHead>
                  <TableHead className="whitespace-nowrap">Description</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No expenses found. Submit your first expense.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-mono font-medium text-xs sm:text-sm">{expense.expenseNo}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{new Date(expense.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{expense.category?.name || "—"}</TableCell>
                      <TableCell className="max-w-[100px] sm:max-w-[200px] truncate text-xs sm:text-sm">{expense.description}</TableCell>
                      <TableCell className="text-right font-mono text-xs sm:text-sm">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={`border-0 text-xs ${statusColors[expense.status] ?? ""}`}>{expense.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-1 items-end sm:flex-row sm:items-center sm:justify-end">
                          {(expense.status === "SUBMITTED" || expense.status === "PENDING") && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600 gap-1 text-xs sm:text-sm" onClick={() => handleApprove(expense.id)} disabled={isPending}>
                                <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
                                <span className="hidden sm:inline">Approve</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 gap-1 text-xs sm:text-sm" onClick={() => setRejectId(expense.id)} disabled={isPending}>
                                <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
                                <span className="hidden sm:inline">Reject</span>
                              </Button>
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

      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Expense Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge key={cat.id} variant="outline" className="text-xs sm:text-sm py-1 px-2 sm:px-3">
                  <span className="truncate">{cat.name}</span>
                  {cat.code && <span className="ml-1 text-muted-foreground hidden sm:inline">({cat.code})</span>}
                  {cat.monthlyLimit && (
                    <span className="ml-1 text-muted-foreground hidden md:inline">Limit: {formatCurrency(cat.monthlyLimit)}</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Rejection</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason for rejection..." />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }} className="order-2 sm:order-1">Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isPending} className="order-1 sm:order-2">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
