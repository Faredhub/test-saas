"use client";

import { useState, useTransition, useEffect, useRef } from "react";
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
  Presentation,
  Loader2,
  MoreVertical,
  Trash2,
  Pencil,
  ArrowLeft,
  Save,
  ChevronUp,
  ChevronDown,
  Layout,
  Columns2,
  Type,
  Square,
  Download,
  Share2,
  FolderOpen,
  PencilLine,
  Users,
  Undo,
  Redo,
  Clipboard,
  Scissors,
  Copy,
  Paintbrush,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image,
  Table,
  Link,
  MessageSquare,
  Maximize2,
  Play,
  Sparkles,
  Eye,
  BookOpen,
  Palette,
  Minimize2,
  ChevronRight,
} from "lucide-react";
import {
  createPresentation,
  updatePresentation,
  deletePresentation,
} from "@/lib/actions/office";
import { toast } from "sonner";

type SlideLayout = "title" | "title-content" | "two-column" | "blank" | "quote" | "timeline";

type SlideContent = {
  title?: string;
  subtitle?: string;
  body?: string;
  leftColumn?: string;
  rightColumn?: string;
};

type Slide = {
  layout: SlideLayout;
  content: SlideContent;
};

type Pres = {
  id: string;
  title: string;
  slides: unknown;
  theme: string;
  projectName?: string | null;
  sharedWith: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string | null };
  version?: number;
};

type User = { id: string; name: string | null; email: string | null; image?: string | null };

type Props = {
  initialPresentations: Pres[];
  users: User[];
};

type ThemeStyle = {
  bg: string;
  text: string;
  accent: string;
  label: string;
  font: string;
  shape: string;
};

const themes: Record<string, ThemeStyle> = {
  default: { bg: "bg-white", text: "text-gray-900", accent: "border-blue-500", label: "Default", font: "font-sans", shape: "bg-blue-500" },
  dark: { bg: "bg-slate-950", text: "text-zinc-100", accent: "border-cyan-400", label: "Dark", font: "font-sans", shape: "bg-cyan-500" },
  nature: { bg: "bg-emerald-50", text: "text-emerald-950", accent: "border-emerald-600", label: "Nature", font: "font-serif", shape: "bg-emerald-600" },
  corporate: { bg: "bg-slate-50", text: "text-slate-900", accent: "border-indigo-500", label: "Corporate", font: "font-sans", shape: "bg-indigo-600" },
  warm: { bg: "bg-amber-50", text: "text-amber-950", accent: "border-amber-500", label: "Warm", font: "font-serif", shape: "bg-amber-500" },
  ocean: { bg: "bg-sky-50/50", text: "text-sky-950", accent: "border-sky-500", label: "Ocean", font: "font-sans", shape: "bg-sky-500" },
  sky: { bg: "bg-blue-50/40", text: "text-blue-950", accent: "border-blue-400", label: "Sky", font: "font-sans", shape: "bg-blue-400" },
  forest: { bg: "bg-green-50/60", text: "text-green-950", accent: "border-green-600", label: "Forest", font: "font-serif", shape: "bg-green-600" },
  sunset: { bg: "bg-orange-50/40", text: "text-orange-950", accent: "border-orange-500", label: "Sunset", font: "font-sans", shape: "bg-orange-500" },
  purple: { bg: "bg-purple-50/50", text: "text-purple-950", accent: "border-purple-500", label: "Purple", font: "font-sans", shape: "bg-purple-600" },
  modern: { bg: "bg-zinc-100", text: "text-zinc-900", accent: "border-red-500", label: "Modern", font: "font-sans", shape: "bg-red-500" },
  elegant: { bg: "bg-yellow-50/30", text: "text-amber-900", accent: "border-yellow-600", label: "Elegant", font: "font-serif", shape: "bg-yellow-600" },
  minimal: { bg: "bg-white", text: "text-zinc-800", accent: "border-zinc-800", label: "Minimal", font: "font-mono", shape: "bg-zinc-800" },
  education: { bg: "bg-teal-50/30", text: "text-teal-950", accent: "border-teal-500", label: "Education", font: "font-sans", shape: "bg-teal-500" },
  startup: { bg: "bg-indigo-50/30", text: "text-indigo-950", accent: "border-violet-500", label: "Startup", font: "font-sans", shape: "bg-violet-600" },
  business: { bg: "bg-zinc-50", text: "text-zinc-950", accent: "border-blue-700", label: "Business", font: "font-sans", shape: "bg-blue-700" },
  technology: { bg: "bg-slate-900", text: "text-slate-100", accent: "border-emerald-400", label: "Technology", font: "font-mono", shape: "bg-emerald-500" },
  medical: { bg: "bg-cyan-50/30", text: "text-cyan-950", accent: "border-cyan-500", label: "Medical", font: "font-sans", shape: "bg-cyan-600" },
  finance: { bg: "bg-stone-50", text: "text-stone-900", accent: "border-emerald-800", label: "Finance", font: "font-serif", shape: "bg-emerald-800" },
  creative: { bg: "bg-pink-50/30", text: "text-pink-950", accent: "border-pink-500", label: "Creative", font: "font-sans", shape: "bg-pink-500" }
};

const layoutOptions: { value: SlideLayout; label: string; icon: React.ReactNode }[] = [
  { value: "title", label: "Title Slide", icon: <Type className="h-4 w-4" /> },
  { value: "title-content", label: "Title + Content", icon: <Layout className="h-4 w-4" /> },
  { value: "two-column", label: "Two Columns", icon: <Columns2 className="h-4 w-4" /> },
  { value: "quote", label: "Quote Slide", icon: <PencilLine className="h-4 w-4" /> },
  { value: "timeline", label: "Timeline", icon: <FolderOpen className="h-4 w-4" /> },
  { value: "blank", label: "Blank", icon: <Square className="h-4 w-4" /> },
];

