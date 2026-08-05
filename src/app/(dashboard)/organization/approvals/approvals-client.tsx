"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Loader2,
  CheckSquare,
  Trash2,
  X,
  Eye,
  Pencil,
  Check,
  ChevronRight,
  GitMerge,
  ShieldCheck,
  Users,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  createApprovalWorkflow,
  deleteApprovalWorkflow,
  toggleApprovalWorkflow,
  updateApprovalWorkflow,
} from "@/lib/actions/organization";
import { toast } from "sonner";

type Workflow = Awaited<ReturnType<typeof import("@/lib/actions/organization").getApprovalWorkflows>>[number];

type Step = { approverRole: string; approverUser?: string; order: number };

const DEFAULT_DESIGNATIONS = [
  "Project Manager",
  "Department Head",
  "HR Manager",
  "Finance Director / CFO",
  "Lead Architect",
  "Operations Manager",
  "General Manager / VP",
  "CEO / Executive",
  "Procurement Manager",
];

const ENTITY_TYPES = [
  { value: "projects", label: "Workflow & Project Progress" },
  { value: "milestones", label: "Project Milestone / Task" },
  { value: "quotations", label: "Quotation" },
  { value: "invoices", label: "Invoice" },
  { value: "expenses", label: "Expense Claim" },
  { value: "leave", label: "Leave Request" },
  { value: "purchase_orders", label: "Purchase Order" },
  { value: "contracts", label: "Contract & Document" },
  { value: "custom", label: "Custom Template (Future Uses)" },
] as const;

const ENTITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ENTITY_TYPES.map((t) => [t.value, t.label])
);

const PRESET_TEMPLATES = [
  {
    title: "Workflow & Project Progress Approval",
    module: "projects",
    threshold: "",
    steps: [
      { approverRole: "Lead Architect", order: 1 },
      { approverRole: "Project Manager", order: 2 },
    ],
  },
  {
    title: "High-Value Expense Approval",
    module: "expenses",
    threshold: "1000",
    steps: [
      { approverRole: "Department Head", order: 1 },
      { approverRole: "Finance Director / CFO", order: 2 },
    ],
  },
  {
    title: "Multi-Stage Quotation & Deal Approval",
    module: "quotations",
    threshold: "5000",
    steps: [
      { approverRole: "Department Head", order: 1 },
      { approverRole: "Finance Director / CFO", order: 2 },
      { approverRole: "CEO / Executive", order: 3 },
    ],
  },
  {
    title: "Employee Leave Request Approval",
    module: "leave",
    threshold: "",
    steps: [
      { approverRole: "Department Head", order: 1 },
      { approverRole: "HR Manager", order: 2 },
    ],
  },
  {
    title: "Procurement Purchase Order Approval",
    module: "purchase_orders",
    threshold: "2000",
    steps: [
      { approverRole: "Procurement Manager", order: 1 },
      { approverRole: "Finance Director / CFO", order: 2 },
    ],
  },
];

type Employee = {
  id: string;
  firstName: string;
  lastName: string | null;
  designation: string | null;
  employeeId: string;
};

type Designation = {
  id: string;
  name: string;
};

type ApprovalsClientProps = {
  initialData: Workflow[];
  employees?: Employee[];
  designations?: Designation[];
};

