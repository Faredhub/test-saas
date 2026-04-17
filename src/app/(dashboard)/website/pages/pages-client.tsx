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
  Eye,
  EyeOff,
  GripVertical,
  Type,
  AlignLeft,
  Image,
  MousePointerClick,
  Columns,
  X,
  LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import {
  createPage,
  updatePage,
  deletePage,
  togglePublishPage,
} from "@/lib/actions/website";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateItem = any;

type ContentBlock = {
  id: string;
  type: "heading" | "text" | "image" | "button" | "columns";
  props: Record<string, string>;
};

const BLOCK_TYPES = [
  { type: "heading" as const, label: "Heading", icon: Type },
  { type: "text" as const, label: "Text", icon: AlignLeft },
  { type: "image" as const, label: "Image", icon: Image },
  { type: "button" as const, label: "Button", icon: MousePointerClick },
  { type: "columns" as const, label: "Columns", icon: Columns },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const addBlock = (type: ContentBlock["type"]) => {
    const defaults: Record<string, Record<string, string>> = {
      heading: { text: "New Heading", level: "h2" },
      text: { text: "Enter your text here..." },
      image: { src: "", alt: "" },
      button: { text: "Click me", href: "#" },
      columns: { left: "Left column", right: "Right column" },
    };
    onChange([
      ...blocks,
      { id: crypto.randomUUID(), type, props: defaults[type] },
    ]);
  };

  const updateBlock = (id: string, props: Record<string, string>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, props } : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const newBlocks = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [
      newBlocks[target],
      newBlocks[index],
    ];
    onChange(newBlocks);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {BLOCK_TYPES.map((bt) => (
          <Button
            key={bt.type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addBlock(bt.type)}
          >
            <bt.icon className="h-3 w-3 mr-1" />
            {bt.label}
          </Button>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          Click a block type above to start building your page
        </div>
      )}

      {blocks.map((block, i) => (
        <div
          key={block.id}
          className="border rounded-lg p-3 space-y-2 bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs capitalize">
                {block.type}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(i, -1)}
                disabled={i === 0}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(i, 1)}
                disabled={i === blocks.length - 1}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeBlock(block.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {block.type === "heading" && (
            <div className="space-y-2">
              <Select
                value={block.props.level}
                onValueChange={(v) =>
                  v && updateBlock(block.id, { ...block.props, level: v })
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={block.props.text}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    text: e.target.value,
                  })
                }
                placeholder="Heading text"
              />
            </div>
          )}

          {block.type === "text" && (
            <Textarea
              value={block.props.text}
              onChange={(e) =>
                updateBlock(block.id, {
                  ...block.props,
                  text: e.target.value,
                })
              }
              placeholder="Paragraph text..."
              rows={3}
            />
          )}

          {block.type === "image" && (
            <div className="grid gap-2 grid-cols-2">
              <Input
                value={block.props.src}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    src: e.target.value,
                  })
                }
                placeholder="Image URL"
              />
              <Input
                value={block.props.alt}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    alt: e.target.value,
                  })
                }
                placeholder="Alt text"
              />
            </div>
          )}

          {block.type === "button" && (
            <div className="grid gap-2 grid-cols-2">
              <Input
                value={block.props.text}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    text: e.target.value,
                  })
                }
                placeholder="Button text"
              />
              <Input
                value={block.props.href}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    href: e.target.value,
                  })
                }
                placeholder="Link URL"
              />
            </div>
          )}

          {block.type === "columns" && (
            <div className="grid gap-2 grid-cols-2">
              <Textarea
                value={block.props.left}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    left: e.target.value,
                  })
                }
                placeholder="Left column"
                rows={3}
              />
              <Textarea
                value={block.props.right}
                onChange={(e) =>
                  updateBlock(block.id, {
                    ...block.props,
                    right: e.target.value,
                  })
                }
                placeholder="Right column"
                rows={3}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PagesClient({
  initialPages,
  templates,
}: {
  initialPages: PageItem[];
  templates: TemplateItem[];
}) {
  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PageItem | null>(null);
  const [pending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [templateId, setTemplateId] = useState<string>("");

  const filtered = pages.filter(
    (p: PageItem) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setSlug("");
    setBlocks([]);
    setMetaTitle("");
    setMetaDesc("");
    setTemplateId("");
    setDialogOpen(true);
  };

  const openEdit = (page: PageItem) => {
    setEditing(page);
    setTitle(page.title);
    setSlug(page.slug);
    setBlocks(
      Array.isArray(page.content) ? (page.content as ContentBlock[]) : []
    );
    setMetaTitle(page.metaTitle || "");
    setMetaDesc(page.metaDesc || "");
    setTemplateId(page.templateId || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      if (editing) {
        const updated = await updatePage(editing.id, {
          title,
          slug,
          content: blocks,
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
          content: blocks,
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
    const tpl = templates.find((t: TemplateItem) => t.id === tplId);
    if (tpl && Array.isArray(tpl.content)) {
      setBlocks(tpl.content as ContentBlock[]);
      setTemplateId(tplId);
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
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
                <TableHead>Blocks</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((page: PageItem) => {
                const blockCount = Array.isArray(page.content)
                  ? page.content.length
                  : 0;
                return (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      /{page.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{blockCount} blocks</Badge>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(page)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(page.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <Select value={templateId} onValueChange={(v) => v && applyTemplate(v)}>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Content Blocks</label>
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              </div>
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
