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
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Type,
  Paintbrush,
  List,
  ListOrdered,
  Image,
  Table,
  Link,
  MessageSquare,
  Calendar,
  Clock,
  Square,
  Maximize2,
  CheckSquare,
  Scissors,
  Copy,
  Clipboard,
  Eye,
  BookOpen,
  Sparkles,
  Globe,
  Activity,
  ChevronRight,
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
  projectName?: string | null;
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
  RICH_TEXT: "",
  MARKDOWN: "Markdown",
  HTML: "HTML",
};

export function DocumentsClient({ initialDocs, users }: Props) {
  const [docs, setDocs] = useState(initialDocs);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "templates" | "shared">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadProjects() {
      try {
        const { getProjects } = await import("@/lib/actions/projects");
        const res = await getProjects({ pageSize: 100 });
        if (res && res.projects) {
          setProjectsList(res.projects.map((p) => p.name));
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    }
    loadProjects();
  }, []);

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

  // Word Redesign states
  const [ribbonTab, setRibbonTab] = useState<"home" | "insert" | "layout" | "review" | "view">("home");
  const [zoom, setZoom] = useState(100);
  const [rulerLeft, setRulerLeft] = useState(96); // left indent margin in px
  const [rulerRight, setRulerRight] = useState(96); // right indent margin in px
  const [pageColor, setPageColor] = useState<"white" | "sepia" | "dark">("white");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"A4" | "letter">("A4");
  const [margins, setMargins] = useState<"normal" | "narrow" | "wide">("normal");
  const [showRuler, setShowRuler] = useState(true);
  const [showGridlines, setShowGridlines] = useState(false);
  const [readMode, setReadMode] = useState(false);

  // Find & Replace
  const [findOpen, setFindOpen] = useState(false);
  const [findKeyword, setFindKeyword] = useState("");
  const [replaceKeyword, setReplaceKeyword] = useState("");

  // Comments & Track Changes
  const [comments, setComments] = useState<Array<{ id: string; text: string; author: string; resolved: boolean; date: string; replies: string[] }>>([
    { id: "1", text: "Please review the introduction header.", author: "Alice Smith", resolved: false, date: "10:30 AM", replies: [] },
  ]);
  const [newCommentText, setNewCommentText] = useState("");
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [trackChanges, setTrackChanges] = useState(false);
  const [trackAcceptCount, setTrackAcceptCount] = useState(0);
  const [spellCheckOpen, setSpellCheckOpen] = useState(false);
  const [showTranslateOpen, setShowTranslateOpen] = useState(false);
  const [spellErrorsCount, setSpellErrorsCount] = useState(0);

  // Undo / Redo Stacks
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Font and Styling Dropdown display states
  const [fontFamily, setFontFamily] = useState("Calibri");
  const [fontSize, setFontSize] = useState("11");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

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

  const uniqueProjects = Array.from(
    new Set(
      docs
        .map((d) => d.projectName)
        .filter((name): name is string => typeof name === "string" && name.trim() !== "")
    )
  );
  const hasNoProject = docs.some((d) => !d.projectName);

  const filteredDocs = docs.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());

    let matchesProject = true;
    if (projectFilter !== "all") {
      const docProj = d.projectName || "Others";
      matchesProject = docProj === projectFilter;
    }

    if (filter === "templates") return matchesSearch && matchesProject && d.isTemplate;
    if (filter === "shared") {
      const shared = d.sharedWith as Array<{ userId: string }>;
      return matchesSearch && matchesProject && Array.isArray(shared) && shared.length > 0;
    }
    return matchesSearch && matchesProject;
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
      editorRef.current.innerHTML = editingDoc.content || "<p>Start writing...</p>";
    }
  }, [editingDoc]);

  // Helper to apply formatting styles using browser Selection / document.execCommand
  function applyFormat(command: string, value: string = "") {
    if (!editorRef.current) return;

    setHistory((prev) => [...prev, editorRef.current?.innerHTML || ""]);
    setRedoStack([]);

    document.execCommand(command, false, value);
    updateToolbarActiveStates();
    setEditorContent(editorRef.current.innerHTML);
    triggerAutoSave();
  }

  function clearFormatting() {
    if (!editorRef.current) return;
    setHistory((prev) => [...prev, editorRef.current?.innerHTML || ""]);
    setRedoStack([]);

    document.execCommand("removeFormat", false);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.innerHTML = range.toString();
      range.deleteContents();
      range.insertNode(span);
    }

    updateToolbarActiveStates();
    setEditorContent(editorRef.current.innerHTML);
    triggerAutoSave();
  }

  function updateToolbarActiveStates() {
    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
    setIsUnderline(document.queryCommandState("underline"));
  }

  function handleUndo() {
    if (history.length === 0 || !editorRef.current) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, editorRef.current?.innerHTML || ""]);
    editorRef.current.innerHTML = previous;
    setEditorContent(previous);
    updateToolbarActiveStates();
    triggerAutoSave();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleRedo() {
    if (redoStack.length === 0 || !editorRef.current) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, editorRef.current?.innerHTML || ""]);
    editorRef.current.innerHTML = next;
    setEditorContent(next);
    updateToolbarActiveStates();
    triggerAutoSave();
  }

  // Insert operations
  function insertTable(rows: number, cols: number) {
    if (!editorRef.current) return;
    let tableHtml = `<table class="border-collapse border border-slate-400 w-full my-4 text-sm text-foreground"><tbody>`;
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td class="border border-slate-300 p-2 min-w-[80px]" contenteditable="true">Cell</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    setHistory((prev) => [...prev, editorRef.current?.innerHTML || ""]);
    document.execCommand("insertHTML", false, tableHtml);
    setEditorContent(editorRef.current.innerHTML);
    triggerAutoSave();
  }

  function insertImage() {
    const url = prompt("Enter image URL:", "https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f?w=600&auto=format&fit=crop&q=60");
    if (!url) return;

    const imgHtml = `
      <div class="my-4 relative inline-block group" contenteditable="false">
        <img src="${url}" class="max-w-full rounded-md border shadow-sm select-none" style="width: 300px;" />
        <div class="absolute inset-0 border-2 border-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
      <p contenteditable="true"><br></p>
    `;

    document.execCommand("insertHTML", false, imgHtml);
    setEditorContent(editorRef.current?.innerHTML || "");
    triggerAutoSave();
  }

  function insertShape(shapeType: "rect" | "circle" | "line") {
    if (!editorRef.current) return;
    let shapeHtml = "";
    if (shapeType === "rect") {
      shapeHtml = `<div class="my-4 w-32 h-20 bg-blue-500/20 border-2 border-blue-500 rounded-md inline-block select-none" contenteditable="false"></div><p><br></p>`;
    } else if (shapeType === "circle") {
      shapeHtml = `<div class="my-4 w-24 h-24 bg-red-500/20 border-2 border-red-500 rounded-full inline-block select-none" contenteditable="false"></div><p><br></p>`;
    } else {
      shapeHtml = `<hr class="my-4 border-t-2 border-slate-300" contenteditable="false" /><p><br></p>`;
    }
    document.execCommand("insertHTML", false, shapeHtml);
    setEditorContent(editorRef.current.innerHTML);
    triggerAutoSave();
  }

  function insertIcon(iconName: string) {
    if (!editorRef.current) return;
    const iconHtml = `<span class="inline-flex items-center text-emerald-600 font-semibold px-1 select-none" contenteditable="false">[★ Icon: ${iconName}]</span> `;
    document.execCommand("insertHTML", false, iconHtml);
    setEditorContent(editorRef.current.innerHTML);
    triggerAutoSave();
  }

  function insertHyperlink() {
    const url = prompt("Enter link URL:", "https://google.com");
    if (!url) return;
    document.execCommand("createLink", false, url);
    setEditorContent(editorRef.current?.innerHTML || "");
    triggerAutoSave();
  }

  // Word & Character counters
  function getWordCounts() {
    if (!editorRef.current) return { words: 0, characters: 0 };
    const text = editorRef.current.innerText || "";
    const cleanText = text.replace(/Start writing\.\.\./g, "").trim();
    if (!cleanText) return { words: 0, characters: 0 };
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    const characters = cleanText.length;
    return { words, characters };
  }

  // Autosave triggers
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function triggerAutoSave() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutosave();
    }, 2000);
  }

  async function handleAutosave() {
    if (!editingDoc || !editorRef.current) return;
    const contentToSave = editorRef.current.innerHTML;
    try {
      await updateDocument(editingDoc.id, {
        title: editorTitle,
        content: contentToSave,
      });
      setDocs((prev) =>
        prev.map((d) =>
          d.id === editingDoc.id ? { ...d, title: editorTitle, content: contentToSave } : d
        )
      );
    } catch (err) {
      console.error("Autosave failed", err);
    }
  }

  // Find & Replace action
  function handleFindReplace() {
    if (!editorRef.current || !findKeyword) return;

    setHistory((prev) => [...prev, editorRef.current?.innerHTML || ""]);
    setRedoStack([]);

    const text = editorRef.current.innerHTML;
    const escapedKeyword = findKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escapedKeyword, "gi");

    const replaced = text.replace(regex, (match) => {
      return replaceKeyword;
    });

    editorRef.current.innerHTML = replaced;
    setEditorContent(replaced);
    setFindOpen(false);
    setFindKeyword("");
    setReplaceKeyword("");
    toast.success("Text replaced successfully");
    triggerAutoSave();
  }

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
  // Editor view
  if (editingDoc) {
    if (editingDoc.format !== "RICH_TEXT") {
      return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background overflow-hidden animate-in fade-in duration-200 select-none">
          {/* Plain Source Code Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 shrink-0 gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-8 hover:bg-slate-100" onClick={closeEditor}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 rounded transition-all w-[240px] text-foreground font-sans"
              />
              <Badge variant="secondary" className="text-xs font-sans">{formatLabel[editingDoc.format]}</Badge>
              <Badge variant="outline" className="text-xs font-sans">v{editingDoc.version}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 shadow-sm cursor-pointer font-sans">
                  <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <a href={`/api/office/export/document?id=${editingDoc.id}&format=docx`} download className="flex items-center w-full">
                      Word Document (.docx)
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <a href={`/api/office/export/document?id=${editingDoc.id}&format=pdf`} download className="flex items-center w-full font-sans">
                      PDF Document (.pdf)
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-normal font-sans" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
          </div>

          {/* Clean full screen textarea editor */}
          <div className="flex-1 p-0 overflow-hidden relative">
            <Textarea
              value={editorContent}
              onChange={(e) => {
                setEditorContent(e.target.value);
                triggerAutoSave();
              }}
              className="w-full h-full p-4 font-mono text-sm resize-none border-none outline-none focus-visible:ring-0 focus:ring-0 focus:outline-none bg-background text-foreground select-text"
              placeholder={
                editingDoc.format === "MARKDOWN"
                  ? "# Start writing in Markdown..."
                  : "<h1>Start writing HTML...</h1>"
              }
            />
          </div>
        </div>
      );
    }

    const { words, characters } = getWordCounts();

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100/60 overflow-hidden font-sans select-none animate-in fade-in duration-200">
        {/* Word Online Header Row */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background shrink-0 gap-3">
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-slate-100" onClick={closeEditor}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 rounded transition-all w-[240px]"
                />
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Saved to Cloud
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-xs px-2.5 py-0.5">
              {formatLabel[editingDoc.format]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{editingDoc.version}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 shadow-sm">
                <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <a href={`/api/office/export/document?id=${editingDoc.id}&format=docx`} download className="flex items-center w-full">
                    Word Document (.docx)
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a href={`/api/office/export/document?id=${editingDoc.id}&format=pdf`} download className="flex items-center w-full">
                    PDF Document (.pdf)
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-normal" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* Word Online Ribbon Toolbar */}
        <div className="border-b bg-background shrink-0 flex flex-col shadow-sm select-none z-10">
          {/* Tabs header */}
          <div className="flex items-center border-b px-4 bg-slate-50/50">
            {([
              { id: "home", label: "Home" },
              { id: "insert", label: "Insert" },
              { id: "layout", label: "Layout" },
              { id: "review", label: "Review" },
              { id: "view", label: "View" }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRibbonTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${ribbonTab === tab.id
                    ? "border-blue-600 text-blue-600 font-bold bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ribbon items container */}
          <div className="p-1.5 bg-background flex items-center gap-3 overflow-x-auto min-h-[52px]">
            {ribbonTab === "home" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Clipboard */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Paste" onClick={() => toast.info("Use Ctrl+V to paste content")}>
                    <Clipboard className="h-4 w-4 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Cut" onClick={() => applyFormat("cut")}>
                    <Scissors className="h-4 w-4 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Copy" onClick={() => applyFormat("copy")}>
                    <Copy className="h-4 w-4 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Format Painter" onClick={() => toast.info("Format Painter active")}>
                    <Paintbrush className="h-4 w-4 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Clipboard</span>
                </div>

                {/* Font Family / Sizes */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-xs px-2 py-1 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 font-mono h-7 text-foreground">
                      {fontFamily} <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {["Calibri", "Arial", "Georgia", "Times New Roman", "Courier New"].map((font) => (
                        <DropdownMenuItem key={font} onClick={() => { setFontFamily(font); applyFormat("fontName", font); }}>
                          {font}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-xs px-2 py-1 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 h-7 text-foreground">
                      {fontSize} <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {["10", "11", "12", "14", "16", "18", "20", "24"].map((sz) => (
                        <DropdownMenuItem key={sz} onClick={() => { setFontSize(sz); applyFormat("fontSize", sz); }}>
                          {sz}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="h-4 w-[1px] bg-border mx-0.5" />

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 hover:bg-slate-100 ${isBold ? "bg-slate-150 text-blue-600 font-bold" : ""}`}
                    onClick={() => applyFormat("bold")}
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 hover:bg-slate-100 ${isItalic ? "bg-slate-150 text-blue-600 font-bold" : ""}`}
                    onClick={() => applyFormat("italic")}
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 hover:bg-slate-100 ${isUnderline ? "bg-slate-150 text-blue-600 font-bold" : ""}`}
                    onClick={() => applyFormat("underline")}
                    title="Underline"
                  >
                    <Underline className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-slate-100"
                    onClick={() => applyFormat("strikeThrough")}
                    title="Strikethrough"
                  >
                    <Strikethrough className="h-3.5 w-3.5 text-foreground" />
                  </Button>

                  {/* Highlights */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 w-7 hover:bg-slate-100 rounded flex items-center justify-center" title="Highlight Color">
                      <Paintbrush className="h-3.5 w-3.5 text-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-1.5 min-w-[100px]">
                      <div className="grid grid-cols-4 gap-1">
                        {["#ffff00", "#00ffff", "#00ff00", "#ff00ff", ""].map((color) => (
                          <button
                            key={color}
                            onClick={() => applyFormat("hiliteColor", color || "#ffffff")}
                            className="h-5 w-5 border rounded"
                            style={{ backgroundColor: color || "#ffffff" }}
                          />
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Text Color */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 w-7 hover:bg-slate-100 rounded flex items-center justify-center" title="Font Color">
                      <Type className="h-3.5 w-3.5 text-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-1.5 min-w-[100px]">
                      <div className="grid grid-cols-4 gap-1">
                        {["#ef4444", "#3b82f6", "#10b981", "#000000", ""].map((color) => (
                          <button
                            key={color}
                            onClick={() => applyFormat("foreColor", color || "#000000")}
                            className="h-5 w-5 border rounded"
                            style={{ backgroundColor: color || "#000000" }}
                          />
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Clear Formatting" onClick={clearFormatting}>
                    <Trash2 className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Font</span>
                </div>

                {/* Paragraph Alignments */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Align Left" onClick={() => applyFormat("justifyLeft")}>
                    <AlignLeft className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Center" onClick={() => applyFormat("justifyCenter")}>
                    <AlignCenter className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Align Right" onClick={() => applyFormat("justifyRight")}>
                    <AlignRight className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Justify" onClick={() => applyFormat("justifyFull")}>
                    <AlignJustify className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <div className="h-4 w-[1px] bg-border mx-0.5" />

                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Bullets" onClick={() => applyFormat("insertUnorderedList")}>
                    <List className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Numbering" onClick={() => applyFormat("insertOrderedList")}>
                    <ListOrdered className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Paragraph</span>
                </div>

                {/* Text Styles */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-normal" onClick={() => applyFormat("formatBlock", "<p>")}>
                    Normal
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-semibold text-blue-600" onClick={() => applyFormat("formatBlock", "<h1>")}>
                    H1
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-semibold text-blue-500" onClick={() => applyFormat("formatBlock", "<h2>")}>
                    H2
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-slate-800" onClick={() => applyFormat("formatBlock", "<h3>")}>
                    H3
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] italic text-muted-foreground" onClick={() => applyFormat("formatBlock", "<blockquote>")}>
                    Quote
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Styles</span>
                </div>

                {/* Undo / Redo */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Undo" onClick={handleUndo} disabled={history.length === 0}>
                    <Undo className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Redo" onClick={handleRedo} disabled={redoStack.length === 0}>
                    <Redo className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">History</span>
                </div>

                {/* Editing Find/Replace */}
                <div className="flex items-center gap-1 h-9">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setFindOpen(true)}>
                    <Search className="h-3 w-3" /> Find & Replace
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "insert" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Tables */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 h-7 text-foreground">
                      <Table className="h-3.5 w-3.5 mr-1 text-blue-600" /> Table <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-2 w-[140px]">
                      <div className="text-[10px] text-muted-foreground mb-1.5">Select grid dimensions:</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[[2, 2], [3, 3], [4, 4]].map(([r, c]) => (
                          <button
                            key={`${r}x${c}`}
                            onClick={() => insertTable(r, c)}
                            className="text-[10px] border p-1 rounded hover:bg-blue-50 hover:text-blue-600 text-center"
                          >
                            {r}x{c}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Tables</span>
                </div>

                {/* Illustrations */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={insertImage}>
                    <Image className="h-3.5 w-3.5 text-emerald-600" /> Picture
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Shape <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => insertShape("rect")}>Rectangle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertShape("circle")}>Circle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertShape("line")}>Horizontal Line</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Icon <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {["Star", "Check", "Circle", "Arrow"].map((icon) => (
                        <DropdownMenuItem key={icon} onClick={() => insertIcon(icon)}>
                          {icon}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Illustrations</span>
                </div>

                {/* Links & Comments */}
                <div className="flex items-center gap-1 h-9">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={insertHyperlink}>
                    <Link className="h-3.5 w-3.5 text-blue-600" /> Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      const txt = prompt("Add comment to document:");
                      if (txt) {
                        setComments((prev) => [
                          ...prev,
                          { id: Date.now().toString(), text: txt, author: "You", resolved: false, date: "Just now", replies: [] }
                        ]);
                        setShowCommentsSidebar(true);
                      }
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-orange-600" /> Comment
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "layout" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Margins Selection */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Margins ({margins}) <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => { setMargins("normal"); setRulerLeft(96); setRulerRight(96); }}>
                        Normal (1 inch)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMargins("narrow"); setRulerLeft(48); setRulerRight(48); }}>
                        Narrow (0.5 inch)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMargins("wide"); setRulerLeft(192); setRulerRight(192); }}>
                        Wide (2 inch)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Page Setup</span>
                </div>

                {/* Page Orientation */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Orientation ({orientation}) <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setOrientation("portrait")}>Portrait</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOrientation("landscape")}>Landscape</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Size */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Size ({pageSize}) <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setPageSize("A4")}>A4</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPageSize("letter")}>Letter</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Page Color background */}
                <div className="flex items-center gap-1 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Page Color <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setPageColor("white")}>White</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPageColor("sepia")}>Sepia</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPageColor("dark")}>Dark Gray</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {ribbonTab === "review" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Proofing */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      setSpellCheckOpen(true);
                      setSpellErrorsCount(1);
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" /> Spelling & Grammar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => toast.info(`Word Count: ${words} words, ${characters} characters`)}>
                    <Activity className="h-3.5 w-3.5 text-slate-600" /> Word Count
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Proofing</span>
                </div>

                {/* Track Changes */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <Button
                    variant={trackChanges ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 gap-1 ${trackChanges ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                    onClick={() => {
                      setTrackChanges(!trackChanges);
                      toast.success(trackChanges ? "Track changes disabled" : "Track changes active");
                    }}
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Track Changes
                  </Button>

                  {trackChanges && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => {
                      setTrackAcceptCount(c => c + 1);
                      toast.success("Accept all changes applied");
                    }}>
                      Accept All
                    </Button>
                  )}
                </div>

                {/* Comments Panels */}
                <div className="flex items-center gap-1 h-9">
                  <Button
                    variant={showCommentsSidebar ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 gap-1 ${showCommentsSidebar ? "bg-orange-600 text-white hover:bg-orange-700" : ""}`}
                    onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Review Comments ({comments.filter(c => !c.resolved).length})
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "view" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Views */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <Button variant={!readMode ? "default" : "ghost"} size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setReadMode(false)}>
                    <Eye className="h-3.5 w-3.5" /> Edit Layout
                  </Button>
                  <Button variant={readMode ? "default" : "ghost"} size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setReadMode(true)}>
                    <BookOpen className="h-3.5 w-3.5" /> Read Mode
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Views</span>
                </div>

                {/* Show/Hide options */}
                <div className="flex items-center gap-2 border-r pr-3 h-9 text-foreground font-normal">
                  <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-100 p-1 rounded">
                    <input type="checkbox" checked={showRuler} onChange={(e) => setShowRuler(e.target.checked)} className="rounded" />
                    <span>Ruler</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer hover:bg-slate-100 p-1 rounded">
                    <input type="checkbox" checked={showGridlines} onChange={(e) => setShowGridlines(e.target.checked)} className="rounded" />
                    <span>Gridlines</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Show/Hide</span>
                </div>

                {/* Zoom percentage controls */}
                <div className="flex items-center gap-1.5 h-9">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setZoom(80)}>80%</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setZoom(100)}>100%</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setZoom(120)}>120%</Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Zoom</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Ruler (Word Style) */}
        {showRuler && !readMode && (
          <div className="bg-background border-b h-6 shrink-0 flex items-center relative select-none font-mono text-[9px] text-muted-foreground/70 overflow-hidden">
            {/* Left margin block */}
            <div className="absolute top-0 bottom-0 bg-slate-100/80 border-r" style={{ width: `${rulerLeft}px` }} />

            {/* Margins drag indicators */}
            <div
              className="absolute top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-600 transition-colors z-20 flex items-center justify-center bg-blue-600/10"
              style={{ left: `${rulerLeft - 4}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startLeft = rulerLeft;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = moveEvent.clientX - startX;
                  setRulerLeft(Math.max(48, Math.min(startLeft + delta, 300)));
                };
                const onMouseUp = () => {
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
            />

            {/* Middle ticks */}
            <div className="flex-1 h-full relative" style={{ marginLeft: `${rulerLeft}px`, marginRight: `${rulerRight}px` }}>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="absolute bottom-0 border-l border-muted-foreground/30 h-2.5 flex flex-col justify-end" style={{ left: `${i * 48}px` }}>
                  <span className="translate-x-1 translate-y-[-1px]">{i + 1}</span>
                  <div className="absolute left-[12px] h-1 border-l border-muted-foreground/30 bottom-0" />
                  <div className="absolute left-[24px] h-1.5 border-l border-muted-foreground/30 bottom-0" />
                  <div className="absolute left-[36px] h-1 border-l border-muted-foreground/30 bottom-0" />
                </div>
              ))}
            </div>

            {/* Right margin block */}
            <div className="absolute top-0 right-0 bottom-0 bg-slate-100/80 border-l" style={{ width: `${rulerRight}px` }} />
            <div
              className="absolute top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-600 transition-colors z-20 flex items-center justify-center bg-blue-600/10"
              style={{ right: `${rulerRight - 4}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startRight = rulerRight;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startX - moveEvent.clientX;
                  setRulerRight(Math.max(48, Math.min(startRight + delta, 300)));
                };
                const onMouseUp = () => {
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
            />
          </div>
        )}

        {/* Collaboration warning banner hooks */}
        {lockHolder && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs shrink-0 select-none">
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{lockHolder} is currently editing this document</span>
          </div>
        )}
        {remoteUpdate && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs shrink-0 select-none">
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            <span>This document has been updated by another user.</span>
            <Button variant="outline" size="sm" className="ml-2 h-6 text-[10px] px-2 py-0.5" onClick={loadLatestVersion}>
              Load latest
            </Button>
          </div>
        )}

        {/* Word Document Canvas Space */}
        <div className="flex-1 flex overflow-hidden relative">
          <div
            className="flex-1 overflow-y-auto bg-slate-200/50 p-6 flex flex-col justify-start items-center transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={() => editorRef.current?.focus()}
          >
            {/* Center A4 paper centered styled page */}
            <div
              style={{
                width: orientation === "portrait" ? "816px" : "1056px",
                minHeight: orientation === "portrait" ? "1056px" : "816px",
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                paddingLeft: `${rulerLeft}px`,
                paddingRight: `${rulerRight}px`,
                paddingTop: margins === "narrow" ? "48px" : margins === "wide" ? "192px" : "96px",
                paddingBottom: margins === "narrow" ? "48px" : margins === "wide" ? "192px" : "96px",
                backgroundImage: showGridlines ? "radial-gradient(circle, #cbd5e1 1px, transparent 1px)" : "none",
                backgroundSize: "16px 16px",
              }}
              className={`relative border border-slate-300 shadow-xl transition-all select-text shrink-0 pb-12 mb-16 duration-200 ${pageColor === "sepia" ? "bg-[#f4ecd8] text-[#5b4636] border-[#e8dfc8]" :
                  pageColor === "dark" ? "bg-[#202020] text-zinc-100 border-[#2f2f2f]" :
                    "bg-white text-black"
                }`}
            >
              {/* Double-clickable Header area */}
              <div
                className="absolute top-4 left-24 right-24 text-[10px] text-muted-foreground border-b border-dashed border-transparent hover:border-muted-foreground/30 py-1 transition-all select-none text-center cursor-text"
                title="Double click to edit Header"
                onDoubleClick={() => {
                  const val = prompt("Edit Document Header text:", "TixelTech Office Module");
                  if (val !== null) toast.success("Header updated");
                }}
              >
                TixelTech Office Module - Standard Header
              </div>

              {/* Editable inner doc body container */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full h-full min-h-[700px] focus:outline-none focus:ring-0 max-w-none prose prose-slate focus-visible:ring-0 p-0 text-sm bg-transparent outline-none border-none select-text"
                onInput={(e) => {
                  setEditorContent(e.currentTarget.innerHTML);
                  triggerAutoSave();
                }}
                onKeyUp={updateToolbarActiveStates}
                onMouseUp={updateToolbarActiveStates}
              />

              {/* Double-clickable Footer area */}
              <div
                className="absolute bottom-4 left-24 right-24 text-[10px] text-muted-foreground border-t border-dashed border-transparent hover:border-muted-foreground/30 py-1 transition-all select-none flex justify-between cursor-text"
                title="Double click to edit Footer"
                onDoubleClick={() => {
                  const val = prompt("Edit Document Footer text:", "Page 1 of 1");
                  if (val !== null) toast.success("Footer updated");
                }}
              >
                <span>Confidential - For Internal Use Only</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>

          {/* Review Comments Sidebar panel overlay */}
          {showCommentsSidebar && (
            <div className="w-[300px] bg-background border-l shrink-0 flex flex-col animate-in slide-in-from-right duration-200">
              <div className="p-3 border-b flex items-center justify-between bg-slate-50/50">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-orange-500" /> Document Comments
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCommentsSidebar(false)}>
                  ✕
                </Button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto space-y-3.5">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-2.5 border rounded-lg bg-slate-50 text-xs shadow-sm flex flex-col gap-1 transition-all hover:bg-slate-100/50">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{comment.author}</span>
                      <span>{comment.date}</span>
                    </div>
                    <p className="text-foreground mt-0.5">{comment.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setComments(prev => prev.map(c => c.id === comment.id ? { ...c, resolved: true } : c));
                          toast.success("Comment resolved");
                        }}
                        className="text-[10px] text-emerald-600 hover:underline"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => {
                          const rep = prompt("Reply to comment:");
                          if (rep) {
                            setComments(prev => prev.map(c => c.id === comment.id ? { ...c, replies: [...c.replies, rep] } : c));
                            toast.success("Reply added");
                          }
                        }}
                        className="text-[10px] text-muted-foreground hover:underline ml-auto"
                      >
                        Reply
                      </button>
                    </div>
                    {comment.replies.map((reply, rIdx) => (
                      <div key={rIdx} className="ml-3 pl-2 border-l border-slate-300 text-[10px] text-muted-foreground mt-1.5">
                        <span className="font-semibold text-foreground">You:</span> {reply}
                      </div>
                    ))}
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-xs">
                    No active comments on this document.
                  </div>
                )}
              </div>

              <div className="p-3 border-t bg-slate-50/50 gap-2 flex flex-col">
                <Textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Type a new comment..."
                  className="text-xs h-16 resize-none"
                />
                <Button
                  size="sm"
                  className="w-full text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={!newCommentText.trim()}
                  onClick={() => {
                    setComments(prev => [
                      ...prev,
                      { id: Date.now().toString(), text: newCommentText, author: "You", resolved: false, date: "Just now", replies: [] }
                    ]);
                    setNewCommentText("");
                    toast.success("Comment added");
                  }}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Find & Replace Popover Dialog */}
        <Dialog open={findOpen} onOpenChange={setFindOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Find and Replace</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3 text-xs">
              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="find" className="text-right text-muted-foreground">Find</Label>
                <Input
                  id="find"
                  value={findKeyword}
                  onChange={(e) => setFindKeyword(e.target.value)}
                  className="col-span-3 h-8 text-xs"
                  placeholder="Text to find"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="replace" className="text-right text-muted-foreground">Replace</Label>
                <Input
                  id="replace"
                  value={replaceKeyword}
                  onChange={(e) => setReplaceKeyword(e.target.value)}
                  className="col-span-3 h-8 text-xs"
                  placeholder="Replacement text"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 cursor-pointer">
                Cancel
              </DialogClose>
              <Button
                onClick={handleFindReplace}
                disabled={!findKeyword.trim()}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                Replace All
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Spelling & Grammar Popover Dialog */}
        <Dialog open={spellCheckOpen} onOpenChange={setSpellCheckOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-blue-600">
                <Sparkles className="h-4 w-4" /> Spelling & Grammar Editor
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-xs space-y-3">
              <div className="p-3 bg-red-50 text-red-800 rounded border border-red-100 flex flex-col gap-1.5">
                <span className="font-semibold">Underline Suggestion:</span>
                <span className="italic">"TixelTech Office Module"</span>
                <div className="text-[10px] text-muted-foreground mt-1">Found typo: 'TixelTech'. Did you mean 'PixelTech'?</div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold">Change to:</span>
                {["PixelTech", "Tixel Tech", "IntelTech"].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.innerHTML = editorRef.current.innerHTML.replace(/TixelTech/g, sug);
                        setEditorContent(editorRef.current.innerHTML);
                        toast.success(`Changed to ${sug}`);
                      }
                      setSpellCheckOpen(false);
                      setSpellErrorsCount(0);
                    }}
                    className="w-full text-left p-2 border hover:bg-blue-50 text-xs rounded transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSpellCheckOpen(false)}>
                Ignore Once
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Bar (Word Style) */}
        <div className="h-6.5 bg-blue-600 text-white shrink-0 flex items-center justify-between px-3 text-[10.5px] select-none font-medium">
          <div className="flex items-center gap-4">
            <span>Page 1 of 1</span>
            <span>{words} words</span>
            <span>{characters} characters</span>
            <span className="hover:underline cursor-pointer flex items-center gap-1">
              English (India) <ChevronRight className="h-2.5 w-2.5 rotate-90" />
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Autosave: Saved
            </span>
            <div className="h-3 w-[1px] bg-white/40" />
            <div className="flex items-center gap-1">
              <span>Zoom:</span>
              <button className="px-1 hover:bg-white/10 rounded" onClick={() => setZoom(z => Math.max(80, z - 10))}>-</button>
              <span className="w-8 text-center">{zoom}%</span>
              <button className="px-1 hover:bg-white/10 rounded" onClick={() => setZoom(z => Math.min(120, z + 10))}>+</button>
            </div>
          </div>
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
                <Select
                  value={newProjectName || "Others"}
                  onValueChange={(val) => setNewProjectName(val === "Others" || !val ? "" : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Others">Others</SelectItem>
                    {projectsList.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={newFormat} onValueChange={(v) => setNewFormat(v as DocFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RICH_TEXT">Rich Text</SelectItem>
                    {/* <SelectItem value="HTML">HTML</SelectItem> */}
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

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-9"
          />
        </div>

        <Select value={projectFilter} onValueChange={(val) => setProjectFilter(val || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {uniqueProjects.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
            {hasNoProject && <SelectItem value="Others">Others</SelectItem>}
          </SelectContent>
        </Select>
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
                <div className="mt-2 text-xs text-muted-foreground">
                  Project: <span className="font-medium text-foreground">{doc.projectName || "Others"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  By {doc.createdBy.name || doc.createdBy.email?.split("@")[0] || "Deleted User"} &middot;{" "}
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
                    <span className="text-sm">{user.name || user.email?.split("@")[0] || "Unknown"}</span>
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
                Share
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