export function ApprovalsClient({
  initialData,
  employees = [],
  designations = [],
}: ApprovalsClientProps) {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Available Designation options (combined default + DB designations)
  const designationOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_DESIGNATIONS);
    designations.forEach((d) => {
      if (d.name?.trim()) set.add(d.name.trim());
    });
    employees.forEach((e) => {
      if (e.designation?.trim()) set.add(e.designation.trim());
    });
    return Array.from(set).sort();
  }, [designations, employees]);

  // Form state for create dialog
  const [formName, setFormName] = useState("");
  const [formModule, setFormModule] = useState<string>("");
  const [formSteps, setFormSteps] = useState<Step[]>([
    { approverRole: "Department Head", order: 1 },
  ]);
  const [formThreshold, setFormThreshold] = useState("");

  // View & Edit states
  const [viewWorkflow, setViewWorkflow] = useState<Workflow | null>(null);
  const [editWorkflow, setEditWorkflow] = useState<Workflow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editModule, setEditModule] = useState("");
  const [editSteps, setEditSteps] = useState<Step[]>([]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = initialData.length;
    const active = initialData.filter((w) => w.isActive).length;
    const multiStage = initialData.filter((w) => {
      const steps = w.steps as Step[] | null;
      return Array.isArray(steps) && steps.length > 1;
    }).length;

    const uniqueDesignations = new Set<string>();
    initialData.forEach((w) => {
      const steps = w.steps as Step[] | null;
      if (Array.isArray(steps)) {
        steps.forEach((s) => {
          if (s.approverRole) uniqueDesignations.add(s.approverRole);
        });
      }
    });

    return { total, active, multiStage, designationsCount: uniqueDesignations.size };
  }, [initialData]);

  function resetForm() {
    setFormName("");
    setFormModule("");
    setFormSteps([{ approverRole: "Department Head", order: 1 }]);
    setFormThreshold("");
  }

  function applyPresetTemplate(template: (typeof PRESET_TEMPLATES)[number]) {
    setFormName(template.title);
    setFormModule(template.module);
    setFormThreshold(template.threshold);
    setFormSteps(template.steps.map((s) => ({ ...s })));
    toast.info(`Loaded "${template.title}" template`);
  }

  function addStep() {
    setFormSteps((prev) => [
      ...prev,
      { approverRole: designationOptions[0] || "Manager", order: prev.length + 1 },
    ]);
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

  function updateStepUser(index: number, user: string) {
    setFormSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, approverUser: user === "NONE" ? "" : user } : s))
    );
  }

  function addEditStep() {
    setEditSteps((prev) => [
      ...prev,
      { approverRole: designationOptions[0] || "Manager", order: prev.length + 1 },
    ]);
  }

  function removeEditStep(index: number) {
    setEditSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  function updateEditStepRole(index: number, role: string) {
    setEditSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, approverRole: role } : s))
    );
  }

  function updateEditStepUser(index: number, user: string) {
    setEditSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, approverUser: user === "NONE" ? "" : user } : s))
    );
  }

  function handleCreate() {
    if (!formName.trim() || !formModule) {
      toast.error("Workflow name and entity type are required");
      return;
    }
    if (formSteps.some((s) => !s.approverRole.trim())) {
      toast.error("All approval steps must have an assigned approver designation");
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
        toast.success("Multi-stage approval workflow created successfully");
        setIsOpen(false);
        resetForm();
      } catch {
        toast.error("Failed to create approval workflow");
      }
    });
  }

  function handleUpdate() {
    if (!editWorkflow) return;
    if (!editName.trim() || !editModule) {
      toast.error("Workflow name and entity type are required");
      return;
    }
    if (editSteps.some((s) => !s.approverRole.trim())) {
      toast.error("All approval steps must have an assigned approver designation");
      return;
    }

    startTransition(async () => {
      try {
        await updateApprovalWorkflow(editWorkflow.id, {
          name: editName.trim(),
          module: editModule,
          steps: editSteps,
        });
        toast.success("Workflow updated successfully");
        setEditOpen(false);
        setEditWorkflow(null);
      } catch {
        toast.error("Failed to update workflow");
      }
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleApprovalWorkflow(id);
        toast.success("Workflow status updated");
      } catch {
        toast.error("Failed to update workflow status");
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
    if (moduleFilter !== "ALL" && wf.module !== moduleFilter) {
      return false;
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      const nameMatch = wf.name.toLowerCase().includes(s);
      const modMatch = wf.module.toLowerCase().includes(s);
      const steps = (wf.steps as Step[] | null) || [];
      const stepMatch = steps.some(
        (st) =>
          st.approverRole?.toLowerCase().includes(s) ||
          st.approverUser?.toLowerCase().includes(s)
      );
      if (!nameMatch && !modMatch && !stepMatch) return false;
    }
    return true;
  });

  function getStepCount(wf: Workflow): number {
    const steps = wf.steps as Step[] | null;
    return Array.isArray(steps) ? steps.length : 0;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approval Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Configure multi-stage approval processes integrated with HRM designations for workflows, project progress, and future template uses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset Template Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Load Template
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Multi-Stage Templates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRESET_TEMPLATES.map((tmpl, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => {
                    setIsOpen(true);
                    applyPresetTemplate(tmpl);
                  }}
                  className="flex flex-col items-start gap-0.5 cursor-pointer"
                >
                  <span className="font-medium text-xs">{tmpl.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {tmpl.steps.length} Stages • Designation Integrated
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Workflow Button */}
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="h-4 w-4" />
              Create Workflow
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitMerge className="h-5 w-5 text-primary" />
                  Create Multi-Stage Approval Workflow
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="wf-name">Workflow Name *</Label>
                  <Input
                    id="wf-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Project Progress Multi-Stage Approval"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entity / Module Type *</Label>
                  <Select value={formModule} onValueChange={(val) => setFormModule(val ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select entity type (e.g. Projects, Expenses, Quotations)" />
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Multi-Stage Approval Pipeline (Designation Integrated)
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addStep} className="h-7 text-xs">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Stage Step
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formSteps.map((step, index) => (
                      <div key={index} className="space-y-3 border p-3 rounded-lg bg-muted/20 relative">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <Layers className="h-3 w-3" />
                            Stage {step.order}
                          </span>
                          {formSteps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeStep(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Designation Select / Input */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                              Approver Designation / Role *
                            </Label>
                            <Select
                              value={step.approverRole}
                              onValueChange={(val) => updateStepRole(index, val ?? "")}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select designation" />
                              </SelectTrigger>
                              <SelectContent>
                                {designationOptions.map((desig) => (
                                  <SelectItem key={desig} value={desig}>
                                    {desig}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Specific Employee Assignment (Optional) */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                              Assigned Employee (Optional)
                            </Label>
                            {employees.length > 0 ? (
                              <Select
                                value={step.approverUser || ""}
                                onValueChange={(val) => updateStepUser(index, val ?? "")}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select specific employee" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">Any user with designation</SelectItem>
                                  {employees.map((emp) => {
                                    const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(" ");
                                    const label = emp.designation ? `${fullName} (${emp.designation})` : fullName;
                                    return (
                                      <SelectItem key={emp.id} value={fullName}>
                                        {label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input placeholder="No employees loaded" disabled className="h-8 text-xs" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wf-threshold">Auto-Approve Threshold (Optional)</Label>
                  <Input
                    id="wf-threshold"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    placeholder="Amount below which stage 1 approval is auto-granted"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
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
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Workflows</CardTitle>
            <GitMerge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">Configured pipelines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active Workflows</CardTitle>
            <CheckSquare className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{metrics.active}</div>
            <p className="text-xs text-muted-foreground">Enforcing approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400">Multi-Stage Workflows</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{metrics.multiStage}</div>
            <p className="text-xs text-muted-foreground">Multi-level approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-purple-600 dark:text-purple-400">Designations Integrated</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{metrics.designationsCount}</div>
            <p className="text-xs text-muted-foreground">HRM roles assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search workflows, roles, or employees..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={moduleFilter} onValueChange={(val) => setModuleFilter(val ?? "ALL")}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue placeholder="Filter by Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Entity Types</SelectItem>
                  {ENTITY_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Approval Stages & Designations</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium text-sm">No approval workflows found</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Create your first multi-stage approval workflow or load a pre-built template.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsOpen(true);
                        applyPresetTemplate(PRESET_TEMPLATES[0]);
                      }}
                    >
                      <Sparkles className="mr-1.5 h-4 w-4 text-amber-400" />
                      Load Sample Workflow Template
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((wf) => {
                  const steps = ((wf.steps as Step[] | null) || []);
                  return (
                    <TableRow key={wf.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <div>{wf.name}</div>
                        {getStepCount(wf) > 1 && (
                          <Badge variant="secondary" className="text-[10px] mt-1 bg-primary/10 text-primary border-primary/20">
                            {getStepCount(wf)}-Stage Workflow
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {ENTITY_LABEL_MAP[wf.module] ?? wf.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted font-medium text-[11px] border">
                                <span className="text-[10px] text-muted-foreground font-semibold">S{step.order}:</span>
                                {step.approverRole}
                              </span>
                              {idx < steps.length - 1 && (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {steps.map((step, idx) => (
                            <div key={idx} className="text-foreground font-medium whitespace-nowrap">
                              {step.approverUser ? (
                                <span className="text-xs">{step.approverUser}</span>
                              ) : (
                                <span className="text-muted-foreground/60 text-xs font-normal">Any {step.approverRole}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggle(wf.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                        >
                          <span
                            className={`inline-block h-3.5 w-7 rounded-full transition-colors ${
                              wf.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                            } relative`}
                          >
                            <span
                              className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform ${
                                wf.isActive ? "left-4" : "left-0.5"
                              }`}
                            />
                          </span>
                          <span className={wf.isActive ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}>
                            {wf.isActive ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewWorkflow(wf)}
                            title="View Pipeline Diagram"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                            disabled={isPending}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditWorkflow(wf);
                              setEditName(wf.name);
                              setEditModule(wf.module);
                              setEditSteps(
                                wf.steps
                                  ? (wf.steps as Step[]).map((s) => ({
                                      approverRole: s.approverRole,
                                      approverUser: s.approverUser || "",
                                      order: s.order,
                                    }))
                                  : [{ approverRole: "Department Head", order: 1 }]
                              );
                              setEditOpen(true);
                            }}
                            title="Edit Workflow"
                            className="h-8 w-8 text-foreground hover:bg-muted"
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {deleteConfirmId === wf.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleDelete(wf.id)}
                                title="Confirm Delete"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                onClick={() => setDeleteConfirmId(null)}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              onClick={() => setDeleteConfirmId(wf.id)}
                              title="Delete"
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* VIEW WORKFLOW DIALOG (Interactive Multi-Stage Flow Diagram) */}
      <Dialog open={!!viewWorkflow} onOpenChange={(open) => { if (!open) setViewWorkflow(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GitMerge className="h-5 w-5 text-primary" />
              Workflow Details — {viewWorkflow?.name}
            </DialogTitle>
          </DialogHeader>

          {viewWorkflow && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-semibold">Entity Type</span>
                  <span className="font-semibold text-sm">
                    {ENTITY_LABEL_MAP[viewWorkflow.module] ?? viewWorkflow.module}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-semibold">Workflow Status</span>
                  <Badge variant={viewWorkflow.isActive ? "default" : "secondary"} className="mt-0.5">
                    {viewWorkflow.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Multi-Stage Pipeline Graph */}
              <div className="space-y-3">
                <span className="text-xs text-muted-foreground block uppercase font-semibold">
                  Multi-Stage Approval Pipeline Flow
                </span>

                <div className="space-y-3">
                  {((viewWorkflow.steps as Step[] | null) || []).map((step, idx, arr) => (
                    <div key={idx} className="relative">
                      <div className="border rounded-lg p-3 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                            {step.order}
                          </span>
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              <span>Stage {step.order}: {step.approverRole}</span>
                              <Badge variant="outline" className="text-[10px] bg-background">
                                Designation Integrated
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {step.approverUser
                                ? `Assigned to: ${step.approverUser}`
                                : `Role-based: Approving user with designation "${step.approverRole}"`}
                            </p>
                          </div>
                        </div>

                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          Required
                        </Badge>
                      </div>

                      {idx < arr.length - 1 && (
                        <div className="flex justify-center my-1.5">
                          <ArrowRight className="h-4 w-4 text-primary rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT WORKFLOW DIALOG */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditWorkflow(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Multi-Stage Approval Workflow
            </DialogTitle>
          </DialogHeader>

          {editWorkflow && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-wf-name">Workflow Name *</Label>
                <Input
                  id="edit-wf-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Project Progress Approval"
                />
              </div>

              <div className="space-y-2">
                <Label>Entity / Module Type *</Label>
                <Select value={editModule} onValueChange={(val) => setEditModule(val ?? "")}>
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Multi-Stage Approval Pipeline
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEditStep} className="h-7 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Stage Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {editSteps.map((step, index) => (
                    <div key={index} className="space-y-3 border p-3 rounded-lg bg-muted/20 relative">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Layers className="h-3 w-3" />
                          Stage {step.order}
                        </span>
                        {editSteps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeEditStep(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Approver Designation / Role *
                          </Label>
                          <Select
                            value={step.approverRole}
                            onValueChange={(val) => updateEditStepRole(index, val ?? "")}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select designation" />
                            </SelectTrigger>
                            <SelectContent>
                              {designationOptions.map((desig) => (
                                <SelectItem key={desig} value={desig}>
                                  {desig}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Assigned Employee (Optional)
                          </Label>
                          {employees.length > 0 ? (
                            <Select
                              value={step.approverUser || ""}
                              onValueChange={(val) => updateEditStepUser(index, val ?? "")}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">Any user with designation</SelectItem>
                                {employees.map((emp) => {
                                  const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(" ");
                                  const label = emp.designation ? `${fullName} (${emp.designation})` : fullName;
                                  return (
                                    <SelectItem key={emp.id} value={fullName}>
                                      {label}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input placeholder="No employees loaded" disabled className="h-8 text-xs" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false);
                    setEditWorkflow(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
