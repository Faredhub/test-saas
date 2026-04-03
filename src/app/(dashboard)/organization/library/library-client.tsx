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
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Trash2,
  Pencil,
  LayoutGrid,
  List,
  BookOpen,
  Tag,
  User,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import {
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/actions/organization";
import { toast } from "sonner";

type Document = Awaited<
  ReturnType<typeof import("@/lib/actions/organization").getDocuments>
>[number];

const CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "SOP", label: "SOP" },
  { value: "POLICY", label: "Policy" },
  { value: "TEMPLATE", label: "Template" },
  { value: "TRAINING", label: "Training" },
  { value: "OTHER", label: "Other" },
] as const;

function categoryBadgeClass(category: string) {
  switch (category) {
    case "SOP":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "POLICY":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "TEMPLATE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "TRAINING":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "OTHER":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function uploaderName(
  u: { name: string | null; firstName: string | null; lastName: string | null } | null
): string {
  if (!u) return "-";
  if (u.name) return u.name;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "-";
}

type LibraryClientProps = {
  initialData: Document[];
};

export function LibraryClient({ initialData }: LibraryClientProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isOpen, setIsOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("GENERAL");
  const [formTags, setFormTags] = useState("");
  const [formContent, setFormContent] = useState("");

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("GENERAL");
    setFormTags("");
    setFormContent("");
    setEditDoc(null);
  }

  function openEdit(doc: Document) {
    setFormTitle(doc.title);
    setFormDescription(doc.description ?? "");
    setFormCategory(doc.category);
    setFormTags((doc.tags ?? []).join(", "));
    setFormContent(doc.content ?? "");
    setEditDoc(doc);
    setIsOpen(true);
    setActionsOpenId(null);
  }

  function handleSubmit() {
    if (!formTitle.trim()) {
      toast.error("Document title is required");
      return;
    }

    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        if (editDoc) {
          await updateDocument(editDoc.id, {
            title: formTitle.trim(),
            description: formDescription || null,
            category: formCategory,
            tags,
            content: formContent || null,
          });
          toast.success("Document updated successfully");
        } else {
          await createDocument({
            title: formTitle.trim(),
            description: formDescription || undefined,
            category: formCategory,
            tags,
            content: formContent || undefined,
          });
          toast.success("Document created successfully");
        }
        setIsOpen(false);
        resetForm();
      } catch {
        toast.error(editDoc ? "Failed to update document" : "Failed to create document");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id);
        toast.success("Document deleted");
        setDeleteConfirmId(null);
        setActionsOpenId(null);
      } catch {
        toast.error("Failed to delete document");
      }
    });
  }

  const filtered = initialData.filter((doc) => {
    if (categoryFilter !== "ALL" && doc.category !== categoryFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      doc.title.toLowerCase().includes(s) ||
      (doc.description ?? "").toLowerCase().includes(s) ||
      (doc.content ?? "").toLowerCase().includes(s) ||
      (doc.tags ?? []).some((tag) => tag.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">
            Knowledge base &mdash; SOPs, policies, templates, and documents
          </p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Document
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editDoc ? "Edit Document" : "Add Document"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="doc-title">Title *</Label>
                <Input
                  id="doc-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Employee Onboarding Guide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-description">Description</Label>
                <Textarea
                  id="doc-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief summary of the document..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formCategory}
                    onValueChange={(val) => setFormCategory(val ?? "GENERAL")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-tags">Tags</Label>
                  <Input
                    id="doc-tags"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="hr, onboarding, guide"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-content">Content</Label>
                <Textarea
                  id="doc-content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Document content or notes..."
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editDoc ? "Save Changes" : "Add Document"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, content, or tags..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val ?? "ALL")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-md border">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                No documents found. Add your first document to get started.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ===== GRID VIEW ===== */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  {/* Actions menu */}
                  <div className="absolute right-3 top-3">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          setActionsOpenId(
                            actionsOpenId === doc.id ? null : doc.id
                          )
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {actionsOpenId === doc.id && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                            onClick={() => openEdit(doc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <div className="my-1 h-px bg-border" />
                          {deleteConfirmId === doc.id ? (
                            <div className="flex items-center gap-1 px-2 py-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleDelete(doc.id)}
                                disabled={isPending}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                              onClick={() => setDeleteConfirmId(doc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex items-start gap-3 pr-8">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      {doc.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category + tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={categoryBadgeClass(doc.category)}
                    >
                      {doc.category}
                    </Badge>
                    {(doc.tags ?? []).slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {(doc.tags ?? []).length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{doc.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      v{doc.version}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {uploaderName(doc.uploadedBy)}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ===== LIST VIEW ===== */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[240px]">
                            {doc.title}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={categoryBadgeClass(doc.category)}
                      >
                        {doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(doc.tags ?? []).slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {(doc.tags ?? []).length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{doc.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>v{doc.version}</TableCell>
                    <TableCell>{uploaderName(doc.uploadedBy)}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="relative inline-block">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActionsOpenId(
                              actionsOpenId === doc.id ? null : doc.id
                            )
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {actionsOpenId === doc.id && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                              onClick={() => openEdit(doc)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <div className="my-1 h-px bg-border" />
                            {deleteConfirmId === doc.id ? (
                              <div className="flex items-center gap-1 px-2 py-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={isPending}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setDeleteConfirmId(null)}
                                  disabled={isPending}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                                onClick={() => setDeleteConfirmId(doc.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
