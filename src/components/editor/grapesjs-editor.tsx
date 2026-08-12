"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import grapesjs, { type Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import presetWebpage from "grapesjs-preset-webpage";
import basicBlocks from "grapesjs-blocks-basic";

type GrapesJSEditorProps = {
  initialHtml?: string;
  initialCss?: string;
  onSave: (data: { html: string; css: string }) => void;
};

export type GrapesJSEditorHandle = {
  getEditor: () => Editor | null;
};

export const GrapesJSEditor = forwardRef<
  GrapesJSEditorHandle,
  GrapesJSEditorProps
>(function GrapesJSEditor({ initialHtml, initialCss, onSave }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      plugins: [basicBlocks, presetWebpage],
      pluginsOpts: {
        "grapesjs-preset-webpage": {
          blocks: ["link-block", "quote-block", "text-basic"],
        },
      },
      canvas: {
        styles: [
          "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
        ],
      },
    });

    editorRef.current = editor;

    if (initialHtml || initialCss) {
      editor.setComponents(initialHtml ?? "");
      editor.setStyle(initialCss ?? "");
    }

    editor.Commands.add("save-db", {
      run() {
        const html = editor.getHtml();
        const css = editor.getCss() ?? "";
        onSave({ html, css });
      },
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: "100%" }}
    />
  );
});
