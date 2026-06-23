"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Pencil,
  Globe,
  GlobeLock,
  FileInput,
  Eye,
  BarChart3,
  GripVertical,
  Layers,
  Sparkles,
  ArrowRight,
  MousePointerClick,
  Info,
} from "lucide-react";
import {
  createForm,
  deleteForm,
  publishForm,
} from "@/lib/actions/organization";
import { toast } from "sonner";
import { format } from "date-fns";
import { FormBuilder } from "./builder";
import { FormPreview } from "./preview";
import { FormSubmissions } from "./submissions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Form = Awaited<ReturnType<typeof import("@/lib/actions/organization").getForms>>[number];

type FormsClientProps = {
  initialData: Form[];
};

type View = "list" | "builder" | "preview" | "submissions";

const PREDEFINED_TEMPLATES = [
  {
    id: "blank",
    name: "Blank Form",
    description: "Start from scratch and customize your fields.",
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700",
    badgeColor: "bg-blue-100 text-blue-700",
    fields: []
  },
  {
    id: "leave",
    name: "Leave Application Form",
    description: "Collect employee leave requests with dates and reasons.",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-700",
    fields: [
      { id: "f_leave_name", type: "text", label: "Employee Name", placeholder: "Your full name", required: true },
      { id: "f_leave_type", type: "select", label: "Leave Type", required: true, options: ["Casual Leave", "Sick Leave", "Earned Leave", "LOP"] },
      { id: "f_leave_start", type: "date", label: "Start Date", required: true },
      { id: "f_leave_end", type: "date", label: "End Date", required: true },
      { id: "f_leave_reason", type: "textarea", label: "Reason for Leave", placeholder: "Explain briefly...", required: true }
    ]
  },
  {
    id: "feedback",
    name: "Customer Feedback Form",
    description: "Gather feedback and satisfaction ratings from clients.",
    color: "from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-700",
    badgeColor: "bg-amber-100 text-amber-700",
    fields: [
      { id: "f_fb_name", type: "text", label: "Customer Name", placeholder: "Optional", required: false },
      { id: "f_fb_email", type: "email", label: "Email Address", placeholder: "customer@example.com", required: true },
      { id: "f_fb_rating", type: "radio", label: "Overall Satisfaction", required: true, options: ["1 - Very Dissatisfied", "2 - Dissatisfied", "3 - Neutral", "4 - Satisfied", "5 - Very Satisfied"] },
      { id: "f_fb_comments", type: "textarea", label: "Detailed Comments", placeholder: "Your experience...", required: true }
    ]
  },
  {
    id: "expense",
    name: "Expense Reimbursement Form",
    description: "Submit expense claims with descriptions, categories, and receipts.",
    color: "from-purple-500/10 to-pink-500/10 border-purple-200 text-purple-700",
    badgeColor: "bg-purple-100 text-purple-700",
    fields: [
      { id: "f_exp_title", type: "text", label: "Expense Title", placeholder: "e.g., Client Dinner", required: true },
      { id: "f_exp_cat", type: "select", label: "Category", required: true, options: ["Travel", "Meals & Entertainment", "Office Supplies", "Software", "Other"] },
      { id: "f_exp_amount", type: "number", label: "Amount (INR)", placeholder: "0.00", required: true },
      { id: "f_exp_receipt", type: "file", label: "Attach Receipt", required: true },
      { id: "f_exp_desc", type: "textarea", label: "Description", placeholder: "Details of the expense...", required: false }
    ]
  }
];

