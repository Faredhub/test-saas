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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2, CheckSquare, Trash2, X } from "lucide-react";
import {
  createApprovalWorkflow,
  deleteApprovalWorkflow,
  toggleApprovalWorkflow,
} from "@/lib/actions/organization";
import { toast } from "sonner";

type Workflow = Awaited<ReturnType<typeof import("@/lib/actions/organization").getApprovalWorkflows>>[number];

type Step = { approverRole: string; order: number };

const ENTITY_TYPES = [
  { value: "quotations", label: "Quotation" },
  { value: "invoices", label: "Invoice" },
  { value: "expenses", label: "Expense" },
  { value: "leave", label: "Leave" },
  { value: "purchase_orders", label: "Purchase Order" },
] as const;

const ENTITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ENTITY_TYPES.map((t) => [t.value, t.label])
);

type ApprovalsClientProps = {
  initialData: Workflow[];
};

export function ApprovalsClient({ initialData }: ApprovalsClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state for create dialog
  const [formName, setFormName] = useState("");
  const [formModule, setFormModule] = useState<string>("");
  const [formSteps, setFormSteps] = useState<Step[]>([{ approverRole: "", order: 1 }]);
  const [formThreshold, setFormThreshold] = useState("");

  function resetForm() {
    setFormName("");
    setFormModule("");
    setFormSteps([{ approverRole: "", order: 1 }]);
    setFormThreshold("");
  }

  function addStep() {
    setFormSteps((prev) => [...prev, { approverRole: "", order: prev.length + 1 }]);
  }

  function removeStep(index: number) {
    setFormSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  function updateStepRole(index: number, role: string) {
    setFormSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, approverRole: role } : s))
    );
  }

  function handleCreate() {
    if (!formName.trim() || !formModule) {
      toast.error("Name and entity type are required");
      return;
    }
    if (formSteps.some((s) => !s.approverRole.trim())) {
      toast.error("All steps must have an approver role");
      return;
    }

    startTransition(async () => {
      try {
        await createApprovalWorkflow({
          name: formName.trim(),
          module: formModule,
          steps: formSteps,
          autoApproveThreshold: formThreshold ? parseFloat(formThreshold) : undefined,
        });
        toast.success("Workflow created successfully");
        setIsOpen(false);
        resetForm();
      } catch {
        toast.error("Failed to create workflow");
      }
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleApprovalWorkflow(id);
        toast.success("Workflow status updated");
      } catch {
        toast.error("Failed to update workflow");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteApprovalWorkflow(id);
        toast.success("Workflow deleted");
        setDeleteConfirmId(null);
      } catch {
        toast.error("Failed to delete workflow");
      }
    });
  }

  const filtered = initialData.filter((wf) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      wf.name.toLowerCase().includes(s) ||
      wf.module.toLowerCase().includes(s)
    );
  });

  function getStepCount(wf: Workflow): number {
    const steps = wf.steps as Step[] | null;
    return Array.isArray(steps) ? steps.length : 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approval Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Configure multi-step approval processes for your organization
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create Workflow
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Approval Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wf-name">Workflow Name *</Label>
                <Input
                  id="wf-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Quotation Approval"
                />
              </div>

              <div className="space-y-2">
                <Label>Entity Type *</Label>
                <Select value={formModule} onValueChange={(val) => setFormModule(val ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((et) => (
                      <SelectItem key={et.value} value={et.value}>
                        {et.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Approval Steps</Label>
                <div className="space-y-2">
                  {formSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {step.order}
                      </span>
                      <Input
                        placeholder="Approver role (e.g. Manager)"
                        value={step.approverRole}
                        onChange={(e) => updateStepRole(index, e.target.value)}
                        className="flex-1"
                      />
                      {formSteps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeStep(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addStep} className="mt-1">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wf-threshold">Auto-Approve Threshold (optional)</Label>
                <Input
                  id="wf-threshold"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                  placeholder="Amount below which approval is auto-granted"
                />
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Workflow
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No approval workflows found. Create your first workflow to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell className="font-medium">{wf.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ENTITY_LABEL_MAP[wf.module] ?? wf.module}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStepCount(wf)} step{getStepCount(wf) !== 1 ? "s" : ""}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleToggle(wf.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 text-sm"
                      >
                        <span
                          className={`inline-block h-3 w-6 rounded-full transition-colors ${
                            wf.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                          } relative`}
                        >
                          <span
                            className={`absolute top-0.5 h-2 w-2 rounded-full bg-white transition-transform ${
                              wf.isActive ? "left-3.5" : "left-0.5"
                            }`}
                          />
                        </span>
                        <span className={wf.isActive ? "text-emerald-600" : "text-muted-foreground"}>
                          {wf.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      {deleteConfirmId === wf.id ? (
                        <span className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(wf.id)}
                            disabled={isPending}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isPending}
                          >
                            Cancel
                          </Button>
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(wf.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
