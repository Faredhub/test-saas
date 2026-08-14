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
  IndianRupee,
  CheckCircle2,
  XCircle,
  Timer,
  Trash2,
} from "lucide-react";
import {
  createTimesheet,
  approveTimesheet,
  approveTimesheetBySenior,
  approveTimesheetByManager,
  rejectTimesheet,
  deleteTimesheet,
} from "@/lib/actions/projects";
import { toast } from "sonner";

type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
};

type Project = {
  id: string;
  name: string;
  code?: string | null;
};

type TimesheetsClientProps = {
  initialData: Awaited<ReturnType<typeof import("@/lib/actions/projects").getTimesheets>>;
  employees: Employee[];
  projects: Project[];
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

function formatNiceDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcHours(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return "";
  const [sH, sM] = startStr.split(":").map(Number);
  const [eH, eM] = endStr.split(":").map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return "";
  let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const h = Math.round((totalMinutes / 60) * 100) / 100;
  return h > 0 ? String(h) : "";
}

export function TimesheetsClient({ initialData, employees, projects }: TimesheetsClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:30");
  const [hours, setHours] = useState(() => calcHours("09:00", "17:30"));

  const handleTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    const calculated = calcHours(newStart, newEnd);
    if (calculated) {
      setHours(calculated);
    }
  };

  const currentWeek = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getWeekDates(ref);
  }, [weekOffset]);

  const currentMonth = useMemo(() => {
    const ref = new Date();
    ref.setMonth(ref.getMonth() + monthOffset);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
    const monthName = ref.toLocaleString("en-US", { month: "long", year: "numeric" });
    return { start, end, monthName };
  }, [monthOffset]);

  const periodTimesheets = useMemo(() => {
    return initialData.timesheets.filter((ts) => {
      const d = new Date(ts.date);
      if (viewMode === "week") {
        return d >= currentWeek.start && d <= currentWeek.end;
      } else {
        return d >= currentMonth.start && d <= currentMonth.end;
      }
    });
  }, [initialData.timesheets, viewMode, currentWeek, currentMonth]);

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
    (ts) => ts.status === "PENDING" || ts.status === "PENDING_SENIOR" || ts.status === "PENDING_MANAGER"
  ).length;

  const weekTotal = initialData.timesheets
    .filter((ts) => {
      const d = new Date(ts.date);
      return d >= currentWeek.start && d <= currentWeek.end;
    })
    .reduce((sum, ts) => sum + Number(ts.hours), 0);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createTimesheet({
          employeeId: formData.get("employeeId") as string,
          projectId: (formData.get("projectId") as string) || undefined,
          date: formData.get("date") as string,
          startTime: formData.get("startTime") as string || undefined,
          endTime: formData.get("endTime") as string || undefined,
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

  async function handleSeniorApprove(id: string) {
    startTransition(async () => {
      try {
        await approveTimesheetBySenior(id);
        toast.success("Senior approval completed");
      } catch {
        toast.error("Failed to process senior approval");
      }
    });
  }

  async function handleManagerApprove(id: string) {
    startTransition(async () => {
      try {
        await approveTimesheetByManager(id);
        toast.success("Manager approval completed (Fully Approved)");
      } catch {
        toast.error("Failed to process manager approval");
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

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTimesheet(id);
        toast.success("Timesheet entry deleted");
      } catch {
        toast.error("Failed to delete timesheet entry");
      }
    });
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 font-medium">Approved</Badge>;
      case "PENDING_MANAGER":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-medium">Pending Manager</Badge>;
      case "REJECTED":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 font-medium">Rejected</Badge>;
      case "PENDING_SENIOR":
      case "PENDING":
      default:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 font-medium">Pending Senior</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timesheets</h1>
          <p className="text-muted-foreground">Human Resource & Project Time Tracking with Multi-Level Approvals</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Log Time
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <strong>Note:</strong> Employees will fill the Timesheet. Department Seniors can also fill their team members&apos; timesheets by selecting the team employee below.
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee Name *</Label>
                <select
                  id="employeeId"
                  name="employeeId"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select Employee</option>
                  {employees && employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.employeeId ? `(${emp.employeeId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">Project Name</Label>
                <select
                  id="projectId"
                  name="projectId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None (No Project / General HR)</option>
                  {projects && projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} {proj.code ? `(${proj.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e.target.value, endTime)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => handleTimeChange(startTime, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Total Hours *</Label>
                  <Input
                    id="hours"
                    name="hours"
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="24"
                    required
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} placeholder="Tasks performed..." />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="isBillable" name="isBillable" defaultChecked />
                <Label htmlFor="isBillable" className="text-sm font-normal">
                  Billable
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Timesheet
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
            <IndianRupee className="h-4 w-4 text-green-500" />
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

      {/* Period View (Week / Month) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                {viewMode === "week"
                  ? `Week of ${formatNiceDate(currentWeek.start)} - ${formatNiceDate(currentWeek.end)}`
                  : `Month of ${currentMonth.monthName}`}
              </CardTitle>
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === "week"
                      ? "bg-background shadow font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === "month"
                      ? "bg-background shadow font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (viewMode === "week") setWeekOffset((w) => w - 1);
                  else setMonthOffset((m) => m - 1);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (viewMode === "week") setWeekOffset(0);
                  else setMonthOffset(0);
                }}
              >
                Current
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (viewMode === "week") setWeekOffset((w) => w + 1);
                  else setMonthOffset((m) => m + 1);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {periodTimesheets.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No entries this {viewMode === "week" ? "week" : "month"}
            </p>
          ) : (
            <div className="space-y-2">
              {periodTimesheets.map((ts) => (
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
                      {ts.startTime && ts.endTime && (
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          ({ts.startTime} - {ts.endTime})
                        </span>
                      )}
                      <span className="text-muted-foreground ml-2">
                        {ts.project?.name || "General"}
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
                    {renderStatusBadge(ts.status)}
                    {(ts.status === "PENDING" || ts.status === "PENDING_SENIOR") && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={() => handleSeniorApprove(ts.id)}
                          disabled={isPending}
                          title="Department Senior Approval"
                        >
                          Senior Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600"
                          onClick={() => handleReject(ts.id)}
                          disabled={isPending}
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {ts.status === "PENDING_MANAGER" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => handleManagerApprove(ts.id)}
                          disabled={isPending}
                          title="Department Manager Approval"
                        >
                          Manager Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600"
                          onClick={() => handleReject(ts.id)}
                          disabled={isPending}
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => handleDelete(ts.id)}
                      disabled={isPending}
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING_SENIOR">Pending Senior</SelectItem>
                <SelectItem value="PENDING_MANAGER">Pending Manager</SelectItem>
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
                <TableHead>Time Range</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Approvals & Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No timesheet entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimesheets.map((ts) => (
                  <TableRow key={ts.id}>
                    <TableCell className="font-medium">
                      {formatNiceDate(new Date(ts.date))}
                    </TableCell>
                    <TableCell>
                      {ts.employee
                        ? `${ts.employee.firstName} ${ts.employee.lastName}`
                        : ts.employeeId}
                    </TableCell>
                    <TableCell>{ts.project?.name || "General"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {ts.startTime && ts.endTime ? `${ts.startTime} - ${ts.endTime}` : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">{Number(ts.hours).toFixed(2)}h</TableCell>
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
                      {renderStatusBadge(ts.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(ts.status === "PENDING" || ts.status === "PENDING_SENIOR") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
                              onClick={() => handleSeniorApprove(ts.id)}
                              disabled={isPending}
                            >
                              Senior Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => handleReject(ts.id)}
                              disabled={isPending}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {ts.status === "PENDING_MANAGER" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => handleManagerApprove(ts.id)}
                              disabled={isPending}
                            >
                              Manager Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => handleReject(ts.id)}
                              disabled={isPending}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {ts.status === "APPROVED" && (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1 mr-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Fully Approved
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => handleDelete(ts.id)}
                          disabled={isPending}
                          title="Delete Timesheet Entry"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
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