export function FormsClient({ initialData }: FormsClientProps) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templateId, setTemplateId] = useState("blank");
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("list");
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  // Drag and Drop States
  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);
  const [draggingFormId, setDraggingFormId] = useState<string | null>(null);
  const [isOverCreateZone, setIsOverCreateZone] = useState(false);
  const [activeActionZone, setActiveActionZone] = useState<"publish" | "submissions" | "preview" | "delete" | null>(null);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const selectedTemplate = PREDEFINED_TEMPLATES.find((t) => t.id === templateId);
        const form = await createForm({
          title: formData.get("title") as string,
          description: (formData.get("description") as string) || undefined,
          fields: selectedTemplate?.fields || [],
        });
        toast.success("Form created successfully");
        setIsCreateOpen(false);
        const newForm = {
          ...form,
          createdBy: { id: "", name: null, firstName: null, lastName: null },
          _count: { submissions: 0 },
        } as Form;
        setSelectedForm(newForm);
        setView("builder");
      } catch {
        toast.error("Failed to create form");
      }
    });
  }

  async function handleCreateFromTemplate(tplId: string) {
    const tpl = PREDEFINED_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    startTransition(async () => {
      try {
        const defaultTitle = `${tpl.name} - Draft ${initialData.length + 1}`;
        const form = await createForm({
          title: defaultTitle,
          description: tpl.description,
          fields: tpl.fields,
        });
        toast.success(`Form "${defaultTitle}" created!`);
        const newForm = {
          ...form,
          createdBy: { id: "", name: null, firstName: null, lastName: null },
          _count: { submissions: 0 },
        } as Form;
        setSelectedForm(newForm);
        setView("builder");
      } catch {
        toast.error("Failed to create form from template");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this form and all its submissions?")) return;
    startTransition(async () => {
      try {
        await deleteForm(id);
        toast.success("Form deleted successfully");
        if (selectedForm?.id === id) {
          setSelectedForm(null);
          setView("list");
        }
      } catch {
        toast.error("Failed to delete form");
      }
    });
  }

  async function handlePublishToggle(id: string) {
    startTransition(async () => {
      try {
        await publishForm(id);
        toast.success("Form status updated successfully");
      } catch {
        toast.error("Failed to update form status");
      }
    });
  }

  function openBuilder(form: Form) {
    setSelectedForm(form);
    setView("builder");
  }

  function openPreview(form: Form) {
    setSelectedForm(form);
    setView("preview");
  }

  function openSubmissions(form: Form) {
    setSelectedForm(form);
    setView("submissions");
  }

  // Predefined Template Drag Handlers
  function handleTemplateDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("application/form-template-id", id);
    setDraggingTemplateId(id);
    // Visual drag feedback
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleTemplateDragEnd() {
    setDraggingTemplateId(null);
    setIsOverCreateZone(false);
  }

  // Create Zone Drop Handlers
  function handleCreateDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (draggingTemplateId) {
      setIsOverCreateZone(true);
    }
  }

  function handleCreateDragLeave() {
    setIsOverCreateZone(false);
  }

  async function handleCreateDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOverCreateZone(false);
    const tplId = e.dataTransfer.getData("application/form-template-id");
    setDraggingTemplateId(null);
    if (tplId) {
      await handleCreateFromTemplate(tplId);
    }
  }

  // Active Customized Form Drag Handlers
  function handleFormDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("application/form-card-id", id);
    setDraggingFormId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleFormDragEnd() {
    setDraggingFormId(null);
    setActiveActionZone(null);
  }

  // Action Bins Drag & Drop Handlers
  function handleActionDragOver(e: React.DragEvent, zone: "publish" | "submissions" | "preview" | "delete") {
    e.preventDefault();
    if (draggingFormId) {
      setActiveActionZone(zone);
    }
  }

  function handleActionDragLeave() {
    setActiveActionZone(null);
  }

  async function handleActionDrop(e: React.DragEvent, zone: "publish" | "submissions" | "preview" | "delete") {
    e.preventDefault();
    setActiveActionZone(null);
    const formId = e.dataTransfer.getData("application/form-card-id");
    setDraggingFormId(null);

    if (!formId) return;
    const formObj = initialData.find((f) => f.id === formId);
    if (!formObj) return;

    switch (zone) {
      case "publish":
        await handlePublishToggle(formId);
        break;
      case "submissions":
        openSubmissions(formObj);
        break;
      case "preview":
        openPreview(formObj);
        break;
      case "delete":
        await handleDelete(formId);
        break;
    }
  }

  // Sub-views rendering
  if (view === "builder" && selectedForm) {
    return (
      <FormBuilder
        form={selectedForm}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "preview" && selectedForm) {
    return (
      <FormPreview
        form={selectedForm}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "submissions" && selectedForm) {
    return (
      <FormSubmissions
        form={selectedForm}
        onBack={() => setView("list")}
      />
    );
  }

  const filtered = initialData.filter((form) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      form.title.toLowerCase().includes(s) ||
      form.description?.toLowerCase().includes(s)
    );
  });

  const fieldCount = (form: Form) => {
    const fields = form.fields as unknown[];
    return Array.isArray(fields) ? fields.length : 0;
  };

  return (
    <div className="space-y-6 relative pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Form Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create custom forms, collect submissions, and manage workflows visually
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Form</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g., Leave Application" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" placeholder="Brief description of this form" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">Predefined Template</Label>
                <select
                  id="template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none cursor-pointer"
                >
                  {PREDEFINED_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} — {tpl.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create & Build
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Drag & Drop Predefined Templates Shelf */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="border border-muted bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base font-semibold">Predefined Templates</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Drag a template card onto the canvas grid dropzone on the right to instantly spin up a form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PREDEFINED_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  draggable
                  onDragStart={(e) => handleTemplateDragStart(e, tpl.id)}
                  onDragEnd={handleTemplateDragEnd}
                  onClick={() => handleCreateFromTemplate(tpl.id)}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-lg border bg-gradient-to-br transition-all cursor-grab active:cursor-grabbing",
                    tpl.color,
                    "hover:shadow-md hover:scale-[1.02] border-dashed group relative overflow-hidden"
                  )}
                >
                  {/* Subtle Sparkle background indicator */}
                  <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-30 transition-opacity">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs leading-none tracking-tight">{tpl.name}</span>
                    <Badge className={cn("text-[9px] px-1.5 py-0.5", tpl.badgeColor)}>
                      Drag to Create
                    </Badge>
                  </div>
                  <p className="text-[11px] opacity-80 mt-1">{tpl.description}</p>
                  <div className="flex items-center gap-1 text-[10px] opacity-60 mt-2 font-medium">
                    <GripVertical className="h-3 w-3" />
                    <span>Hold & drag over workspace</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customized Forms List & Workspace */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customized forms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* DRAG TARGET ZONE FOR PREDEFINED TEMPLATES */}
          <AnimatePresence>
            {(draggingTemplateId || isOverCreateZone) && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 120 }}
              >
                <div
                  onDragOver={handleCreateDragOver}
                  onDragLeave={handleCreateDragLeave}
                  onDrop={handleCreateDrop}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed transition-all",
                    isOverCreateZone
                      ? "border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/5"
                      : "border-muted-foreground/30 bg-muted/20"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-indigo-500/5 rounded-xl pointer-events-none" />
                  <FileInput className={cn("h-10 w-10 mb-2 transition-transform", isOverCreateZone && "scale-110 text-primary animate-pulse")} />
                  <p className="font-bold text-sm text-center">
                    {isOverCreateZone ? "Drop to Instantly Initialize Form!" : "Drop Predefined Template Here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    This will create the draft immediately and open the drag & drop field builder.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid list of active forms */}
          {filtered.length === 0 ? (
            <Card className="border-dashed bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileInput className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  {search ? "No customized forms match your search" : "No forms created yet."}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm text-center">
                  Drag a template from the left panel, or click "Create Form" above to start custom building.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((form) => (
                <div
                  key={form.id}
                  draggable
                  onDragStart={(e) => handleFormDragStart(e, form.id)}
                  onDragEnd={handleFormDragEnd}
                  className="group relative cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-transform duration-200"
                >
                  <Card className="h-full border border-muted hover:border-muted-foreground/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-card/75">
                    {/* Visual drag hint overlay */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 rounded p-1 cursor-grab">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>

                    <CardHeader className="pb-2 pt-6 pl-8">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">
                          {form.title}
                        </CardTitle>
                        <div className="shrink-0">
                          {form.isPublished ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 hover:bg-emerald-500/15 text-[10px]">
                              <Globe className="mr-1 h-3 w-3 shrink-0" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-muted-foreground bg-muted/60">
                              <GlobeLock className="mr-1 h-3 w-3 shrink-0" />
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                      {form.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 pr-2">{form.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pl-8">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{fieldCount(form)} fields</span>
                        <span>•</span>
                        <span>{form._count.submissions} submissions</span>
                        <span>•</span>
                        <span>{format(new Date(form.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openBuilder(form)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPreview(form)}>
                          <Eye className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openSubmissions(form)}>
                          <BarChart3 className="mr-1 h-3 w-3" />
                          {form._count.submissions}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DRAG-AND-DROP BOTTOM FLOATING ACTION PANEL */}
      <AnimatePresence>
        {draggingFormId && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none"
          >
            <div className="bg-background/95 backdrop-blur border shadow-xl rounded-xl p-4 w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
                <GripVertical className="h-4 w-4 animate-bounce text-indigo-500" />
                <span>Drag form card over any bin to perform action:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                {/* Publish Bin */}
                <div
                  onDragOver={(e) => handleActionDragOver(e, "publish")}
                  onDragLeave={handleActionDragLeave}
                  onDrop={(e) => handleActionDrop(e, "publish")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-lg border text-center transition-all cursor-default select-none",
                    activeActionZone === "publish"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 scale-105"
                      : "bg-muted/40 border-muted hover:border-emerald-500/40 hover:bg-emerald-500/5 text-muted-foreground"
                  )}
                >
                  <Globe className="h-4 w-4 mb-1" />
                  <span className="text-[10px] font-bold">
                    {activeActionZone === "publish" ? "Release to Publish" : "Toggle Publish"}
                  </span>
                </div>

                {/* Preview Bin */}
                <div
                  onDragOver={(e) => handleActionDragOver(e, "preview")}
                  onDragLeave={handleActionDragLeave}
                  onDrop={(e) => handleActionDrop(e, "preview")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-lg border text-center transition-all cursor-default select-none",
                    activeActionZone === "preview"
                      ? "bg-sky-500/10 border-sky-500 text-sky-600 scale-105"
                      : "bg-muted/40 border-muted hover:border-sky-500/40 hover:bg-sky-500/5 text-muted-foreground"
                  )}
                >
                  <Eye className="h-4 w-4 mb-1" />
                  <span className="text-[10px] font-bold">
                    {activeActionZone === "preview" ? "Release to Preview" : "Live Preview"}
                  </span>
                </div>

                {/* Submissions Bin */}
                <div
                  onDragOver={(e) => handleActionDragOver(e, "submissions")}
                  onDragLeave={handleActionDragLeave}
                  onDrop={(e) => handleActionDrop(e, "submissions")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-lg border text-center transition-all cursor-default select-none",
                    activeActionZone === "submissions"
                      ? "bg-violet-500/10 border-violet-500 text-violet-600 scale-105"
                      : "bg-muted/40 border-muted hover:border-violet-500/40 hover:bg-violet-500/5 text-muted-foreground"
                  )}
                >
                  <BarChart3 className="h-4 w-4 mb-1" />
                  <span className="text-[10px] font-bold">
                    {activeActionZone === "submissions" ? "Release to View" : "Submissions"}
                  </span>
                </div>

                {/* Delete Bin */}
                <div
                  onDragOver={(e) => handleActionDragOver(e, "delete")}
                  onDragLeave={handleActionDragLeave}
                  onDrop={(e) => handleActionDrop(e, "delete")}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-lg border text-center transition-all cursor-default select-none",
                    activeActionZone === "delete"
                      ? "bg-rose-500/10 border-rose-500 text-rose-600 scale-105"
                      : "bg-muted/40 border-muted hover:border-rose-500/40 hover:bg-rose-500/5 text-muted-foreground"
                  )}
                >
                  <Trash2 className="h-4 w-4 mb-1" />
                  <span className="text-[10px] font-bold">
                    {activeActionZone === "delete" ? "Release to Delete" : "Delete Form"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
