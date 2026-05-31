"use client";

import { useState, useTransition, useMemo } from "react";
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
import {
  Plus,
  Hash,
  Loader2,
  PhoneForwarded,
  CheckCircle,
  SkipForward,
  Users,
  Clock,
  UserCheck,
  Timer,
} from "lucide-react";
import {
  getQueueTokens,
  issueToken,
  callNextToken,
  completeToken,
  skipToken,
} from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QueueToken = {
  id: string;
  tokenNumber: number;
  customerName: string | null;
  phone: string | null;
  purpose: string | null;
  status: string;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-700",
  SERVING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  SKIPPED: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  WAITING: "Waiting",
  SERVING: "Serving",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  initialData: Awaited<ReturnType<typeof getQueueTokens>>;
};

export function QueueClient({ initialData }: Props) {
  const [tokens, setTokens] = useState<QueueToken[]>(initialData);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Derived stats
  const currentServing = useMemo(
    () => tokens.find((t) => t.status === "SERVING"),
    [tokens]
  );
  const waitingCount = useMemo(
    () => tokens.filter((t) => t.status === "WAITING").length,
    [tokens]
  );
  const totalToday = tokens.length;
  const completedCount = useMemo(
    () => tokens.filter((t) => t.status === "COMPLETED").length,
    [tokens]
  );

  // Average wait time (for completed tokens that have calledAt)
  const avgWaitMinutes = useMemo(() => {
    const completed = tokens.filter(
      (t) => t.status === "COMPLETED" && t.calledAt
    );
    if (completed.length === 0) return 0;
    const totalMs = completed.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const called = new Date(t.calledAt!).getTime();
      return sum + (called - created);
    }, 0);
    return Math.round(totalMs / completed.length / 60000);
  }, [tokens]);

  async function refresh() {
    const data = await getQueueTokens();
    setTokens(data);
  }

  async function handleIssue(formData: FormData) {
    startTransition(async () => {
      try {
        await issueToken({
          customerName: formData.get("customerName") as string,
          phone: formData.get("phone") as string,
          purpose: formData.get("purpose") as string,
        });
        toast.success("Token issued");
        setIsOpen(false);
        await refresh();
      } catch {
        toast.error("Failed to issue token");
      }
    });
  }

  async function handleCallNext() {
    startTransition(async () => {
      try {
        await callNextToken();
        toast.success("Next token called");
        await refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to call next token"
        );
      }
    });
  }

  async function handleComplete(id: string) {
    startTransition(async () => {
      try {
        await completeToken(id);
        toast.success("Token completed");
        await refresh();
      } catch {
        toast.error("Failed to complete token");
      }
    });
  }

  async function handleSkip(id: string) {
    startTransition(async () => {
      try {
        await skipToken(id);
        toast.success("Token skipped");
        await refresh();
      } catch {
        toast.error("Failed to skip token");
      }
    });
  }

  function formatWaitTime(createdAt: string) {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "< 1 min";
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Queue Management
          </h1>
          <p className="text-muted-foreground">
            Token queue and serving display
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCallNext}
            disabled={isPending || waitingCount === 0}
            variant="default"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PhoneForwarded className="mr-2 h-4 w-4" />
            )}
            Call Next
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Issue Token
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue New Token</DialogTitle>
              </DialogHeader>
              <form action={handleIssue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name (optional)</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    placeholder="Walk-in customer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" name="phone" placeholder="+91..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose (optional)</Label>
                  <Input
                    id="purpose"
                    name="purpose"
                    placeholder="e.g., Billing, Inquiry"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Issue Token
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Currently Serving — Big Display */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Now Serving
          </p>
          {currentServing ? (
            <>
              <div className="text-7xl font-bold text-primary tabular-nums">
                {String(currentServing.tokenNumber).padStart(3, "0")}
              </div>
              {currentServing.customerName && (
                <p className="mt-2 text-lg text-muted-foreground">
                  {currentServing.customerName}
                </p>
              )}
              {currentServing.purpose && (
                <p className="text-sm text-muted-foreground">
                  {currentServing.purpose}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleComplete(currentServing.id)}
                  disabled={isPending}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSkip(currentServing.id)}
                  disabled={isPending}
                >
                  <SkipForward className="mr-1 h-4 w-4" />
                  Skip
                </Button>
              </div>
            </>
          ) : (
            <div className="text-4xl font-bold text-muted-foreground/40">
              ---
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Today</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToday}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {waitingCount}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgWaitMinutes > 0 ? `${avgWaitMinutes} min` : "--"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Queue List</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="mb-3 h-10 w-10 opacity-40" />
              <p>No tokens issued today</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Token</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wait Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-mono font-bold">
                      {String(token.tokenNumber).padStart(3, "0")}
                    </TableCell>
                    <TableCell>
                      <div>
                        {token.customerName || "Walk-in"}
                        {token.phone && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {token.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {token.purpose || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[token.status] || ""}
                      >
                        {statusLabels[token.status] || token.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {token.status === "WAITING"
                        ? formatWaitTime(token.createdAt)
                        : token.calledAt
                          ? formatWaitTime(token.createdAt)
                          : "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      {token.status === "SERVING" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleComplete(token.id)}
                            disabled={isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSkip(token.id)}
                            disabled={isPending}
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {token.status === "WAITING" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSkip(token.id)}
                          disabled={isPending}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
