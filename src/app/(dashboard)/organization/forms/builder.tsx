"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Save,
  Loader2,
  Type,
  Hash,
  Mail,
  Phone,
  AlignLeft,
  ListOrdered,
  CheckSquare,
  CircleDot,
  Calendar,
  Upload,
  Plus,
  X,
  Settings2,
} from "lucide-react";
import { updateForm } from "@/lib/actions/organization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormField = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  showIf?: { fieldId: string; equals: string } | null;
};

type Form = {
  id: string;
  title: string;
  description?: string | null;
  fields: unknown;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_TYPES = [
  { type: "text", label: "Text", icon: Type },
  { type: "number", label: "Number", icon: Hash },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "textarea", label: "Textarea", icon: AlignLeft },
  { type: "select", label: "Dropdown", icon: ListOrdered },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "radio", label: "Radio", icon: CircleDot },
  { type: "date", label: "Date", icon: Calendar },
  { type: "file", label: "File", icon: Upload },
] as const;

function generateId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function getFieldIcon(type: string) {
  const found = FIELD_TYPES.find((f) => f.type === type);
  return found?.icon ?? Type;
}

// ---------------------------------------------------------------------------
// FieldPaletteItem — draggable from the left panel
// ---------------------------------------------------------------------------

function FieldPaletteItem({ type, label, icon: Icon }: { type: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/form-field-type", type);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm transition-all hover:shadow-md active:cursor-grabbing active:scale-[1.02] active:opacity-80"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CanvasField — each field on the canvas
// ---------------------------------------------------------------------------

function CanvasField({
  field,
  index,
  isSelected,
  onSelect,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  const Icon = getFieldIcon(field.type);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 rounded-lg border p-3 transition-all cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "hover:border-muted-foreground/30 hover:bg-muted/30",
        isDragOver && "border-primary/50 bg-primary/10 border-dashed"
      )}
    >
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{field.label}</span>
          {field.required && (
            <span className="text-xs text-red-500">*</span>
          )}
        </div>
        {field.placeholder && (
          <p className="text-xs text-muted-foreground truncate">{field.placeholder}</p>
        )}
      </div>
      <Badge variant="secondary" className="text-[10px] shrink-0">
        {field.type}
      </Badge>
      {field.showIf && (
        <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-600">
          conditional
        </Badge>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldEditor — right-panel property editor for a selected field
// ---------------------------------------------------------------------------

function FieldEditor({
  field,
  allFields,
  onChange,
}: {
  field: FormField;
  allFields: FormField[];
  onChange: (updated: FormField) => void;
}) {
  const otherFields = allFields.filter((f) => f.id !== field.id);
  const hasOptions = ["select", "radio", "checkbox"].includes(field.type);

  function addOption() {
    const opts = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
    onChange({ ...field, options: opts });
  }

  function updateOption(idx: number, value: string) {
    const opts = [...(field.options || [])];
    opts[idx] = value;
    onChange({ ...field, options: opts });
  }

  function removeOption(idx: number) {
    const opts = (field.options || []).filter((_, i) => i !== idx);
    onChange({ ...field, options: opts });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Field Properties</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Label</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Placeholder</Label>
        <Input
          value={field.placeholder || ""}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="Placeholder text"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Required</Label>
        <Switch
          checked={field.required}
          onCheckedChange={(checked) => onChange({ ...field, required: !!checked })}
        />
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <Label className="text-xs">Options</Label>
          <div className="space-y-1.5">
            {(field.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0 text-destructive"
                  onClick={() => removeOption(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="w-full h-7 text-xs" onClick={addOption}>
            <Plus className="mr-1 h-3 w-3" />
            Add Option
          </Button>
        </div>
      )}

      {/* Conditional logic: Show If */}
      <div className="space-y-2 border-t pt-4">
        <Label className="text-xs font-semibold">Conditional Logic</Label>
        <p className="text-[11px] text-muted-foreground">Show this field only if another field equals a specific value.</p>

        {field.showIf ? (
          <div className="space-y-2 rounded-md border p-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Show if field</Label>
              <Select
                value={field.showIf.fieldId}
                onValueChange={(val) =>
                  onChange({ ...field, showIf: { fieldId: val ?? "", equals: field.showIf?.equals || "" } })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {otherFields.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Equals</Label>
              <Input
                value={field.showIf.equals}
                onChange={(e) =>
                  onChange({ ...field, showIf: { fieldId: field.showIf!.fieldId, equals: e.target.value } })
                }
                className="h-8 text-xs"
                placeholder="Value to match"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-full text-xs text-destructive"
              onClick={() => onChange({ ...field, showIf: null })}
            >
              Remove Condition
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={() =>
              onChange({ ...field, showIf: { fieldId: otherFields[0]?.id || "", equals: "" } })
            }
            disabled={otherFields.length === 0}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Condition
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormBuilder — main component
// ---------------------------------------------------------------------------

export function FormBuilder({
  form,
  onBack,
}: {
  form: Form;
  onBack: () => void;
}) {
  const initialFields = Array.isArray(form.fields) ? (form.fields as FormField[]) : [];
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description || "");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // DnD state
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndex = useRef<number | null>(null);
  const isDraggingFromPalette = useRef(false);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  // --- DnD: Palette to Canvas ---
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes("application/form-field-type") ? "copy" : "move";
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const fieldType = e.dataTransfer.getData("application/form-field-type");
      if (fieldType) {
        // Adding a new field from palette
        const typeMeta = FIELD_TYPES.find((t) => t.type === fieldType);
        const newField: FormField = {
          id: generateId(),
          type: fieldType,
          label: typeMeta?.label || fieldType,
          placeholder: "",
          required: false,
          options: ["select", "radio", "checkbox"].includes(fieldType)
            ? ["Option 1", "Option 2"]
            : undefined,
        };
        setFields((prev) => [...prev, newField]);
        setSelectedFieldId(newField.id);
        return;
      }
    },
    []
  );

  // --- DnD: Reorder on canvas ---
  const handleFieldDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("application/form-field-reorder", String(index));
    e.dataTransfer.effectAllowed = "move";
    dragSourceIndex.current = index;
    isDraggingFromPalette.current = false;
  }, []);

  const handleFieldDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    // Accept both palette drops and reorder
    if (
      e.dataTransfer.types.includes("application/form-field-reorder") ||
      e.dataTransfer.types.includes("application/form-field-type")
    ) {
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes("application/form-field-type") ? "copy" : "move";
      setDragOverIndex(index);
    }
  }, []);

  const handleFieldDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);

      // Handle palette drop onto a specific position
      const fieldType = e.dataTransfer.getData("application/form-field-type");
      if (fieldType) {
        const typeMeta = FIELD_TYPES.find((t) => t.type === fieldType);
        const newField: FormField = {
          id: generateId(),
          type: fieldType,
          label: typeMeta?.label || fieldType,
          placeholder: "",
          required: false,
          options: ["select", "radio", "checkbox"].includes(fieldType)
            ? ["Option 1", "Option 2"]
            : undefined,
        };
        setFields((prev) => {
          const copy = [...prev];
          copy.splice(targetIndex, 0, newField);
          return copy;
        });
        setSelectedFieldId(newField.id);
        return;
      }

      // Handle reorder
      const sourceStr = e.dataTransfer.getData("application/form-field-reorder");
      if (sourceStr !== "") {
        const sourceIndex = parseInt(sourceStr, 10);
        if (sourceIndex === targetIndex) return;
        setFields((prev) => {
          const copy = [...prev];
          const [moved] = copy.splice(sourceIndex, 1);
          copy.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved);
          return copy;
        });
      }
    },
    []
  );

  const handleFieldDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragSourceIndex.current = null;
  }, []);

  // --- Field operations ---
  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  function updateField(updated: FormField) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  // --- Save ---
  function handleSave() {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateForm(form.id, {
          title: title.trim(),
          description: description || null,
          fields,
        });
        toast.success("Form saved");
      } catch {
        toast.error("Failed to save form");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-lg font-bold border-0 shadow-none px-0 focus-visible:ring-0"
              placeholder="Form title"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Form description (optional)"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 280px)" }}>
        {/* Left: Field Palette */}
        <div className="col-span-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Field Types
          </h3>
          <p className="text-[11px] text-muted-foreground px-1">
            Drag a field onto the canvas
          </p>
          <div className="space-y-1.5">
            {FIELD_TYPES.map((ft) => (
              <FieldPaletteItem key={ft.type} type={ft.type} label={ft.label} icon={ft.icon} />
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="col-span-6">
          <div
            className={cn(
              "min-h-[400px] rounded-lg border-2 border-dashed p-4 transition-colors",
              fields.length === 0
                ? "flex items-center justify-center"
                : "space-y-2"
            )}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            {fields.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Drag fields here to build your form
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Or click a field type to add it
                </p>
              </div>
            ) : (
              fields.map((field, idx) => (
                <CanvasField
                  key={field.id}
                  field={field}
                  index={idx}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => setSelectedFieldId(field.id)}
                  onRemove={() => removeField(field.id)}
                  onDragStart={handleFieldDragStart}
                  onDragOver={handleFieldDragOver}
                  onDrop={handleFieldDrop}
                  onDragEnd={handleFieldDragEnd}
                  isDragOver={dragOverIndex === idx}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Field Editor */}
        <div className="col-span-3">
          {selectedField ? (
            <Card>
              <CardContent className="p-4">
                <FieldEditor
                  field={selectedField}
                  allFields={fields}
                  onChange={updateField}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4">
              <p className="text-xs text-muted-foreground text-center">
                Select a field on the canvas to edit its properties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
