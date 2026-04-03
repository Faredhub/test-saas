"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Form = Awaited<ReturnType<typeof import("@/lib/actions/organization").getForms>>[number];

type FormsClientProps = {
  initialData: Form[];
};

type View = "list" | "builder" | "preview" | "submissions";

export function FormsClient({ initialData }: FormsClientProps) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("list");
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const form = await createForm({
          title: formData.get("title") as string,
          description: (formData.get("description") as string) || undefined,
        });
        toast.success("Form created");
        setIsCreateOpen(false);
        // Navigate to builder with the new form
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this form and all its submissions?")) return;
    startTransition(async () => {
      try {
        await deleteForm(id);
        toast.success("Form deleted");
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
        toast.success("Form status updated");
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

  // Sub-views
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Form Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create custom forms, collect submissions, and share publicly
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
                <Input id="title" name="title" required placeholder="e.g., Customer Feedback" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" placeholder="Brief description of this form" rows={3} />
              </div>
              <div className="flex justify-end gap-2">
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search forms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileInput className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              {search ? "No forms match your search" : "No forms yet. Create your first form."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((form) => (
            <Card key={form.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">{form.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    {form.isPublished ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                        <Globe className="mr-1 h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <GlobeLock className="mr-1 h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
                {form.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{fieldCount(form)} fields</span>
                  <span>{form._count.submissions} submissions</span>
                  <span>{format(new Date(form.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openBuilder(form)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openPreview(form)}>
                    <Eye className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openSubmissions(form)}>
                    <BarChart3 className="mr-1 h-3 w-3" />
                    {form._count.submissions}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePublishToggle(form.id)}
                    disabled={isPending}
                  >
                    {form.isPublished ? <GlobeLock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(form.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
