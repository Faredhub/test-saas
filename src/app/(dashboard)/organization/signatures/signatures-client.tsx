"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Star,
  Loader2,
  PenTool,
  Send,
  Inbox,
  ArrowUpRight,
  Check,
  X,
  Clock,
  FileSignature,
  Upload,
} from "lucide-react";
import {
  createSignature,
  deleteSignature,
  setDefaultSignature,
  createSignatureRequest,
  signSignatureRequest,
  declineSignatureRequest,
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

type UserInfo = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type SignatureRequest = {
  id: string;
  title: string;
  description: string | null;
  documentRef: string | null;
  status: string;
  signatureId: string | null;
  signedAt: Date | string | null;
  declinedAt: Date | string | null;
  declineReason: string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
  requestedById: string;
  assignedToId: string;
  requestedBy: UserInfo;
  assignedTo: UserInfo;
};

type OrgUser = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
};

type Props = {
  initialData: Signature[];
  initialRequests: SignatureRequest[];
  orgUsers: OrgUser[];
  currentUserId: string;
};

function getUserDisplayName(user: { name: string | null; firstName: string | null; lastName: string | null; email: string }) {
  if (user.name) return user.name;
  if (user.firstName) return [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.email;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:text-amber-400"><Clock className="h-3 w-3" />Pending</Badge>;
    case "SIGNED":
      return <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-400"><Check className="h-3 w-3" />Signed</Badge>;
    case "DECLINED":
      return <Badge variant="outline" className="gap-1 border-red-300 text-red-700 dark:text-red-400"><X className="h-3 w-3" />Declined</Badge>;
    case "EXPIRED":
      return <Badge variant="outline" className="gap-1 border-gray-300 text-gray-500"><Clock className="h-3 w-3" />Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SignaturesClient({ initialData, initialRequests, orgUsers, currentUserId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sigName, setSigName] = useState("");
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [sigSource, setSigSource] = useState<"draw" | "upload" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Request form state
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDescription, setReqDescription] = useState("");
  const [reqAssigneeId, setReqAssigneeId] = useState("");
  const [reqExpiresAt, setReqExpiresAt] = useState("");

  // Sign dialog state
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signRequestId, setSignRequestId] = useState<string | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState("");
  const [showNewSigPad, setShowNewSigPad] = useState(false);
  const [newSigName, setNewSigName] = useState("");
  const [newSigDataUrl, setNewSigDataUrl] = useState<string | null>(null);
  const [newSigSource, setNewSigSource] = useState<"draw" | "upload" | null>(null);

  // Decline dialog state
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineRequestId, setDeclineRequestId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const incomingRequests = initialRequests.filter((r) => r.assignedToId === currentUserId);
  const outgoingRequests = initialRequests.filter((r) => r.requestedById === currentUserId);
  const availableAssignees = orgUsers.filter((u) => u.id !== currentUserId && u.status === "ACTIVE");

  function resetForm() {
    setSigName("");
    setDrawnDataUrl(null);
    setSigSource(null);
    setIsDragging(false);
  }

  function resetReqForm() {
    setReqTitle("");
    setReqDescription("");
    setReqAssigneeId("");
    setReqExpiresAt("");
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let file: File | null = null;
    if ("files" in e.target && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    } else if ("dataTransfer" in e && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
    }

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Please upload a PNG or JPEG image");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setDrawnDataUrl(dataUrl);
      setSigSource("upload");
    };
    reader.readAsDataURL(file);
  };

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let file: File | null = null;
    if ("files" in e.target && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    } else if ("dataTransfer" in e && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
    }

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Please upload a PNG or JPEG image");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setNewSigDataUrl(dataUrl);
      setNewSigSource("upload");
    };
    reader.readAsDataURL(file);
  };

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

  function handleCreateRequest() {
    if (!reqTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!reqAssigneeId) {
      toast.error("Please select an assignee");
      return;
    }

    startTransition(async () => {
      try {
        await createSignatureRequest({
          title: reqTitle.trim(),
          description: reqDescription.trim() || undefined,
          assignedToId: reqAssigneeId,
          expiresAt: reqExpiresAt || undefined,
        });
        toast.success("Signature request sent");
        setReqDialogOpen(false);
        resetReqForm();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send request");
      }
    });
  }

  function openSignDialog(requestId: string) {
    setSignRequestId(requestId);
    setSelectedSignatureId("");
    setShowNewSigPad(false);
    setNewSigName("");
    setNewSigDataUrl(null);
    setNewSigSource(null);
    setSignDialogOpen(true);
  }

  function handleSignWithExisting() {
    if (!signRequestId || !selectedSignatureId) {
      toast.error("Please select a signature");
      return;
    }
    startTransition(async () => {
      try {
        await signSignatureRequest(signRequestId, selectedSignatureId);
        toast.success("Request signed successfully");
        setSignDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to sign request");
      }
    });
  }

  function handleSignWithNew(dataUrl: string) {
    if (!newSigName.trim()) {
      toast.error("Please enter a name for the new signature");
      return;
    }
    startTransition(async () => {
      try {
        // First create the signature, then sign the request
        const sig = await createSignature({ name: newSigName.trim(), dataUrl });
        if (signRequestId) {
          await signSignatureRequest(signRequestId, sig.id);
        }
        toast.success("Signed with new signature");
        setSignDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to sign");
      }
    });
  }

  function openDeclineDialog(requestId: string) {
    setDeclineRequestId(requestId);
    setDeclineReason("");
    setDeclineDialogOpen(true);
  }

  function handleDecline() {
    if (!declineRequestId) return;
    startTransition(async () => {
      try {
        await declineSignatureRequest(declineRequestId, declineReason.trim() || undefined);
        toast.success("Request declined");
        setDeclineDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to decline");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Signatures</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and request digital signatures
          </p>
        </div>
      </div>

      <Tabs defaultValue="signatures">
        <TabsList>
          <TabsTrigger value="signatures">
            <PenTool className="h-4 w-4 mr-1.5" />
            My Signatures
          </TabsTrigger>
          <TabsTrigger value="requests">
            <FileSignature className="h-4 w-4 mr-1.5" />
            Requests
            {incomingRequests.filter((r) => r.status === "PENDING").length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {incomingRequests.filter((r) => r.status === "PENDING").length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* TAB: My Signatures                                                */}
        {/* ================================================================ */}
        <TabsContent value="signatures">
          <div className="space-y-4 pt-4">
            <div className="flex justify-end">
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
                            onClick={() => {
                              setDrawnDataUrl(null);
                              setSigSource(null);
                            }}
                          >
                            {sigSource === "upload" ? "Change Image" : "Redraw"}
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
                      <Tabs defaultValue="draw" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="draw">Draw</TabsTrigger>
                          <TabsTrigger value="upload">Upload Image</TabsTrigger>
                        </TabsList>
                        <TabsContent value="draw" className="pt-2">
                          <SignaturePad
                            onSave={(url) => {
                              handlePadSave(url);
                              setSigSource("draw");
                            }}
                            onCancel={() => setIsOpen(false)}
                          />
                        </TabsContent>
                        <TabsContent value="upload" className="pt-2">
                          <div className="space-y-4">
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                              }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => {
                                setIsDragging(false);
                                handleFileChange(e);
                              }}
                              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                                isDragging
                                  ? "border-primary bg-primary/5"
                                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                              }`}
                              onClick={() => document.getElementById("file-upload")?.click()}
                            >
                              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                              <p className="text-sm font-medium mb-1">
                                Drag & drop signature image here
                              </p>
                              <p className="text-xs text-muted-foreground mb-4">
                                Supports PNG, JPG, or JPEG
                              </p>
                              <Button type="button" variant="outline" size="sm">
                                Browse File
                              </Button>
                              <input
                                id="file-upload"
                                type="file"
                                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                                className="hidden"
                                onChange={handleFileChange}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
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
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB: Requests                                                     */}
        {/* ================================================================ */}
        <TabsContent value="requests">
          <div className="space-y-6 pt-4">
            {/* Send for Signature button */}
            <div className="flex justify-end">
              <Dialog
                open={reqDialogOpen}
                onOpenChange={(open) => {
                  setReqDialogOpen(open);
                  if (!open) resetReqForm();
                }}
              >
                <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Send className="h-4 w-4" />
                  Send for Signature
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send for Signature</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="req-title">Title *</Label>
                      <Input
                        id="req-title"
                        value={reqTitle}
                        onChange={(e) => setReqTitle(e.target.value)}
                        placeholder="e.g. Contract approval for Project X"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="req-desc">Description</Label>
                      <Textarea
                        id="req-desc"
                        value={reqDescription}
                        onChange={(e) => setReqDescription(e.target.value)}
                        placeholder="Optional details about what needs to be signed..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To *</Label>
                      <Select value={reqAssigneeId} onValueChange={(v) => v && setReqAssigneeId(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAssignees.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getUserDisplayName(user)} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="req-expires">Expires On (optional)</Label>
                      <Input
                        id="req-expires"
                        type="date"
                        value={reqExpiresAt}
                        onChange={(e) => setReqExpiresAt(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setReqDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRequest} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Request
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Incoming Requests */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Inbox className="h-4 w-4" />
                Incoming Requests
              </h2>
              {incomingRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No incoming signature requests.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="flex items-center justify-between gap-4 py-4 px-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{req.title}</h3>
                            {statusBadge(req.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            From {getUserDisplayName(req.requestedBy)} &middot; {formatDate(req.createdAt)}
                            {req.expiresAt && <> &middot; Expires {formatDate(req.expiresAt)}</>}
                          </p>
                          {req.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                          )}
                          {req.declineReason && (
                            <p className="text-xs text-red-600 mt-1">Reason: {req.declineReason}</p>
                          )}
                        </div>
                        {req.status === "PENDING" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openSignDialog(req.id)}
                              disabled={isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Sign
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-destructive hover:text-destructive"
                              onClick={() => openDeclineDialog(req.id)}
                              disabled={isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ArrowUpRight className="h-4 w-4" />
                Outgoing Requests
              </h2>
              {outgoingRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No outgoing signature requests.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <Card key={req.id}>
                      <CardContent className="flex items-center justify-between gap-4 py-4 px-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{req.title}</h3>
                            {statusBadge(req.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            To {getUserDisplayName(req.assignedTo)} &middot; {formatDate(req.createdAt)}
                            {req.expiresAt && <> &middot; Expires {formatDate(req.expiresAt)}</>}
                          </p>
                          {req.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                          )}
                          {req.signedAt && (
                            <p className="text-xs text-emerald-600 mt-1">Signed on {formatDate(req.signedAt)}</p>
                          )}
                          {req.declineReason && (
                            <p className="text-xs text-red-600 mt-1">Declined: {req.declineReason}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* Dialog: Sign a Request                                            */}
      {/* ================================================================ */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!showNewSigPad ? (
              <>
                {initialData.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Select a saved signature</Label>
                    <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                      {initialData.map((sig) => (
                        <button
                          key={sig.id}
                          type="button"
                          onClick={() => setSelectedSignatureId(sig.id)}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-all text-left ${
                            selectedSignatureId === sig.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="h-[50px] w-[100px] shrink-0 rounded bg-white border overflow-hidden flex items-center justify-center">
                            <img
                              src={sig.dataUrl}
                              alt={sig.name}
                              className="max-h-[46px] max-w-[96px] object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{sig.name}</p>
                            {sig.isDefault && (
                              <p className="text-xs text-emerald-600">Default</p>
                            )}
                          </div>
                          {selectedSignatureId === sig.id && (
                            <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowNewSigPad(true)}
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Draw New
                      </Button>
                      <Button
                        onClick={handleSignWithExisting}
                        disabled={isPending || !selectedSignatureId}
                      >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Apply Signature
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      You don&apos;t have any saved signatures. Draw one now.
                    </p>
                    <Button
                      onClick={() => setShowNewSigPad(true)}
                      className="gap-1.5"
                    >
                      <PenTool className="h-4 w-4" />
                      Draw Signature
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-sig-name">Signature Name *</Label>
                  <Input
                    id="new-sig-name"
                    value={newSigName}
                    onChange={(e) => setNewSigName(e.target.value)}
                    placeholder="e.g. My Official Signature"
                  />
                </div>

                {newSigDataUrl ? (
                  <div className="space-y-3">
                    <Label>Preview</Label>
                    <div className="rounded-lg border bg-white p-4">
                      <img
                        src={newSigDataUrl}
                        alt="Signature preview"
                        className="mx-auto max-h-[120px] object-contain"
                      />
                    </div>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewSigDataUrl(null);
                          setNewSigSource(null);
                        }}
                      >
                        {newSigSource === "upload" ? "Change Image" : "Redraw"}
                      </Button>
                      <Button
                        onClick={() => handleSignWithNew(newSigDataUrl)}
                        disabled={isPending}
                      >
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save & Sign
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Tabs defaultValue="draw" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="draw">Draw</TabsTrigger>
                      <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    </TabsList>
                    <TabsContent value="draw" className="pt-2">
                      <SignaturePad
                        onSave={(url) => {
                          setNewSigDataUrl(url);
                          setNewSigSource("draw");
                        }}
                        onCancel={() => setShowNewSigPad(false)}
                      />
                    </TabsContent>
                    <TabsContent value="upload" className="pt-2">
                      <div className="space-y-4">
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            setIsDragging(false);
                            handleNewFileChange(e);
                          }}
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            isDragging
                              ? "border-primary bg-primary/5"
                              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                          }`}
                          onClick={() => document.getElementById("new-file-upload")?.click()}
                        >
                          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                          <p className="text-sm font-medium mb-1">
                            Drag & drop signature image here
                          </p>
                          <p className="text-xs text-muted-foreground mb-4">
                            Supports PNG, JPG, or JPEG
                          </p>
                          <Button type="button" variant="outline" size="sm">
                            Browse File
                          </Button>
                          <input
                            id="new-file-upload"
                            type="file"
                            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                            className="hidden"
                            onChange={handleNewFileChange}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewSigPad(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Dialog: Decline a Request                                         */}
      {/* ================================================================ */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline Signature Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="decline-reason">Reason (optional)</Label>
              <Textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Why are you declining this request?"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
