"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Plus, Loader2, ChevronLeft, ChevronRight, Calendar, Clock, Trash2, Pencil,
} from "lucide-react";
import {
  getShifts, createShift, updateShift, deleteShift,
  getScheduleEntries, createScheduleEntry, deleteScheduleEntry,
  getEmployees, createScheduleEntriesForRange,
  getFieldVisitSchedules, createFieldVisitSchedule, updateFieldVisitStatus, deleteFieldVisitSchedule,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type ShiftsData = Awaited<ReturnType<typeof getShifts>>;
type ScheduleData = Awaited<ReturnType<typeof getScheduleEntries>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type FieldVisitsData = Awaited<ReturnType<typeof getFieldVisitSchedules>>;

function getWeekDates(refDate: Date): Date[] {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function shortDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function SchedulingClient() {
  const [shifts, setShifts] = useState<ShiftsData>([]);
  const [schedule, setSchedule] = useState<ScheduleData>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisitsData>([]);
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [weekRef, setWeekRef] = useState(new Date());
  const [shiftOpen, setShiftOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [fieldVisitOpen, setFieldVisitOpen] = useState(false);
  const [assignDate, setAssignDate] = useState("");
  const [assignEmpId, setAssignEmpId] = useState("");
  const [isPending, startTransition] = useTransition();

  // Calendar view states
  const [isCalendarMode, setIsCalendarMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"master" | "field">("master");
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");
  const [editShift, setEditShift] = useState<ShiftsData[number] | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);

  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth();

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth + 1, 1));
  };
  const goToToday = () => {
    setCurrentCalendarDate(new Date());
  };

  const calendarCells = useMemo(() => {
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // First day of current month
    const firstDay = new Date(calYear, calMonth, 1);
    // Last day of current month
    const lastDay = new Date(calYear, calMonth + 1, 0);
    
    // Padding days from previous month (Sunday = 0)
    const prevPadding = firstDay.getDay();
    for (let i = prevPadding - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth, -i);
      cells.push({ date: d, isCurrentMonth: false });
    }
    
    // Days of current month
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(calYear, calMonth, i);
      cells.push({ date: d, isCurrentMonth: true });
    }
    
    // Fill remaining to get complete 6-week grid (42 cells)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(calYear, calMonth + 1, i);
      cells.push({ date: d, isCurrentMonth: false });
    }
    
    return cells;
  }, [calYear, calMonth]);

  const calendarData = useMemo(() => {
    return calendarCells.map((cell) => {
      const dateStr = formatDate(cell.date);
      const cellEntries = schedule.filter((entry) => {
        const eDate = formatDate(new Date(entry.date));
        if (eDate !== dateStr) return false;
        if (filterEmployeeId !== "all" && entry.employeeId !== filterEmployeeId) return false;
        return true;
      });
      return { ...cell, entries: cellEntries };
    });
  }, [calendarCells, schedule, filterEmployeeId]);

  function loadData() {
    startTransition(async () => {
      try {
        let startDate: string;
        let endDate: string;
        
        if (isCalendarMode) {
          const firstCell = calendarCells[0]?.date || new Date(calYear, calMonth, -6);
          const lastCell = calendarCells[calendarCells.length - 1]?.date || new Date(calYear, calMonth + 1, 6);
          startDate = formatDate(firstCell);
          endDate = formatDate(lastCell);
        } else {
          startDate = formatDate(weekDates[0]);
          endDate = formatDate(weekDates[6]);
        }

        const [shiftData, schedData, empData, fieldVisitData] = await Promise.all([
          getShifts(),
          getScheduleEntries({ startDate, endDate }),
          getEmployees({ pageSize: 100 }),
          getFieldVisitSchedules({ startDate, endDate }),
        ]);
        setShifts(shiftData);
        setSchedule(schedData);
        setEmployees(empData);
        setFieldVisits(fieldVisitData);
      } catch {
        toast.error("Failed to load schedule data");
      }
    });
  }

  useEffect(() => { loadData(); }, [weekRef, currentCalendarDate, isCalendarMode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpdateShift(formData: FormData) {
    if (!editShift) return;
    startTransition(async () => {
      try {
        await updateShift(editShift.id, {
          name: formData.get("name") as string,
          startTime: formData.get("startTime") as string,
          endTime: formData.get("endTime") as string,
          breakMinutes: Number(formData.get("breakMinutes")) || 60,
          color: formData.get("color") as string || "#3b82f6",
        });
        toast.success("Shift updated");
        setEditShift(null);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function prevWeek() {
    const d = new Date(weekRef);
    d.setDate(d.getDate() - 7);
    setWeekRef(d);
  }

  function nextWeek() {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + 7);
    setWeekRef(d);
  }

  async function handleCreateShift(formData: FormData) {
    startTransition(async () => {
      try {
        await createShift({
          name: formData.get("name") as string,
          startTime: formData.get("startTime") as string,
          endTime: formData.get("endTime") as string,
          breakMinutes: Number(formData.get("breakMinutes")) || 60,
          color: formData.get("color") as string || "#3b82f6",
        });
        toast.success("Shift created");
        setShiftOpen(false);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleAssign(formData: FormData) {
    startTransition(async () => {
      try {
        await createScheduleEntriesForRange({
          employeeId: formData.get("employeeId") as string,
          shiftId: formData.get("shiftId") as string,
          startDate: formData.get("startDate") as string,
          endDate: formData.get("endDate") as string,
          notes: formData.get("notes") as string || undefined,
        });
        toast.success("Shift(s) assigned successfully");
        setAssignOpen(false);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to assign shift");
      }
    });
  }

  async function handleDeleteEntry(id: string) {
    startTransition(async () => {
      try {
        await deleteScheduleEntry(id);
        toast.success("Entry removed");
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleDeleteShift(id: string) {
    startTransition(async () => {
      try {
        await deleteShift(id);
        toast.success("Shift deleted");
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  // Build a map: employeeId -> { date -> entry[] }
  const empList = employees?.data ?? [];
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleData>>();
    for (const entry of schedule) {
      const empId = entry.employeeId;
      const dateKey = formatDate(new Date(entry.date));
      if (!map.has(empId)) map.set(empId, new Map());
      const empMap = map.get(empId)!;
      if (!empMap.has(dateKey)) empMap.set(dateKey, []);
      empMap.get(dateKey)!.push(entry);
    }
    return map;
  }, [schedule]);

  // Only show employees who have schedule entries or all employees
  const displayEmployees = empList.filter((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Scheduling</h1>
          <p className="text-sm text-muted-foreground">Manage shifts and weekly schedules</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <Clock className="h-4 w-4" />Manage Shifts
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Shifts</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {shifts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color ?? "#3b82f6" }} />
                      <div>
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {s.startTime} - {s.endTime} ({s.breakMinutes}m break)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-700 hover:bg-slate-100 h-8 w-8 p-0 cursor-pointer"
                        onClick={() => setEditShift(s)}
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 h-8 w-8 p-0 cursor-pointer"
                        onClick={() => handleDeleteShift(s.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {shifts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No shifts yet</p>}
              </div>
              <form action={handleCreateShift} className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Add New Shift</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input name="name" placeholder="Morning Shift" required />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input name="color" type="color" defaultValue="#3b82f6" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start</Label>
                    <Input name="startTime" type="time" defaultValue="09:00" required />
                  </div>
                  <div>
                    <Label>End</Label>
                    <Input name="endTime" type="time" defaultValue="17:00" required />
                  </div>
                  <div>
                    <Label>Break (min)</Label>
                    <Input name="breakMinutes" type="number" defaultValue={60} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Shift
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />Assign Shift
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Shift</DialogTitle></DialogHeader>
              <form action={handleAssign} className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select name="employeeId" defaultValue={assignEmpId}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {displayEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shift</Label>
                  <Select name="shiftId" required>
                    <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input name="startDate" type="date" defaultValue={assignDate || formatDate(weekDates[0])} required />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input name="endDate" type="date" defaultValue={assignDate || formatDate(weekDates[0])} required />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input name="notes" placeholder="Optional notes" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Shift Dialog */}
          <Dialog open={!!editShift} onOpenChange={(open) => !open && setEditShift(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Edit Shift</DialogTitle></DialogHeader>
              {editShift && (
                <form action={handleUpdateShift} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input name="name" defaultValue={editShift.name} required />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Input name="color" type="color" defaultValue={editShift.color || "#3b82f6"} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Start</Label>
                      <Input name="startTime" type="time" defaultValue={editShift.startTime} required />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input name="endTime" type="time" defaultValue={editShift.endTime} required />
                    </div>
                    <div>
                      <Label>Break (min)</Label>
                      <Input name="breakMinutes" type="number" defaultValue={editShift.breakMinutes} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setEditShift(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week/Month Navigation & Schedule View Toggle */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={isCalendarMode ? prevMonth : prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-semibold min-w-[180px] text-center flex items-center justify-center">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              {isCalendarMode
                ? currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : `${shortDay(weekDates[0])} - ${shortDay(weekDates[6])}`}
            </CardTitle>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={isCalendarMode ? nextMonth : nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={isCalendarMode ? goToToday : () => setWeekRef(new Date())}
            >
              Today
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Filter Selection in Calendar Mode */}
            {isCalendarMode && (
              <Select value={filterEmployeeId} onValueChange={(val) => setFilterEmployeeId(val || "all")}>
                <SelectTrigger className="w-44 h-8 text-xs bg-background">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {displayEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Layout Toggle Buttons */}
            <div className="flex rounded-md border p-0.5 bg-muted/40">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs cursor-pointer ${!isCalendarMode ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setIsCalendarMode(false)}
                type="button"
              >
                Weekly Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs cursor-pointer ${isCalendarMode ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setIsCalendarMode(true)}
                type="button"
              >
                Monthly Calendar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isPending && (
            isCalendarMode ? (
              /* MONTHLY CALENDAR GRID VIEW */
              <div className="p-4 space-y-4 max-w-3xl mx-auto w-full">
                {/* Legend status indicators */}
                <div className="flex flex-wrap gap-3 text-[11px] justify-end bg-muted/30 p-2 rounded-lg border border-muted-foreground/10">
                  <span className="font-semibold text-muted-foreground mr-1">Shifts Key:</span>
                  {shifts.map((s) => (
                    <span key={s.id} className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="h-2.5 w-2.5 rounded-full border" style={{ backgroundColor: s.color ?? "#3b82f6", borderColor: s.color ? `${s.color}aa` : "#3b82f6" }} />
                      {s.name} ({s.startTime}-{s.endTime})
                    </span>
                  ))}
                  {shifts.length === 0 && <span className="text-muted-foreground">No shifts configured</span>}
                </div>

                {/* Calendar Grid Table */}
                <div className="grid grid-cols-7 gap-1 md:gap-1.5 border-t pt-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                    <div key={dayName} className={`text-center font-semibold text-[10px] md:text-xs py-1 uppercase tracking-wide select-none ${
                      dayName === "Sun" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                    }`}>
                      {dayName}
                    </div>
                  ))}

                  {calendarData.map((cell, index) => {
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    const isCurrMonth = cell.isCurrentMonth;
                    const isSunday = cell.date.getDay() === 0;
                    const dateKey = formatDate(cell.date);
                    
                    let cellClass = "min-h-[80px] md:min-h-[96px] flex flex-col justify-between border rounded-lg p-1.5 transition-all duration-200 relative select-none hover:shadow-xs ";
                    
                    if (isCurrMonth) {
                      if (isSunday) {
                        cellClass += "bg-red-50/10 dark:bg-red-950/5 border-red-100 dark:border-red-900/20 text-foreground hover:bg-red-50/20 cursor-pointer";
                      } else {
                        cellClass += "bg-background border-border text-foreground hover:bg-muted/30 cursor-pointer";
                      }
                    } else {
                      cellClass += "bg-muted/10 border-muted text-muted-foreground/30";
                    }

                    if (isToday) {
                      cellClass += " ring-2 ring-primary ring-offset-2 dark:ring-offset-background";
                    }

                    return (
                      <div
                        key={`${dateKey}-${index}`}
                        className={cellClass}
                        onClick={() => {
                          if (isCurrMonth) {
                            setAssignDate(dateKey);
                            setAssignOpen(true);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] md:text-xs font-bold ${
                            isToday
                              ? "bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center font-bold"
                              : isSunday
                              ? "text-red-500"
                              : isCurrMonth
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          }`}>
                            {cell.date.getDate()}
                          </span>
                          {isCurrMonth && (
                            <span className="text-[9px] text-muted-foreground opacity-50 hover:opacity-100 transition-opacity font-semibold">
                              + Add
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-1 overflow-y-auto max-h-[60px] md:max-h-[80px]" onClick={(e) => e.stopPropagation()}>
                          {cell.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="group relative flex flex-col rounded px-1.5 py-0.5 text-[9px] text-white leading-tight mb-0.5 border"
                              style={{ 
                                backgroundColor: (entry as any).shift?.color ?? "#3b82f6",
                                borderColor: (entry as any).shift?.color ? `${(entry as any).shift?.color}cc` : "#3b82f6"
                              }}
                            >
                              <span className="font-semibold truncate">
                                {entry.employee.firstName} {entry.employee.lastName}
                              </span>
                              <span className="opacity-90 text-[8px] truncate">
                                {(entry as any).shift?.name} ({(entry as any).shift?.startTime}-{(entry as any).shift?.endTime})
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEntry(entry.id);
                                }}
                                className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white font-bold group-hover:flex shadow cursor-pointer text-[8px]"
                                title="Delete shift assignment"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* WEEKLY GRID TABLE VIEW */
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="w-48 p-3 text-left text-sm font-medium text-muted-foreground">Employee</th>
                    {weekDates.map((d) => (
                      <th key={formatDate(d)} className="p-3 text-center text-sm font-medium text-muted-foreground">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                        <br />
                        <span className="text-xs">{d.getDate()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b last:border-0">
                      <td className="p-3 text-sm font-medium">{emp.firstName} {emp.lastName}</td>
                      {weekDates.map((d) => {
                        const dateKey = formatDate(d);
                        const entries = scheduleMap.get(emp.id)?.get(dateKey) ?? [];
                        return (
                          <td key={dateKey} className="p-2 text-center">
                            {entries.length > 0 ? (
                              entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="group relative mx-auto mb-1 max-w-[120px] rounded px-2 py-1 text-xs text-white"
                                  style={{ backgroundColor: (entry as any).shift?.color ?? "#3b82f6" }}
                                >
                                  {(entry as any).shift?.name}
                                  <br />
                                  <span className="opacity-80">{(entry as any).shift?.startTime}-{(entry as any).shift?.endTime}</span>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex cursor-pointer"
                                  >
                                    x
                                  </button>
                                </div>
                              ))
                            ) : (
                              <button
                                onClick={() => {
                                  setAssignEmpId(emp.id);
                                  setAssignDate(dateKey);
                                  setAssignOpen(true);
                                }}
                                className="mx-auto flex h-8 w-8 items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {displayEmployees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No active employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
