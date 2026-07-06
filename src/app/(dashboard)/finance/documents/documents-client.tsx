"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Search, Loader2, Trash2, FileText, File, Download, Upload, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  getFinancialDocuments, createFinancialDocument, deleteFinancialDocument, updateFinancialDocument,
} from "@/lib/actions/finance";

type FinancialDocument = Awaited<ReturnType<typeof getFinancialDocuments>>["data"][number];

const docTypes = ["INVOICE", "RECEIPT", "BILL", "TAX_RETURN", "BANK_STATEMENT", "OTHER"];
const docCategories = ["RECEIVABLE", "PAYABLE", "TAX", "PAYROLL", "OTHER"];

const typeIcons: Record<string, string> = {
  INVOICE: "text-blue-600",
  RECEIPT: "text-green-600",
  BILL: "text-orange-600",
  TAX_RETURN: "text-purple-600",
  BANK_STATEMENT: "text-indigo-600",
  OTHER: "text-gray-600",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentsClient() {
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [viewDoc, setViewDoc] = useState<FinancialDocument | null>(null);
  const [editDoc, setEditDoc] = useState<FinancialDocument | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setTags("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (editDoc) {
      setTags(editDoc.tags.join(", "));
    } else {
      setTags("");
    }
  }, [editDoc]);

  const CHEVRON_SVG = "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat";
  const SELECT_CLS = `flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm appearance-none ${CHEVRON_SVG} pr-10 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors cursor-pointer`;

  function loadDocuments() {
    startTransition(async () => {
      try {
        const res = await getFinancialDocuments({
          search: search || undefined,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
          pageSize: 50,
        });
        setDocuments(res.data);
        setTotal(res.total);
      } catch {
        toast.error("Failed to load documents");
      }
    });
  }

  useEffect(() => { loadDocuments(); }, [search, typeFilter]);

  async function handleCreate(formData: FormData) {
    if (!selectedFile) {
      toast.error("Please upload a PDF or Image file");
      return;
    }

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string;
          try {
            const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
            const fileName = selectedFile.name;
            const fileSize = selectedFile.size;
            const mimeType = selectedFile.type || "application/pdf";

            await createFinancialDocument({
              title: formData.get("title") as string,
              type: formData.get("type") as string,
              category: (formData.get("category") as string) || undefined,
              fileName,
              fileSize,
              mimeType,
              reference: (formData.get("reference") as string) || undefined,
              tags: tagList.length > 0 ? tagList : undefined,
              content: base64Data,
            });
            toast.success("Document created successfully");
            setIsOpen(false);
            setSelectedFile(null);
            setTags("");
            loadDocuments();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create document");
          }
        };
        reader.readAsDataURL(selectedFile);
      } catch {
        toast.error("Failed to process file upload");
      }
    });
  }

  async function handleEdit(formData: FormData) {
    if (!editDoc) return;
    startTransition(async () => {
      try {
        const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
        await updateFinancialDocument(editDoc.id, {
          title: formData.get("title") as string,
          type: formData.get("type") as string,
          category: (formData.get("category") as string) || undefined,
          reference: (formData.get("reference") as string) || undefined,
          tags: tagList,
        });
        toast.success("Document updated successfully");
        setEditDoc(null);
        setTags("");
        loadDocuments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update document");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteFinancialDocument(id);
        toast.success("Document deleted");
        setConfirmDeleteId(null);
        loadDocuments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete document");
      }
    });
  }

  function handleViewFile(doc: FinancialDocument) {
    if (!doc.content) {
      toast.error("No file data associated with this document");
      return;
    }
    try {
      const base64Parts = doc.content.split(";base64,");
      const contentType = base64Parts[0].split(":")[1] || doc.mimeType;
      const raw = window.atob(base64Parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch {
      toast.error("Failed to open file preview");
    }
  }

  function handleDownload(doc: FinancialDocument) {
    if (!doc.content) {
      toast.error("No file data associated with this document");
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = doc.content;
      link.download = doc.fileName || `${doc.title.replace(/\s+/g, "_").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded "${doc.fileName || doc.title}"`);
    } catch {
      toast.error("Download failed");
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return (
      doc.title.toLowerCase().includes(term) ||
      doc.fileName.toLowerCase().includes(term) ||
      (doc.reference || "").toLowerCase().includes(term) ||
      (doc.category || "").toLowerCase().includes(term) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Documents</h1>
          <p className="text-sm text-muted-foreground">Store and categorize financial documents ({total} total)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/office/spreadsheets?template=finance-documents&source=finance-documents">
            <Button
              variant="outline"
              type="button"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>

          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setTags(""); }}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />Add Document
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Financial Document</DialogTitle></DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title *</Label>
                  <Input id="doc-title" name="title" required placeholder="e.g. Q4 2025 Invoice" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-type">Document Type *</Label>
                    <select name="type" id="doc-type" required className={SELECT_CLS}>
                      {docTypes.map((t) => (
                        <option key={t} value={t}>{t.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-category">Category</Label>
                    <select name="category" id="doc-category" className={SELECT_CLS}>
                      <option value="">None</option>
                      {docCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Document File (PDF / Image) *</Label>
                  <div
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all hover:border-primary hover:bg-muted/50 flex flex-col items-center justify-center relative bg-muted/20"
                  >
                    <input
                      type="file"
                      id="file-upload"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          // Autofill title if title input is empty
                          const titleInput = document.getElementById("doc-title") as HTMLInputElement;
                          if (titleInput && titleInput.value === "") {
                            const name = file.name;
                            const nameWithoutExt = name.substring(0, name.lastIndexOf(".")) || name;
                            titleInput.value = nameWithoutExt;
                          }
                        }
                      }}
                      className="hidden"
                      required={!selectedFile}
                    />
                    <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                    {selectedFile ? (
                      <div className="text-left w-full max-w-[240px] mx-auto">
                        <p className="font-semibold text-xs truncate text-primary">{selectedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Size: {formatFileSize(selectedFile.size)} &bull; Type: {selectedFile.type || "unknown"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-xs">Click to upload file</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Supports PDF and Images (PNG, JPG, etc.)</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-reference">Reference</Label>
                  <Input id="doc-reference" name="reference" placeholder="e.g. INV-00123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-tags">Tags (comma-separated)</Label>
                  <Input
                    id="doc-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. tax, 2025, quarterly"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Document
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "")}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {docTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No documents found. Add your first financial document.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => {
                          if (doc.content) {
                            handleViewFile(doc);
                          } else {
                            setViewDoc(doc);
                            toast.info("No file content stored for this document. Showing details instead.");
                          }
                        }}
                        className="flex items-center gap-2 text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group/title"
                        title={doc.content ? "Click to view file" : "Click to view details"}
                      >
                        <FileText className={`h-4 w-4 shrink-0 transition-colors group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 ${typeIcons[doc.type] ?? "text-gray-600"}`} />
                        <span className="group-hover/title:underline">{doc.title}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{doc.type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.category || "—"}</TableCell>
                    <TableCell className="text-sm">{doc.fileName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell className="text-sm">{doc.reference || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(doc.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-right">
                      {confirmDeleteId === doc.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)} disabled={isPending}>Confirm</Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 gap-1 text-xs sm:text-sm"
                            onClick={() => setViewDoc(doc)}
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost" size="sm"
                            className="text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 gap-1 text-xs sm:text-sm"
                            onClick={() => setEditDoc(doc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 gap-1 text-xs sm:text-sm"
                            onClick={() => setConfirmDeleteId(doc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Document Details</DialogTitle></DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Title</span>
                  <span className="text-sm font-medium">{viewDoc.title}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Type</span>
                  <Badge variant="outline" className="text-xs">{viewDoc.type.replace("_", " ")}</Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Category</span>
                  <span className="text-sm font-medium">{viewDoc.category || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Date Added</span>
                  <span className="text-sm font-medium">{new Date(viewDoc.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">File Name</span>
                  <span className="text-sm font-medium truncate max-w-[150px] block">{viewDoc.fileName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">File Size</span>
                  <span className="text-sm font-medium">{formatFileSize(viewDoc.fileSize)}</span>
                </div>
                {viewDoc.reference && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Reference</span>
                    <span className="text-sm font-medium">{viewDoc.reference}</span>
                  </div>
                )}
              </div>
              {viewDoc.tags.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {viewDoc.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t pt-4">
                {viewDoc.content && (
                  <>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleViewFile(viewDoc)}
                      className="gap-1.5"
                    >
                      <Eye className="h-4 w-4" /> Open File
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleDownload(viewDoc)}
                      className="gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900"
                    >
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </>
                )}
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!editDoc} onOpenChange={(open) => { if (!open) setEditDoc(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Document</DialogTitle></DialogHeader>
          {editDoc && (
            <form action={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-doc-title">Title *</Label>
                <Input id="edit-doc-title" name="title" required defaultValue={editDoc.title} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-doc-type">Document Type *</Label>
                  <select name="type" id="edit-doc-type" required className={SELECT_CLS} defaultValue={editDoc.type}>
                    {docTypes.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-doc-category">Category</Label>
                  <select name="category" id="edit-doc-category" className={SELECT_CLS} defaultValue={editDoc.category || ""}>
                    <option value="">None</option>
                    {docCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-doc-reference">Reference</Label>
                <Input id="edit-doc-reference" name="reference" defaultValue={editDoc.reference || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-doc-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-doc-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. tax, 2025, quarterly"
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
