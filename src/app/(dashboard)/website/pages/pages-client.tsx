"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  FileCode,
  Search,
  LayoutTemplate,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePermission } from "@/hooks/use-permission";
import {
  createPage,
  updatePage,
  deletePage,
  togglePublishPage,
} from "@/lib/actions/website";
import {
  websiteTemplates,
  TEMPLATE_CATEGORIES,
  type WebsiteTemplate,
} from "@/lib/website-templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateItem = any;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getBlockCount(content: unknown): number {
  try {
    if (Array.isArray(content)) return content.length;
    if (
      typeof content === "object" &&
      content !== null &&
      "html" in (content as Record<string, unknown>)
    ) {
      return 1;
    }
  } catch {
    // ignore
  }
  return 0;
}

export function PagesClient({
  initialPages,
  templates,
}: {
  initialPages: PageItem[];
  templates: TemplateItem[];
}) {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PageItem | null>(null);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>("business");
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);

  const filtered = pages.filter(
    (p: PageItem) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setSlug("");
    setMetaTitle("");
    setMetaDesc("");
    setTemplateId("");
    setSelectedTemplateCat("business");
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const openEdit = (page: PageItem) => {
    setEditing(page);
    setTitle(page.title);
    setSlug(page.slug);
    setMetaTitle(page.metaTitle || "");
    setMetaDesc(page.metaDesc || "");
    setTemplateId(page.templateId || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      let content: { html: string; css: string };
      if (selectedTemplate) {
        content = { html: selectedTemplate.html, css: selectedTemplate.css };
      } else {
        content = { html: "<h1>New Page</h1><p>Start editing...</p>", css: "" };
      }

      if (editing) {
        const updated = await updatePage(editing.id, {
          title,
          slug,
          metaTitle: metaTitle || undefined,
          metaDesc: metaDesc || undefined,
          templateId: templateId || null,
        });
        setPages((prev: PageItem[]) =>
          prev.map((p: PageItem) => (p.id === editing.id ? updated : p))
        );
      } else {
        const created = await createPage({
          title,
          slug: slug || undefined,
          content,
          metaTitle: metaTitle || undefined,
          metaDesc: metaDesc || undefined,
          templateId: templateId || undefined,
        });
        setPages((prev: PageItem[]) => [created, ...prev]);
      }
      setDialogOpen(false);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    startTransition(async () => {
      await deletePage(id);
      setPages((prev: PageItem[]) => prev.filter((p: PageItem) => p.id !== id));
    });
  };

  const handleTogglePublish = (id: string) => {
    startTransition(async () => {
      const updated = await togglePublishPage(id);
      setPages((prev: PageItem[]) =>
        prev.map((p: PageItem) => (p.id === id ? updated : p))
      );
    });
  };

  const applyTemplate = (tplId: string) => {
    const dbTpl = templates.find((t: TemplateItem) => t.id === tplId);
    if (dbTpl) {
      setTemplateId(tplId);
      // Prefer full HTML content from stored template when available
      const content = dbTpl.content as { html?: string; css?: string } | null;
      if (content && typeof content === "object" && content.html) {
        setSelectedTemplate({
          id: dbTpl.id,
          name: dbTpl.name,
          category: dbTpl.category || "general",
          description: "Saved page template",
          tags: [dbTpl.category || "template"],
          sections: 0,
          html: content.html,
          css: content.css || "",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-muted-foreground">
            Build and manage your website pages
          </p>
        </div>
        {canCreate("pages") && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No pages yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first page to get started
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((page: PageItem) => {
                const blockCount = getBlockCount(page.content);
                return (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      /{page.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {blockCount > 0 ? "Has content" : "Empty"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={page.isPublished}
                        onCheckedChange={() => handleTogglePublish(page.id)}
                        disabled={pending}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/website/pages/${page.id}`}
                          title="Visual Editor"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <LayoutTemplate className="h-3.5 w-3.5" />
                        </Link>
                        {canUpdate("pages") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(page)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete("pages") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(page.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Page" : "Create New Page"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-2">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!editing) setSlug(slugify(e.target.value));
                    }}
                    placeholder="Page title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="page-slug"
                  />
                </div>
              </div>

              {templates.length > 0 && !editing && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start from template
                  </label>
                  <Select
                    value={templateId}
                    onValueChange={(v) => v && applyTemplate(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t: TemplateItem) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!editing && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <label className="text-sm font-semibold">
                      Full page designs
                    </label>
                    {selectedTemplate && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Selected: {selectedTemplate.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Complete GrapesJS layouts (nav through footer). Open the
                    visual editor after create to customize every section.
                  </p>

                  <div className="flex gap-1.5 flex-wrap">
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <Badge
                        key={cat.key}
                        variant={
                          selectedTemplateCat === cat.key
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setSelectedTemplateCat(cat.key)}
                      >
                        {cat.icon} {cat.label}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-1">
                    {websiteTemplates
                      .filter((t) => t.category === selectedTemplateCat)
                      .map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => {
                            setSelectedTemplate(tpl);
                            setTemplateId("");
                            if (!title) {
                              setTitle(tpl.name);
                              setSlug(slugify(tpl.name));
                            }
                          }}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedTemplate?.id === tpl.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "hover:bg-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold truncate">
                                {tpl.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5 shrink-0"
                              >
                                Full page · {tpl.sections} sections
                              </Badge>
                              {selectedTemplate?.id === tpl.id && (
                                <Badge
                                  variant="default"
                                  className="text-[10px] h-4 px-1 shrink-0"
                                >
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {tpl.description}
                            </p>
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {tpl.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Meta Title</label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO title (defaults to page title)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Meta Description</label>
                <Textarea
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="Brief description for search engines..."
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || pending}>
              {pending ? "Saving..." : editing ? "Update Page" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
