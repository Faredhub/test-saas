"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Editor, Frame, Element, useNode, useEditor } from "@craftjs/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Eye,
  Undo2,
  Monitor,
  Tablet,
  Smartphone,
  Type,
  Heading,
  ImageIcon,
  MousePointerClick,
  LayoutGrid,
  Minus,
  MoveVertical,
  GripVertical,
} from "lucide-react";
import { updatePage } from "@/lib/actions/website";
import { toast } from "sonner";

// =============================================================================
// Craft.js User Components
// =============================================================================

function TextBlock({
  text,
  fontSize,
  color,
  textAlign,
}: {
  text: string;
  fontSize: number;
  color: string;
  textAlign: string;
}) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`p-2 transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2" : "hover:outline hover:outline-1 hover:outline-gray-300"}`}
      style={{ fontSize: `${fontSize}px`, color, textAlign: textAlign as never }}
    >
      {text}
    </div>
  );
}

TextBlock.craft = {
  displayName: "Text",
  props: { text: "Enter your text here...", fontSize: 16, color: "#000000", textAlign: "left" },
  related: { settings: TextSettings },
};

function TextSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Text Content</Label>
        <Textarea
          value={props.text}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.text = e.target.value))}
          rows={3}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Font Size (px)</Label>
        <Input
          type="number"
          value={props.fontSize}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.fontSize = parseInt(e.target.value) || 16))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1">
          <input
            type="color"
            value={props.color}
            onChange={(e) => setProp((p: Record<string, unknown>) => (p.color = e.target.value))}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input
            value={props.color}
            onChange={(e) => setProp((p: Record<string, unknown>) => (p.color = e.target.value))}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Alignment</Label>
        <Select value={props.textAlign} onValueChange={(v) => setProp((p: Record<string, unknown>) => (p.textAlign = v))}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function HeadingBlock({
  text,
  level,
  textAlign,
}: {
  text: string;
  level: string;
  textAlign: string;
}) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  const sizeMap: Record<string, string> = {
    h1: "text-4xl",
    h2: "text-3xl",
    h3: "text-2xl",
    h4: "text-xl",
    h5: "text-lg",
    h6: "text-base",
  };

  const headingClass = `${sizeMap[level] || "text-2xl"} font-bold`;
  const headingStyle = { textAlign: textAlign as React.CSSProperties["textAlign"] };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`p-2 transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2" : "hover:outline hover:outline-1 hover:outline-gray-300"}`}
    >
      {level === "h1" && <h1 className={headingClass} style={headingStyle}>{text}</h1>}
      {level === "h2" && <h2 className={headingClass} style={headingStyle}>{text}</h2>}
      {level === "h3" && <h3 className={headingClass} style={headingStyle}>{text}</h3>}
      {level === "h4" && <h4 className={headingClass} style={headingStyle}>{text}</h4>}
      {level === "h5" && <h5 className={headingClass} style={headingStyle}>{text}</h5>}
      {level === "h6" && <h6 className={headingClass} style={headingStyle}>{text}</h6>}
    </div>
  );
}

HeadingBlock.craft = {
  displayName: "Heading",
  props: { text: "New Heading", level: "h2", textAlign: "left" },
  related: { settings: HeadingSettings },
};

function HeadingSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Heading Text</Label>
        <Input
          value={props.text}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.text = e.target.value))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Level</Label>
        <Select value={props.level} onValueChange={(v) => setProp((p: Record<string, unknown>) => (p.level = v))}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["h1", "h2", "h3", "h4", "h5", "h6"].map((h) => (
              <SelectItem key={h} value={h}>
                {h.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Alignment</Label>
        <Select value={props.textAlign} onValueChange={(v) => setProp((p: Record<string, unknown>) => (p.textAlign = v))}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ImageBlock({
  src,
  alt,
  width,
}: {
  src: string;
  alt: string;
  width: number;
}) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`p-2 transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2" : "hover:outline hover:outline-1 hover:outline-gray-300"}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} style={{ width: `${width}%`, maxWidth: "100%" }} className="rounded" />
      ) : (
        <div
          className="bg-muted rounded flex items-center justify-center text-muted-foreground text-sm"
          style={{ width: `${width}%`, height: 150 }}
        >
          No image URL set
        </div>
      )}
    </div>
  );
}

ImageBlock.craft = {
  displayName: "Image",
  props: { src: "", alt: "Image", width: 100 },
  related: { settings: ImageSettings },
};

function ImageSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Image URL</Label>
        <Input
          value={props.src}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.src = e.target.value))}
          placeholder="https://..."
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Alt Text</Label>
        <Input
          value={props.alt}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.alt = e.target.value))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Width (%)</Label>
        <Input
          type="number"
          min={10}
          max={100}
          value={props.width}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.width = parseInt(e.target.value) || 100))}
          className="mt-1"
        />
      </div>
    </div>
  );
}

function ButtonBlock({
  text,
  href,
  variant,
}: {
  text: string;
  href: string;
  variant: string;
}) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  const variantStyles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`p-2 transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2" : "hover:outline hover:outline-1 hover:outline-gray-300"}`}
    >
      <a
        href={href}
        onClick={(e) => e.preventDefault()}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${variantStyles[variant] || variantStyles.primary}`}
      >
        {text}
      </a>
    </div>
  );
}

ButtonBlock.craft = {
  displayName: "Button",
  props: { text: "Click me", href: "#", variant: "primary" },
  related: { settings: ButtonSettings },
};

function ButtonSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Button Text</Label>
        <Input
          value={props.text}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.text = e.target.value))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Link URL</Label>
        <Input
          value={props.href}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.href = e.target.value))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Variant</Label>
        <Select value={props.variant} onValueChange={(v) => setProp((p: Record<string, unknown>) => (p.variant = v))}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ContainerBlock({
  direction,
  gap,
  padding,
  background,
  children,
}: {
  direction: string;
  gap: number;
  padding: number;
  background: string;
  children?: React.ReactNode;
}) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`min-h-[60px] rounded transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2" : "hover:outline hover:outline-1 hover:outline-gray-300"}`}
      style={{
        display: "flex",
        flexDirection: direction as never,
        gap: `${gap}px`,
        padding: `${padding}px`,
        backgroundColor: background || "transparent",
      }}
    >
      {children}
    </div>
  );
}

ContainerBlock.craft = {
  displayName: "Container",
  props: { direction: "column", gap: 8, padding: 16, background: "" },
  isCanvas: true,
  related: { settings: ContainerSettings },
};

function ContainerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Direction</Label>
        <Select value={props.direction} onValueChange={(v) => setProp((p: Record<string, unknown>) => (p.direction = v))}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row">Row (horizontal)</SelectItem>
            <SelectItem value="column">Column (vertical)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Gap (px)</Label>
        <Input
          type="number"
          value={props.gap}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.gap = parseInt(e.target.value) || 0))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Padding (px)</Label>
        <Input
          type="number"
          value={props.padding}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.padding = parseInt(e.target.value) || 0))}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Background Color</Label>
        <div className="flex gap-2 mt-1">
          <input
            type="color"
            value={props.background || "#ffffff"}
            onChange={(e) => setProp((p: Record<string, unknown>) => (p.background = e.target.value))}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input
            value={props.background}
            onChange={(e) => setProp((p: Record<string, unknown>) => (p.background = e.target.value))}
            placeholder="transparent"
          />
        </div>
      </div>
    </div>
  );
}

function DividerBlock({ color, thickness }: { color: string; thickness: number }) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`py-2 transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2" : "hover:outline hover:outline-1 hover:outline-gray-300"}`}
    >
      <hr style={{ borderColor: color, borderTopWidth: `${thickness}px` }} />
    </div>
  );
}

DividerBlock.craft = {
  displayName: "Divider",
  props: { color: "#e5e7eb", thickness: 1 },
  related: { settings: DividerSettings },
};

function DividerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1">
          <input
            type="color"
            value={props.color}
            onChange={(e) => setProp((p: Record<string, unknown>) => (p.color = e.target.value))}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input
            value={props.color}
            onChange={(e) => setProp((p: Record<string, unknown>) => (p.color = e.target.value))}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Thickness (px)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={props.thickness}
          onChange={(e) => setProp((p: Record<string, unknown>) => (p.thickness = parseInt(e.target.value) || 1))}
          className="mt-1"
        />
      </div>
    </div>
  );
}

