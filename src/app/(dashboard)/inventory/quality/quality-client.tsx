"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Pencil, ClipboardCheck, Trash2 } from "lucide-react";
import { createQualityCheck, updateQualityCheck, getQualityChecks } from "@/lib/actions/inventory";
import { toast } from "sonner";

type Props = {
  initialData: Awaited<ReturnType<typeof getQualityChecks>>;
};

type Defect = { description: string; severity: string; action: string };

const checkTypes = ["INCOMING", "IN_PROCESS", "FINAL"];
const checkStatuses = ["PENDING", "PASSED", "FAILED", "ON_HOLD"];
const severityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PASSED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  ON_HOLD: "bg-gray-100 text-gray-800",
};

const typeColors: Record<string, string> = {
  INCOMING: "bg-blue-100 text-blue-800",
  IN_PROCESS: "bg-purple-100 text-purple-800",
  FINAL: "bg-indigo-100 text-indigo-800",
};

export function QualityClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isPending, startTransition] = useTransition();

  function refreshData() {
    startTransition(async () => {
      try {
        const result = await getQualityChecks({
          search: search || undefined,
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        setData(result);
      } catch {
        // ignore
      }
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
    startTransition(async () => {
      try {
        const result = await getQualityChecks({
          search: value || undefined,
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        setData(result);
      } catch {
        // ignore
      }
    });
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editId) {
          await updateQualityCheck(editId, {
            status: (formData.get("status") as string) || undefined,
            inspector: (formData.get("inspector") as string) || undefined,
            notes: (formData.get("notes") as string) || undefined,
            checkedAt: (formData.get("checkedAt") as string) || undefined,
            defects: defects.length > 0 ? defects : undefined,
          });
          toast.success("Quality check updated");
        } else {
          await createQualityCheck({
            checkNo: formData.get("checkNo") as string,
            type: (formData.get("type") as string) || "INCOMING",
            reference: (formData.get("reference") as string) || undefined,
            productName: (formData.get("productName") as string) || undefined,
            inspector: (formData.get("inspector") as string) || undefined,
            notes: (formData.get("notes") as string) || undefined,
            defects: defects.length > 0 ? defects : undefined,
          });
          toast.success("Quality check created");
        }
        setIsOpen(false);
        setEditId(null);
        setDefects([]);
        refreshData();
      } catch {
        toast.error("Failed to save quality check");
      }
    });
  }

  function openEdit(check: (typeof data.data)[0]) {
    setEditId(check.id);
    setDefects((check.defects as Defect[] | null) ?? []);
    setIsOpen(true);
  }

  function openCreate() {
    setEditId(null);
    setDefects([]);
    setIsOpen(true);
  }

  function addDefect() {
    setDefects([...defects, { description: "", severity: "MEDIUM", action: "" }]);
  }

  function updateDefect(index: number, field: keyof Defect, value: string) {
    const updated = [...defects];
    updated[index] = { ...updated[index], [field]: value };
    setDefects(updated);
  }

  function removeDefect(index: number) {
    setDefects(defects.filter((_, i) => i !== index));
  }

  const editCheck = editId ? data.data.find((c) => c.id === editId) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quality Control</h1>
          <p className="text-muted-foreground mt-1">Manage quality checks and defect tracking</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Check
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {checkStatuses.map((status) => {
          const count = data.data.filter((c) => c.status === status).length;
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter(status); refreshData(); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{status}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <Badge className={statusColors[status] ?? ""}>{status}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by check number, product, or reference..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); refreshData(); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {checkTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); refreshData(); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {checkStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quality Checks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Defects</TableHead>
                <TableHead>Checked At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No quality checks found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((check) => {
                  const checkDefects = (check.defects as Defect[] | null) ?? [];
                  return (
                    <TableRow key={check.id}>
                      <TableCell className="font-mono font-semibold">{check.checkNo}</TableCell>
                      <TableCell>
                        <Badge className={typeColors[check.type] ?? ""}>{check.type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{check.productName ?? "-"}</TableCell>
                      <TableCell className="text-sm">{check.reference ?? "-"}</TableCell>
                      <TableCell>{check.inspector ?? "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[check.status] ?? ""}>{check.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {checkDefects.length > 0 ? (
                          <Badge variant="destructive">{checkDefects.length} defect{checkDefects.length > 1 ? "s" : ""}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {check.checkedAt ? new Date(check.checkedAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(check)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setEditId(null); setDefects([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Quality Check" : "New Quality Check"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            {!editId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkNo">Check Number *</Label>
                  <Input id="checkNo" name="checkNo" required placeholder="QC-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qcType">Type</Label>
                  <select name="type" defaultValue="INCOMING" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {checkTypes.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {!editId && (
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input id="productName" name="productName" />
                </div>
              )}
              {!editId && (
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (PO/MO)</Label>
                  <Input id="reference" name="reference" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspector">Inspector</Label>
                <Input id="inspector" name="inspector" defaultValue={editCheck?.inspector ?? ""} />
              </div>
              {editId && (
                <div className="space-y-2">
                  <Label htmlFor="qcStatus">Status</Label>
                  <select name="status" defaultValue={editCheck?.status ?? "PENDING"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {checkStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {editId && (
              <div className="space-y-2">
                <Label htmlFor="checkedAt">Checked At</Label>
                <Input id="checkedAt" name="checkedAt" type="datetime-local" defaultValue={editCheck?.checkedAt ? new Date(editCheck.checkedAt).toISOString().slice(0, 16) : ""} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="qcNotes">Notes</Label>
              <Textarea id="qcNotes" name="notes" defaultValue={editCheck?.notes ?? ""} />
            </div>

            {/* Defects Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Defects</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDefect}>
                  <Plus className="mr-1 h-3 w-3" /> Add Defect
                </Button>
              </div>
              {defects.map((defect, index) => (
                <Card key={index}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Defect description"
                          value={defect.description}
                          onChange={(e) => updateDefect(index, "description", e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={defect.severity}
                            onChange={(e) => updateDefect(index, "severity", e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          >
                            {severityOptions.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <Input
                            placeholder="Action taken"
                            value={defect.action}
                            onChange={(e) => updateDefect(index, "action", e.target.value)}
                          />
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDefect(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {defects.length === 0 && (
                <p className="text-sm text-muted-foreground">No defects recorded.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
