"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import {
  createPresentation,
  updatePresentation,
  deletePresentation,
} from "@/lib/actions/office";
import { toast } from "sonner";

type SlideLayout = "title" | "title-content" | "two-column" | "blank";

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
  sharedWith: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string | null };
};

type Props = {
  initialPresentations: Pres[];
};

const themes: Record<string, { bg: string; text: string; accent: string; label: string }> = {
  default: { bg: "bg-white", text: "text-gray-900", accent: "border-blue-500", label: "Default" },
  dark: { bg: "bg-gray-900", text: "text-white", accent: "border-cyan-400", label: "Dark" },
  nature: { bg: "bg-emerald-50", text: "text-emerald-900", accent: "border-emerald-500", label: "Nature" },
  corporate: { bg: "bg-slate-50", text: "text-slate-900", accent: "border-indigo-500", label: "Corporate" },
  warm: { bg: "bg-orange-50", text: "text-orange-900", accent: "border-orange-500", label: "Warm" },
};

const layoutOptions: { value: SlideLayout; label: string; icon: React.ReactNode }[] = [
  { value: "title", label: "Title Slide", icon: <Type className="h-4 w-4" /> },
  { value: "title-content", label: "Title + Content", icon: <Layout className="h-4 w-4" /> },
  { value: "two-column", label: "Two Columns", icon: <Columns2 className="h-4 w-4" /> },
  { value: "blank", label: "Blank", icon: <Square className="h-4 w-4" /> },
];

export function PresentationsClient({ initialPresentations }: Props) {
  const [presentations, setPresentations] = useState(initialPresentations);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTheme, setNewTheme] = useState("default");

  // Editor state
  const [editing, setEditing] = useState<Pres | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [editorTitle, setEditorTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredPres = presentations.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      try {
        const pres = await createPresentation({ title: newTitle, theme: newTheme });
        setPresentations((prev) => [
          { ...pres, createdBy: { id: pres.createdById, name: "You", email: null } } as Pres,
          ...prev,
        ]);
        setCreateOpen(false);
        setNewTitle("");
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

  const theme = themes[currentTheme] || themes.default;
  const activeSlide = slides[activeSlideIdx];

  // Editor view
  if (editing && activeSlide) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 p-3 border-b bg-background shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Input
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            className="max-w-md font-semibold"
          />
          <Select value={currentTheme} onValueChange={(v) => { if (v) setCurrentTheme(v); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(themes).map(([key, t]) => (
                <SelectItem key={key} value={key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`/api/office/export/presentation?id=${editing.id}`}
              download
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" type="button">
                <Download className="h-4 w-4 mr-1" /> PPTX
              </Button>
            </a>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Slide thumbnails */}
          <div className="w-48 border-r bg-muted/30 p-2 overflow-y-auto shrink-0">
            <div className="space-y-2">
              {slides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`w-full aspect-[16/9] rounded border-2 p-2 text-left text-[8px] leading-tight transition-colors ${
                    idx === activeSlideIdx
                      ? "border-blue-500 bg-blue-50"
                      : "border-border hover:border-blue-300"
                  } ${theme.bg}`}
                >
                  <div className="font-bold truncate">{slide.content.title || `Slide ${idx + 1}`}</div>
                  <div className="text-muted-foreground truncate mt-0.5">
                    {slide.layout}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={addSlide}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteSlide}
                disabled={slides.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => moveSlide("up")}
                disabled={activeSlideIdx === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => moveSlide("down")}
                disabled={activeSlideIdx === slides.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Main slide editor */}
          <div className="flex-1 flex flex-col overflow-auto">
            {/* Layout selector */}
            <div className="flex items-center gap-2 p-3 border-b">
              <span className="text-sm text-muted-foreground">Layout:</span>
              {layoutOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={activeSlide.layout === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSlideLayout(opt.value)}
                  className="gap-1"
                >
                  {opt.icon} {opt.label}
                </Button>
              ))}
            </div>

            {/* Slide preview / editor */}
            <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
              <div
                className={`w-full max-w-3xl aspect-[16/9] rounded-lg shadow-lg border-l-4 ${theme.bg} ${theme.text} ${theme.accent} p-8 flex flex-col`}
              >
                {activeSlide.layout === "title" && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                    <Input
                      value={activeSlide.content.title ?? ""}
                      onChange={(e) => updateSlideContent("title", e.target.value)}
                      placeholder="Presentation Title"
                      className="text-3xl font-bold text-center border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                    <Input
                      value={activeSlide.content.subtitle ?? ""}
                      onChange={(e) => updateSlideContent("subtitle", e.target.value)}
                      placeholder="Subtitle"
                      className="text-lg text-center border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}

                {activeSlide.layout === "title-content" && (
                  <div className="flex-1 flex flex-col gap-4">
                    <Input
                      value={activeSlide.content.title ?? ""}
                      onChange={(e) => updateSlideContent("title", e.target.value)}
                      placeholder="Slide Title"
                      className="text-2xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                    <Textarea
                      value={activeSlide.content.body ?? ""}
                      onChange={(e) => updateSlideContent("body", e.target.value)}
                      placeholder="Content goes here..."
                      className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 resize-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}

                {activeSlide.layout === "two-column" && (
                  <div className="flex-1 flex flex-col gap-4">
                    <Input
                      value={activeSlide.content.title ?? ""}
                      onChange={(e) => updateSlideContent("title", e.target.value)}
                      placeholder="Slide Title"
                      className="text-2xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <Textarea
                        value={activeSlide.content.leftColumn ?? ""}
                        onChange={(e) => updateSlideContent("leftColumn", e.target.value)}
                        placeholder="Left column..."
                        className="border-none bg-transparent shadow-none focus-visible:ring-0 resize-none placeholder:text-muted-foreground/50"
                      />
                      <Textarea
                        value={activeSlide.content.rightColumn ?? ""}
                        onChange={(e) => updateSlideContent("rightColumn", e.target.value)}
                        placeholder="Right column..."
                        className="border-none bg-transparent shadow-none focus-visible:ring-0 resize-none placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                )}

                {activeSlide.layout === "blank" && (
                  <div className="flex-1 flex items-center justify-center">
                    <Textarea
                      value={activeSlide.content.body ?? ""}
                      onChange={(e) => updateSlideContent("body", e.target.value)}
                      placeholder="Free-form content..."
                      className="w-full h-full border-none bg-transparent shadow-none focus-visible:ring-0 resize-none text-center placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-2 border-t text-xs text-muted-foreground text-center">
              Slide {activeSlideIdx + 1} of {slides.length}
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presentations..."
          className="pl-9"
        />
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
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
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
                <p className="text-xs text-muted-foreground mt-2">
                  By {pres.createdBy.name ?? pres.createdBy.email} &middot;{" "}
                  {new Date(pres.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
