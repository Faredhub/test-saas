"use client";

import { useEffect, useRef, useState } from "react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import presetNewsletter from "grapesjs-preset-newsletter";

type Props = {
  initialHtml?: string;
  onSave: (html: string) => void;
};

export function GrapesJSEmailEditor({ initialHtml, onSave }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof grapesjs.init> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    if (editorRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      plugins: [presetNewsletter],
      pluginsOpts: {
        [presetNewsletter as unknown as string]: {},
      },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        ],
      },
      deviceManager: {
        devices: [
          {
            name: "Desktop",
            width: "",
          },
          {
            name: "Mobile",
            width: "480px",
            widthMedia: "480px",
          },
        ],
      },
      panels: {
        defaults: [
          {
            id: "layers",
            el: ".panel__right",
            resizable: {
              maxDim: 350,
              minDim: 200,
              tc: false,
              cl: true,
              cr: false,
              bc: false,
              keyWidth: "flex-basis",
            },
          },
          {
            id: "panel-switcher",
            el: ".panel__switcher",
            buttons: [
              {
                id: "show-layers",
                active: true,
                label: "Layers",
                command: "show-layers",
                togglable: false,
              },
              {
                id: "show-style",
                active: true,
                label: "Styles",
                command: "show-styles",
                togglable: false,
              },
              {
                id: "show-traits",
                active: true,
                label: "Traits",
                command: "show-traits",
                togglable: false,
              },
            ],
          },
        ],
      },
    });

    editorRef.current = editor;

    if (initialHtml) {
      editor.setComponents(initialHtml);
    }

    editor.Commands.add("save-email", {
      run() {
        const html = editor.getHtml();
        const css = editor.getCss();
        const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
        onSave(fullHtml);
      },
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mounted]);

  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900">
        <p className="text-zinc-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="[&_.gjs-one-bg]:bg-zinc-900 [&_.gjs-two-color]:text-zinc-300 [&_.gjs-three-bg]:bg-zinc-800 [&_.gjs-four-color]:text-zinc-400 [&_.gjs-four-color-h]:text-zinc-200 [&_.gjs-pn-panel]:bg-zinc-900 [&_.gjs-pn-panel]:border-zinc-700 [&_.gjs-pn-btn]:text-zinc-300 [&_.gjs-pn-btn.gjs-pn-active]:bg-zinc-700 [&_.gjs-pn-btn.gjs-pn-active]:text-white [&_.gjs-pn-commands]:border-b-zinc-700 [&_.gjs-pn-options]:border-b-zinc-700 [&_.gjs-cv-canvas]:bg-zinc-800 [&_.gjs-blocks-c]:bg-zinc-900 [&_.gjs-block]:border-zinc-700 [&_.gjs-block:hover]:border-zinc-500 [&_.gjs-block__media]:text-zinc-300 [&_.gjs-sm-sector__title]:bg-zinc-800 [&_.gjs-sm-sector__title]:text-zinc-300 [&_.gjs-sm-field]:bg-zinc-800 [&_.gjs-sm-field]:text-zinc-300 [&_.gjs-sm-field]:border-zinc-700 [&_.gjs-clm-tags]:bg-zinc-800 [&_.gjs-clm-tag]:bg-zinc-700 [&_.gjs-clm-tag]:text-zinc-300 [&_.gjs-clm-tag]:border-zinc-600 [&_.gjs-sm-property]:text-zinc-300 [&_.gjs-field]:bg-zinc-800 [&_.gjs-field]:text-zinc-300 [&_.gjs-field]:border-zinc-700 [&_.gjs-select]:bg-zinc-800 [&_.gjs-select]:text-zinc-300 [&_.gjs-select]:border-zinc-700 [&_.gjs-colorp-c]:border-zinc-700 [&_.gjs-radio-item]:text-zinc-300 [&_.gjs-editor]:bg-zinc-900 [&_.gjs-editor]:text-zinc-300 [&_.gjs-trt-trait__wrp]:border-zinc-700 [&_#gjs-sm-float]:bg-zinc-900" />
  );
}
