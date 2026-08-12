"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye } from "lucide-react";
import {
  GrapesJSEditor,
  type GrapesJSEditorHandle,
} from "@/components/editor/grapesjs-editor";
import { updatePage } from "@/lib/actions/website";
import { toast } from "sonner";

type GrapesJSContent = {
  html: string;
  css: string;
};

export function VisualEditor({
  pageId,
  pageTitle,
  initialContent,
}: {
  pageId: string;
  pageTitle: string;
  initialContent: unknown;
}) {
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<GrapesJSEditorHandle>(null);
  const router = useRouter();

  const parsedContent = useCallback((): { html: string; css: string } => {
    try {
      if (
        typeof initialContent === "object" &&
        initialContent !== null &&
        "html" in (initialContent as Record<string, unknown>)
      ) {
        const c = initialContent as GrapesJSContent;
        return { html: c.html ?? "", css: c.css ?? "" };
      }

      if (typeof initialContent === "string") {
        const parsed = JSON.parse(initialContent);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "html" in parsed
        ) {
          return { html: parsed.html ?? "", css: parsed.css ?? "" };
        }

        if (parsed && typeof parsed === "object" && "ROOT" in parsed) {
          return {
            html:
              "<h1>Legacy Content</h1><p>This page was created with an older editor. Start editing to rebuild it.</p>",
            css: "",
          };
        }
      }
    } catch {
      // fall through
    }
    return {
      html: "<h1>New Page</h1><p>Start editing...</p>",
      css: "",
    };
  }, [initialContent]);

  const handleSave = useCallback(
    async (data: { html: string; css: string }) => {
      setSaving(true);
      try {
        await updatePage(pageId, { content: data });
        toast.success("Page saved");
      } catch {
        toast.error("Failed to save page");
      } finally {
        setSaving(false);
      }
    },
    [pageId]
  );

  const handleToolbarSave = useCallback(() => {
    editorRef.current?.getEditor()?.runCommand("save-db");
  }, []);

  const handlePreview = useCallback(() => {
    window.open(`/preview/${pageId}`, "_blank");
  }, [pageId]);

  const { html, css } = parsedContent();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/website/pages")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <div className="h-5 w-px bg-border" />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {pageTitle}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Visual design editor · drag blocks · style in the Design panel
          </p>
        </div>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={handlePreview}>
          <Eye className="mr-1 h-4 w-4" />
          Preview
        </Button>
        <Button size="sm" onClick={handleToolbarSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving..." : "Save page"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <GrapesJSEditor
          ref={editorRef}
          initialHtml={html}
          initialCss={css}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
