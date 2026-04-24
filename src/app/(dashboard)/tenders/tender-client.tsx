"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Trophy,
  Shield,
  Loader2,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  createTender,
  updateTender,
  deleteTender,
  getTender,
  createBid,
  updateBidResult,
  createBOQItem,
  updateBOQItem,
  deleteBOQItem,
  createEMDRecord,
  updateEMDRecord,
  analyzeLostBids,
} from "@/lib/actions/tenders";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TendersData = Awaited<
  ReturnType<typeof import("@/lib/actions/tenders").getTenders>
>;
type TenderRow = TendersData["data"][number];

// ---------------------------------------------------------------------------
// Status badge color mapping
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  IDENTIFIED: "bg-gray-100 text-gray-700",
  PRE_QUALIFIED: "bg-blue-50 text-blue-700",
  BID_PREPARING: "bg-indigo-100 text-indigo-700",
  BID_SUBMITTED: "bg-blue-100 text-blue-700",
  EVALUATING: "bg-yellow-100 text-yellow-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  EXPIRED: "bg-red-50 text-red-600",
  CANCELLED: "bg-gray-200 text-gray-600",
};

function formatCurrency(val: number | null | undefined) {
  if (val == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(val: string | Date | null | undefined) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export function TenderClient({ initialData }: { initialData: TendersData }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTender, setEditTender] = useState<TenderRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Awaited<
    ReturnType<typeof getTender>
  > | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Bid analysis
  const [analysisOpen, setAnalysisOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisData, setAnalysisData] = useState<any[]>([]);

  // Compute unique categories from data
  const categories = Array.from(
    new Set(initialData.data.map((t) => t.category).filter(Boolean))
  ) as string[];

  // Compute stats
  const totalTenders = initialData.total;
  const activeBids = initialData.data.filter((t) =>
    ["BID_SUBMITTED", "BID_PREPARING", "EVALUATING"].includes(t.status)
  ).length;
  const wonTenders = initialData.data.filter(
    (t) => t.status === "WON"
  ).length;
  const totalEMD = initialData.data.reduce(
    (sum, t) => sum + (t.emdAmount?.toNumber?.() ?? Number(t.emdAmount) ?? 0),
    0
  );

  // Filter data
  const filtered = initialData.data.filter((tender) => {
    if (statusFilter !== "ALL" && tender.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && tender.category !== categoryFilter)
      return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        tender.title.toLowerCase().includes(s) ||
        tender.referenceNo.toLowerCase().includes(s) ||
        (tender.issuingAuth?.toLowerCase().includes(s) ?? false)
      );
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createTender({
          referenceNo: formData.get("referenceNo") as string,
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          source: (formData.get("source") as string) as
            | "GEM"
            | "CPPP"
            | "STATE_PORTAL"
            | "PRIVATE"
            | "MANUAL"
            | "REFERRAL"
            | undefined,
          issuingAuth: formData.get("issuingAuth") as string,
          category: formData.get("category") as string,
          estimatedValue: Number(formData.get("estimatedValue")) || undefined,
          emdAmount: Number(formData.get("emdAmount")) || undefined,
          submissionDeadline:
            (formData.get("submissionDeadline") as string) || undefined,
          openingDate: (formData.get("openingDate") as string) || undefined,
        });
        toast.success("Tender created");
        setCreateOpen(false);
      } catch {
        toast.error("Failed to create tender");
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editTender) return;
    startTransition(async () => {
      try {
        await updateTender(editTender.id, {
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          source: (formData.get("source") as string) as
            | "GEM"
            | "CPPP"
            | "STATE_PORTAL"
            | "PRIVATE"
            | "MANUAL"
            | "REFERRAL"
            | undefined,
          issuingAuth: formData.get("issuingAuth") as string,
          category: formData.get("category") as string,
          status: (formData.get("status") as string) as
            | "IDENTIFIED"
            | "PRE_QUALIFIED"
            | "BID_PREPARING"
            | "BID_SUBMITTED"
            | "EVALUATING"
            | "WON"
            | "LOST"
            | "EXPIRED"
            | "CANCELLED"
            | undefined,
          estimatedValue: Number(formData.get("estimatedValue")) || undefined,
          emdAmount: Number(formData.get("emdAmount")) || undefined,
          submissionDeadline:
            (formData.get("submissionDeadline") as string) || undefined,
          openingDate: (formData.get("openingDate") as string) || undefined,
        });
        toast.success("Tender updated");
        setEditTender(null);
      } catch {
        toast.error("Failed to update tender");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTender(id);
        toast.success("Tender deleted");
        setConfirmDeleteId(null);
      } catch {
        toast.error("Failed to delete tender");
      }
    });
  }

  async function handleExpand(tenderId: string) {
    if (expandedId === tenderId) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    setExpandedId(tenderId);
    startTransition(async () => {
      try {
        const data = await getTender(tenderId);
        setDetailData(data);
      } catch {
        toast.error("Failed to load tender details");
      }
    });
  }

  async function handleAnalyzeLostBids() {
    startTransition(async () => {
      try {
        const data = await analyzeLostBids();
        setAnalysisData(data);
        setAnalysisOpen(true);
      } catch {
        toast.error("Failed to analyze bids");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tender Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track tenders, bids, BOQ, and EMD records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAnalyzeLostBids}>
            <Trophy className="mr-2 h-4 w-4" />
            Bid Analysis
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tender
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tenders
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBids}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won Tenders</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {wonTenders}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total EMD Value
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEMD)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tenders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="IDENTIFIED">Identified</SelectItem>
            <SelectItem value="PRE_QUALIFIED">Pre-Qualified</SelectItem>
            <SelectItem value="BID_PREPARING">Bid Preparing</SelectItem>
            <SelectItem value="BID_SUBMITTED">Bid Submitted</SelectItem>
            <SelectItem value="EVALUATING">Evaluating</SelectItem>
            <SelectItem value="WON">Won</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Reference No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Est. Value</TableHead>
                <TableHead className="text-right">EMD Amount</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No tenders found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((tender) => (
                <>
                  <TableRow
                    key={tender.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleExpand(tender.id)}
                  >
                    <TableCell>
                      {expandedId === tender.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tender.referenceNo}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {tender.title}
                    </TableCell>
                    <TableCell className="text-xs">{tender.source}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        tender.estimatedValue?.toNumber?.() ??
                          Number(tender.estimatedValue)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        tender.emdAmount?.toNumber?.() ??
                          Number(tender.emdAmount)
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(tender.submissionDeadline)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[tender.status] ?? "bg-gray-100 text-gray-700"
                        }
                      >
                        {tender.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTender(tender);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(tender.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {expandedId === tender.id && (
                    <TableRow key={`${tender.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/20 p-0">
                        <TenderDetail
                          tender={tender}
                          detailData={detailData}
                          isPending={isPending}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Tender Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Tender</DialogTitle>
          </DialogHeader>
          <TenderForm
            onSubmit={handleCreate}
            isPending={isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Tender Dialog */}
      <Dialog
        open={!!editTender}
        onOpenChange={(open) => !open && setEditTender(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tender</DialogTitle>
          </DialogHeader>
          {editTender && (
            <TenderForm
              onSubmit={handleUpdate}
              isPending={isPending}
              onCancel={() => setEditTender(null)}
              defaultValues={editTender}
              showStatus
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tender</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the tender and all associated bids, BOQ
            items, and EMD records. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bid Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lost Bid Analysis</DialogTitle>
          </DialogHeader>
          {analysisData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No lost bids found for analysis.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {analysisData.length} lost bid(s) found. Review patterns below.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tender</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Bid Amount</TableHead>
                    <TableHead>Loss Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisData.map((bid: Record<string, unknown>, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">
                        {(bid.tender as Record<string, unknown>)?.title as string ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(bid.tender as Record<string, unknown>)?.category as string ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(bid.bidAmount))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(bid.lossReason as string) ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tender Form (create / edit)
// ---------------------------------------------------------------------------

function TenderForm({
  onSubmit,
  isPending,
  onCancel,
  defaultValues,
  showStatus,
}: {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  onCancel: () => void;
  defaultValues?: Partial<TenderRow>;
  showStatus?: boolean;
}) {
  function toDateStr(val: string | Date | null | undefined) {
    if (!val) return "";
    return new Date(val).toISOString().slice(0, 10);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference No</Label>
          <Input
            id="referenceNo"
            name="referenceNo"
            required
            defaultValue={defaultValues?.referenceNo ?? ""}
            readOnly={!!defaultValues}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select name="source" defaultValue={defaultValues?.source ?? "MANUAL"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="GEM">GeM</SelectItem>
              <SelectItem value="CPPP">CPPP</SelectItem>
              <SelectItem value="STATE_PORTAL">State Portal</SelectItem>
              <SelectItem value="PRIVATE">Private</SelectItem>
              <SelectItem value="REFERRAL">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issuingAuth">Issuing Authority</Label>
          <Input
            id="issuingAuth"
            name="issuingAuth"
            defaultValue={defaultValues?.issuingAuth ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            defaultValue={defaultValues?.category ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedValue">Estimated Value</Label>
          <Input
            id="estimatedValue"
            name="estimatedValue"
            type="number"
            defaultValue={
              defaultValues?.estimatedValue != null
                ? String(
                    (defaultValues.estimatedValue as { toNumber?: () => number })
                      .toNumber?.() ?? Number(defaultValues.estimatedValue)
                  )
                : ""
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emdAmount">EMD Amount</Label>
          <Input
            id="emdAmount"
            name="emdAmount"
            type="number"
            defaultValue={
              defaultValues?.emdAmount != null
                ? String(
                    (defaultValues.emdAmount as { toNumber?: () => number })
                      .toNumber?.() ?? Number(defaultValues.emdAmount)
                  )
                : ""
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="submissionDeadline">Submission Deadline</Label>
          <Input
            id="submissionDeadline"
            name="submissionDeadline"
            type="date"
            defaultValue={toDateStr(defaultValues?.submissionDeadline)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openingDate">Opening Date</Label>
          <Input
            id="openingDate"
            name="openingDate"
            type="date"
            defaultValue={toDateStr(defaultValues?.openingDate)}
          />
        </div>
      </div>

      {showStatus && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? "IDENTIFIED"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDENTIFIED">Identified</SelectItem>
              <SelectItem value="PRE_QUALIFIED">Pre-Qualified</SelectItem>
              <SelectItem value="BID_PREPARING">Bid Preparing</SelectItem>
              <SelectItem value="BID_SUBMITTED">Bid Submitted</SelectItem>
              <SelectItem value="EVALUATING">Evaluating</SelectItem>
              <SelectItem value="WON">Won</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Save Changes" : "Create Tender"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tender Detail (expanded row with tabs)
// ---------------------------------------------------------------------------

function TenderDetail({
  tender,
  detailData,
  isPending: parentPending,
}: {
  tender: TenderRow;
  detailData: Awaited<ReturnType<typeof getTender>> | null;
  isPending: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [bidOpen, setBidOpen] = useState(false);
  const [boqOpen, setBoqOpen] = useState(false);
  const [emdOpen, setEmdOpen] = useState(false);

  if (!detailData && parentPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detailData) return null;

  const bids = detailData.bids ?? [];
  const boqItems = detailData.boqItems ?? [];
  const emdRecords = detailData.emdRecords ?? [];

  // Handlers
  async function handleCreateBid(formData: FormData) {
    startTransition(async () => {
      try {
        await createBid({
          tenderId: tender.id,
          bidNo: formData.get("bidNo") as string,
          bidAmount: Number(formData.get("bidAmount")),
        });
        toast.success("Bid created");
        setBidOpen(false);
      } catch {
        toast.error("Failed to create bid");
      }
    });
  }

  async function handleCreateBOQ(formData: FormData) {
    startTransition(async () => {
      try {
        await createBOQItem({
          tenderId: tender.id,
          sNo: Number(formData.get("sNo")),
          description: formData.get("description") as string,
          unit: formData.get("unit") as string,
          quantity: Number(formData.get("quantity")),
          rate: Number(formData.get("rate")) || undefined,
          amount: Number(formData.get("amount")) || undefined,
        });
        toast.success("BOQ item added");
        setBoqOpen(false);
      } catch {
        toast.error("Failed to add BOQ item");
      }
    });
  }

  async function handleDeleteBOQ(id: string) {
    startTransition(async () => {
      try {
        await deleteBOQItem(id);
        toast.success("BOQ item removed");
      } catch {
        toast.error("Failed to remove BOQ item");
      }
    });
  }

  async function handleCreateEMD(formData: FormData) {
    startTransition(async () => {
      try {
        await createEMDRecord({
          tenderId: tender.id,
          type: (formData.get("type") as "EMD" | "PERFORMANCE_BOND" | "SECURITY_DEPOSIT" | "BID_BOND") || "EMD",
          instrumentNo: formData.get("instrumentNo") as string,
          bankName: formData.get("bankName") as string,
          amount: Number(formData.get("amount")),
          issuedDate: (formData.get("issuedDate") as string) || undefined,
          expiryDate: (formData.get("expiryDate") as string) || undefined,
          remarks: formData.get("remarks") as string,
        });
        toast.success("EMD record added");
        setEmdOpen(false);
      } catch {
        toast.error("Failed to add EMD record");
      }
    });
  }

  async function handleBidResult(
    bidId: string,
    result: "WON" | "LOST" | "NO_RESPONSE"
  ) {
    startTransition(async () => {
      try {
        await updateBidResult(bidId, result);
        toast.success("Bid result updated");
      } catch {
        toast.error("Failed to update bid result");
      }
    });
  }

  return (
    <div className="p-4">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bids">
            Bids ({bids.length})
          </TabsTrigger>
          <TabsTrigger value="boq">
            BOQ ({boqItems.length})
          </TabsTrigger>
          <TabsTrigger value="emd">
            EMD / Bonds ({emdRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Reference No</p>
              <p className="font-medium">{detailData.referenceNo}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Source</p>
              <p className="font-medium">{detailData.source}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Issuing Authority</p>
              <p className="font-medium">{detailData.issuingAuth ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Category</p>
              <p className="font-medium">{detailData.category ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Opening Date</p>
              <p className="font-medium">{formatDate(detailData.openingDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Pre-Qual Status</p>
              <p className="font-medium">
                {detailData.preQualStatus ?? "N/A"}
              </p>
            </div>
            {detailData.description && (
              <div className="col-span-full">
                <p className="text-muted-foreground text-xs">Description</p>
                <p className="font-medium">{detailData.description}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Bids Tab */}
        <TabsContent value="bids" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {bids.length} bid(s) for this tender
            </p>
            <Button size="sm" variant="outline" onClick={() => setBidOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Add Bid
            </Button>
          </div>
          {bids.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bid No</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid) => (
                  <TableRow key={bid.id}>
                    <TableCell className="font-mono text-xs">
                      {bid.bidNo}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (bid.bidAmount as { toNumber?: () => number })
                          ?.toNumber?.() ?? Number(bid.bidAmount)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{bid.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {bid.result ? (
                        <Badge
                          className={
                            bid.result === "WON"
                              ? "bg-green-100 text-green-700"
                              : bid.result === "LOST"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                          }
                        >
                          {bid.result}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-green-600"
                          onClick={() => handleBidResult(bid.id, "WON")}
                          disabled={isPending}
                        >
                          Won
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-red-600"
                          onClick={() => handleBidResult(bid.id, "LOST")}
                          disabled={isPending}
                        >
                          Lost
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Add Bid Dialog */}
          <Dialog open={bidOpen} onOpenChange={setBidOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Bid</DialogTitle>
              </DialogHeader>
              <form action={handleCreateBid} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bidNo">Bid Number</Label>
                  <Input id="bidNo" name="bidNo" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bidAmount">Bid Amount</Label>
                  <Input
                    id="bidAmount"
                    name="bidAmount"
                    type="number"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBidOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Bid
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* BOQ Tab */}
        <TabsContent value="boq" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Bill of Quantities ({boqItems.length} items)
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBoqOpen(true)}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Item
            </Button>
          </div>
          {boqItems.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">S.No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {boqItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.description}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (item.rate as { toNumber?: () => number })?.toNumber?.() ??
                          Number(item.rate)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (item.amount as { toNumber?: () => number })
                          ?.toNumber?.() ?? Number(item.amount)
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDeleteBOQ(item.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Add BOQ Dialog */}
          <Dialog open={boqOpen} onOpenChange={setBoqOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add BOQ Item</DialogTitle>
              </DialogHeader>
              <form action={handleCreateBOQ} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sNo">S.No</Label>
                    <Input id="sNo" name="sNo" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      name="unit"
                      required
                      placeholder="e.g. RMT, SQM, CUM"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" required rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate</Label>
                    <Input id="rate" name="rate" type="number" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBoqOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Item
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* EMD / Bonds Tab */}
        <TabsContent value="emd" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              EMD and Bond records ({emdRecords.length})
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEmdOpen(true)}
            >
              <Plus className="mr-1 h-3 w-3" /> Add EMD
            </Button>
          </div>
          {emdRecords.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Instrument No</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emdRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs">
                      {record.type?.replace(/_/g, " ") ?? "EMD"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.instrumentNo ?? "-"}
                    </TableCell>
                    <TableCell>{record.bankName ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (record.amount as { toNumber?: () => number })
                          ?.toNumber?.() ?? Number(record.amount)
                      )}
                    </TableCell>
                    <TableCell>{formatDate(record.issuedDate)}</TableCell>
                    <TableCell>{formatDate(record.expiryDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          record.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : record.status === "RETURNED"
                              ? "bg-blue-100 text-blue-700"
                              : record.status === "FORFEITED"
                                ? "bg-red-100 text-red-700"
                                : ""
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Add EMD Dialog */}
          <Dialog open={emdOpen} onOpenChange={setEmdOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add EMD / Bond Record</DialogTitle>
              </DialogHeader>
              <form action={handleCreateEMD} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emdType">Type</Label>
                    <Select name="type" defaultValue="EMD">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMD">EMD</SelectItem>
                        <SelectItem value="PERFORMANCE_BOND">
                          Performance Bond
                        </SelectItem>
                        <SelectItem value="SECURITY_DEPOSIT">
                          Security Deposit
                        </SelectItem>
                        <SelectItem value="BID_BOND">Bid Bond</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instrumentNo">Instrument No</Label>
                    <Input id="instrumentNo" name="instrumentNo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" name="bankName" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issuedDate">Issued Date</Label>
                    <Input id="issuedDate" name="issuedDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" name="expiryDate" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea id="remarks" name="remarks" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEmdOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Record
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
