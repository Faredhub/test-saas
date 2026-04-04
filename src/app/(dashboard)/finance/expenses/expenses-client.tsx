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
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Management</h1>
          <p className="text-sm text-muted-foreground">Submit and manage expenses ({total} total)</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Plus className="h-4 w-4" />Category
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Expense Category</DialogTitle></DialogHeader>
              <form action={handleCreateCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Category Name *</Label>
                  <Input id="cat-name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-code">Code</Label>
                    <Input id="cat-code" name="code" placeholder="e.g. TRAVEL" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-limit">Monthly Limit (INR)</Label>
                    <Input id="cat-limit" name="monthlyLimit" type="number" min="0" step="0.01" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
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
            <DialogContent>
              <DialogHeader><DialogTitle>Submit New Expense</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-category">Category</Label>
                  <select name="categoryId" id="exp-category" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
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
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search expenses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
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
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="font-mono font-medium">{expense.expenseNo}</TableCell>
                    <TableCell>{new Date(expense.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{expense.category?.name || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${statusColors[expense.status] ?? ""}`}>{expense.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(expense.status === "SUBMITTED" || expense.status === "PENDING") && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600 gap-1" onClick={() => handleApprove(expense.id)} disabled={isPending}>
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 gap-1" onClick={() => setRejectId(expense.id)} disabled={isPending}>
                              <XCircle className="h-3.5 w-3.5" /> Reject
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
        </CardContent>
      </Card>

      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Expense Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge key={cat.id} variant="outline" className="text-sm py-1 px-3">
                  {cat.name}
                  {cat.code && <span className="ml-1 text-muted-foreground">({cat.code})</span>}
                  {cat.monthlyLimit && (
                    <span className="ml-1 text-muted-foreground">Limit: {formatCurrency(cat.monthlyLimit)}</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Rejection</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason for rejection..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isPending}>
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
