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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Loader2,
  List,
  CalendarDays,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Pencil,
} from "lucide-react";
import {
  getFieldVisits,
  createFieldVisit,
  updateFieldVisit,
  completeFieldVisit,
  cancelFieldVisit,
} from "@/lib/actions/projects";
import { toast } from "sonner";

type FieldVisit = Awaited<ReturnType<typeof getFieldVisits>>[number];

interface FieldVisitsClientProps {
  initialVisits: FieldVisit[];
  projects: { id: string; name: string; code?: string | null }[];
  employees: { id: string; firstName: string; lastName: string; employeeId?: string | null; status?: string }[];
  formTemplates: { id: string; title: string }[];
  contacts: { id: string; label: string; sublabel: string }[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-700",
  },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

export function FieldVisitsClient({
  initialVisits,
  projects,
  employees,
  formTemplates,
  contacts,
}: FieldVisitsClientProps) {
  const [visits, setVisits] = useState<FieldVisit[]>(initialVisits);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<FieldVisit | null>(null);

  const [filterProjectId, setFilterProjectId] = useState("all");
  const [filterEmployeeId, setFilterEmployeeId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [calendarRef, setCalendarRef] = useState(new Date());

  function loadVisits() {
    startTransition(async () => {
      try {
        const data = await getFieldVisits({
          projectId: filterProjectId !== "all" ? filterProjectId : undefined,
          employeeId: filterEmployeeId !== "all" ? filterEmployeeId : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        });
        setVisits(data);
      } catch {
        toast.error("Failed to load visits");
      }
    });
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createFieldVisit({
          title: formData.get("title") as string,
          siteLocation: formData.get("siteLocation") as string,
          clientName: (formData.get("clientName") as string) || undefined,
          clientId: (formData.get("clientId") as string) || undefined,
          projectId:
            (formData.get("projectId") as string) !== "none"
              ? (formData.get("projectId") as string)
              : undefined,
          employeeId: formData.get("employeeId") as string,
          vehicleId: undefined,
          formTemplateId:
            (formData.get("formTemplateId") as string) !== "none"
              ? (formData.get("formTemplateId") as string)
              : undefined,
          date: formData.get("date") as string,
          startTime: (formData.get("startTime") as string) || undefined,
          endTime: (formData.get("endTime") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Field visit created");
        setDialogOpen(false);
        loadVisits();
      } catch {
        toast.error("Failed to create field visit");
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editingVisit) return;
    startTransition(async () => {
      try {
        await updateFieldVisit(editingVisit.id, {
          title: formData.get("title") as string,
          siteLocation: formData.get("siteLocation") as string,
          clientName: (formData.get("clientName") as string) || undefined,
          clientId: (formData.get("clientId") as string) || undefined,
          projectId:
            (formData.get("projectId") as string) !== "none"
              ? (formData.get("projectId") as string)
              : undefined,
          employeeId: formData.get("employeeId") as string,
          formTemplateId:
            (formData.get("formTemplateId") as string) !== "none"
              ? (formData.get("formTemplateId") as string)
              : undefined,
          date: formData.get("date") as string,
          startTime: (formData.get("startTime") as string) || undefined,
          endTime: (formData.get("endTime") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Field visit updated");
        setEditingVisit(null);
        loadVisits();
      } catch {
        toast.error("Failed to update field visit");
      }
    });
  }

  async function handleStartVisit(id: string) {
    startTransition(async () => {
      try {
        await updateFieldVisit(id, { status: "IN_PROGRESS" });
        toast.success("Visit started");
        loadVisits();
      } catch {
        toast.error("Failed to start visit");
      }
    });
  }

  async function handleCompleteVisit(id: string) {
    startTransition(async () => {
      try {
        await completeFieldVisit(id);
        toast.success("Visit completed");
        loadVisits();
      } catch {
        toast.error("Failed to complete visit");
      }
    });
  }

  async function handleCancelVisit(id: string) {
    startTransition(async () => {
      try {
        await cancelFieldVisit(id);
        toast.success("Visit cancelled");
        loadVisits();
      } catch {
        toast.error("Failed to cancel visit");
      }
    });
  }

  const filteredVisits = visits;

  const calYear = calendarRef.getFullYear();
  const calMonth = calendarRef.getMonth();

  const calendarCells = useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const prevPadding = firstDay.getDay();
    for (let i = prevPadding - 1; i >= 0; i--) {
      cells.push({ date: new Date(calYear, calMonth, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      cells.push({ date: new Date(calYear, calMonth, i), isCurrentMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const i = cells.length - lastDay.getDate() - prevPadding + 1;
      cells.push({ date: new Date(calYear, calMonth + 1, i), isCurrentMonth: false });
    }
    return cells;
  }, [calYear, calMonth]);

  const calendarVisitsMap = useMemo(() => {
    const map = new Map<string, FieldVisit[]>();
    for (const v of filteredVisits) {
      const key = new Date(v.date).toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [filteredVisits]);

  const prevMonth = () => setCalendarRef(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarRef(new Date(calYear, calMonth + 1, 1));

  const dialogContent = (submitHandler: (fd: FormData) => void) => (
    <form action={submitHandler} className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={editingVisit?.title ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="projectId">Project</Label>
          <Select
            name="projectId"
            defaultValue={editingVisit?.projectId ?? "none"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employeeId">Employee</Label>
          <Select
            name="employeeId"
            required
            defaultValue={editingVisit?.employeeId ?? ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                  {e.employeeId ? ` (${e.employeeId})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={
                editingVisit?.date
                  ? new Date(editingVisit.date).toISOString().split("T")[0]
                  : ""
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="siteLocation">Location</Label>
            <Input
              id="siteLocation"
              name="siteLocation"
              required
              defaultValue={editingVisit?.siteLocation ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              name="startTime"
              type="time"
              defaultValue={editingVisit?.startTime ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              name="endTime"
              type="time"
              defaultValue={editingVisit?.endTime ?? ""}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientName">Client Name</Label>
          <Input
            id="clientName"
            name="clientName"
            defaultValue={editingVisit?.clientName ?? ""}
          />
          <select name="clientId" defaultValue={(editingVisit as unknown as { clientId?: string })?.clientId ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">— Link to client (optional) —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.label}{c.sublabel ? ` (${c.sublabel})` : ""}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="formTemplateId">Form Template</Label>
          <Select
            name="formTemplateId"
            defaultValue={editingVisit?.formTemplateId ?? "none"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {formTemplates.map((ft) => (
                <SelectItem key={ft.id} value={ft.id}>
                  {ft.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={editingVisit?.notes ?? ""}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {editingVisit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Field Visits</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and manage site visits
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="mr-1 h-4 w-4" /> List
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="mr-1 h-4 w-4" /> Calendar
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-1 h-4 w-4" /> Add Visit
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Field Visit</DialogTitle>
              </DialogHeader>
              {dialogContent(handleCreate)}
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editingVisit}
            onOpenChange={(open) => {
              if (!open) setEditingVisit(null);
            }}
          >
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Field Visit</DialogTitle>
              </DialogHeader>
              {dialogContent(handleUpdate)}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <Select
            value={filterProjectId}
            onValueChange={(val) => setFilterProjectId(val ?? "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterEmployeeId}
            onValueChange={(val) => setFilterEmployeeId(val ?? "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val ?? "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="w-[160px]"
            placeholder="Start date"
          />
          <Input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="w-[160px]"
            placeholder="End date"
          />
          <Button variant="outline" size="icon" onClick={loadVisits} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No field visits found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-medium">
                        {visit.project?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {visit.employee.firstName} {visit.employee.lastName}
                      </TableCell>
                      <TableCell>
                        {new Date(visit.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {visit.startTime ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {visit.startTime}
                            {visit.endTime ? ` - ${visit.endTime}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {visit.siteLocation}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            STATUS_CONFIG[visit.status]?.className ?? ""
                          }
                        >
                          {STATUS_CONFIG[visit.status]?.label ?? visit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {visit.status === "SCHEDULED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleStartVisit(visit.id)}
                                title="Start Visit"
                              >
                                <PlayCircle className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCancelVisit(visit.id)}
                                title="Cancel Visit"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {visit.status === "IN_PROGRESS" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCompleteVisit(visit.id)}
                                title="Complete Visit"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCancelVisit(visit.id)}
                                title="Cancel Visit"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingVisit(visit);
                            }}
                            title="Edit Visit"
                          >
                            <Pencil className="h-4 w-4" />
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
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {new Date(calYear, calMonth).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarRef(new Date())}
              >
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="bg-card px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {calendarCells.map((cell, idx) => {
                const dateKey = cell.date.toISOString().split("T")[0];
                const dayVisits = calendarVisitsMap.get(dateKey) ?? [];
                const isToday =
                  dateKey === new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={idx}
                    className={`bg-card min-h-[80px] p-1 text-xs ${
                      !cell.isCurrentMonth ? "opacity-40" : ""
                    } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    <span className="block px-1 py-0.5 font-medium">
                      {cell.date.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {dayVisits.slice(0, 3).map((v) => (
                        <div
                          key={v.id}
                          className="truncate rounded px-1 py-0.5 text-[10px] font-medium bg-primary/10 text-primary"
                          title={v.title}
                        >
                          {v.startTime ? `${v.startTime} ` : ""}
                          {v.title}
                        </div>
                      ))}
                      {dayVisits.length > 3 && (
                        <span className="block px-1 text-[10px] text-muted-foreground">
                          +{dayVisits.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
