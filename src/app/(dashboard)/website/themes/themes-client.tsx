"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Pencil,
  Trash2,
  Check,
  Palette,
  X,
} from "lucide-react";
import {
  createTheme,
  updateTheme,
  deleteTheme,
  activateTheme,
} from "@/lib/actions/website";

export type Theme = {
  id: string;
  name: string;
  isActive: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headingFont: string | null;
  borderRadius: string;
  darkMode: boolean;
  customCSS: string | null;
  previewThumbnail?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  tenantId?: string;
};

const FONT_FAMILIES = ["Inter", "Roboto", "Poppins", "Open Sans", "Montserrat"];

function ThemePreview({ theme }: { theme: Partial<Theme> }) {
  const p = theme.primaryColor ?? "#4F46E5";
  const s = theme.secondaryColor ?? "#7C3AED";
  const font = theme.fontFamily ?? "Inter";
  const radius = theme.borderRadius ?? "0.5rem";
  const dark = theme.darkMode ?? false;

  return (
    <div
      className="rounded-lg border p-4 space-y-3 transition-colors"
      style={{
        backgroundColor: dark ? "#1e1e2e" : "#ffffff",
        borderRadius: radius,
        fontFamily: font,
      }}
    >
      <div className="flex gap-2">
        <div
          className="h-8 w-8 rounded-md"
          style={{ backgroundColor: p }}
        />
        <div
          className="h-8 w-8 rounded-md"
          style={{ backgroundColor: s }}
        />
      </div>
      <div className="space-y-1">
        <div className="h-3 w-3/4 rounded" style={{ backgroundColor: p, opacity: 0.3 }} />
        <div
          className="h-2 w-1/2 rounded"
          style={{ backgroundColor: dark ? "#555" : "#ddd" }}
        />
      </div>
      <div className="flex gap-2">
        <div
          className="h-6 flex-1 rounded"
          style={{ backgroundColor: p, borderRadius: radius }}
        />
        <div
          className="h-6 w-16 rounded"
          style={{ backgroundColor: s, borderRadius: radius, opacity: 0.6 }}
        />
      </div>
    </div>
  );
}

export function ThemesClient({ initialThemes }: { initialThemes: Theme[] }) {
  const [themes, setThemes] = useState<Theme[]>(initialThemes);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);

  const [form, setForm] = useState({
    name: "",
    primaryColor: "#4F46E5",
    secondaryColor: "#7C3AED",
    fontFamily: "Inter",
    headingFont: "",
    borderRadius: "0.5rem",
    darkMode: false,
    customCSS: "",
  });

  function resetForm() {
    setForm({
      name: "",
      primaryColor: "#4F46E5",
      secondaryColor: "#7C3AED",
      fontFamily: "Inter",
      headingFont: "",
      borderRadius: "0.5rem",
      darkMode: false,
      customCSS: "",
    });
    setEditingTheme(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(theme: Theme) {
    setEditingTheme(theme);
    setForm({
      name: theme.name,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      fontFamily: theme.fontFamily,
      headingFont: theme.headingFont ?? "",
      borderRadius: theme.borderRadius,
      darkMode: theme.darkMode,
      customCSS: theme.customCSS ?? "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      if (editingTheme) {
        const updated = await updateTheme(editingTheme.id, {
          name: form.name,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          fontFamily: form.fontFamily,
          headingFont: form.headingFont || undefined,
          borderRadius: form.borderRadius,
          darkMode: form.darkMode,
          customCSS: form.customCSS || undefined,
        });
        setThemes((prev) =>
          prev.map((t) => (t.id === updated.id ? updated as Theme : t))
        );
      } else {
        const created = await createTheme({
          name: form.name,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          fontFamily: form.fontFamily,
          headingFont: form.headingFont || undefined,
          borderRadius: form.borderRadius,
          darkMode: form.darkMode,
          customCSS: form.customCSS || undefined,
        });
        setThemes((prev) => [created as Theme, ...prev]);
      }
      setDialogOpen(false);
      resetForm();
    });
  }

  function handleDelete(theme: Theme) {
    setThemeToDelete(theme);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (!themeToDelete) return;
    startTransition(async () => {
      await deleteTheme(themeToDelete.id);
      setThemes((prev) => prev.filter((t) => t.id !== themeToDelete.id));
      setDeleteConfirmOpen(false);
      setThemeToDelete(null);
    });
  }

  function handleActivate(theme: Theme) {
    startTransition(async () => {
      const activated = await activateTheme(theme.id);
      setThemes((prev) =>
        prev.map((t) => ({ ...t, isActive: t.id === activated.id }))
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Website Themes</h1>
          <p className="text-muted-foreground">
            Manage color schemes and typography for your site
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Theme
        </Button>
      </div>

      {themes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No themes yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first theme to customize your website&apos;s appearance
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Theme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <Card
              key={theme.id}
              className={`relative overflow-hidden transition-shadow hover:shadow-md ${
                theme.isActive ? "ring-2 ring-primary" : ""
              }`}
            >
              {theme.isActive && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="gap-1">
                    <Check className="h-3 w-3" /> Active
                  </Badge>
                </div>
              )}
              <CardContent className="p-4 space-y-4">
                <ThemePreview theme={theme} />

                <div className="space-y-1">
                  <h3 className="font-semibold text-sm truncate">{theme.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {theme.fontFamily}
                    {theme.headingFont ? ` / ${theme.headingFont}` : ""}
                  </p>
                </div>

                <div className="flex gap-2">
                  <div
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: theme.primaryColor }}
                    title={theme.primaryColor}
                  />
                  <div
                    className="h-5 w-5 rounded-full border"
                    style={{ backgroundColor: theme.secondaryColor }}
                    title={theme.secondaryColor}
                  />
                  {theme.darkMode && (
                    <Badge variant="outline" className="text-xs">Dark</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!theme.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleActivate(theme)}
                      disabled={isPending}
                    >
                      Set Active
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(theme)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(theme)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? "Edit Theme" : "Create Theme"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Theme Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Theme"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm({ ...form, primaryColor: e.target.value })
                    }
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm({ ...form, primaryColor: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm({ ...form, secondaryColor: e.target.value })
                    }
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm({ ...form, secondaryColor: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={form.fontFamily}
                  onValueChange={(v) => setForm({ ...form, fontFamily: v ?? "Inter" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Heading Font</Label>
                <Select
                  value={form.headingFont || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, headingFont: v === "none" || !v ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Same as body" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Same as body</SelectItem>
                    {FONT_FAMILIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="borderRadius">Border Radius</Label>
                <Input
                  id="borderRadius"
                  value={form.borderRadius}
                  onChange={(e) =>
                    setForm({ ...form, borderRadius: e.target.value })
                  }
                  placeholder="0.5rem"
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={form.darkMode}
                    onCheckedChange={(v) => setForm({ ...form, darkMode: v })}
                    id="darkMode"
                  />
                  <Label htmlFor="darkMode">Dark Mode</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customCSS">Custom CSS</Label>
              <textarea
                id="customCSS"
                value={form.customCSS}
                onChange={(e) => setForm({ ...form, customCSS: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="/* Optional custom styles */"
              />
            </div>

            {/* Live Preview */}
            <div className="space-y-1">
              <Label>Preview</Label>
              <ThemePreview theme={form} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim()}>
              {editingTheme ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{themeToDelete?.name}&quot;? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