function SpacerBlock({ height }: { height: number }) {
  const {
    connectors: { connect, drag },
    isSelected,
  } = useNode((node) => ({ isSelected: node.events.selected }));

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`transition-all ${isSelected ? "outline outline-2 outline-blue-500 outline-offset-2 bg-blue-50/50" : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-gray-300"}`}
      style={{ height: `${height}px` }}
    />
  );
}

SpacerBlock.craft = {
  displayName: "Spacer",
  props: { height: 32 },
  related: { settings: SpacerSettings },
};

function SpacerSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props }));

  return (
    <div>
      <Label className="text-xs">Height (px)</Label>
      <Input
        type="number"
        min={8}
        max={200}
        value={props.height}
        onChange={(e) => setProp((p: Record<string, unknown>) => (p.height = parseInt(e.target.value) || 32))}
        className="mt-1"
      />
    </div>
  );
}

// =============================================================================
// Canvas Root (droppable area)
// =============================================================================

function CanvasRoot({ children }: { children?: React.ReactNode }) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="min-h-[400px] p-4"
    >
      {children}
    </div>
  );
}

CanvasRoot.craft = {
  displayName: "Canvas",
  isCanvas: true,
};

// =============================================================================
// Component Palette (left sidebar)
// =============================================================================

const PALETTE_ITEMS = [
  { label: "Text", icon: Type, component: <TextBlock text="Enter your text here..." fontSize={16} color="#000000" textAlign="left" /> },
  { label: "Heading", icon: Heading, component: <HeadingBlock text="New Heading" level="h2" textAlign="left" /> },
  { label: "Image", icon: ImageIcon, component: <ImageBlock src="" alt="Image" width={100} /> },
  { label: "Button", icon: MousePointerClick, component: <ButtonBlock text="Click me" href="#" variant="primary" /> },
  {
    label: "Container",
    icon: LayoutGrid,
    component: (
      <Element is={ContainerBlock} direction="column" gap={8} padding={16} background="" canvas />
    ),
  },
  { label: "Divider", icon: Minus, component: <DividerBlock color="#e5e7eb" thickness={1} /> },
  { label: "Spacer", icon: MoveVertical, component: <SpacerBlock height={32} /> },
];

