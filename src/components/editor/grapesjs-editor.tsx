"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import basicBlocks from "grapesjs-blocks-basic";
import webpagePreset from "grapesjs-preset-webpage";
import { registerDesignBlocks } from "./grapesjs-blocks";
import {
  Layers,
  Paintbrush,
  Settings2,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Code2,
  Trash2,
  LayoutGrid,
  FileInput,
} from "lucide-react";
import { cn } from "@/lib/utils";

type GrapesJSEditorProps = {
  initialHtml?: string;
  initialCss?: string;
  onSave: (data: { html: string; css: string }) => void;
};

export type GrapesJSEditorHandle = {
  getEditor: () => Editor | null;
};

type RightPanel = "styles" | "layers" | "traits";
type DeviceId = "Desktop" | "Tablet" | "Mobile portrait";

const CANVAS_BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
  }
  img { max-width: 100%; height: auto; }
  a { color: inherit; }
`;

const STYLE_SECTORS = [
  {
    name: "Layout",
    open: true,
    properties: [
      { property: "display", type: "select", defaults: "block", options: [
        { value: "block", name: "Block" },
        { value: "flex", name: "Flex" },
        { value: "grid", name: "Grid" },
        { value: "inline-block", name: "Inline Block" },
        { value: "inline", name: "Inline" },
        { value: "none", name: "None" },
      ]},
      { property: "position", type: "select", defaults: "static", options: [
        { value: "static", name: "Static" },
        { value: "relative", name: "Relative" },
        { value: "absolute", name: "Absolute" },
        { value: "fixed", name: "Fixed" },
        { value: "sticky", name: "Sticky" },
      ]},
      "top",
      "right",
      "bottom",
      "left",
      "z-index",
      { property: "flex-direction", type: "select", defaults: "row", options: [
        { value: "row", name: "Row" },
        { value: "column", name: "Column" },
        { value: "row-reverse", name: "Row Reverse" },
        { value: "column-reverse", name: "Column Reverse" },
      ]},
      { property: "justify-content", type: "select", defaults: "flex-start", options: [
        { value: "flex-start", name: "Start" },
        { value: "center", name: "Center" },
        { value: "flex-end", name: "End" },
        { value: "space-between", name: "Space Between" },
        { value: "space-around", name: "Space Around" },
        { value: "space-evenly", name: "Space Evenly" },
      ]},
      { property: "align-items", type: "select", defaults: "stretch", options: [
        { value: "stretch", name: "Stretch" },
        { value: "flex-start", name: "Start" },
        { value: "center", name: "Center" },
        { value: "flex-end", name: "End" },
        { value: "baseline", name: "Baseline" },
      ]},
      { property: "flex-wrap", type: "select", defaults: "nowrap", options: [
        { value: "nowrap", name: "No Wrap" },
        { value: "wrap", name: "Wrap" },
      ]},
      "gap",
      { property: "grid-template-columns", type: "text" },
    ],
  },
  {
    name: "Size",
    open: false,
    properties: [
      "width",
      "height",
      "max-width",
      "min-width",
      "max-height",
      "min-height",
      "margin",
      "padding",
    ],
  },
  {
    name: "Typography",
    open: false,
    properties: [
      {
        property: "font-family",
        type: "select",
        defaults: "Inter, sans-serif",
        options: [
          { value: "Inter, ui-sans-serif, system-ui, sans-serif", name: "Inter" },
          { value: "Georgia, 'Times New Roman', serif", name: "Georgia" },
          { value: "'Segoe UI', Roboto, sans-serif", name: "Segoe UI" },
          { value: "Menlo, Monaco, Consolas, monospace", name: "Monospace" },
          { value: "'Playfair Display', Georgia, serif", name: "Playfair" },
          { value: "inherit", name: "Inherit" },
        ],
      },
      "font-size",
      {
        property: "font-weight",
        type: "select",
        defaults: "400",
        options: [
          { value: "300", name: "Light" },
          { value: "400", name: "Regular" },
          { value: "500", name: "Medium" },
          { value: "600", name: "Semi Bold" },
          { value: "700", name: "Bold" },
          { value: "800", name: "Extra Bold" },
        ],
      },
      "letter-spacing",
      "color",
      "line-height",
      {
        property: "text-align",
        type: "radio",
        defaults: "left",
        options: [
          { value: "left", name: "Left" },
          { value: "center", name: "Center" },
          { value: "right", name: "Right" },
          { value: "justify", name: "Justify" },
        ],
      },
      {
        property: "text-decoration",
        type: "select",
        defaults: "none",
        options: [
          { value: "none", name: "None" },
          { value: "underline", name: "Underline" },
          { value: "line-through", name: "Line Through" },
        ],
      },
      {
        property: "text-transform",
        type: "select",
        defaults: "none",
        options: [
          { value: "none", name: "None" },
          { value: "uppercase", name: "Uppercase" },
          { value: "lowercase", name: "Lowercase" },
          { value: "capitalize", name: "Capitalize" },
        ],
      },
    ],
  },
  {
    name: "Background",
    open: false,
    properties: [
      "background-color",
      {
        property: "background-image",
        type: "text",
      },
      {
        property: "background-size",
        type: "select",
        defaults: "auto",
        options: [
          { value: "auto", name: "Auto" },
          { value: "cover", name: "Cover" },
          { value: "contain", name: "Contain" },
        ],
      },
      {
        property: "background-position",
        type: "select",
        defaults: "center center",
        options: [
          { value: "center center", name: "Center" },
          { value: "top center", name: "Top" },
          { value: "bottom center", name: "Bottom" },
          { value: "left center", name: "Left" },
          { value: "right center", name: "Right" },
        ],
      },
      {
        property: "background-repeat",
        type: "select",
        defaults: "no-repeat",
        options: [
          { value: "no-repeat", name: "No Repeat" },
          { value: "repeat", name: "Repeat" },
          { value: "repeat-x", name: "Repeat X" },
          { value: "repeat-y", name: "Repeat Y" },
        ],
      },
    ],
  },
  {
    name: "Borders & Effects",
    open: false,
    properties: [
      "border-radius",
      "border-width",
      {
        property: "border-style",
        type: "select",
        defaults: "none",
        options: [
          { value: "none", name: "None" },
          { value: "solid", name: "Solid" },
          { value: "dashed", name: "Dashed" },
          { value: "dotted", name: "Dotted" },
        ],
      },
      "border-color",
      "box-shadow",
      "opacity",
      {
        property: "overflow",
        type: "select",
        defaults: "visible",
        options: [
          { value: "visible", name: "Visible" },
          { value: "hidden", name: "Hidden" },
          { value: "scroll", name: "Scroll" },
          { value: "auto", name: "Auto" },
        ],
      },
      "transition",
      "transform",
    ],
  },
];

export const GrapesJSEditor = forwardRef<
  GrapesJSEditorHandle,
  GrapesJSEditorProps
>(function GrapesJSEditor({ initialHtml, initialCss, onSave }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("styles");
  const [device, setDevice] = useState<DeviceId>("Desktop");
  const [showBlocks, setShowBlocks] = useState(true);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
  }));

  const switchRightPanel = useCallback((panel: RightPanel) => {
    setRightPanel(panel);

    const stylesEl = document.getElementById("gjs-styles-panel");
    const layersEl = document.getElementById("gjs-layers-panel");
    const traitsEl = document.getElementById("gjs-traits-panel");

    if (stylesEl) stylesEl.style.display = panel === "styles" ? "block" : "none";
    if (layersEl) layersEl.style.display = panel === "layers" ? "block" : "none";
    if (traitsEl) traitsEl.style.display = panel === "traits" ? "block" : "none";
  }, []);

  const setEditorDevice = useCallback((name: DeviceId) => {
    setDevice(name);
    editorRef.current?.setDevice(name);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      fromElement: false,
      noticeOnUnload: false,
      showOffsets: true,
      showOffsetsSelected: true,
      plugins: [
        (ed) =>
          basicBlocks(ed, {
            blocks: [
              "column1",
              "column2",
              "column3",
              "column3-7",
              "text",
              "link",
              "image",
              "video",
              "map",
            ],
            flexGrid: true,
            addBasicStyle: true,
            category: "Basic",
          }),
        (ed) =>
          webpagePreset(ed, {
            blocks: ["link-block", "quote", "text-basic"],
            useCustomTheme: false,
            showStylesOnChange: true,
          }),
      ],
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@500;700&display=swap",
        ],
      },
      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Tablet", width: "768px", widthMedia: "992px" },
          { name: "Mobile portrait", width: "375px", widthMedia: "480px" },
        ],
      },
      blockManager: {
        appendTo: "#gjs-blocks-panel",
      },
      layerManager: {
        appendTo: "#gjs-layers-panel",
      },
      selectorManager: {
        appendTo: "#gjs-styles-panel",
      },
      styleManager: {
        appendTo: "#gjs-styles-panel",
        sectors: STYLE_SECTORS,
      },
      traitManager: {
        appendTo: "#gjs-traits-panel",
      },
      panels: { defaults: [] },
    });

    editorRef.current = editor;

    // Base canvas styles
    editor.on("load", () => {
      const frameDoc = editor.Canvas.getDocument();
      if (frameDoc) {
        const style = frameDoc.createElement("style");
        style.id = "gjs-base-styles";
        style.innerHTML = CANVAS_BASE_CSS;
        frameDoc.head.appendChild(style);
      }
    });

    registerDesignBlocks(editor);

    // Order block categories for a design-first palette
    const categoryOrder = [
      "Sections",
      "Design",
      "Typography",
      "Layout",
      "Forms",
      "Basic",
      "Extra",
    ];
    categoryOrder.forEach((name, index) => {
      const categories = editor.BlockManager.getCategories();
      const cat = categories.find(
        (c: { get: (k: string) => unknown }) =>
          c.get("id") === name || c.get("label") === name
      );
      if (cat) {
        cat.set("open", index < 2);
        cat.set("order", index);
      }
    });

    if (initialHtml || initialCss) {
      editor.setComponents(initialHtml ?? "");
      editor.setStyle(initialCss ?? "");
    }

    editor.Commands.add("save-db", {
      run(ed) {
        const html = ed.getHtml();
        const css = ed.getCss() ?? "";
        onSave({ html, css });
      },
    });

    // Default right panel visibility
    requestAnimationFrame(() => {
      const layersEl = document.getElementById("gjs-layers-panel");
      const traitsEl = document.getElementById("gjs-traits-panel");
      if (layersEl) layersEl.style.display = "none";
      if (traitsEl) traitsEl.style.display = "none";
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCommand = (cmd: string) => {
    editorRef.current?.runCommand(cmd);
  };

  return (
    <div className="gjs-editor-shell flex h-full w-full flex-col bg-zinc-100 dark:bg-zinc-950">
      {/* Editor chrome toolbar */}
      <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
        <ToolbarButton
          active={showBlocks}
          onClick={() => setShowBlocks((v) => !v)}
          title="Toggle blocks"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-xs font-medium">Blocks</span>
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        <ToolbarButton
          active={device === "Desktop"}
          onClick={() => setEditorDevice("Desktop")}
          title="Desktop"
        >
          <Monitor className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={device === "Tablet"}
          onClick={() => setEditorDevice("Tablet")}
          title="Tablet"
        >
          <Tablet className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={device === "Mobile portrait"}
          onClick={() => setEditorDevice("Mobile portrait")}
          title="Mobile"
        >
          <Smartphone className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        <ToolbarButton onClick={() => runCommand("core:undo")} title="Undo">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => runCommand("core:redo")} title="Redo">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        <ToolbarButton
          onClick={() => runCommand("core:component-outline")}
          title="Toggle outlines"
        >
          <Eye className="h-4 w-4" />
          <span className="text-xs font-medium">Outline</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => runCommand("core:open-code")}
          title="View / export code"
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => runCommand("gjs-open-import-webpage")}
          title="Import HTML"
        >
          <FileInput className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            if (confirm("Clear the entire canvas? This cannot be undone.")) {
              runCommand("core:canvas-clear");
            }
          }}
          title="Clear canvas"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </ToolbarButton>

        <div className="flex-1" />

        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          <PanelTab
            active={rightPanel === "styles"}
            onClick={() => switchRightPanel("styles")}
            icon={<Paintbrush className="h-3.5 w-3.5" />}
            label="Design"
          />
          <PanelTab
            active={rightPanel === "layers"}
            onClick={() => switchRightPanel("layers")}
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Layers"
          />
          <PanelTab
            active={rightPanel === "traits"}
            onClick={() => switchRightPanel("traits")}
            icon={<Settings2 className="h-3.5 w-3.5" />}
            label="Settings"
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex min-h-0 flex-1">
        {/* Blocks palette */}
        <div
          id="gjs-blocks-panel"
          className={cn(
            "gjs-blocks-sidebar shrink-0 overflow-y-auto border-r border-zinc-200 bg-white transition-all dark:border-zinc-800 dark:bg-zinc-900",
            showBlocks ? "w-[280px]" : "w-0 overflow-hidden border-0"
          )}
        />

        {/* Canvas */}
        <div className="relative min-w-0 flex-1 bg-zinc-200/80 dark:bg-zinc-900">
          <div
            ref={containerRef}
            className="h-full w-full [&_.gjs-cv-canvas]:bg-zinc-200/80 dark:[&_.gjs-cv-canvas]:bg-zinc-900"
            style={{ minHeight: "100%" }}
          />
        </div>

        {/* Design / layers / traits panel */}
        <div className="gjs-right-sidebar flex w-[300px] shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {rightPanel === "styles" && "Design styles"}
              {rightPanel === "layers" && "Layer tree"}
              {rightPanel === "traits" && "Element settings"}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {rightPanel === "styles" &&
                "Select an element to edit spacing, type, color, and effects."}
              {rightPanel === "layers" &&
                "Reorder and select elements from the page structure."}
              {rightPanel === "traits" &&
                "Edit attributes such as links, IDs, and form fields."}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div id="gjs-styles-panel" className="gjs-sm-wrap p-1" />
            <div id="gjs-layers-panel" className="p-1" style={{ display: "none" }} />
            <div id="gjs-traits-panel" className="p-1" style={{ display: "none" }} />
          </div>
        </div>
      </div>

      {/* Editor theme overrides */}
      <style>{`
        .gjs-editor-shell .gjs-one-bg {
          background-color: transparent;
        }
        .gjs-editor-shell .gjs-two-color {
          color: #3f3f46;
        }
        .gjs-editor-shell .gjs-three-bg {
          background-color: #f4f4f5;
        }
        .gjs-editor-shell .gjs-four-color,
        .gjs-editor-shell .gjs-four-color-h:hover {
          color: #4f46e5;
        }
        .gjs-editor-shell .gjs-pn-panel {
          display: none;
        }
        .gjs-editor-shell .gjs-editor {
          background: transparent;
        }
        .gjs-editor-shell .gjs-cv-canvas {
          top: 0;
          width: 100%;
          height: 100%;
        }
        .gjs-editor-shell .gjs-frame-wrapper {
          padding: 24px 16px;
          background: transparent;
        }
        .gjs-editor-shell .gjs-frame {
          border-radius: 8px;
          box-shadow:
            0 0 0 1px rgba(15, 23, 42, 0.06),
            0 12px 40px rgba(15, 23, 42, 0.1);
          background: #fff;
        }

        /* Blocks palette */
        .gjs-blocks-sidebar .gjs-blocks-c {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 10px;
        }
        .gjs-blocks-sidebar .gjs-block {
          width: auto;
          min-height: 72px;
          margin: 0;
          padding: 10px 8px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          background: #fafafa;
          box-shadow: none;
          transition:
            border-color 0.15s,
            background 0.15s,
            box-shadow 0.15s;
          justify-content: center;
        }
        .gjs-blocks-sidebar .gjs-block:hover {
          border-color: #a5b4fc;
          background: #eef2ff;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
        }
        .gjs-blocks-sidebar .gjs-block__media {
          margin-bottom: 6px;
          color: #4f46e5;
          height: 28px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gjs-blocks-sidebar .gjs-block__media svg {
          width: 28px;
          height: 28px;
        }
        .gjs-blocks-sidebar .gjs-block-label {
          font-size: 11px;
          font-weight: 600;
          color: #3f3f46;
          line-height: 1.25;
          text-align: center;
        }
        .gjs-blocks-sidebar .gjs-block-category {
          border: none;
        }
        .gjs-blocks-sidebar .gjs-title {
          background: #fff;
          border-bottom: 1px solid #f4f4f5;
          color: #71717a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 12px 14px 8px;
        }
        .gjs-blocks-sidebar .gjs-caret-icon {
          margin-right: 6px;
        }

        /* Style manager */
        .gjs-right-sidebar .gjs-sm-sector {
          border-bottom: 1px solid #f4f4f5;
        }
        .gjs-right-sidebar .gjs-sm-sector-title {
          background: #fff;
          color: #3f3f46;
          font-size: 12px;
          font-weight: 600;
          padding: 10px 12px;
          letter-spacing: 0;
          text-transform: none;
        }
        .gjs-right-sidebar .gjs-sm-properties {
          padding: 8px 10px 12px;
          background: #fafafa;
        }
        .gjs-right-sidebar .gjs-sm-label {
          color: #71717a;
          font-size: 11px;
          font-weight: 500;
        }
        .gjs-right-sidebar .gjs-field,
        .gjs-right-sidebar .gjs-sm-field {
          background: #fff;
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          color: #18181b;
        }
        .gjs-right-sidebar .gjs-field input,
        .gjs-right-sidebar .gjs-sm-field input,
        .gjs-right-sidebar .gjs-field select {
          color: #18181b;
        }
        .gjs-right-sidebar .gjs-radio-item {
          background: #fff;
          border-color: #e4e4e7;
          color: #52525b;
        }
        .gjs-right-sidebar .gjs-radio-item input:checked + .gjs-radio-item-label {
          background: #eef2ff;
          color: #4f46e5;
        }
        .gjs-right-sidebar .gjs-clm-tags {
          background: transparent;
          padding: 8px 10px 0;
        }
        .gjs-right-sidebar .gjs-clm-tag {
          background: #eef2ff;
          color: #4f46e5;
          border: 1px solid #c7d2fe;
          border-radius: 6px;
        }
        .gjs-right-sidebar .gjs-clm-sels-info {
          color: #a1a1aa;
        }
        .gjs-right-sidebar .gjs-layer {
          background: transparent;
          color: #3f3f46;
        }
        .gjs-right-sidebar .gjs-layer.gjs-selected {
          background: #eef2ff;
          color: #4f46e5;
        }
        .gjs-right-sidebar .gjs-trt-trait {
          padding: 6px 10px;
        }
        .gjs-right-sidebar .gjs-label {
          color: #71717a;
          font-size: 11px;
        }

        .dark .gjs-editor-shell .gjs-two-color {
          color: #d4d4d8;
        }
        .dark .gjs-blocks-sidebar .gjs-block {
          background: #18181b;
          border-color: #27272a;
        }
        .dark .gjs-blocks-sidebar .gjs-block:hover {
          background: #1e1b4b;
          border-color: #4f46e5;
        }
        .dark .gjs-blocks-sidebar .gjs-block-label {
          color: #e4e4e7;
        }
        .dark .gjs-blocks-sidebar .gjs-title {
          background: #18181b;
          border-color: #27272a;
          color: #a1a1aa;
        }
        .dark .gjs-right-sidebar .gjs-sm-sector-title {
          background: #18181b;
          color: #e4e4e7;
        }
        .dark .gjs-right-sidebar .gjs-sm-properties {
          background: #09090b;
        }
        .dark .gjs-right-sidebar .gjs-field,
        .dark .gjs-right-sidebar .gjs-sm-field {
          background: #18181b;
          border-color: #27272a;
          color: #e4e4e7;
        }
        .dark .gjs-right-sidebar .gjs-field input,
        .dark .gjs-right-sidebar .gjs-sm-field input {
          color: #e4e4e7;
        }
      `}</style>
    </div>
  );
});

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
        active &&
          "bg-indigo-50 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
      )}
    >
      {children}
    </button>
  );
}

function PanelTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-300"
          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
