"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2 } from "lucide-react";
import { createDeal, deleteDeal, updateDeal } from "@/lib/actions/sales";
import { toast } from "sonner";

const stageLabels: Record<string, { label: string; color: string }> = {
  PROSPECTING: { label: "Prospecting", color: "bg-slate-100 text-slate-700" },
  QUALIFICATION: { label: "Qualification", color: "bg-blue-100 text-blue-700" },
  PROPOSAL: { label: "Proposal", color: "bg-amber-100 text-amber-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-100 text-orange-700" },
  CLOSED_WON: { label: "Won", color: "bg-green-100 text-green-700" },
  CLOSED_LOST: { label: "Lost", color: "bg-red-100 text-red-700" },
};

type Props = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/sales").getDeals>>;
};

export function DealsClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createDeal({
          title: formData.get("title") as string,
          value: Number(formData.get("value")) || undefined,
          probability: Number(formData.get("probability")) || 0,
          expectedCloseDate: formData.get("expectedCloseDate") as string || undefined,
          notes: formData.get("notes") as string,
        });
        toast.success("Deal created");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create deal");
      }
    });
  }

  async function handleStageChange(id: string, stage: string) {
    startTransition(async () => {
      try {
        const data: { stage: string; actualCloseDate?: string } = { stage };
        if (stage === "CLOSED_WON" || stage === "CLOSED_LOST") {
          data.actualCloseDate = new Date().toISOString();
        }
        await updateDeal(id, data as Parameters<typeof updateDeal>[1]);
        toast.success("Deal updated");
      } catch {
        toast.error("Failed to update deal");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDeal(id);
        toast.success("Deal deleted");
      } catch {
        toast.error("Failed to delete deal");
      }
    });
  }

  const filtered = initialData.data.filter((d) => {
    if (!search) return true;
    return d.title.toLowerCase().includes(search.toLowerCase());
  });

  function formatCurrency(value: unknown) {
    if (!value) return "—";
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">Track deal value and pipeline progress</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Deal
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Deal</DialogTitle></DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input id="title" name="title" required placeholder="e.g. Website redesign for Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value (₹)</Label>
                  <Input id="value" name="value" type="number" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Deal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search deals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No deals found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell>{d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}` : "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(d.value)}</TableCell>
                    <TableCell>{d.probability}%</TableCell>
                    <TableCell>
                      <select
                        value={d.stage}
                        onChange={(e) => handleStageChange(d.id, e.target.value)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer ${stageLabels[d.stage]?.color ?? ""}`}
                      >
                        {Object.entries(stageLabels).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>{d.owner?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(d.id)}>Delete</Button>
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
