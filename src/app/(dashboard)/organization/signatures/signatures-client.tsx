"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Star, Loader2, PenTool } from "lucide-react";
import {
  createSignature,
  deleteSignature,
  setDefaultSignature,
} from "@/lib/actions/organization";
import { toast } from "sonner";
import { SignaturePad } from "./signature-pad";

type Signature = {
  id: string;
  name: string;
  dataUrl: string;
  isDefault: boolean;
  createdAt: Date | string;
};

type Props = {
  initialData: Signature[];
};

export function SignaturesClient({ initialData }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sigName, setSigName] = useState("");
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function resetForm() {
    setSigName("");
    setDrawnDataUrl(null);
  }

  function handlePadSave(dataUrl: string) {
    setDrawnDataUrl(dataUrl);
  }

  function handleCreate() {
    if (!sigName.trim()) {
      toast.error("Please enter a name for the signature");
      return;
    }
    if (!drawnDataUrl) {
      toast.error("Please draw a signature first");
      return;
    }

    startTransition(async () => {
      try {
        await createSignature({ name: sigName.trim(), dataUrl: drawnDataUrl });
        toast.success("Signature saved successfully");
        setIsOpen(false);
        resetForm();
      } catch {
        toast.error("Failed to save signature");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSignature(id);
        toast.success("Signature deleted");
        setDeleteConfirmId(null);
      } catch {
        toast.error("Failed to delete signature");
      }
    });
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      try {
        await setDefaultSignature(id);
        toast.success("Default signature updated");
      } catch {
        toast.error("Failed to set default signature");
      }
    });
  }

  function formatDate(d: string | Date): string {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Signatures</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your digital signatures
          </p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create Signature
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Signature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sig-name">Signature Name *</Label>
                <Input
                  id="sig-name"
                  value={sigName}
                  onChange={(e) => setSigName(e.target.value)}
                  placeholder="e.g. My Official Signature"
                />
              </div>

              {drawnDataUrl ? (
                <div className="space-y-3">
                  <Label>Preview</Label>
                  <div className="rounded-lg border bg-white p-4">
                    <img
                      src={drawnDataUrl}
                      alt="Signature preview"
                      className="mx-auto max-h-[120px] object-contain"
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrawnDataUrl(null)}
                    >
                      Redraw
                    </Button>
                    <Button onClick={handleCreate} disabled={isPending}>
                      {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Signature
                    </Button>
                  </div>
                </div>
              ) : (
                <SignaturePad
                  onSave={handlePadSave}
                  onCancel={() => setIsOpen(false)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Signature Grid */}
      {initialData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <PenTool className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No signatures yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first digital signature to use in documents and
              contracts.
            </p>
            <Button
              onClick={() => setIsOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Signature
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialData.map((sig) => (
            <Card key={sig.id} className="group relative overflow-hidden">
              <CardContent className="p-0">
                {/* Preview */}
                <div className="border-b bg-white p-6">
                  <img
                    src={sig.dataUrl}
                    alt={sig.name}
                    className="mx-auto h-[100px] object-contain"
                  />
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{sig.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(sig.createdAt)}
                      </p>
                    </div>
                    {sig.isDefault && (
                      <Badge
                        variant="default"
                        className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        Default
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!sig.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleSetDefault(sig.id)}
                        disabled={isPending}
                      >
                        <Star className="h-3.5 w-3.5" />
                        Set Default
                      </Button>
                    )}

                    {deleteConfirmId === sig.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(sig.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Confirm"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(sig.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
