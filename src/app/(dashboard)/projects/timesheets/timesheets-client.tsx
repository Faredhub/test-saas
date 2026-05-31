"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Loader2,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import {
  createTimesheet,
  approveTimesheet,
  rejectTimesheet,
} from "@/lib/actions/projects";
import { toast } from "sonner";

type TimesheetsClientProps = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/projects").getTimesheets>>;
};

function getWeekDates(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday
  return { start, end };
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function TimesheetsClient({ initialData }: TimesheetsClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeek = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getWeekDates(ref);
  }, [weekOffset]);

  const weekTimesheets = initialData.timesheets.filter((ts) => {
    const d = new Date(ts.date);
    return d >= currentWeek.start && d <= currentWeek.end;
  });

  const filteredTimesheets = initialData.timesheets.filter(
    (ts) => statusFilter === "ALL" || ts.status === statusFilter
  );

  const totalHours = initialData.timesheets.reduce(
    (sum, ts) => sum + Number(ts.hours),
    0
  );
  const billableHours = initialData.timesheets
    .filter((ts) => ts.isBillable)
    .reduce((sum, ts) => sum + Number(ts.hours), 0);
  const pendingCount = initialData.timesheets.filter(
    (ts) => ts.status === "PENDING"
  ).length;

  const weekTotal = weekTimesheets.reduce(
    (sum, ts) => sum + Number(ts.hours),
    0
  );

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createTimesheet({
          employeeId: formData.get("employeeId") as string,
          projectId: (formData.get("projectId") as string) || undefined,
          date: formData.get("date") as string,
          hours: Number(formData.get("hours")),
          description: formData.get("description") as string,
          isBillable: formData.get("isBillable") === "on",
        });
        toast.success("Timesheet entry created");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create timesheet entry");
      }
    });
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approveTimesheet(id);
        toast.success("Timesheet approved");
      } catch {
        toast.error("Failed to approve timesheet");
      }
    });
  }

  async function handleReject(id: string) {
    startTransition(async () => {
      try {
        await rejectTimesheet(id);
        toast.success("Timesheet rejected");
      } catch {
        toast.error("Failed to reject timesheet");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timesheets</h1>
          <p className="text-muted-foreground">Track and approve time entries</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Log Time
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input id="employeeId" name="employeeId" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID</Label>
                <Input id="projectId" name="projectId" placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={formatDate(new Date())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours *</Label>
                  <Input
                    id="hours"
                    name="hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="isBillable" name="isBillable" defaultChecked />
                <Label htmlFor="isBillable" className="text-sm font-normal">
                  Billable
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log Time
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billableHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {totalHours > 0
                ? `${Math.round((billableHours / totalHours) * 100)}% billable`
                : "0% billable"}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Timer className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekTotal.toFixed(1)}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Week of {currentWeek.start.toLocaleDateString()} -{" "}
              {currentWeek.end.toLocaleDateString()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
                Current
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {weekTimesheets.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No entries this week</p>
          ) : (
            <div className="space-y-2">
              {weekTimesheets.map((ts) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium w-24">
                      {new Date(ts.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div>
                      <span className="font-medium">{Number(ts.hours).toFixed(1)}h</span>
                      <span className="text-muted-foreground ml-2">
                        {ts.project?.name || "No project"}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        ts.isBillable
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }
                    >
                      {ts.isBillable ? "Billable" : "Non-billable"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        ts.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : ts.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }
                    >
                      {ts.status}
                    </Badge>
                    {ts.status === "PENDING" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(ts.id)}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(ts.id)}
                          disabled={isPending}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Entries</CardTitle>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No timesheet entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimesheets.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell>
                      {new Date(ts.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {ts.employee
                        ? `${ts.employee.firstName} ${ts.employee.lastName}`
                        : ts.employeeId}
                    </TableCell>
                    <TableCell>{ts.project?.name || "-"}</TableCell>
                    <TableCell>{Number(ts.hours).toFixed(1)}h</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {ts.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          ts.isBillable
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {ts.isBillable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          ts.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : ts.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }
                      >
                        {ts.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ts.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(ts.id)}
                            disabled={isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(ts.id)}
                            disabled={isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
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
    </div>
  );
}
