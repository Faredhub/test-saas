"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Plus, Loader2, Trash2, Copy, LayoutTemplate, ListChecks, Milestone,
} from "lucide-react";
import {
  getProjectTemplates, createProjectTemplate, applyProjectTemplate, deleteProjectTemplate,
} from "@/lib/actions/projects";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type TemplatesData = Awaited<ReturnType<typeof getProjectTemplates>>;
type Template = TemplatesData[number];

export function TemplatesClient({ initialTemplates }: { initialTemplates: TemplatesData }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [createOpen, setCreateOpen] = useState(false);
  const [useTemplate, setUseTemplate] = useState<Template | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reload() {
    startTransition(async () => {
      try {
        const data = await getProjectTemplates();
        setTemplates(data);
      } catch {
        toast.error("Failed to reload templates");
      }
    });
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createProjectTemplate({
          name: formData.get("name") as string,
          description: formData.get("description") as string || undefined,
          category: formData.get("category") as string || undefined,
        });
        toast.success("Template created");
        setCreateOpen(false);
        reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleApply(formData: FormData) {
    if (!useTemplate) return;
    startTransition(async () => {
      try {
        const project = await applyProjectTemplate(useTemplate.id, {
          name: formData.get("name") as string,
          code: formData.get("code") as string || undefined,
          startDate: formData.get("startDate") as string || undefined,
          clientName: formData.get("clientName") as string || undefined,
          budget: Number(formData.get("budget")) || undefined,
        });
        toast.success("Project created from template");
        setUseTemplate(null);
        router.push(`/projects/${project.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteProjectTemplate(id);
        toast.success("Template deleted");
        reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create reusable templates to spin up new projects quickly
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />New Template
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input name="name" placeholder="e.g. Sprint Project" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" rows={3} placeholder="What this template is for..." />
              </div>
              <div>
                <Label>Category</Label>
                <Input name="category" placeholder="e.g. Engineering, Marketing" />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No templates yet</p>
            <p className="text-sm text-muted-foreground">Create your first template to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const tasks = (t.tasks as Array<{ title: string }>) ?? [];
            const milestones = (t.milestones as Array<{ title: string }>) ?? [];
            return (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      {t.category && (
                        <Badge variant="outline" className="mt-1">{t.category}</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-4 w-4" />{tasks.length} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Milestone className="h-4 w-4" />{milestones.length} milestones
                    </span>
                  </div>
                  <Button className="w-full" onClick={() => setUseTemplate(t)}>
                    <Copy className="mr-2 h-4 w-4" />Use Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Use Template Dialog */}
      <Dialog open={!!useTemplate} onOpenChange={(open) => !open && setUseTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project from &quot;{useTemplate?.name}&quot;</DialogTitle>
          </DialogHeader>
          <form action={handleApply} className="space-y-4">
            <div>
              <Label>Project Name</Label>
              <Input name="name" placeholder="New project name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input name="code" placeholder="PRJ-001" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input name="startDate" type="date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client Name</Label>
                <Input name="clientName" placeholder="Client" />
              </div>
              <div>
                <Label>Budget</Label>
                <Input name="budget" type="number" min={0} step={0.01} placeholder="0.00" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUseTemplate(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
