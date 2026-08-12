"use client";

import { useState, useTransition, useEffect } from "react";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BellRing,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  Hash,
  AlertTriangle,
  ArrowBigUp,
  ArrowRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import {
  getWaiterCalls,
  createWaiterCall,
  acknowledgeCall,
  resolveCall,
} from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WaiterCall = {
  id: string;
  tableNumber: string;
  notes: string | null;
  priority: string;
  status: string;
  assignedToId: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACKNOWLEDGED: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
};

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-blue-100 text-blue-700",
};

const priorityIcons: Record<string, React.ReactNode> = {
  HIGH: <ArrowBigUp className="h-3.5 w-3.5" />,
  MEDIUM: <ArrowRight className="h-3.5 w-3.5" />,
  LOW: <ArrowDownRight className="h-3.5 w-3.5" />,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaiterCallsClient() {
  const [activeTab, setActiveTab] = useState("active");
  const [isPending, startTransition] = useTransition();

  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTable, setFormTable] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");

  // Filters
  const [filterTable, setFilterTable] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  async function loadCalls() {
    try {
      setLoading(true);
      const where: Record<string, string | undefined> = {};

      if (activeTab === "active") {
        where.status = undefined;
      } else if (activeTab === "history" && filterStatus) {
        where.status = filterStatus;
      }

      const data = await getWaiterCalls({
        status: where.status,
        tableNumber: filterTable || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      });
      setCalls(data.map((c: any) => ({
        ...c,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
        acknowledgedAt: c.acknowledgedAt instanceof Date ? c.acknowledgedAt.toISOString() : c.acknowledgedAt,
        resolvedAt: c.resolvedAt instanceof Date ? c.resolvedAt.toISOString() : c.resolvedAt,
      })) as WaiterCall[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const activeCalls = calls.filter((c) => c.status !== "RESOLVED");
  const historyCalls = calls.filter((c) => c.status === "RESOLVED");

  const pendingCount = activeCalls.filter((c) => c.status === "PENDING").length;
  const acknowledgedCount = activeCalls.filter((c) => c.status === "ACKNOWLEDGED").length;
  const resolvedCount = calls.filter((c) => c.status === "RESOLVED").length;

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  function handleCreate() {
    if (!formTable.trim()) {
      toast.error("Table number is required");
      return;
    }

    startTransition(async () => {
      try {
        await createWaiterCall({
          tableNumber: formTable.trim(),
          notes: formNotes.trim() || undefined,
          priority: formPriority,
        });
        toast.success(`Call created for Table ${formTable.trim()}`);
        setDialogOpen(false);
        setFormTable("");
        setFormNotes("");
        setFormPriority("MEDIUM");
        await loadCalls();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create call"
        );
      }
    });
  }

  function handleAcknowledge(id: string) {
    startTransition(async () => {
      try {
        await acknowledgeCall(id);
        toast.success("Call acknowledged");
        await loadCalls();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to acknowledge call"
        );
      }
    });
  }

  function handleResolve(id: string) {
    startTransition(async () => {
      try {
        await resolveCall(id);
        toast.success("Call resolved");
        await loadCalls();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to resolve call"
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render row common
  // ---------------------------------------------------------------------------

  function renderCallRow(call: WaiterCall) {
    return (
      <TableRow key={call.id}>
        <TableCell className="font-mono font-bold">
          <span className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            Table {call.tableNumber}
          </span>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDateTime(call.createdAt)}
        </TableCell>
        <TableCell>{formatElapsed(call.createdAt)}</TableCell>
        <TableCell>
          <Badge variant="secondary" className={priorityColors[call.priority] || ""}>
            <span className="mr-1">{priorityIcons[call.priority]}</span>
            {call.priority}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={statusColors[call.status] || ""}>
            {statusLabels[call.status] || call.status}
          </Badge>
        </TableCell>
        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
          {call.notes || "-"}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {call.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleAcknowledge(call.id)}
                disabled={isPending}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Acknowledge
              </Button>
            )}
            {call.status === "ACKNOWLEDGED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleResolve(call.id)}
                disabled={isPending}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Resolve
              </Button>
            )}
            {call.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleResolve(call.id)}
                disabled={isPending}
              >
                Resolve
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Waiter Calls</h1>
            <p className="text-xs text-muted-foreground">
              Manage table service call requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCalls}
            disabled={isPending}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Call
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Waiter Call</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="wc-table" className="mb-1.5 text-xs">
                    Table Number *
                  </Label>
                  <Input
                    id="wc-table"
                    placeholder="e.g. A5, 12"
                    value={formTable}
                    onChange={(e) => setFormTable(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="wc-priority" className="mb-1.5 text-xs">
                    Priority
                  </Label>
                  <Select value={formPriority} onValueChange={(v) => v && setFormPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wc-notes" className="mb-1.5 text-xs">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="wc-notes"
                    placeholder="e.g. Water refill, extra napkins..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Call
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BellRing className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCalls.length}</p>
              <p className="text-xs text-muted-foreground">Active Calls</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{acknowledgedCount}</p>
              <p className="text-xs text-muted-foreground">Acknowledged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="text-xs">
            Active Calls
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Call History
          </TabsTrigger>
        </TabsList>

        {/* Active Calls */}
        <TabsContent value="active" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-4 w-4" />
                Active Calls
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
                    {pendingCount} pending
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : activeCalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BellRing className="mb-3 h-12 w-12 opacity-20" />
                  <p className="text-sm">No active calls</p>
                  <p className="text-xs">
                    All caught up! New calls will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Called At</TableHead>
                      <TableHead>Waiting</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCalls
                      .sort((a, b) => {
                        const prioOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                        const pa = prioOrder[a.priority as keyof typeof prioOrder] ?? 1;
                        const pb = prioOrder[b.priority as keyof typeof prioOrder] ?? 1;
                        return pa - pb || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      })
                      .map(renderCallRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call History */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="mb-1.5 text-xs">Table</Label>
                  <Input
                    placeholder="e.g. A5"
                    value={filterTable}
                    onChange={(e) => setFilterTable(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">From</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">To</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterTable("");
                    setFilterStatus("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={loadCalls} disabled={isPending}>
                  {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Call History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (activeTab === "history" ? calls : historyCalls).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="mb-3 h-12 w-12 opacity-20" />
                  <p className="text-sm">No call history</p>
                  <p className="text-xs">
                    Completed calls will show up here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Called At</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resolved At</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(activeTab === "history" ? calls : historyCalls).map((call) => (
                      <TableRow key={call.id}>
                        <TableCell className="font-mono font-bold">
                          <span className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            Table {call.tableNumber}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(call.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={priorityColors[call.priority] || ""}>
                            <span className="mr-1">{priorityIcons[call.priority]}</span>
                            {call.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[call.status] || ""}>
                            {statusLabels[call.status] || call.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(call.resolvedAt)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {call.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
