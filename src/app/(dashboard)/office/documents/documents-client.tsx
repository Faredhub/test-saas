"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  FileText,
  File,
  Code,
  Loader2,
  MoreVertical,
  Trash2,
  Share2,
  Pencil,
  ArrowLeft,
  Save,
  Users,
  FolderOpen,
  BookTemplate,
  Download,
  PencilLine,
} from "lucide-react";
import {
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/actions/office";
import {
  checkDocumentVersion,
  acquireEditLock,
  releaseEditLock,
} from "@/lib/collaboration";
import { toast } from "sonner";

type DocFormat = "RICH_TEXT" | "MARKDOWN" | "HTML";

type Doc = {
  id: string;
  title: string;
  content: string;
  format: DocFormat;
  isTemplate: boolean;
  version: number;
  sharedWith: unknown;
  tags: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string | null };
};

type User = { id: string; name: string | null; email: string | null; image?: string | null };

type Props = {
  initialDocs: Doc[];
  users: User[];
};

const formatIcon: Record<DocFormat, React.ReactNode> = {
  RICH_TEXT: <FileText className="h-4 w-4 text-blue-500" />,
  MARKDOWN: <Code className="h-4 w-4 text-green-500" />,
  HTML: <File className="h-4 w-4 text-orange-500" />,
};

const formatLabel: Record<DocFormat, string> = {
  RICH_TEXT: "Rich Text",
  MARKDOWN: "Markdown",
  HTML: "HTML",
};