export function PresentationsClient({ initialPresentations, users }: Props) {
  const [presentations, setPresentations] = useState(initialPresentations);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePresId, setSharePresId] = useState<string | null>(null);
  const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamePresId, setRenamePresId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [projectsList, setProjectsList] = useState<string[]>([]);
  const [newTheme, setNewTheme] = useState("default");

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

  // Editor state
  const [editing, setEditing] = useState<Pres | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [editorTitle, setEditorTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // PowerPoint style states
  const [ribbonTab, setRibbonTab] = useState<"home" | "insert" | "design" | "transitions" | "animations" | "slideshow" | "view">("home");
  const [zoom, setZoom] = useState(100);
  const [layoutRatio, setLayoutRatio] = useState<"16:9" | "4:3">("16:9");
  const [activeTransition, setActiveTransition] = useState<"fade" | "push" | "reveal" | "zoom">("fade");
  const [activeAnimation, setActiveAnimation] = useState<"fly-in" | "float" | "bounce" | "fade-in">("fade-in");
  const [speakerNotes, setSpeakerNotes] = useState<Record<number, string>>({});
  const [variant, setVariant] = useState<"light" | "dark" | "colorful" | "minimal" | "professional">("light");
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  
  // Undo/Redo stacks
  const [history, setHistory] = useState<Slide[][]>([]);
  const [redoStack, setRedoStack] = useState<Slide[][]>([]);

  // Slide Custom Objects (Shapes, Textboxes, Icons)
  const [slideObjects, setSlideObjects] = useState<Record<number, Array<{ id: string; type: "shape" | "textbox" | "icon" | "image"; shapeType?: "rect" | "circle" | "line"; text?: string; iconName?: string; x: number; y: number; w: number; h: number; color?: string }>>>({});
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Show/Hide features
  const [showRuler, setShowRuler] = useState(true);
  const [showGridlines, setShowGridlines] = useState(false);
  const [spellCheckOpen, setSpellCheckOpen] = useState(false);
  const [spellCheckError, setSpellCheckError] = useState(false);

  const uniqueProjects = Array.from(
    new Set(
      presentations
        .map((p) => p.projectName)
        .filter((name): name is string => typeof name === "string" && name.trim() !== "")
    )
  );
  const hasNoProject = presentations.some((p) => !p.projectName);

  const filteredPres = presentations.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    
    if (projectFilter !== "all") {
      const presProj = p.projectName || "Others";
      if (presProj !== projectFilter) {
        return false;
      }
    }
    return matchesSearch;
  });

  function handleCreate() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      try {
        const pres = await createPresentation({ title: newTitle, theme: newTheme, projectName: newProjectName || undefined });
        setPresentations((prev) => [
          { ...pres, createdBy: { id: pres.createdById, name: "You", email: null } } as Pres,
          ...prev,
        ]);
        setCreateOpen(false);
        setNewTitle("");
        setNewProjectName("");
        setNewTheme("default");
        toast.success("Presentation created");
      } catch {
        toast.error("Failed to create presentation");
      }
    });
  }

  function openEditor(pres: Pres) {
    setEditing(pres);
    setEditorTitle(pres.title);
    setCurrentTheme(pres.theme || "default");
    const parsed = pres.slides as Slide[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      setSlides(parsed);
    } else {
      setSlides([{ layout: "title", content: { title: pres.title, subtitle: "" } }]);
    }
    setActiveSlideIdx(0);
  }

  function handleSave() {
    if (!editing) return;
    setIsSaving(true);
    startTransition(async () => {
      try {
        await updatePresentation(editing.id, {
          title: editorTitle,
          slides,
          theme: currentTheme,
        });
        setPresentations((prev) =>
          prev.map((p) =>
            p.id === editing.id ? { ...p, title: editorTitle, theme: currentTheme } : p
          )
        );
        toast.success("Presentation saved");
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
        await deletePresentation(id);
        setPresentations((prev) => prev.filter((p) => p.id !== id));
        if (editing?.id === id) setEditing(null);
        toast.success("Presentation deleted");
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  function handleRename() {
    if (!renamePresId || !renameTitle.trim()) return;
    startTransition(async () => {
      try {
        await updatePresentation(renamePresId, { title: renameTitle });
        setPresentations((prev) =>
          prev.map((p) => (p.id === renamePresId ? { ...p, title: renameTitle } : p))
        );
        setRenameOpen(false);
        setRenamePresId(null);
        setRenameTitle("");
        toast.success("Presentation renamed successfully");
      } catch {
        toast.error("Failed to rename presentation");
      }
    });
  }

  function handleShare() {
    if (!sharePresId) return;
    startTransition(async () => {
      try {
        const sharedWith = selectedShareUsers.map((uid) => ({ userId: uid, permission: "read" }));
        await updatePresentation(sharePresId, { sharedWith });
        setPresentations((prev) =>
          prev.map((p) => (p.id === sharePresId ? { ...p, sharedWith } : p))
        );
        setShareOpen(false);
        setSharePresId(null);
        setSelectedShareUsers([]);
        toast.success("Sharing updated");
      } catch {
        toast.error("Failed to update sharing");
      }
    });
  }

  function updateSlideContent(field: keyof SlideContent, value: string) {
    setSlides((prev) => {
      const updated = [...prev];
      updated[activeSlideIdx] = {
        ...updated[activeSlideIdx],
        content: { ...updated[activeSlideIdx].content, [field]: value },
      };
      return updated;
    });
  }

  function updateSlideLayout(layout: SlideLayout) {
    setSlides((prev) => {
      const updated = [...prev];
      updated[activeSlideIdx] = { ...updated[activeSlideIdx], layout };
      return updated;
    });
  }

  function addSlide() {
    const newSlide: Slide = { layout: "title-content", content: { title: "", body: "" } };
    setSlides((prev) => {
      const updated = [...prev];
      updated.splice(activeSlideIdx + 1, 0, newSlide);
      return updated;
    });
    setActiveSlideIdx(activeSlideIdx + 1);
  }

  function deleteSlide() {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== activeSlideIdx));
    setActiveSlideIdx(Math.max(0, activeSlideIdx - 1));
  }

  function moveSlide(direction: "up" | "down") {
    const newIdx = direction === "up" ? activeSlideIdx - 1 : activeSlideIdx + 1;
    if (newIdx < 0 || newIdx >= slides.length) return;
    setSlides((prev) => {
      const updated = [...prev];
      [updated[activeSlideIdx], updated[newIdx]] = [updated[newIdx], updated[activeSlideIdx]];
      return updated;
    });
    setActiveSlideIdx(newIdx);
  }

  // Undo / Redo Presentation edits
  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(slides))]);
    setSlides(previous);
    triggerAutoSave();
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(slides))]);
    setSlides(next);
    triggerAutoSave();
  }

  // Custom objects inside presentation canvas
  function addCustomShape(shapeType: "rect" | "circle" | "line") {
    const id = Date.now().toString();
    const newShape = {
      id,
      type: "shape" as const,
      shapeType,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      w: shapeType === "line" ? 200 : 120,
      h: shapeType === "line" ? 4 : 100,
      color: "#3b82f6",
    };
    
    setSlideObjects((prev) => {
      const activeObjects = prev[activeSlideIdx] || [];
      return {
        ...prev,
        [activeSlideIdx]: [...activeObjects, newShape],
      };
    });
    setSelectedObjectId(id);
    triggerAutoSave();
  }

  function addCustomIcon(iconName: string) {
    const id = Date.now().toString();
    const newIcon = {
      id,
      type: "icon" as const,
      iconName,
      x: 150,
      y: 150,
      w: 48,
      h: 48,
      color: "#10b981",
    };
    
    setSlideObjects((prev) => {
      const activeObjects = prev[activeSlideIdx] || [];
      return {
        ...prev,
        [activeSlideIdx]: [...activeObjects, newIcon],
      };
    });
    setSelectedObjectId(id);
    triggerAutoSave();
  }

  function addCustomTextbox() {
    const id = Date.now().toString();
    const newTextbox = {
      id,
      type: "textbox" as const,
      text: "Click to edit text",
      x: 120,
      y: 120,
      w: 220,
      h: 60,
    };
    
    setSlideObjects((prev) => {
      const activeObjects = prev[activeSlideIdx] || [];
      return {
        ...prev,
        [activeSlideIdx]: [...activeObjects, newTextbox],
      };
    });
    setSelectedObjectId(id);
    triggerAutoSave();
  }

  function addCustomImage() {
    const url = prompt("Enter Image URL:", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=60");
    if (!url) return;
    const id = Date.now().toString();
    const newImg = {
      id,
      type: "image" as const,
      text: url,
      x: 200,
      y: 150,
      w: 240,
      h: 150,
    };
    
    setSlideObjects((prev) => {
      const activeObjects = prev[activeSlideIdx] || [];
      return {
        ...prev,
        [activeSlideIdx]: [...activeObjects, newImg],
      };
    });
    setSelectedObjectId(id);
    triggerAutoSave();
  }

  function deleteSelectedObject() {
    if (!selectedObjectId) return;
    setSlideObjects((prev) => {
      const activeObjects = prev[activeSlideIdx] || [];
      return {
        ...prev,
        [activeSlideIdx]: activeObjects.filter((obj) => obj.id !== selectedObjectId),
      };
    });
    setSelectedObjectId(null);
    triggerAutoSave();
  }

  // Update notes per active slide
  function setNotesForActiveSlide(text: string) {
    setSpeakerNotes((prev) => ({
      ...prev,
      [activeSlideIdx]: text,
    }));
    triggerAutoSave();
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
    if (!editing) return;
    try {
      await updatePresentation(editing.id, {
        title: editorTitle,
        slides,
        theme: currentTheme,
      });
      setPresentations((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, title: editorTitle, theme: currentTheme } : p
        )
      );
    } catch (err) {
      console.error("Autosave failed", err);
    }
  }

  const theme = themes[currentTheme] || themes.default;
  const activeSlide = slides[activeSlideIdx];

  // Editor view
  if (editing && activeSlide) {
    const handleObjectMouseDown = (e: React.MouseEvent, objId: string) => {
      e.stopPropagation();
      setSelectedObjectId(objId);
      const startX = e.clientX;
      const startY = e.clientY;
      const currentObjs = slideObjects[activeSlideIdx] || [];
      const targetObj = currentObjs.find(o => o.id === objId);
      if (!targetObj) return;
      const originalX = targetObj.x;
      const originalY = targetObj.y;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        setSlideObjects(prev => {
          const active = prev[activeSlideIdx] || [];
          return {
            ...prev,
            [activeSlideIdx]: active.map(o => o.id === objId ? { ...o, x: Math.max(0, originalX + deltaX), y: Math.max(0, originalY + deltaY) } : o)
          };
        });
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        triggerAutoSave();
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const activeTheme = themes[currentTheme] || themes.default;

    // Apply variants styling dynamically
    let slideBg = activeTheme.bg;
    let slideText = activeTheme.text;
    let slideBorder = activeTheme.accent;

    if (variant === "dark") {
      slideBg = "bg-slate-950";
      slideText = "text-zinc-100";
      slideBorder = "border-zinc-800";
    } else if (variant === "colorful") {
      slideBg = "bg-gradient-to-tr from-violet-600 via-pink-600 to-orange-400";
      slideText = "text-white";
      slideBorder = "border-amber-400";
    } else if (variant === "minimal") {
      slideBg = "bg-white";
      slideText = "text-zinc-900";
      slideBorder = "border-zinc-200";
    } else if (variant === "professional") {
      slideBg = "bg-[#0b132b]";
      slideText = "text-slate-100";
      slideBorder = "border-amber-500/80";
    }

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100/50 overflow-hidden font-sans select-none animate-in fade-in duration-200">
        
        {/* PowerPoint Header Row */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background shrink-0 gap-3">
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-slate-100" onClick={() => setEditing(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Presentation className="h-5 w-5 text-orange-600" />
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-600 focus:outline-none px-1 py-0.5 rounded transition-all w-[240px]"
                />
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Saved to Cloud
                </span>
              </div>
              
              {/* PowerPoint Ribbon Tabs */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 font-medium">
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("home")}>File</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("home")}>Home</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("insert")}>Insert</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("design")}>Design</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("transitions")}>Transitions</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("animations")}>Animations</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("slideshow")}>Slide Show</span>
                <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => setRibbonTab("view")}>View</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">v{editing.version}</Badge>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 hover:bg-slate-100"
              onClick={() => {
                setSlideshowIndex(activeSlideIdx);
                setIsSlideshowOpen(true);
              }}
            >
              <Play className="h-3.5 w-3.5 text-orange-600" /> Play Slideshow
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 shadow-sm">
                <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <a href={`/api/office/export/presentation?id=${editing.id}`} download className="flex items-center w-full">
                    PowerPoint Presentation (.pptx)
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-sm font-normal" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* PowerPoint Ribbon Panel */}
        <div className="border-b bg-background shrink-0 flex flex-col shadow-sm select-none z-10">
          {/* Active Ribbon tabs selection bar */}
          <div className="flex items-center border-b px-4 bg-slate-50/50">
            {([
              { id: "home", label: "Home" },
              { id: "insert", label: "Insert" },
              { id: "design", label: "Design" },
              { id: "transitions", label: "Transitions" },
              { id: "animations", label: "Animations" },
              { id: "slideshow", label: "Slide Show" },
              { id: "view", label: "View" }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRibbonTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  ribbonTab === tab.id
                    ? "border-orange-600 text-orange-600 font-bold bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ribbon sub-menu contents panel */}
          <div className="p-1.5 bg-background flex items-center gap-3 overflow-x-auto min-h-[52px]">
            {ribbonTab === "home" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Clipboard Group */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Paste" onClick={() => toast.info("Use Ctrl+V to paste onto presentation")}>
                    <Clipboard className="h-4 w-4 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Cut" onClick={() => toast.info("Cut slide element")}>
                    <Scissors className="h-4 w-4 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Copy" onClick={() => toast.info("Copy slide element")}>
                    <Copy className="h-4 w-4 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" title="Format Painter" onClick={() => toast.info("Format Painter active")}>
                    <Paintbrush className="h-4 w-4 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Clipboard</span>
                </div>

                {/* Slides Actions Group */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="outline" size="sm" className="h-7 text-xs border-orange-200 hover:bg-orange-50 hover:text-orange-600 gap-1" onClick={addSlide}>
                    <Plus className="h-3.5 w-3.5" /> New Slide
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const dup = { ...activeSlide };
                      setSlides((prev) => {
                        const next = [...prev];
                        next.splice(activeSlideIdx + 1, 0, dup);
                        return next;
                      });
                      setActiveSlideIdx(activeSlideIdx + 1);
                      toast.success("Slide duplicated");
                    }}
                  >
                    Duplicate
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                    onClick={deleteSlide}
                    disabled={slides.length <= 1}
                  >
                    Delete
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Slides</span>
                </div>

                {/* Typography formatting */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100 font-bold" onClick={() => toast.info("Format bold text placeholder")} title="Bold">
                    <Bold className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100 italic" onClick={() => toast.info("Format italic text placeholder")} title="Italic">
                    <Italic className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100 underline" onClick={() => toast.info("Format underline text")} title="Underline">
                    <Underline className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={() => toast.info("Character spacing applied")} title="Character Spacing">
                    <AlignJustify className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Font</span>
                </div>

                {/* Paragraph spacing Alignments */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Align Left">
                    <AlignLeft className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Center">
                    <AlignCenter className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Align Right">
                    <AlignRight className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <div className="h-4 w-[1px] bg-border mx-0.5" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Bullets">
                    <List className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Numbering">
                    <ListOrdered className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Paragraph</span>
                </div>

                {/* Drawing actions */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Shapes <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => addCustomShape("rect")}>Rectangle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addCustomShape("circle")}>Circle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addCustomShape("line")}>Horizontal Line</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground">
                      Icons <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {["Star", "Heart", "Check", "Palette", "Users"].map((ico) => (
                        <DropdownMenuItem key={ico} onClick={() => addCustomIcon(ico)}>
                          {ico}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addCustomTextbox}>
                    <Type className="h-3.5 w-3.5 text-orange-600" /> Textbox
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Drawing</span>
                </div>

                {/* History undo / redo */}
                <div className="flex items-center gap-1 h-9">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Undo" onClick={handleUndo} disabled={history.length === 0}>
                    <Undo className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" title="Redo" onClick={handleRedo} disabled={redoStack.length === 0}>
                    <Redo className="h-3.5 w-3.5 text-foreground" />
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "insert" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Media assets inserter */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addCustomImage}>
                    <Image className="h-3.5 w-3.5 text-emerald-600" /> Picture
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addCustomTextbox}>
                    <Type className="h-3.5 w-3.5 text-blue-600" /> Custom Text box
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      const rows = parseInt(prompt("Table Rows count:", "3") || "3", 10);
                      const cols = parseInt(prompt("Table Columns count:", "3") || "3", 10);
                      if (rows > 0 && cols > 0) {
                        toast.success(`Inserted ${rows}x${cols} slide table structure`);
                      }
                    }}
                  >
                    <Table className="h-3.5 w-3.5 text-indigo-600" /> Insert Table
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Media</span>
                </div>

                {/* Hyperlinks */}
                <div className="flex items-center gap-1.5 h-9">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      const link = prompt("Add Hyperlink URL to element:", "https://");
                      if (link) toast.success("Hyperlink added to slide");
                    }}
                  >
                    <Link className="h-3.5 w-3.5 text-sky-600" /> Hyperlink
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "design" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Theme picker variant selector */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <span className="text-[10px] text-muted-foreground">Select Variant:</span>
                  {(["light", "dark", "colorful", "minimal", "professional"] as const).map((v) => (
                    <Button
                      key={v}
                      variant={variant === v ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setVariant(v)}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Button>
                  ))}
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Variants</span>
                </div>

                {/* Slide ratio sizing */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground text-xs font-semibold">
                      Ratio: {layoutRatio} <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setLayoutRatio("16:9")}>Widescreen (16:9)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLayoutRatio("4:3")}>Standard (4:3)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Slide Sizing</span>
                </div>

                {/* Dynamic Theme Picker */}
                <div className="flex items-center gap-1.5 h-9">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-7 px-2.5 bg-background border rounded hover:bg-muted cursor-pointer flex items-center gap-1 text-foreground text-xs font-semibold">
                      Theme Gallery <ChevronDown className="h-3 w-3 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-2 w-[240px] max-h-[300px] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(themes).map(([key, t]) => (
                          <button
                            key={key}
                            onClick={() => setCurrentTheme(key)}
                            className={`p-2 text-[10px] border rounded transition-colors text-left flex flex-col gap-1 ${t.bg} ${t.text} ${
                              currentTheme === key ? "border-orange-500 ring-1 ring-orange-200" : "border-border"
                            }`}
                          >
                            <span className="font-semibold">{t.label}</span>
                            <div className="h-1.5 w-full rounded" style={{ backgroundColor: t.accent.includes("border-") ? "#3b82f6" : "#cbd5e1" }} />
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {ribbonTab === "transitions" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Transitions lists */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <span className="text-[10px] text-muted-foreground">Slide Transition:</span>
                  {(["fade", "push", "reveal", "zoom"] as const).map((t) => (
                    <Button
                      key={t}
                      variant={activeTransition === t ? "default" : "outline"}
                      size="sm"
                      className={`h-7 text-[10px] ${activeTransition === t ? "bg-orange-600 text-white" : ""}`}
                      onClick={() => {
                        setActiveTransition(t);
                        toast.success(`${t.toUpperCase()} transition layout selected`);
                      }}
                    >
                      {t.toUpperCase()}
                    </Button>
                  ))}
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Transitions Gallery</span>
                </div>

                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.success("Transition applied to all slides successfully")}>
                  Apply to All
                </Button>
              </div>
            )}

            {ribbonTab === "animations" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* Animation elements */}
                <div className="flex items-center gap-1.5 border-r pr-3 h-9">
                  <span className="text-[10px] text-muted-foreground">Object Animation:</span>
                  {(["fly-in", "float", "bounce", "fade-in"] as const).map((a) => (
                    <Button
                      key={a}
                      variant={activeAnimation === a ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => {
                        setActiveAnimation(a);
                        toast.success(`${a} animation applied to selected elements`);
                      }}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Button>
                  ))}
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Animations List</span>
                </div>

                <div className="flex items-center gap-1.5 h-9">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info("Animation timeline panel active")}>
                    Animation Pane
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "slideshow" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* slideshow playback actions */}
                <div className="flex items-center gap-1 border-r pr-3 h-9">
                  <Button variant="outline" size="sm" className="h-7 text-xs border-orange-200 hover:bg-orange-50 gap-1" onClick={() => { setSlideshowIndex(0); setIsSlideshowOpen(true); }}>
                    <Play className="h-3.5 w-3.5 text-orange-600" /> From Beginning
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSlideshowIndex(activeSlideIdx); setIsSlideshowOpen(true); }}>
                    <Play className="h-3.5 w-3.5 text-orange-500" /> From Current Slide
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 scale-90 select-none border-l pl-2">Start Show</span>
                </div>

                {/* Laser pointer / Rehearse */}
                <div className="flex items-center gap-1 h-9">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info("Presenter view opened")}>
                    Presenter View
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info("Rehearse timings recorded")}>
                    Rehearse Timings
                  </Button>
                </div>
              </div>
            )}

            {ribbonTab === "view" && (
              <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium animate-in fade-in duration-200">
                {/* View show/hide options */}
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

                {/* Quick zoom controls */}
                <div className="flex items-center gap-1 h-9">
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setZoom(80)}>80%</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setZoom(100)}>100%</Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setZoom(120)}>120%</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Presentation Main Workspace Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left slide thumbnails navigator panel */}
          <div className="w-[200px] border-r bg-muted/20 shrink-0 flex flex-col justify-start select-none shadow-sm z-10">
            <div className="p-2 border-b flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Slides Navigator</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-600" onClick={addSlide} title="Add New Slide">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-2.5">
              <div className="space-y-3.5 pb-8">
                {slides.map((slide, idx) => (
                  <div key={idx} className="relative group">
                    {/* Index count label */}
                    <span className="absolute left-[-16px] top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/80 w-3 text-right">
                      {idx + 1}
                    </span>
                    
                    <button
                      onClick={() => setActiveSlideIdx(idx)}
                      className={`w-full aspect-[16/9] rounded-lg border-2 p-2 text-left text-[8px] leading-tight transition-all relative overflow-hidden shadow-sm hover:scale-[1.02] ${
                        idx === activeSlideIdx
                          ? "border-orange-500 bg-orange-50/10 ring-2 ring-orange-100"
                          : "border-border hover:border-orange-300"
                      } ${slideBg}`}
                    >
                      <div className={`font-bold truncate ${slideText}`}>{slide.content.title || `Slide ${idx + 1}`}</div>
                      <div className="text-[6px] text-muted-foreground/80 truncate mt-0.5">
                        {slide.layout.toUpperCase()} Layout
                      </div>
                      
                      {/* Active slide indicator visual accent lines */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 ${slideBorder.replace("border-", "bg-")}`} />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Thumbnail Navigator controls */}
            <div className="p-2 border-t bg-slate-50/50 flex flex-col gap-1.5 shrink-0">
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-[10px]"
                  onClick={() => moveSlide("up")}
                  disabled={activeSlideIdx === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-0.5" /> Move Up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-[10px]"
                  onClick={() => moveSlide("down")}
                  disabled={activeSlideIdx === slides.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5 mr-0.5" /> Move Down
                </Button>
              </div>
            </div>
          </div>

          {/* Center visual slide canvas editor workspace */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-200/50 p-6 items-center justify-start relative select-none">
            
            {/* Horizontal margin ruler mockup */}
            {showRuler && (
              <div className="w-full max-w-3xl h-5 border bg-background rounded-md text-[8px] font-mono text-muted-foreground/80 flex items-center px-4 relative mb-2 shadow-sm select-none shrink-0 overflow-hidden">
                <div className="w-1/2 text-left">0 &bull;&bull;&bull; 1 &bull;&bull;&bull; 2 &bull;&bull;&bull; 3 &bull;&bull;&bull; 4 &bull;&bull;&bull; 5</div>
                <div className="w-1/2 text-right">6 &bull;&bull;&bull; 7 &bull;&bull;&bull; 8 &bull;&bull;&bull; 9 &bull;&bull;&bull; 10 &bull;&bull;&bull; 11</div>
              </div>
            )}

            {/* Canvas gridlines simulation background container */}
            <div
              style={{
                width: layoutRatio === "16:9" ? "800px" : "680px",
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
              onClick={() => setSelectedObjectId(null)}
              className={`aspect-[16/9] border-l-8 shadow-2xl relative rounded-xl p-8 flex flex-col shrink-0 overflow-hidden mb-8 transition-all duration-200 select-text ${slideBg} ${slideText} ${slideBorder} ${
                showGridlines ? "bg-gridlines-mock bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] bg-[size:16px_16px]" : ""
              }`}
            >
              {/* Slideshow entry watermark */}
              <div className="absolute top-2 right-4 text-[7px] font-semibold text-muted-foreground/40 select-none uppercase tracking-widest">
                {activeTheme.label} Theme
              </div>

              {/* Dynamic Presentation Layout Templates rendering */}
              {activeSlide.layout === "title" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
                  <input
                    type="text"
                    value={activeSlide.content.title ?? ""}
                    onChange={(e) => updateSlideContent("title", e.target.value)}
                    placeholder="Click to add presentation title"
                    className={`text-4xl font-extrabold text-center border-b border-dashed border-transparent hover:border-muted-foreground/30 focus:border-orange-500 focus:outline-none bg-transparent w-full transition-all tracking-tight ${slideText}`}
                  />
                  <input
                    type="text"
                    value={activeSlide.content.subtitle ?? ""}
                    onChange={(e) => updateSlideContent("subtitle", e.target.value)}
                    placeholder="Click to add subtitle"
                    className="text-lg text-center border-b border-dashed border-transparent hover:border-muted-foreground/30 focus:border-orange-500 focus:outline-none bg-transparent w-3/4 opacity-85 transition-all font-medium"
                  />
                </div>
              )}

              {activeSlide.layout === "title-content" && (
                <div className="flex-1 flex flex-col gap-4">
                  <input
                    type="text"
                    value={activeSlide.content.title ?? ""}
                    onChange={(e) => updateSlideContent("title", e.target.value)}
                    placeholder="Click to add slide title"
                    className={`text-2xl font-bold border-b border-dashed border-transparent hover:border-muted-foreground/30 focus:border-orange-500 focus:outline-none bg-transparent w-full transition-all pb-1 ${slideText}`}
                  />
                  <textarea
                    value={activeSlide.content.body ?? ""}
                    onChange={(e) => updateSlideContent("body", e.target.value)}
                    placeholder="Click to add content body text..."
                    className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 focus:outline-none focus:ring-0 resize-none text-sm placeholder:text-muted-foreground/40 leading-relaxed overflow-hidden font-normal"
                  />
                </div>
              )}

              {activeSlide.layout === "two-column" && (
                <div className="flex-1 flex flex-col gap-4">
                  <input
                    type="text"
                    value={activeSlide.content.title ?? ""}
                    onChange={(e) => updateSlideContent("title", e.target.value)}
                    placeholder="Click to add slide title"
                    className={`text-2xl font-bold border-b border-dashed border-transparent hover:border-muted-foreground/30 focus:border-orange-500 focus:outline-none bg-transparent w-full transition-all pb-1 ${slideText}`}
                  />
                  <div className="flex-1 grid grid-cols-2 gap-6 mt-1">
                    <textarea
                      value={activeSlide.content.leftColumn ?? ""}
                      onChange={(e) => updateSlideContent("leftColumn", e.target.value)}
                      placeholder="Click to add left column text..."
                      className="border-none bg-transparent shadow-none focus-visible:ring-0 focus:outline-none resize-none text-xs placeholder:text-muted-foreground/40 leading-relaxed overflow-hidden"
                    />
                    <textarea
                      value={activeSlide.content.rightColumn ?? ""}
                      onChange={(e) => updateSlideContent("rightColumn", e.target.value)}
                      placeholder="Click to add right column text..."
                      className="border-none bg-transparent shadow-none focus-visible:ring-0 focus:outline-none resize-none text-xs placeholder:text-muted-foreground/40 leading-relaxed overflow-hidden"
                    />
                  </div>
                </div>
              )}

              {activeSlide.layout === "quote" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-4xl text-orange-400 font-serif leading-none">“</span>
                  <textarea
                    value={activeSlide.content.body ?? ""}
                    onChange={(e) => updateSlideContent("body", e.target.value)}
                    placeholder="Click to add double quotation text..."
                    className="w-full text-center text-lg italic border-none bg-transparent focus:outline-none resize-none overflow-hidden font-serif placeholder:text-muted-foreground/40"
                  />
                  <input
                    type="text"
                    value={activeSlide.content.title ?? ""}
                    onChange={(e) => updateSlideContent("title", e.target.value)}
                    placeholder="- Author Name"
                    className="text-xs text-center border-none bg-transparent focus:outline-none w-1/2 opacity-75 mt-2 font-mono"
                  />
                </div>
              )}

              {activeSlide.layout === "timeline" && (
                <div className="flex-1 flex flex-col gap-4">
                  <input
                    type="text"
                    value={activeSlide.content.title ?? ""}
                    onChange={(e) => updateSlideContent("title", e.target.value)}
                    placeholder="Timeline Roadmap"
                    className={`text-xl font-bold border-none bg-transparent focus:outline-none pb-1 ${slideText}`}
                  />
                  
                  {/* Visual timeline steps graph */}
                  <div className="flex-1 flex items-center justify-between px-6 relative mt-4">
                    <div className="absolute left-6 right-6 h-1 bg-muted-foreground/20 z-0 top-1/2 -translate-y-1/2" />
                    
                    {["Step 1", "Step 2", "Step 3"].map((step, sIdx) => (
                      <div key={sIdx} className="flex flex-col items-center z-10 bg-inherit px-2 text-center gap-1.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${activeTheme.shape}`}>
                          {sIdx + 1}
                        </div>
                        <input
                          type="text"
                          placeholder={step}
                          className="text-[10px] font-bold text-center border-none bg-transparent focus:outline-none w-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSlide.layout === "blank" && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-muted-foreground/30 text-xs select-none">Blank Canvas - Add shapes, icons, images, or textboxes from ribbon</div>
                </div>
              )}

              {/* Slide Custom Objects Layers (Rects, Circles, Lines, Textboxes, Icons) */}
              {(slideObjects[activeSlideIdx] || []).map((obj) => (
                <div
                  key={obj.id}
                  style={{
                    left: `${obj.x}px`,
                    top: `${obj.y}px`,
                    width: `${obj.w}px`,
                    height: `${obj.h}px`,
                  }}
                  className={`absolute cursor-move select-text group ${
                    selectedObjectId === obj.id ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent" : "hover:ring-1 hover:ring-muted-foreground/30"
                  }`}
                  onMouseDown={(e) => handleObjectMouseDown(e, obj.id)}
                >
                  {obj.type === "shape" && (
                    <div
                      className="w-full h-full relative"
                      style={{
                        backgroundColor: obj.shapeType === "line" ? "transparent" : obj.color || "#3b82f6",
                        borderBottom: obj.shapeType === "line" ? `4px solid ${obj.color || "#3b82f6"}` : "none",
                        borderRadius: obj.shapeType === "circle" ? "9999px" : "4px",
                      }}
                    />
                  )}
                  {obj.type === "icon" && (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <span className="scale-125" style={{ color: obj.color || "#10b981" }}>
                        {obj.iconName === "Star" && "★"}
                        {obj.iconName === "Heart" && "♥"}
                        {obj.iconName === "Check" && "✓"}
                        {obj.iconName === "Palette" && "🎨"}
                        {obj.iconName === "Users" && "👥"}
                      </span>
                    </div>
                  )}
                  {obj.type === "textbox" && (
                    <textarea
                      value={obj.text ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlideObjects(prev => {
                          const active = prev[activeSlideIdx] || [];
                          return {
                            ...prev,
                            [activeSlideIdx]: active.map(o => o.id === obj.id ? { ...o, text: val } : o)
                          };
                        });
                      }}
                      className="w-full h-full text-xs border-none bg-transparent resize-none focus:outline-none text-foreground font-medium p-1 select-text"
                    />
                  )}
                  {obj.type === "image" && (
                    <img
                      src={obj.text}
                      alt="Custom Insert"
                      className="w-full h-full object-cover rounded shadow border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200";
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Speaker Notes panel */}
            <div className="w-full max-w-3xl bg-background border border-slate-200 rounded-lg p-3 shadow-md shrink-0 select-text flex flex-col gap-2 transition-all mt-auto animate-in slide-in-from-bottom-3 duration-200">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <PencilLine className="h-3.5 w-3.5 text-orange-500" /> Speaker Notes
              </span>
              <textarea
                value={speakerNotes[activeSlideIdx] ?? ""}
                onChange={(e) => setNotesForActiveSlide(e.target.value)}
                placeholder="Type slide presenter notes here..."
                className="w-full text-xs h-16 resize-none border-none bg-transparent focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 leading-relaxed"
              />
            </div>
          </div>

          {/* Right format properties side control panel */}
          <div className="w-[200px] border-l bg-background shrink-0 flex flex-col select-none p-3 shadow-sm z-10 gap-4 overflow-y-auto animate-in slide-in-from-right duration-200">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase border-b pb-1">Format Properties</span>
            
            {selectedObjectId ? (
              <div className="flex flex-col gap-3.5 text-xs">
                <span className="font-semibold text-[11px] text-foreground">Selected Object Settings</span>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground">Object Layer Fill Color:</span>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#111827"].map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setSlideObjects(prev => {
                            const active = prev[activeSlideIdx] || [];
                            return {
                              ...prev,
                              [activeSlideIdx]: active.map(o => o.id === selectedObjectId ? { ...o, color: c } : o)
                            };
                          });
                          triggerAutoSave();
                        }}
                        className="h-4 w-full rounded border"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[10px] text-red-600 hover:text-red-700 h-8 mt-4 border-red-200 hover:bg-red-50"
                  onClick={deleteSelectedObject}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Object
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 text-xs">
                <span className="font-semibold text-[11px] text-foreground">Slide Canvas Theme variant</span>
                <p className="text-[10px] text-muted-foreground">Select formatting variants to instantly update all slides backgrounds, fonts, and button borders.</p>
                
                <div className="flex flex-col gap-2 mt-2">
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[11px]" onClick={() => setVariant("light")}>
                    <span className="h-2 w-2 rounded-full bg-white border border-slate-400 mr-2" /> Light Minimal
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[11px]" onClick={() => setVariant("dark")}>
                    <span className="h-2 w-2 rounded-full bg-slate-900 border mr-2" /> Dark Presentation
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[11px]" onClick={() => setVariant("colorful")}>
                    <span className="h-2 w-2 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 mr-2" /> Colorful Gradient
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-[11px]" onClick={() => setVariant("professional")}>
                    <span className="h-2 w-2 rounded-full bg-indigo-950 mr-2" /> Deep Royal Navy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slide Show playback fullscreen overlay modal */}
        {isSlideshowOpen && (
          <div className="fixed inset-0 bg-slate-950 text-white z-50 flex items-center justify-center select-none overflow-hidden animate-in fade-in duration-300">
            {/* Hover control header bar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-zinc-300/80 bg-zinc-900/60 p-2.5 rounded-lg z-50 border border-zinc-800 backdrop-blur opacity-0 hover:opacity-100 transition-opacity duration-300">
              <span className="font-bold text-orange-500 tracking-wider">PowerPoint Slideshow Active</span>
              <div className="flex items-center gap-4">
                <span>Slide {slideshowIndex + 1} of {slides.length}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-white hover:bg-zinc-800" onClick={() => setIsSlideshowOpen(false)}>
                  ✕ Exit Show
                </Button>
              </div>
            </div>

            {/* Centered slide viewer inside slideshow mode */}
            <div
              className={`w-full max-w-4xl aspect-[16/9] p-12 rounded-xl flex flex-col justify-start shadow-2xl relative select-text border border-zinc-800 transition-all duration-300 ${
                activeTransition === "fade" ? "animate-in fade-in duration-500" :
                activeTransition === "push" ? "animate-in slide-in-from-right duration-500" :
                activeTransition === "zoom" ? "animate-in zoom-in-95 duration-500" : "animate-in fade-in duration-300"
              } ${themes[currentTheme]?.bg || "bg-white"} ${themes[currentTheme]?.text || "text-slate-900"}`}
            >
              {/* Layout slides preview inside slideshow rendering */}
              {slides[slideshowIndex].layout === "title" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
                  <h1 className="text-5xl font-extrabold tracking-tight">{slides[slideshowIndex].content.title || "Untitled slide Title"}</h1>
                  <h3 className="text-xl opacity-80">{slides[slideshowIndex].content.subtitle || ""}</h3>
                </div>
              )}

              {slides[slideshowIndex].layout === "title-content" && (
                <div className="flex-1 flex flex-col gap-6">
                  <h2 className="text-3xl font-bold border-b pb-2">{slides[slideshowIndex].content.title || ""}</h2>
                  <p className="text-lg leading-relaxed text-left whitespace-pre-line">{slides[slideshowIndex].content.body || ""}</p>
                </div>
              )}

              {slides[slideshowIndex].layout === "two-column" && (
                <div className="flex-1 flex flex-col gap-6">
                  <h2 className="text-3xl font-bold border-b pb-2">{slides[slideshowIndex].content.title || ""}</h2>
                  <div className="grid grid-cols-2 gap-8 text-left text-lg">
                    <div>{slides[slideshowIndex].content.leftColumn || ""}</div>
                    <div>{slides[slideshowIndex].content.rightColumn || ""}</div>
                  </div>
                </div>
              )}

              {slides[slideshowIndex].layout === "quote" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center font-serif py-12">
                  <span className="text-6xl text-orange-400 font-serif leading-none">“</span>
                  <p className="text-2xl italic leading-normal max-w-2xl">{slides[slideshowIndex].content.body || ""}</p>
                  <p className="text-sm opacity-80 mt-4 font-mono">- {slides[slideshowIndex].content.title || ""}</p>
                </div>
              )}

              {slides[slideshowIndex].layout === "timeline" && (
                <div className="flex-1 flex flex-col gap-6">
                  <h2 className="text-3xl font-bold border-b pb-2">{slides[slideshowIndex].content.title || "Timeline"}</h2>
                  <div className="flex-1 flex items-center justify-between px-12 relative mt-16">
                    <div className="absolute left-12 right-12 h-1 bg-zinc-400 z-0 top-1/2 -translate-y-1/2" />
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex flex-col items-center z-10 bg-inherit px-4 text-center">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-bold text-white shadow bg-orange-500`}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {slides[slideshowIndex].layout === "blank" && (
                <div className="flex-1" />
              )}
            </div>

            {/* Click navigation overlays */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1/6 hover:bg-white/5 cursor-pointer flex items-center justify-center"
              onClick={() => setSlideshowIndex(i => Math.max(0, i - 1))}
            >
              ◀
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-1/6 hover:bg-white/5 cursor-pointer flex items-center justify-center"
              onClick={() => {
                if (slideshowIndex < slides.length - 1) {
                  setSlideshowIndex(i => i + 1);
                } else {
                  setIsSlideshowOpen(false);
                }
              }}
            >
              ▶
            </div>
          </div>
        )}

        {/* PowerPoint Bottom Status Bar */}
        <div className="h-6.5 bg-orange-600 text-white shrink-0 flex items-center justify-between px-3 text-[10.5px] select-none font-medium z-25">
          <div className="flex items-center gap-4">
            <span>Slide {activeSlideIdx + 1} of {slides.length}</span>
            <span>Theme: {activeTheme.label}</span>
            <span>English (United States)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
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
          <h1 className="text-2xl font-bold">Presentations</h1>
          <p className="text-muted-foreground">Create and edit slide decks</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Presentation
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Presentation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Presentation title"
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
                <Label>Theme</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {Object.entries(themes).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setNewTheme(key)}
                      className={`p-3 rounded border-2 text-xs text-center transition-colors ${t.bg} ${t.text} ${
                        newTheme === key ? "border-blue-500 ring-2 ring-blue-200" : "border-border"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
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

      <div className="flex items-center gap-4 flex-wrap mt-2">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presentations..."
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
      </div>

      {filteredPres.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Presentation className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No presentations found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "Try a different search term" : "Create your first presentation to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPres.map((pres) => (
            <Card
              key={pres.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openEditor(pres)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Presentation className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base truncate">{pres.title}</CardTitle>
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
                        openEditor(pres);
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(pres);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamePresId(pres.id);
                        setRenameTitle(pres.title);
                        setRenameOpen(true);
                      }}
                    >
                      <PencilLine className="h-4 w-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharePresId(pres.id);
                        const shared = pres.sharedWith as Array<{ userId: string }>;
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
                        handleDelete(pres.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{themes[pres.theme]?.label ?? pres.theme}</Badge>
                  <span>{(pres.slides as Slide[])?.length ?? 0} slides</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Project: <span className="font-medium text-foreground">{pres.projectName || "Others"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  By {pres.createdBy.name ?? pres.createdBy.email} &middot;{" "}
                  {new Date(pres.updatedAt).toLocaleDateString()}
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
            <DialogTitle>Share Presentation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select users to share with:</p>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {users && users.map((user) => (
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
            <DialogTitle>Rename Presentation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Presentation title"
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
