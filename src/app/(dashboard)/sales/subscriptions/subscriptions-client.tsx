"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  RefreshCw,
  IndianRupee,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { createSubscription, cancelSubscription } from "@/lib/actions/sales";
import { toast } from "sonner";
import { format } from "date-fns";

const intervalColors: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  QUARTERLY: "bg-purple-100 text-purple-700",
  ANNUAL: "bg-green-100 text-green-700",
};

const intervalLabels: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type Subscription = Awaited<
  ReturnType<typeof import("@/lib/actions/sales").getSubscriptions>
>[number];

type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
};

type Props = {
  initialData: Subscription[];
  contacts: Contact[];
};

export function SubscriptionsClient({ initialData, contacts }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 18 },
  ]);

  function addItem() {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 18 },
    ]);
  }
  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }
  function updateItem(
    i: number,
    field: keyof LineItem,
    value: string | number
  ) {
    const u = [...items];
    u[i] = { ...u[i], [field]: value };
    setItems(u);
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = items.reduce(
    (s, i) => s + (i.quantity * i.unitPrice * i.taxRate) / 100,
    0
  );

  function formatCurrency(value: unknown) {
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }

  // Compute summary stats
  const activeSubscriptions = initialData.filter((s) => s.isRecurring);
  const activeCount = activeSubscriptions.length;

  // MRR: sum of monthly-equivalent totals for active subscriptions
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    const total = Number(sub.total);
    switch (sub.recurrenceRule) {
      case "MONTHLY":
        return sum + total;
      case "QUARTERLY":
        return sum + total / 3;
      case "ANNUAL":
        return sum + total / 12;
      default:
        return sum + total;
    }
  }, 0);

  const arr = mrr * 12;

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const validItems = items.filter(
          (i) => i.description && i.unitPrice > 0
        );
        if (validItems.length === 0) {
          toast.error("Add at least one line item");
          return;
        }
        const startDate = formData.get("startDate") as string;
        if (!startDate) {
          toast.error("Start date is required");
          return;
        }
        const interval = formData.get("interval") as string;
        if (!interval) {
          toast.error("Billing interval is required");
          return;
        }

        await createSubscription({
          contactId: (formData.get("contactId") as string) || undefined,
          items: validItems,
          recurringInterval: interval as "MONTHLY" | "QUARTERLY" | "ANNUAL",
          startDate,
          endDate: (formData.get("endDate") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Subscription created");
        setIsOpen(false);
        setItems([
          { description: "", quantity: 1, unitPrice: 0, taxRate: 18 },
        ]);
      } catch {
        toast.error("Failed to create subscription");
      }
    });
  }

  async function handleCancel() {
    if (!cancelId) return;
    startTransition(async () => {
      try {
        await cancelSubscription(cancelId);
        toast.success("Subscription cancelled");
        setCancelId(null);
      } catch {
        toast.error("Failed to cancel subscription");
      }
    });
  }

  const filtered = initialData.filter((sub) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const contactName = sub.contact
      ? `${sub.contact.firstName} ${sub.contact.lastName ?? ""}`.toLowerCase()
      : "";
    return (
      sub.invoiceNo.toLowerCase().includes(q) || contactName.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage recurring invoices and subscription billing
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create Subscription
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Subscription</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              {/* Contact selector */}
              <div className="space-y-2">
                <Label htmlFor="contactId">Contact</Label>
                <select
                  id="contactId"
                  name="contactId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName ?? ""}{" "}
                      {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div>
                <Label className="mb-2 block">Line Items</Label>
                <div className="text-xs text-muted-foreground grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 mb-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Tax %</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-end"
                    >
                      <Input
                        placeholder="Service/Product"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(i, "description", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, "quantity", Number(e.target.value))
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateItem(i, "unitPrice", Number(e.target.value))
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) =>
                          updateItem(i, "taxRate", Number(e.target.value))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      + Add Item
                    </Button>
                    <div className="text-right space-y-1">
                      <div>Subtotal: {formatCurrency(subtotal)}</div>
                      <div>GST: {formatCurrency(tax)}</div>
                      <div className="font-semibold text-base">
                        Total: {formatCurrency(subtotal + tax)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interval & Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">Billing Interval</Label>
                  <select
                    id="interval"
                    name="interval"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input id="endDate" name="endDate" type="date" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Subscription
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-700 transition-all duration-200 group-hover:scale-105">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Active Subscriptions
              </p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-700 transition-all duration-200 group-hover:scale-105">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Monthly Recurring Revenue
              </p>
              <p className="text-2xl font-bold">{formatCurrency(mrr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-700 transition-all duration-200 group-hover:scale-105">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Annual Recurring Revenue
              </p>
              <p className="text-2xl font-bold">{formatCurrency(arr)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice no or contact..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      {sub.contact
                        ? `${sub.contact.firstName} ${sub.contact.lastName ?? ""}`
                        : "—"}
                      {sub.contact?.company && (
                        <span className="block text-xs text-muted-foreground">
                          {sub.contact.company}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      {sub.invoiceNo}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(sub.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${intervalColors[sub.recurrenceRule ?? ""] ?? "bg-gray-100 text-gray-700"} border-0`}
                      >
                        {intervalLabels[sub.recurrenceRule ?? ""] ??
                          sub.recurrenceRule ??
                          "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.nextRecurrence
                        ? format(new Date(sub.nextRecurrence), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {sub.isRecurring ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-0">
                          Cancelled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sub.isRecurring && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setCancelId(sub.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
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

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this subscription? This will stop
            all future recurring invoices. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCancelId(null)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