export function DocumentsClient({ initialDocs, users }: Props) {
  const [docs, setDocs] = useState(initialDocs);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "templates" | "shared">("all");
  const [isPending, startTransition] = useTransition();

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newFormat, setNewFormat] = useState<DocFormat>("RICH_TEXT");
  const [newIsTemplate, setNewIsTemplate] = useState(false);

  // Editor state
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Collaboration state
  const [lockHolder, setLockHolder] = useState<string | null>(null);
  const [remoteUpdate, setRemoteUpdate] = useState(false);
  const [trackedVersion, setTrackedVersion] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const filteredDocs = docs.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
    if (filter === "templates") return matchesSearch && d.isTemplate;
    if (filter === "shared") {
      const shared = d.sharedWith as Array<{ userId: string }>;
      return matchesSearch && Array.isArray(shared) && shared.length > 0;
    }
    return matchesSearch;
  });

  function handleCreate() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      try {
        const doc = await createDocument({
          title: newTitle,
          format: newFormat,
          isTemplate: newIsTemplate,
          projectName: newProjectName || undefined,
        });
        setDocs((prev) => [{ ...doc, createdBy: { id: doc.createdById, name: "You", email: null } } as unknown as Doc, ...prev]);
        setCreateOpen(false);
        setNewTitle("");
        setNewProjectName("");
        setNewFormat("RICH_TEXT");
        setNewIsTemplate(false);
        toast.success("Document created");
      } catch {
        toast.error("Failed to create document");
      }
    });
  }

  async function openEditor(doc: Doc) {
    setEditingDoc(doc);
    setEditorContent(doc.content);
    setEditorTitle(doc.title);
    setLockHolder(null);
    setRemoteUpdate(false);
    setTrackedVersion(doc.version);

    // Try to acquire the edit lock
    try {
      const result = await acquireEditLock(doc.id);
      if (!result.acquired) {
        setLockHolder(result.heldByName ?? "Someone");
      }
    } catch {
      // Lock acquisition is best-effort
    }

    // Start polling for remote changes every 3 seconds
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const info = await checkDocumentVersion(doc.id);
        if (info.version > doc.version && info.version !== trackedVersion) {
          setRemoteUpdate(true);
        }
      } catch {
        // Polling failures are silent
      }
    }, 3000);
  }

  // Set contentEditable text when opening the editor for rich text
  useEffect(() => {
    if (editingDoc?.format === "RICH_TEXT" && editorRef.current) {
      editorRef.current.textContent = editingDoc.content || "Start writing...";
    }
  }, [editingDoc]);

  function handleSave() {
    if (!editingDoc) return;
    // For rich text, read from the contentEditable div
    const contentToSave =
      editingDoc.format === "RICH_TEXT" && editorRef.current
        ? editorRef.current.innerText
        : editorContent;

    setIsSaving(true);
    startTransition(async () => {
      try {
        const updated = await updateDocument(editingDoc.id, {
          title: editorTitle,
          content: contentToSave,
        });
        setDocs((prev) =>
          prev.map((d) =>
            d.id === editingDoc.id
              ? { ...d, title: editorTitle, content: contentToSave, version: (updated as unknown as Doc).version }
              : d
          )
        );
        const newVersion = (updated as unknown as Doc).version;
        setEditingDoc((prev) =>
          prev ? { ...prev, title: editorTitle, content: contentToSave, version: newVersion } : null
        );
        setTrackedVersion(newVersion);
        setRemoteUpdate(false);
        toast.success("Document saved");
      } catch {
        toast.error("Failed to save");
      } finally {
        setIsSaving(false);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id);
        setDocs((prev) => prev.filter((d) => d.id !== id));
        if (editingDoc?.id === id) setEditingDoc(null);
        toast.success("Document deleted");
      } catch {
        toast.error("Failed to delete document");
      }
    });
  }

  function handleShare() {
    if (!shareDocId) return;
    startTransition(async () => {
      try {
        await updateDocument(shareDocId, {
          sharedWith: selectedShareUsers.map((uid) => ({ userId: uid, permission: "read" })),
        });
        setDocs((prev) =>
          prev.map((d) =>
            d.id === shareDocId
              ? { ...d, sharedWith: selectedShareUsers.map((uid) => ({ userId: uid, permission: "read" })) }
              : d
          )
        );
        setShareOpen(false);
        setShareDocId(null);
        setSelectedShareUsers([]);
        toast.success("Sharing updated");
      } catch {
        toast.error("Failed to update sharing");
      }
    });
  }

  function handleRename() {
    if (!renameDocId || !renameTitle.trim()) return;
    startTransition(async () => {
      try {
        await updateDocument(renameDocId, { title: renameTitle });
        setDocs((prev) =>
          prev.map((d) => (d.id === renameDocId ? { ...d, title: renameTitle } : d))
        );
        setRenameOpen(false);
        setRenameDocId(null);
        setRenameTitle("");
        toast.success("Document renamed successfully");
      } catch {
        toast.error("Failed to rename document");
      }
    });
  }

  // Clean up polling and release lock when leaving editor
  function closeEditor() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (editingDoc) {
      releaseEditLock(editingDoc.id).catch(() => { });
    }
    setEditingDoc(null);
    setLockHolder(null);
    setRemoteUpdate(false);
  }

  // Release lock on unmount / tab close
  useEffect(() => {
    const handleUnload = () => {
      if (editingDoc) {
        releaseEditLock(editingDoc.id).catch(() => { });
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [editingDoc]);

  async function loadLatestVersion() {
    if (!editingDoc) return;
    try {
      const { getDocumentById } = await import("@/lib/actions/office");
      const latest = await getDocumentById(editingDoc.id);
      if (latest) {
        const updated = { ...editingDoc, content: latest.content, version: latest.version, title: latest.title };
        setEditingDoc(updated as Doc);
        setEditorContent(latest.content);
        setEditorTitle(latest.title);
        setTrackedVersion(latest.version);
        setRemoteUpdate(false);
        toast.success("Loaded latest version");
      }
    } catch {
      toast.error("Failed to load latest version");
    }
  }

  // Editor view
  if (editingDoc) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {lockHolder && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{lockHolder} is currently editing this document</span>
          </div>
        )}
        {remoteUpdate && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>This document has been updated by another user.</span>
            <Button variant="outline" size="sm" className="ml-2 h-7 text-xs" onClick={loadLatestVersion}>
              Load latest
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3 p-4 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Input
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            className="max-w-md font-semibold"
          />
          <Badge variant="secondary">{formatLabel[editingDoc.format]}</Badge>
          <Badge variant="outline">v{editingDoc.version}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`/api/office/export/document?id=${editingDoc.id}&format=docx`}
              download
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" type="button">
                <Download className="h-4 w-4 mr-1" /> DOCX
              </Button>
            </a>
            <a
              href={`/api/office/export/document?id=${editingDoc.id}&format=pdf`}
              download
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" type="button">
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </a>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          {editingDoc.format === "MARKDOWN" || editingDoc.format === "HTML" ? (
            <Textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="w-full h-full min-h-[500px] font-mono text-sm resize-none"
              placeholder={
                editingDoc.format === "MARKDOWN"
                  ? "# Start writing in Markdown..."
                  : "<h1>Start writing HTML...</h1>"
              }
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full min-h-[500px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring max-w-none whitespace-pre-wrap"
              onInput={(e) => setEditorContent(e.currentTarget.innerText)}
            />
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Create and manage documents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Document
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>
              <div>
                <Label>Project Name (Optional)</Label>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Select or type project name"
                />
              </div>
              <div>
                <Label>Format</Label>
                <Select value={newFormat} onValueChange={(v) => setNewFormat(v as DocFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RICH_TEXT">Rich Text</SelectItem>
                    <SelectItem value="HTML">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={newIsTemplate}
                  onChange={(e) => setNewIsTemplate(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isTemplate">Save as template</Label>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending || !newTitle.trim()}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1">
              <FolderOpen className="h-3.5 w-3.5" /> All
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1">
              <BookTemplate className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-1">
              <Users className="h-3.5 w-3.5" /> Shared
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No documents found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "Try a different search term" : "Create your first document to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openEditor(doc)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {formatIcon[doc.format]}
                  <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(doc);
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(doc);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameDocId(doc.id);
                        setRenameTitle(doc.title);
                        setRenameOpen(true);
                      }}
                    >
                      <PencilLine className="h-4 w-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareDocId(doc.id);
                        const shared = doc.sharedWith as Array<{ userId: string }>;
                        setSelectedShareUsers(
                          Array.isArray(shared) ? shared.map((s) => s.userId) : []
                        );
                        setShareOpen(true);
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {formatLabel[doc.format]}
                  </Badge>
                  {doc.isTemplate && (
                    <Badge variant="outline" className="text-xs">
                      Template
                    </Badge>
                  )}
                  <span className="ml-auto">v{doc.version}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  By {doc.createdBy.name ?? doc.createdBy.email} &middot;{" "}
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select users to share with:</p>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShareUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedShareUsers((prev) => [...prev, user.id]);
                        } else {
                          setSelectedShareUsers((prev) => prev.filter((id) => id !== user.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{user.name ?? user.email}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShareOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={isPending || !renameTitle.trim()}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
