"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Pencil,
  Loader2,
  LayoutTemplate,
  GripVertical,
  X,
} from "lucide-react";
import {
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
} from "@/lib/actions/reports";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionDef = {
  title: string;
  type: "text" | "table" | "chart" | "image" | "signature";
  fields: { label: string; key: string }[];
};

type HeaderConfig = {
  logoUrl?: string;
  companyName?: string;
  address?: string;
};

type FooterConfig = {
  disclaimer?: string;
  signatureFields?: string[];
};

type Template = Awaited<
  ReturnType<typeof import("@/lib/actions/reports").getReportTemplates>
>[number];

const REPORT_TYPES = ["SURVEY", "GEOTECHNICAL", "DESIGN", "CUSTOM"] as const;

const typeColors: Record<string, string> = {
  SURVEY: "bg-blue-100 text-blue-700",
  GEOTECHNICAL: "bg-amber-100 text-amber-700",
  DESIGN: "bg-purple-100 text-purple-700",
  CUSTOM: "bg-slate-100 text-slate-700",
};

const SECTION_TYPES = ["text", "table", "chart", "image", "signature"] as const;

// ---------------------------------------------------------------------------
// Section builder sub-component
// ---------------------------------------------------------------------------

function SectionBuilder({
  sections,
  onChange,
}: {
  sections: SectionDef[];
  onChange: (s: SectionDef[]) => void;
}) {
  function addSection() {
    onChange([...sections, { title: "", type: "text", fields: [] }]);
  }

  function removeSection(idx: number) {
    onChange(sections.filter((_, i) => i !== idx));
  }

  function updateSection(idx: number, patch: Partial<SectionDef>) {
    onChange(sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addField(sIdx: number) {
    const s = sections[sIdx];
    updateSection(sIdx, {
      fields: [...s.fields, { label: "", key: "" }],
    });
  }

  function updateField(
    sIdx: number,
    fIdx: number,
    patch: Partial<{ label: string; key: string }>
  ) {
    const s = sections[sIdx];
    updateSection(sIdx, {
      fields: s.fields.map((f, i) => (i === fIdx ? { ...f, ...patch } : f)),
    });
  }

  function removeField(sIdx: number, fIdx: number) {
    const s = sections[sIdx];
    updateSection(sIdx, {
      fields: s.fields.filter((_, i) => i !== fIdx),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Sections</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="mr-1 h-3 w-3" /> Add Section
        </Button>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sections yet. Add one to get started.
        </p>
      )}

      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className="rounded-lg border bg-muted/30 p-3 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Section title"
              value={section.title}
              onChange={(e) =>
                updateSection(sIdx, { title: e.target.value })
              }
              className="flex-1"
            />
            <Select
              value={section.type}
              onValueChange={(v) =>
                updateSection(sIdx, {
                  type: v as SectionDef["type"],
                })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSection(sIdx)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Field definitions */}
          <div className="pl-6 space-y-2">
            {section.fields.map((field, fIdx) => (
              <div key={fIdx} className="flex gap-2 items-center">
                <Input
                  placeholder="Field label"
                  value={field.label}
                  onChange={(e) =>
                    updateField(sIdx, fIdx, { label: e.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  placeholder="Field key"
                  value={field.key}
                  onChange={(e) =>
                    updateField(sIdx, fIdx, {
                      key: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, ""),
                    })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(sIdx, fIdx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addField(sIdx)}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" /> Add Field
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template form dialog
// ---------------------------------------------------------------------------

function TemplateFormDialog({
  template,
  open,
  onOpenChange,
}: {
  template?: Template;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [sections, setSections] = useState<SectionDef[]>(
    (template?.sections as SectionDef[] | undefined) ?? []
  );

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const payload = {
          name: formData.get("name") as string,
          type: formData.get("type") as (typeof REPORT_TYPES)[number],
          description: (formData.get("description") as string) || undefined,
          sections,
          headerConfig: {
            logoUrl: (formData.get("logoUrl") as string) || undefined,
            companyName: (formData.get("companyName") as string) || undefined,
            address: (formData.get("address") as string) || undefined,
          },
          footerConfig: {
            disclaimer: (formData.get("disclaimer") as string) || undefined,
            signatureFields: (formData.get("signatureFields") as string)
              ?.split(",")
              .map((s) => s.trim())
              .filter(Boolean) || [],
          },
          pageSize: formData.get("pageSize") as string,
          orientation: formData.get("orientation") as string,
        };

        if (template) {
          await updateReportTemplate(template.id, payload);
          toast.success("Template updated");
        } else {
          await createReportTemplate(payload);
          toast.success("Template created");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save template");
      }
    });
  }

  const headerConfig = (template?.headerConfig as HeaderConfig | undefined) ?? {};
  const footerConfig = (template?.footerConfig as FooterConfig | undefined) ?? {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={template?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                name="type"
                defaultValue={template?.type ?? "CUSTOM"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={template?.description ?? ""}
            />
          </div>

          {/* Page settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size</Label>
              <Select
                name="pageSize"
                defaultValue={template?.pageSize ?? "A4"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select
                name="orientation"
                defaultValue={template?.orientation ?? "portrait"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Header config */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Header Configuration</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-xs">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  defaultValue={headerConfig.companyName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="text-xs">
                  Logo URL
                </Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  defaultValue={headerConfig.logoUrl ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={headerConfig.address ?? ""}
              />
            </div>
          </div>

          <Separator />

          {/* Footer config */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Footer Configuration</Label>
            <div className="space-y-2">
              <Label htmlFor="disclaimer" className="text-xs">
                Disclaimer Text
              </Label>
              <Textarea
                id="disclaimer"
                name="disclaimer"
                rows={2}
                defaultValue={footerConfig.disclaimer ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signatureFields" className="text-xs">
                Signature Fields (comma-separated)
              </Label>
              <Input
                id="signatureFields"
                name="signatureFields"
                placeholder="e.g. Prepared By, Reviewed By, Approved By"
                defaultValue={footerConfig.signatureFields?.join(", ") ?? ""}
              />
            </div>
          </div>

          <Separator />

          {/* Sections */}
          <SectionBuilder sections={sections} onChange={setSections} />

          <div className="flex justify-end gap-2 pt-4">
            <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {template ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type TemplatesClientProps = {
  initialTemplates: Template[];
};

export function TemplatesClient({ initialTemplates }: TemplatesClientProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(
    undefined
  );
  const [isPending, startTransition] = useTransition();

  const filtered = initialTemplates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "ALL" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by type
  const grouped = REPORT_TYPES.reduce(
    (acc, type) => {
      const items = filtered.filter((t) => t.type === type);
      if (items.length > 0) acc[type] = items;
      return acc;
    },
    {} as Record<string, Template[]>
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteReportTemplate(id);
        toast.success("Template deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete template"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Report Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage report templates for surveys, geotechnical
            reports, designs, and more.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template cards grouped by type */}
      {Object.keys(grouped).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setEditingTemplate(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Create your first template
            </Button>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([type, templates]) => (
        <div key={type} className="space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Badge className={typeColors[type]}>{type}</Badge>
            <span className="text-muted-foreground text-sm">
              ({templates.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => {
              const sectionCount = Array.isArray(tmpl.sections)
                ? (tmpl.sections as unknown[]).length
                : 0;
              return (
                <Card
                  key={tmpl.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{tmpl.name}</CardTitle>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTemplate(tmpl);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tmpl.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tmpl.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {tmpl.pageSize} / {tmpl.orientation}
                      </span>
                      <span>
                        {tmpl._count.reports} report
                        {tmpl._count.reports !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Form dialog */}
      <TemplateFormDialog
        template={editingTemplate}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
