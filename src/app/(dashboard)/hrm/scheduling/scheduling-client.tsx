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
  Plus, Loader2, ChevronLeft, ChevronRight, Calendar, Clock, Trash2,
} from "lucide-react";
import {
  getShifts, createShift, deleteShift,
  getScheduleEntries, createScheduleEntry, deleteScheduleEntry,
  getEmployees, createScheduleEntriesForRange,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type ShiftsData = Awaited<ReturnType<typeof getShifts>>;
type ScheduleData = Awaited<ReturnType<typeof getScheduleEntries>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;

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
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [weekRef, setWeekRef] = useState(new Date());
  const [shiftOpen, setShiftOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDate, setAssignDate] = useState("");
  const [assignEmpId, setAssignEmpId] = useState("");
  const [isPending, startTransition] = useTransition();

  const weekDates = useMemo(() => getWeekDates(weekRef), [weekRef]);

  function loadData() {
    startTransition(async () => {
      try {
        const startDate = formatDate(weekDates[0]);
        const endDate = formatDate(weekDates[6]);
        const [shiftData, schedData, empData] = await Promise.all([
          getShifts(),
          getScheduleEntries({ startDate, endDate }),
          getEmployees({ pageSize: 100 }),
        ]);
        setShifts(shiftData);
        setSchedule(schedData);
        setEmployees(empData);
      } catch {
        toast.error("Failed to load schedule data");
      }
    });
  }

  useEffect(() => { loadData(); }, [weekRef]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteShift(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base">
            <Calendar className="mr-2 inline h-4 w-4" />
            {shortDay(weekDates[0])} - {shortDay(weekDates[6])}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isPending && (
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
                                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
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
                              className="mx-auto flex h-8 w-8 items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