function ComponentPalette() {
  const { connectors } = useEditor();

  return (
    <div className="w-56 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Components</h3>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {PALETTE_ITEMS.map((item) => (
            <div
              key={item.label}
              ref={(ref) => {
                if (ref) connectors.create(ref, item.component);
              }}
              className="flex items-center gap-2 p-2.5 rounded-md cursor-grab hover:bg-muted transition-colors text-sm"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Settings Panel (right sidebar)
// =============================================================================

function SettingsPanel() {
  const { selected, selectedName, settingsComponent } = useEditor((state) => {
    const currentIds = state.events.selected;
    const id = currentIds ? Array.from(currentIds)[0] : undefined;

    if (id) {
      const node = state.nodes[id];
      return {
        selected: id,
        selectedName: node?.data?.displayName || node?.data?.name || "Component",
        settingsComponent: node?.related?.settings,
      };
    }
    return { selected: undefined, selectedName: "", settingsComponent: undefined };
  });

  if (!selected) {
    return (
      <div className="w-64 border-l bg-muted/30 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">Select a component on the canvas to edit its properties</p>
      </div>
    );
  }

  const SettingsComponent = settingsComponent;

  return (
    <div className="w-64 border-l bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold">{selectedName}</h3>
        <p className="text-xs text-muted-foreground">Edit properties</p>
      </div>
      <ScrollArea className="flex-1 p-3">
        {SettingsComponent ? <SettingsComponent /> : <p className="text-xs text-muted-foreground">No settings available</p>}
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Top Toolbar
// =============================================================================

function Toolbar({
  pageTitle,
  canvasWidth,
  setCanvasWidth,
  onSave,
  saving,
  onPreview,
}: {
  pageTitle: string;
  canvasWidth: number;
  setCanvasWidth: (w: number) => void;
  onSave: () => void;
  saving: boolean;
  onPreview: () => void;
}) {
  const { canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const router = useRouter();

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-background">
      <Button variant="ghost" size="sm" onClick={() => router.push("/website/pages")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div className="h-5 w-px bg-border" />

      <span className="text-sm font-medium truncate max-w-[200px]">{pageTitle}</span>

      <div className="flex-1" />

      <div className="flex items-center gap-1 border rounded-md p-0.5">
        <Button
          variant={canvasWidth === 1280 ? "secondary" : "ghost"}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setCanvasWidth(1280)}
          title="Desktop"
        >
          <Monitor className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={canvasWidth === 768 ? "secondary" : "ghost"}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setCanvasWidth(768)}
          title="Tablet"
        >
          <Tablet className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={canvasWidth === 375 ? "secondary" : "ghost"}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setCanvasWidth(375)}
          title="Mobile"
        >
          <Smartphone className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="h-5 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        disabled={!canUndo}
        onClick={() => actions.history.undo()}
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRedo}
        onClick={() => actions.history.redo()}
        title="Redo"
      >
        <Undo2 className="h-4 w-4 scale-x-[-1]" />
      </Button>

      <div className="h-5 w-px bg-border" />

      <Button variant="outline" size="sm" onClick={onPreview}>
        <Eye className="h-4 w-4 mr-1" />
        Preview
      </Button>
      <Button size="sm" onClick={onSave} disabled={saving}>
        <Save className="h-4 w-4 mr-1" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

// =============================================================================
// Save Handler (extracts serialized state)
// =============================================================================

function SaveHandler({ onSerialize }: { onSerialize: (json: string) => void }) {
  const { query } = useEditor();

  useEffect(() => {
    // expose the query serialize function via a callback
    onSerialize(query.serialize());
  });

  return null;
}

// =============================================================================
// Main Visual Editor Component
// =============================================================================

export function VisualEditor({
  pageId,
  pageTitle,
  initialContent,
}: {
  pageId: string;
  pageTitle: string;
  initialContent: unknown;
}) {
  const [canvasWidth, setCanvasWidth] = useState(1280);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const serializeRef = useRef<() => string>(() => "{}");
  const router = useRouter();

  // Parse initial content -- if it's a craft.js JSON string/object, use it;
  // otherwise start with empty canvas
  const loadedJson = useCallback((): string | undefined => {
    try {
      if (typeof initialContent === "string" && initialContent.includes("ROOT")) {
        return initialContent;
      }
      if (typeof initialContent === "object" && initialContent !== null) {
        const str = JSON.stringify(initialContent);
        if (str.includes("ROOT")) return str;
      }
    } catch {
      // fallback to empty
    }
    return undefined;
  }, [initialContent]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const json = serializeRef.current();
      await updatePage(pageId, { content: json });
      toast.success("Page saved");
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  }, [pageId]);

  const handleSerialize = useCallback((json: string) => {
    serializeRef.current = () => json;
  }, []);

  const resolverMap = {
    CanvasRoot,
    TextBlock,
    HeadingBlock,
    ImageBlock,
    ButtonBlock,
    ContainerBlock,
    DividerBlock,
    SpacerBlock,
  };

  const initialData = loadedJson();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Editor resolver={resolverMap} enabled={!previewMode}>
        <Toolbar
          pageTitle={pageTitle}
          canvasWidth={canvasWidth}
          setCanvasWidth={setCanvasWidth}
          onSave={handleSave}
          saving={saving}
          onPreview={() => setPreviewMode((p) => !p)}
        />
        <SaveHandler onSerialize={handleSerialize} />

        <div className="flex flex-1 overflow-hidden">
          {!previewMode && <ComponentPalette />}

          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex justify-center p-6">
            <div
              className="bg-background rounded-lg shadow-sm border transition-all duration-300"
              style={{ width: canvasWidth, maxWidth: "100%" }}
            >
              <Frame data={initialData}>
                <Element is={CanvasRoot} canvas>
                  <HeadingBlock text="Start building your page" level="h2" textAlign="center" />
                  <TextBlock
                    text="Drag components from the left panel and drop them here. Click any component to edit its properties in the right panel."
                    fontSize={16}
                    color="#6b7280"
                    textAlign="center"
                  />
                </Element>
              </Frame>
            </div>
          </div>

          {!previewMode && <SettingsPanel />}
        </div>
      </Editor>
    </div>
  );
}
