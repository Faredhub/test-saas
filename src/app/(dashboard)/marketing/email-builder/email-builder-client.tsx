"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { GrapesJSEmailEditor } from "@/components/editor/grapesjs-email-editor";
import { updateCampaign, sendCampaign } from "@/lib/actions/marketing";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Layers,
  Send,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";

type Props = {
  campaignId?: string;
  templateId?: string;
  initialHtml?: string;
  campaignData?: {
    id: string;
    name: string;
    status: string;
  };
};

type SavedTemplate = {
  id: string;
  name: string;
  html: string;
  createdAt: string;
};

const TEMPLATES_STORAGE_KEY = "email-templates";

function loadTemplates(): SavedTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: SavedTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function EmailBuilderClient({
  campaignId,
  templateId,
  initialHtml,
  campaignData,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentHtml, setCurrentHtml] = useState<string>("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [loadTemplateDialogOpen, setLoadTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);

  const resolvedInitialHtml = useMemo(() => {
    if (initialHtml) return initialHtml;
    if (templateId && typeof window !== "undefined") {
      const saved = loadTemplates().find((t) => t.id === templateId);
      if (saved) return saved.html;
    }
    return undefined;
  }, [initialHtml, templateId]);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const handleSave = useCallback(
    (html: string) => {
      setCurrentHtml(html);
    },
    []
  );

  function handleSaveToCampaign() {
    if (!campaignId) {
      toast.error("No campaign to save to. Create a campaign first.");
      return;
    }
    startTransition(async () => {
      try {
        await updateCampaign(campaignId, { content: currentHtml });
        toast.success("Campaign content saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save campaign");
      }
    });
  }

  function handleSaveAsTemplate() {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    const newTemplate: SavedTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      html: currentHtml,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates, newTemplate];
    saveTemplates(updated);
    setTemplates(updated);
    setTemplateName("");
    setTemplateDialogOpen(false);
    toast.success("Template saved");
  }

  function handleLoadTemplate(template: SavedTemplate) {
    router.push(`/marketing/email-builder?templateId=${template.id}`);
    setLoadTemplateDialogOpen(false);
  }

  function handleSendTest() {
    if (!campaignId) {
      toast.error("No campaign to send. Create a campaign first.");
      return;
    }
    startTransition(async () => {
      try {
        if (currentHtml) {
          await updateCampaign(campaignId, { content: currentHtml });
        }
        await sendCampaign(campaignId);
        toast.success("Campaign sent successfully");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send campaign");
      }
    });
  }

  function handleDeleteTemplate(templateId: string) {
    const updated = templates.filter((t) => t.id !== templateId);
    saveTemplates(updated);
    setTemplates(updated);
    toast.success("Template deleted");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/marketing/campaigns">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Campaigns
            </Button>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
            <Link href="/marketing" className="hover:text-foreground">
              Marketing
            </Link>
            <span>/</span>
            <Link href="/marketing/campaigns" className="hover:text-foreground">
              Campaigns
            </Link>
            <span>/</span>
            <span className="text-foreground">
              {campaignData ? campaignData.name : "Email Builder"}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoadTemplateDialogOpen(true)}
          >
            <Layers className="mr-2 h-4 w-4" />
            Load Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentHtml((prev) => prev);
              setPreviewDialogOpen(true);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <Save className="mr-2 h-4 w-4" />
            Save as Template
          </Button>
          {campaignId && (
            <Button size="sm" onClick={handleSaveToCampaign} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save to Campaign
            </Button>
          )}
          {campaignId && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSendTest}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <GrapesJSEmailEditor
          initialHtml={resolvedInitialHtml}
          onSave={handleSave}
        />
      </div>

      {/* Save as Template dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="My Email Template"
              />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button onClick={handleSaveAsTemplate}>Save Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Template dialog */}
      <Dialog
        open={loadTemplateDialogOpen}
        onOpenChange={setLoadTemplateDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved templates yet. Design an email and save it as a template.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-2 flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Load
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          {currentHtml ? (
            <iframe
              srcDoc={currentHtml}
              className="min-h-[500px] w-full rounded-md border"
              title="Email Preview"
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No content to preview. Start designing your email.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
