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
import { Plus, Search, Loader2, ChevronRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAccounts, createAccount, updateAccount, deleteAccount,
} from "@/lib/actions/finance";

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

type Account = Awaited<ReturnType<typeof getAccounts>>["data"][number];

const typeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-red-100 text-red-700",
  EQUITY: "bg-purple-100 text-purple-700",
  REVENUE: "bg-green-100 text-green-700",
  EXPENSE: "bg-orange-100 text-orange-700",
};

function formatCurrency(amount: unknown): string {
  const num = typeof amount === "object" && amount !== null && "toNumber" in amount
    ? (amount as { toNumber: () => number }).toNumber()
    : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(num);
}

export function AccountsClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadAccounts() {
    startTransition(async () => {
      try {
        const res = await getAccounts({
          search: search || undefined,
          type: typeFilter !== "ALL" ? (typeFilter as AccountType) : undefined,
          pageSize: 100,
        });
        setAccounts(res.data);
        setTotal(res.total);
      } catch {
        toast.error("Failed to load accounts");
      }
    });
  }

  useEffect(() => { loadAccounts(); }, [search, typeFilter]);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createAccount({
          code: formData.get("code") as string,
          name: formData.get("name") as string,
          type: formData.get("type") as AccountType,
          parentId: (formData.get("parentId") as string) || undefined,
          description: (formData.get("description") as string) || undefined,
          currency: (formData.get("currency") as string) || "INR",
        });
        toast.success("Account created successfully");
        setIsOpen(false);
        loadAccounts();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create account");
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editAccount) return;
    startTransition(async () => {
      try {
        await updateAccount(editAccount.id, {
          code: formData.get("code") as string,
          name: formData.get("name") as string,
          type: formData.get("type") as AccountType,
          description: (formData.get("description") as string) || undefined,
        });
        toast.success("Account updated successfully");
        setEditAccount(null);
        loadAccounts();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update account");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAccount(id);
        toast.success("Account deactivated");
        setConfirmDeleteId(null);
        loadAccounts();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete account");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your general ledger accounts ({total} total)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />Add Account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create GL Account</DialogTitle></DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Account Code *</Label>
                  <Input id="code" name="code" placeholder="e.g. 1000" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name *</Label>
                  <Input id="name" name="name" placeholder="e.g. Cash" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type *</Label>
                  <select name="type" id="type" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                    <option value="ASSET">Asset</option>
                    <option value="LIABILITY">Liability</option>
                    <option value="EQUITY">Equity</option>
                    <option value="REVENUE">Revenue</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue="INR" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Account (optional)</Label>
                <select name="parentId" id="parentId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">None (Top-level)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="ASSET">Asset</SelectItem>
            <SelectItem value="LIABILITY">Liability</SelectItem>
            <SelectItem value="EQUITY">Equity</SelectItem>
            <SelectItem value="REVENUE">Revenue</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No accounts found. Create your first GL account to get started.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-medium">{account.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {account.parent && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                        {account.name}
                        {account.children.length > 0 && (
                          <Badge variant="outline" className="text-[10px] ml-1">{account.children.length} sub</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${typeColors[account.type] ?? ""}`}>{account.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.parent ? `${account.parent.code} - ${account.parent.name}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(account.balance)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setEditAccount(account)}
                        >
                          Edit
                        </Button>
                        {confirmDeleteId === account.id ? (
                          <>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(account.id)}>Confirm</Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmDeleteId(account.id)}
                          >
                            Deactivate
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

      {/* Edit Dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => !open && setEditAccount(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          {editAccount && (
            <form action={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Account Code *</Label>
                  <Input id="edit-code" name="code" defaultValue={editAccount.code} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Account Name *</Label>
                  <Input id="edit-name" name="name" defaultValue={editAccount.name} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Account Type *</Label>
                <select name="type" id="edit-type" required defaultValue={editAccount.type} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" name="description" defaultValue={editAccount.description ?? ""} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditAccount(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
