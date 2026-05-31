"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Clock,
  Loader2,
  LogIn,
  LogOut,
  BarChart3,
} from "lucide-react";
import {
  getAttendance,
  clockIn,
  clockOut,
  getAttendanceReport,
  getEmployees,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type AttendanceData = Awaited<ReturnType<typeof getAttendance>>;
type ReportData = Awaited<ReturnType<typeof getAttendanceReport>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;

const attendanceStatusColors: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  ABSENT: "bg-red-100 text-red-700",
  HALF_DAY: "bg-amber-100 text-amber-700",
  LATE: "bg-orange-100 text-orange-700",
  ON_LEAVE: "bg-blue-100 text-blue-700",
  HOLIDAY: "bg-purple-100 text-purple-700",
  WEEK_OFF: "bg-gray-100 text-gray-700",
};

export function AttendanceClient() {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadData() {
    startTransition(async () => {
      try {
        const [attData, empData] = await Promise.all([
          getAttendance({
            employeeId: selectedEmployee || undefined,
            startDate: dateRange.start,
            endDate: dateRange.end,
            pageSize: 100,
          }),
          getEmployees({ pageSize: 100, status: "ACTIVE" }),
        ]);
        setAttendance(attData);
        setEmployees(empData);
      } catch {
        toast.error("Failed to load attendance");
      }
    });
  }

  function loadReport() {
    startTransition(async () => {
      try {
        const rpt = await getAttendanceReport(reportMonth, reportYear, selectedEmployee || undefined);
        setReport(rpt);
      } catch {
        toast.error("Failed to load report");
      }
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClockIn(formData: FormData) {
    startTransition(async () => {
      try {
        const empId = formData.get("employeeId") as string;
        const location = (formData.get("location") as string) || undefined;
        await clockIn(empId, location);
        toast.success("Clocked in successfully");
        setClockInOpen(false);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to clock in");
      }
    });
  }

  async function handleClockOut(formData: FormData) {
    startTransition(async () => {
      try {
        const empId = formData.get("employeeId") as string;
        await clockOut(empId);
        toast.success("Clocked out successfully");
        setClockOutOpen(false);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to clock out");
      }
    });
  }

  // Today stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = attendance?.data.filter(
    (a) => new Date(a.date).toISOString().slice(0, 10) === todayStr
  ) ?? [];
  const presentToday = todayRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const lateToday = todayRecords.filter((a) => a.status === "LATE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Tracking</h1>
          <p className="text-muted-foreground">
            Track employee attendance, clock in/out, and view reports
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={clockInOpen} onOpenChange={setClockInOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              <LogIn className="h-4 w-4" /> Clock In
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clock In</DialogTitle>
              </DialogHeader>
              <form action={handleClockIn} className="space-y-4">
                <div>
                  <Label>Employee *</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.data.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName ?? ""} ({e.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location (optional)</Label>
                  <Input name="location" placeholder="e.g. Office, Remote" />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Clock In
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <LogOut className="h-4 w-4" /> Clock Out
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clock Out</DialogTitle>
              </DialogHeader>
              <form action={handleClockOut} className="space-y-4">
                <div>
                  <Label>Employee *</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.data.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName ?? ""} ({e.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Clock Out
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Today's stats cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Present Today</p>
            <p className="text-3xl font-bold mt-1">{presentToday}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Late Today</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{lateToday}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Employees</p>
            <p className="text-3xl font-bold mt-1">{employees?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Attendance Rate</p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              {employees?.total ? Math.round((presentToday / employees.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
          <TabsTrigger value="report">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={selectedEmployee} onValueChange={(v) => setSelectedEmployee(v === "all" ? "" : v ?? "")}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees?.data.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-40"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-40"
                />
                <Button variant="outline" onClick={loadData} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Filter"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!attendance ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : attendance.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4" />
                  <p>No attendance records found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.data.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">
                          {rec.employee.firstName} {rec.employee.lastName ?? ""}
                          <br />
                          <span className="text-xs text-muted-foreground">{rec.employee.employeeId}</span>
                        </TableCell>
                        <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </TableCell>
                        <TableCell>
                          {rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </TableCell>
                        <TableCell>{rec.totalHours ? `${Number(rec.totalHours).toFixed(1)}h` : "-"}</TableCell>
                        <TableCell>
                          {rec.overtime && Number(rec.overtime) > 0 ? (
                            <span className="text-blue-600">{Number(rec.overtime).toFixed(1)}h</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={attendanceStatusColors[rec.status] ?? ""}>
                            {rec.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{rec.location ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle>Monthly Attendance Report</CardTitle>
                <Select value={String(reportMonth)} onValueChange={(v: string | null) => v && setReportMonth(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {new Date(2000, i).toLocaleString("en-US", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(reportYear)} onValueChange={(v: string | null) => v && setReportYear(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadReport} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                  Generate Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!report ? (
                <p className="text-center text-muted-foreground py-8">
                  Select month and year, then click Generate Report
                </p>
              ) : report.summary.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No attendance data found for this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Half Day</TableHead>
                      <TableHead>On Leave</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.summary.map((row) => (
                      <TableRow key={row.employee.id}>
                        <TableCell className="font-medium">
                          {row.employee.firstName} {row.employee.lastName ?? ""}
                          <br />
                          <span className="text-xs text-muted-foreground">{row.employee.employeeId}</span>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">{row.present}</TableCell>
                        <TableCell className="text-orange-600">{row.late}</TableCell>
                        <TableCell className="text-amber-600">{row.halfDay}</TableCell>
                        <TableCell className="text-blue-600">{row.onLeave}</TableCell>
                        <TableCell className="text-red-600">{row.absent}</TableCell>
                        <TableCell>{row.totalHours.toFixed(1)}h</TableCell>
                        <TableCell>
                          {row.overtime > 0 ? (
                            <span className="text-blue-600">{row.overtime.toFixed(1)}h</span>
                          ) : (
                            "-"
                          )}
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
