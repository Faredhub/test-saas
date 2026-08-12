"use client";

import { useState, useEffect, useTransition } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  CalendarDays,
  Check,
  X,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Pencil,
  Eye,
} from "lucide-react";
import {
  getLeaveRequests,
  getLeaveTypes,
  getHolidays,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  createLeaveType,
  createHoliday,
  deleteHoliday,
  updateHoliday,
  updateLeaveType,
  deleteLeaveType,
  getLeaveBalance,
  getEmployees,
  updateLeaveRequest,
  deleteLeaveRequest,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type LeaveRequestsData = Awaited<ReturnType<typeof getLeaveRequests>>;
type LeaveTypesData = Awaited<ReturnType<typeof getLeaveTypes>>;
type HolidaysData = Awaited<ReturnType<typeof getHolidays>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type LeaveBalanceData = Awaited<ReturnType<typeof getLeaveBalance>>;

const leaveStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

export function LeavesClient() {
  const { user } = useCurrentUser();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.some(
    (r) => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager"
  );

  const [requests, setRequests] = useState<LeaveRequestsData | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypesData>([]);
  const [holidays, setHolidays] = useState<HolidaysData>([]);
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [editLeaveRequest, setEditLeaveRequest] = useState<LeaveRequestsData["data"][number] | null>(null);
  const [balances, setBalances] = useState<LeaveBalanceData>([]);
  const [balanceEmpId, setBalanceEmpId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Holiday Calendar state
  const [isCalendarMode, setIsCalendarMode] = useState(true);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [prefilledHolidayDate, setPrefilledHolidayDate] = useState("");
  const [selectedHoliday, setSelectedHoliday] = useState<HolidaysData[number] | null>(null);
  const [editHoliday, setEditHoliday] = useState<HolidaysData[number] | null>(null);
  const [editLeaveType, setEditLeaveType] = useState<LeaveTypesData[number] | null>(null);
  const [viewLeaveType, setViewLeaveType] = useState<LeaveTypesData[number] | null>(null);

  // Leave Calendar state
  const [isLeaveCalendarMode, setIsLeaveCalendarMode] = useState(true);
  const [currentLeaveCalendarDate, setCurrentLeaveCalendarDate] = useState(new Date());
  const [prefilledLeaveDate, setPrefilledLeaveDate] = useState("");
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequestsData["data"][number] | null>(null);

  const [activeTab, setActiveTab] = useState("requests");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["requests", "types", "holidays", "balances"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", val);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  };



  const currentEmployee = employees?.data.find(
    (emp) => emp.email?.toLowerCase() === user?.email?.toLowerCase()
  );

  const displayedRequests = !isAdmin && currentEmployee
    ? (requests?.data.filter((r) => r.employeeId === currentEmployee.id) || [])
    : (requests?.data || []);

  useEffect(() => {
    if (!isAdmin && currentEmployee && !balanceEmpId) {
      setBalanceEmpId(currentEmployee.id);
      loadBalances(currentEmployee.id);
    }
  }, [isAdmin, currentEmployee, balanceEmpId]);

  function loadData() {
    startTransition(async () => {
      try {
        const [reqData, ltData, holData, empData] = await Promise.all([
          getLeaveRequests({
            status: statusFilter ? (statusFilter as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED") : undefined,
            pageSize: 100,
          }),
          getLeaveTypes(),
          getHolidays(),
          getEmployees({ pageSize: 100 }),
        ]);
        setRequests(reqData);
        setLeaveTypes(ltData);
        setHolidays(holData);
        setEmployees(empData);
      } catch {
        toast.error("Failed to load data");
      }
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function loadBalances(empId: string) {
    if (!empId) { setBalances([]); return; }
    startTransition(async () => {
      try {
        const bal = await getLeaveBalance(empId);
        setBalances(bal);
      } catch {
        toast.error("Failed to load balances");
      }
    });
  }

  async function handleCreateRequest(formData: FormData) {
    startTransition(async () => {
      try {
        const startDate = formData.get("startDate") as string;
        const endDate = formData.get("endDate") as string;
        const days = Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
          ) + 1
        );
        await createLeaveRequest({
          employeeId: formData.get("employeeId") as string,
          leaveTypeId: formData.get("leaveTypeId") as string,
          startDate,
          endDate,
          days,
          reason: (formData.get("reason") as string) || undefined,
        });
        toast.success("Leave request submitted");
        setRequestOpen(false);
        loadData();
      } catch {
        toast.error("Failed to submit leave request");
      }
    });
  }

  async function handleUpdateRequest(formData: FormData) {
    if (!editLeaveRequest) return;
    startTransition(async () => {
      try {
        const startDate = formData.get("startDate") as string;
        const endDate = formData.get("endDate") as string;
        const days = Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
          ) + 1
        );
        await updateLeaveRequest(editLeaveRequest.id, {
          leaveTypeId: formData.get("leaveTypeId") as string,
          startDate,
          endDate,
          days,
          reason: (formData.get("reason") as string) || undefined,
        });
        toast.success("Leave request updated");
        setEditLeaveRequest(null);
        loadData();
      } catch {
        toast.error("Failed to update leave request");
      }
    });
  }

  async function handleDeleteRequest(id: string) {
    if (!confirm("Are you sure you want to delete this leave request?")) return;
    startTransition(async () => {
      try {
        await deleteLeaveRequest(id);
        toast.success("Leave request deleted");
        loadData();
      } catch {
        toast.error("Failed to delete leave request");
      }
    });
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      try {
        await approveLeaveRequest(id);
        toast.success("Leave approved");
        loadData();
      } catch {
        toast.error("Failed to approve leave");
      }
    });
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) return;
    startTransition(async () => {
      try {
        await rejectLeaveRequest(rejectId, rejectReason);
        toast.success("Leave rejected");
        setRejectId(null);
        setRejectReason("");
        loadData();
      } catch {
        toast.error("Failed to reject leave");
      }
    });
  }

  async function handleCreateLeaveType(formData: FormData) {
    startTransition(async () => {
      try {
        await createLeaveType({
          name: formData.get("name") as string,
          code: formData.get("code") as string,
          annualQuota: Number(formData.get("annualQuota")) || 0,
          carryForward: formData.get("carryForward") === "true",
          maxCarry: Number(formData.get("maxCarry")) || 0,
          isPaid: formData.get("isPaid") !== "false",
        });
        toast.success("Leave type created");
        setLeaveTypeOpen(false);
        loadData();
      } catch {
        toast.error("Failed to create leave type");
      }
    });
  }

  async function handleUpdateLeaveType(formData: FormData) {
    if (!editLeaveType) return;
    startTransition(async () => {
      try {
        await updateLeaveType(editLeaveType.id, {
          name: formData.get("name") as string,
          code: formData.get("code") as string,
          annualQuota: Number(formData.get("annualQuota")) || 0,
          carryForward: formData.get("carryForward") === "true",
          maxCarry: Number(formData.get("maxCarry")) || 0,
          isPaid: formData.get("isPaid") !== "false",
        });
        toast.success("Leave type updated");
        setEditLeaveType(null);
        loadData();
      } catch {
        toast.error("Failed to update leave type");
      }
    });
  }

  async function handleDeleteLeaveType(id: string) {
    startTransition(async () => {
      try {
        await deleteLeaveType(id);
        toast.success("Leave type deleted");
        loadData();
      } catch {
        toast.error("Failed to delete leave type");
      }
    });
  }

  async function handleCreateHoliday(formData: FormData) {
    startTransition(async () => {
      try {
        await createHoliday({
          name: formData.get("name") as string,
          date: formData.get("date") as string,
          type: (formData.get("type") as string) || "PUBLIC",
          isOptional: formData.get("isOptional") === "true",
        });
        toast.success("Holiday added");
        setHolidayOpen(false);
        loadData();
      } catch {
        toast.error("Failed to add holiday");
      }
    });
  }

  async function handleDeleteHoliday(id: string) {
    startTransition(async () => {
      try {
        await deleteHoliday(id);
        toast.success("Holiday deleted");
        loadData();
      } catch {
        toast.error("Failed to delete holiday");
      }
    });
  }

  async function handleUpdateHoliday(formData: FormData) {
    if (!editHoliday) return;
    startTransition(async () => {
      try {
        await updateHoliday(editHoliday.id, {
          name: formData.get("name") as string,
          date: formData.get("date") as string,
          type: (formData.get("type") as string) || "PUBLIC",
          isOptional: formData.get("isOptional") === "true",
        });
        toast.success("Holiday updated");
        setEditHoliday(null);
        loadData();
      } catch {
        toast.error("Failed to update holiday");
      }
    });
  }

  // Holiday Calendar grid calculations
  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const yearsList = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentCalendarDate(new Date());
  };

  // Generate day cells for calendar month grid
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const calendarCells: Array<{
    date: Date;
    isCurrentMonth: boolean;
    holiday?: HolidaysData[number];
  }> = [];

  // Padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(calYear, calMonth - 1, totalDaysInPrevMonth - i);
    calendarCells.push({ date: d, isCurrentMonth: false });
  }

  // Days of current month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const d = new Date(calYear, calMonth, i);
    const holiday = holidays.find((h) => {
      const hDate = new Date(h.date);
      return (
        hDate.getFullYear() === d.getFullYear() &&
        hDate.getMonth() === d.getMonth() &&
        hDate.getDate() === d.getDate()
      );
    });
    calendarCells.push({ date: d, isCurrentMonth: true, holiday });
  }

  // Padding days from next month
  const nextPadding = calendarCells.length % 7 === 0 ? 0 : 7 - (calendarCells.length % 7);
  for (let i = 1; i <= nextPadding; i++) {
    const d = new Date(calYear, calMonth + 1, i);
    calendarCells.push({ date: d, isCurrentMonth: false });
  }

  // Leave Calendar grid calculations
  const leaveCalYear = currentLeaveCalendarDate.getFullYear();
  const leaveCalMonth = currentLeaveCalendarDate.getMonth();

  const handlePrevLeaveMonth = () => {
    setCurrentLeaveCalendarDate(new Date(leaveCalYear, leaveCalMonth - 1, 1));
  };

  const handleNextLeaveMonth = () => {
    setCurrentLeaveCalendarDate(new Date(leaveCalYear, leaveCalMonth + 1, 1));
  };

  const handleLeaveToday = () => {
    setCurrentLeaveCalendarDate(new Date());
  };

  const getLeaveForDate = (date: Date) => {
    if (!currentEmployee || !requests) return undefined;
    return requests.data.find((r) => {
      // Only show leaves for the logged-in user to maintain privacy: "only user 1 can see the leave date another user can't see the leave day"
      if (r.employeeId !== currentEmployee.id) return false;
      const dTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const start = new Date(r.startDate);
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const end = new Date(r.endDate);
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return dTime >= startTime && dTime <= endTime;
    });
  };

  // Generate day cells for leave calendar month grid
  const firstLeaveDayIndex = new Date(leaveCalYear, leaveCalMonth, 1).getDay();
  const totalDaysInLeaveMonth = new Date(leaveCalYear, leaveCalMonth + 1, 0).getDate();
  const totalDaysInPrevLeaveMonth = new Date(leaveCalYear, leaveCalMonth, 0).getDate();

  const leaveCalendarCells: Array<{
    date: Date;
    isCurrentMonth: boolean;
    leaveRequest?: LeaveRequestsData["data"][number];
  }> = [];

  // Padding days from previous month
  for (let i = firstLeaveDayIndex - 1; i >= 0; i--) {
    const d = new Date(leaveCalYear, leaveCalMonth - 1, totalDaysInPrevLeaveMonth - i);
    leaveCalendarCells.push({ date: d, isCurrentMonth: false });
  }

  // Days of current month
  for (let i = 1; i <= totalDaysInLeaveMonth; i++) {
    const d = new Date(leaveCalYear, leaveCalMonth, i);
    const leaveRequest = getLeaveForDate(d);
    leaveCalendarCells.push({ date: d, isCurrentMonth: true, leaveRequest });
  }

  // Padding days from next month
  const nextLeavePadding = leaveCalendarCells.length % 7 === 0 ? 0 : 7 - (leaveCalendarCells.length % 7);
  for (let i = 1; i <= nextLeavePadding; i++) {
    const d = new Date(leaveCalYear, leaveCalMonth + 1, i);
    leaveCalendarCells.push({ date: d, isCurrentMonth: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground">
          Manage leave requests, types, holidays, and balances
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="types">Leave Types</TabsTrigger>
          <TabsTrigger value="holidays">Holiday Calendar</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
        </TabsList>

        {/* LEAVE REQUESTS TAB */}
        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Leave Requests</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Track, submit, and manage employee leave requests
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex border rounded-md p-0.5 bg-muted/50 text-xs mr-2">
                    <button
                      type="button"
                      onClick={() => setIsLeaveCalendarMode(true)}
                      className={`px-3 py-1.5 rounded-sm font-medium cursor-pointer transition-all duration-200 ${
                        isLeaveCalendarMode
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLeaveCalendarMode(false)}
                      className={`px-3 py-1.5 rounded-sm font-medium cursor-pointer transition-all duration-200 ${
                        !isLeaveCalendarMode
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      List Table
                    </button>
                  </div>

                  {/* Month/Year selector shown in Calendar Mode */}
                  {isLeaveCalendarMode && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <Button variant="outline" size="sm" className="h-9 px-2 hover:bg-muted" onClick={handlePrevLeaveMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Select
                        value={leaveCalMonth.toString()}
                        onValueChange={(val) => val && setCurrentLeaveCalendarDate(new Date(leaveCalYear, parseInt(val), 1))}
                      >
                        <SelectTrigger className="h-9 w-28 text-xs font-medium">
                          {monthNames[leaveCalMonth]}
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {monthNames.map((m, idx) => (
                            <SelectItem key={m} value={idx.toString()}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={leaveCalYear.toString()}
                        onValueChange={(val) => val && setCurrentLeaveCalendarDate(new Date(parseInt(val), leaveCalMonth, 1))}
                      >
                        <SelectTrigger className="h-9 w-20 text-xs font-medium">
                          {leaveCalYear}
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {yearsList.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-9 px-2 hover:bg-muted" onClick={handleNextLeaveMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 text-xs px-2.5 font-medium hover:bg-muted" onClick={handleLeaveToday}>
                        Today
                      </Button>
                    </div>
                  )}

                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v ?? "")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Dialog open={requestOpen} onOpenChange={(o) => {
                    if (!o) setPrefilledLeaveDate("");
                    setRequestOpen(o);
                  }}>
                    <DialogTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                      <Plus className="h-3.5 w-3.5" /> New Request
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Leave Request</DialogTitle>
                      </DialogHeader>
                      <form action={handleCreateRequest} className="space-y-4">
                        <div>
                          <Label>Employee *</Label>
                          {isAdmin ? (
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
                          ) : (
                            <div className="space-y-2">
                              <Input
                                value={
                                  currentEmployee
                                    ? `${currentEmployee.firstName} ${currentEmployee.lastName ?? ""} (${currentEmployee.employeeId})`
                                    : user?.name || user?.email?.split("@")[0] || "Loading..."
                                }
                                disabled
                                className="bg-muted text-muted-foreground font-medium"
                              />
                              <input type="hidden" name="employeeId" value={currentEmployee?.id || ""} />
                            </div>
                          )}
                        </div>
                        <div>
                          <Label>Leave Type *</Label>
                          <Select name="leaveTypeId" required>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((lt) => (
                                <SelectItem key={lt.id} value={lt.id}>
                                  {lt.name} ({lt.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date *</Label>
                            <Input
                              name="startDate"
                              type="date"
                              required
                              defaultValue={prefilledLeaveDate}
                              key={`start-${prefilledLeaveDate}`}
                            />
                          </div>
                          <div>
                            <Label>End Date *</Label>
                            <Input
                              name="endDate"
                              type="date"
                              required
                              defaultValue={prefilledLeaveDate}
                              key={`end-${prefilledLeaveDate}`}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Reason</Label>
                          <Textarea name="reason" rows={3} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                            Cancel
                          </DialogClose>
                          <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!requests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : isLeaveCalendarMode ? (
                /* LEAVE CALENDAR GRID VIEW */
                <div className="space-y-4 max-w-3xl mx-auto w-full animate-in fade-in duration-200">
                  {/* Legend / Key indicators */}
                  <div className="flex flex-wrap gap-3 text-[11px] justify-end bg-muted/30 p-2 rounded-lg border border-muted-foreground/10">
                    <span className="font-semibold text-muted-foreground mr-1">Status Key:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-green-100 border border-green-300 dark:bg-green-950/40 dark:border-green-900" />
                      Approved
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-amber-100 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-900" />
                      Pending
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-red-100 border border-red-300 dark:bg-red-950/40 dark:border-red-900" />
                      Rejected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-gray-100 border border-gray-300 dark:bg-gray-950/40 dark:border-gray-900" />
                      Cancelled
                    </span>
                  </div>

                  {/* Calendar main wrapper */}
                  <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                    {/* Weekday names */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                      <div key={dayName} className={`text-center font-semibold text-[10px] md:text-xs py-1 uppercase tracking-wide select-none ${
                        dayName === "Sun" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                      }`}>
                        {dayName}
                      </div>
                    ))}

                    {/* Calendar cells */}
                    {leaveCalendarCells.map((cell, index) => {
                      const isToday = new Date().toDateString() === cell.date.toDateString();
                      const hasLeave = !!cell.leaveRequest;
                      const isCurrMonth = cell.isCurrentMonth;
                      const isSunday = cell.date.getDay() === 0;
                      
                      let cellClass = "min-h-[64px] md:min-h-[76px] flex flex-col justify-between border rounded-lg p-1.5 transition-all duration-200 relative select-none hover:shadow-xs hover:-translate-y-[1px] ";
                      
                      if (hasLeave) {
                        const status = cell.leaveRequest?.status;
                        if (status === "APPROVED") {
                          cellClass += "border-l-3 border-l-green-500 bg-green-50/70 border-green-200 text-green-900 hover:bg-green-100/90 dark:bg-green-950/15 dark:border-green-900/40 dark:text-green-300";
                        } else if (status === "PENDING") {
                          cellClass += "border-l-3 border-l-amber-500 bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/90 dark:bg-amber-950/15 dark:border-amber-900/40 dark:text-amber-300";
                        } else if (status === "REJECTED") {
                          cellClass += "border-l-3 border-l-red-500 bg-red-50/70 border-red-200 text-red-900 hover:bg-red-100/90 dark:bg-red-950/15 dark:border-red-900/40 dark:text-red-300";
                        } else {
                          cellClass += "border-l-3 border-l-gray-500 bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-gray-100/90 dark:bg-gray-950/15 dark:border-gray-900/40 dark:text-gray-300";
                        }
                      } else {
                        if (isCurrMonth) {
                          if (isSunday) {
                            cellClass += "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100/40 dark:hover:bg-red-950/20";
                          } else {
                            cellClass += "bg-background border-border text-foreground hover:bg-muted/30";
                          }
                        } else {
                          if (isSunday) {
                            cellClass += "bg-red-50/10 dark:bg-red-950/5 border-red-100/10 dark:border-red-900/10 text-red-500/30 dark:text-red-400/20";
                          } else {
                            cellClass += "bg-muted/5 border-muted-foreground/5 text-muted-foreground/30";
                          }
                        }
                      }

                      if (isToday) {
                        cellClass += " ring-2 ring-primary ring-offset-2 dark:ring-offset-background";
                      }

                      const handleCellClick = () => {
                        if (hasLeave) {
                          setSelectedLeaveRequest(cell.leaveRequest!);
                        } else if (isCurrMonth) {
                          const dateString = cell.date.toISOString().split("T")[0];
                          setPrefilledLeaveDate(dateString);
                          setRequestOpen(true);
                        }
                      };

                      return (
                        <div
                          key={index}
                          onClick={handleCellClick}
                          className={`${cellClass} ${
                            isCurrMonth ? "cursor-pointer" : "cursor-default"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] md:text-xs font-bold ${
                              isToday
                                ? "bg-primary text-primary-foreground h-5 w-5 flex items-center justify-center rounded-full text-[9px]"
                                : isSunday
                                ? "text-red-500 dark:text-red-400"
                                : ""
                            }`}>
                              {cell.date.getDate()}
                            </span>
                            {hasLeave && (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          {hasLeave && (
                            <div className="mt-0.5 text-[9px] md:text-[10px] font-bold leading-none">
                              {cell.leaveRequest?.leaveType.code}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary / Stats footer */}
                  <div className="grid gap-4 sm:grid-cols-3 bg-muted/20 p-4 rounded-xl border border-muted">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Month Overview</span>
                      <p className="text-xl font-bold text-foreground">
                        {leaveCalendarCells.filter(c => c.isCurrentMonth && c.leaveRequest).length} Leave Day(s)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Year Total ({leaveCalYear})</span>
                      <p className="text-xl font-bold text-foreground">
                        {requests?.data.filter(r => r.employeeId === currentEmployee?.id && new Date(r.startDate).getFullYear() === leaveCalYear).length} Leave(s)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Calendar Instructions</span>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Click on any empty working day in the current month to quickly apply for leave. Click on a colored leave cell to see its details.
                      </p>
                    </div>
                  </div>
                </div>
              ) : displayedRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mb-4" />
                  <p>No leave requests found</p>
                </div>
              ) : (
                /* ORIGINAL LIST TABLE VIEW */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.employee.firstName} {req.employee.lastName ?? ""}
                          <br />
                          <span className="text-xs text-muted-foreground">{req.employee.employeeId}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{req.leaveType.code}</Badge>
                        </TableCell>
                        <TableCell>{new Date(req.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(req.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{Number(req.days)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.reason ?? "-"}</TableCell>
                        <TableCell>
                          <Badge className={leaveStatusColors[req.status] ?? ""}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* View button (Blue) */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                                onClick={() => setSelectedLeaveRequest(req)}
                                disabled={isPending}
                                type="button"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {/* Edit button (Black) */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-900 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-100 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
                                onClick={() => setEditLeaveRequest(req)}
                                disabled={isPending}
                                type="button"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete button (Red) */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                onClick={() => handleDeleteRequest(req.id)}
                                disabled={isPending}
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>

                              {req.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => handleApprove(req.id)}
                                    disabled={isPending}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => setRejectId(req.id)}
                                    disabled={isPending}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Reject Dialog */}
          <Dialog open={!!rejectId} onOpenChange={(o) => { if (!o) { setRejectId(null); setRejectReason(""); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Leave Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Reason for rejection *</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                  <Button variant="destructive" onClick={handleReject} disabled={isPending || !rejectReason.trim()}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reject
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Leave Request Details Dialog */}
          <Dialog open={!!selectedLeaveRequest} onOpenChange={(open) => !open && setSelectedLeaveRequest(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Leave Request Details</DialogTitle>
              </DialogHeader>
              {selectedLeaveRequest && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-semibold text-base text-foreground">
                      {selectedLeaveRequest.employee.firstName} {selectedLeaveRequest.employee.lastName ?? ""}
                    </span>
                    <Badge className={leaveStatusColors[selectedLeaveRequest.status] ?? ""}>
                      {selectedLeaveRequest.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                    <span className="text-muted-foreground">Leave Type:</span>
                    <span className="font-medium text-foreground">{selectedLeaveRequest.leaveType.name} ({selectedLeaveRequest.leaveType.code})</span>
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium text-foreground">{new Date(selectedLeaveRequest.startDate).toLocaleDateString()}</span>
                    <span className="text-muted-foreground">To:</span>
                    <span className="font-medium text-foreground">{new Date(selectedLeaveRequest.endDate).toLocaleDateString()}</span>
                    <span className="text-muted-foreground">Total Days:</span>
                    <span className="font-medium text-foreground">{Number(selectedLeaveRequest.days)} {Number(selectedLeaveRequest.days) === 1 ? "day" : "days"}</span>
                    <span className="text-muted-foreground">Reason:</span>
                    <span className="font-medium text-foreground whitespace-pre-wrap">{selectedLeaveRequest.reason ?? "-"}</span>
                  </div>
                  <div className="flex justify-end pt-2 border-t mt-2">
                    <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                      Close
                    </DialogClose>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Leave Request Dialog */}
          <Dialog open={!!editLeaveRequest} onOpenChange={(o) => !o && setEditLeaveRequest(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Leave Request</DialogTitle>
              </DialogHeader>
              {editLeaveRequest && (
                <form action={handleUpdateRequest} className="space-y-4">
                  <div>
                    <Label>Employee *</Label>
                    <Input
                      value={`${editLeaveRequest.employee.firstName} ${editLeaveRequest.employee.lastName ?? ""} (${editLeaveRequest.employee.employeeId})`}
                      disabled
                      className="bg-muted text-muted-foreground font-medium"
                    />
                    <input type="hidden" name="employeeId" value={editLeaveRequest.employee.id} />
                  </div>
                  <div>
                    <Label>Leave Type *</Label>
                    <Select name="leaveTypeId" defaultValue={editLeaveRequest.leaveTypeId} required>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((lt) => (
                          <SelectItem key={lt.id} value={lt.id}>
                            {lt.name} ({lt.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <Input
                        name="startDate"
                        type="date"
                        required
                        defaultValue={new Date(editLeaveRequest.startDate).toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <Input
                        name="endDate"
                        type="date"
                        required
                        defaultValue={new Date(editLeaveRequest.endDate).toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea name="reason" rows={3} defaultValue={editLeaveRequest.reason ?? ""} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditLeaveRequest(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

        </TabsContent>

        {/* LEAVE TYPES TAB */}
        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Leave Types</CardTitle>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <a href="/office/spreadsheets?template=leave-types&source=hrm-leaves">
                      <Button
                        variant="outline"
                        type="button"
                        className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary px-4 py-2 text-sm font-medium"
                      >
                        <Upload className="h-4 w-4" /> Bulk Upload
                      </Button>
                    </a>
                    <Dialog open={leaveTypeOpen} onOpenChange={setLeaveTypeOpen}>
                      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4" /> Add Leave Type
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Leave Type</DialogTitle>
                        </DialogHeader>
                        <form action={handleCreateLeaveType} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Name *</Label>
                              <Input name="name" placeholder="e.g. Casual Leave" required />
                            </div>
                            <div>
                              <Label>Code *</Label>
                              <Input name="code" placeholder="e.g. CL" required />
                            </div>
                            <div>
                              <Label>Annual Quota</Label>
                              <Input name="annualQuota" type="number" defaultValue={12} min={0} />
                            </div>
                            <div>
                              <Label>Max Carry Forward</Label>
                              <Input name="maxCarry" type="number" defaultValue={0} min={0} />
                            </div>
                            <div>
                              <Label>Carry Forward</Label>
                              <Select name="carryForward" defaultValue="false">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Paid Leave</Label>
                              <Select name="isPaid" defaultValue="true">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                            <Button type="submit" disabled={isPending}>
                              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {leaveTypes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No leave types configured</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Annual Quota</TableHead>
                      <TableHead>Carry Forward</TableHead>
                      <TableHead>Max Carry</TableHead>
                      <TableHead>Paid</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.map((lt) => (
                      <TableRow key={lt.id}>
                        <TableCell className="font-medium">{lt.name}</TableCell>
                        <TableCell><Badge variant="outline">{lt.code}</Badge></TableCell>
                        <TableCell>{lt.annualQuota} days</TableCell>
                        <TableCell>{lt.carryForward ? "Yes" : "No"}</TableCell>
                        <TableCell>{lt.maxCarry} days</TableCell>
                        <TableCell>
                          <Badge className={lt.isPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {lt.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                                onClick={() => setViewLeaveType(lt)}
                                type="button"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-900 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                onClick={() => setEditLeaveType(lt)}
                                disabled={isPending}
                                type="button"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                onClick={() => handleDeleteLeaveType(lt.id)}
                                disabled={isPending}
                                type="button"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOLIDAYS TAB */}
        <TabsContent value="holidays" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Holiday Calendar {calYear}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage and announce company holidays for the year
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex border rounded-md p-0.5 bg-muted/50 text-xs mr-2">
                    <button
                      type="button"
                      onClick={() => setIsCalendarMode(true)}
                      className={`px-3 py-1.5 rounded-sm font-medium cursor-pointer transition-all duration-200 ${
                        isCalendarMode
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCalendarMode(false)}
                      className={`px-3 py-1.5 rounded-sm font-medium cursor-pointer transition-all duration-200 ${
                        !isCalendarMode
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      List Table
                    </button>
                  </div>

                  {/* Month/Year selector shown in Calendar Mode */}
                  {isCalendarMode && (
                    <div className="flex items-center gap-1.5 mr-2">
                      <Button variant="outline" size="sm" className="h-9 px-2 hover:bg-muted" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Select
                        value={calMonth.toString()}
                        onValueChange={(val) => val && setCurrentCalendarDate(new Date(calYear, parseInt(val), 1))}
                      >
                        <SelectTrigger className="h-9 w-28 text-xs font-medium">
                          {monthNames[calMonth]}
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {monthNames.map((m, idx) => (
                            <SelectItem key={m} value={idx.toString()}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={calYear.toString()}
                        onValueChange={(val) => val && setCurrentCalendarDate(new Date(parseInt(val), calMonth, 1))}
                      >
                        <SelectTrigger className="h-9 w-20 text-xs font-medium">
                          {calYear}
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {yearsList.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-9 px-2 hover:bg-muted" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 text-xs px-2.5 font-medium hover:bg-muted" onClick={handleToday}>
                        Today
                      </Button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <a href="/office/spreadsheets?template=holidays&source=hrm-leaves">
                        <Button
                          variant="outline"
                          type="button"
                          className="h-9 flex items-center gap-1.5 cursor-pointer border-primary/20 text-primary text-xs hover:bg-primary/5 transition-all duration-200"
                        >
                          <Upload className="h-3.5 w-3.5" /> Bulk Upload
                        </Button>
                      </a>
                      <Dialog open={holidayOpen} onOpenChange={(open) => {
                        if (!open) setPrefilledHolidayDate("");
                        setHolidayOpen(open);
                      }}>
                        <DialogTrigger className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                          <Plus className="h-3.5 w-3.5" /> Add Holiday
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Holiday</DialogTitle>
                          </DialogHeader>
                          <form action={handleCreateHoliday} className="space-y-4">
                            <div>
                              <Label>Holiday Name *</Label>
                              <Input name="name" required placeholder="e.g. Christmas Day" />
                            </div>
                            <div>
                              <Label>Date *</Label>
                              <Input
                                name="date"
                                type="date"
                                required
                                defaultValue={prefilledHolidayDate}
                                key={prefilledHolidayDate}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Type</Label>
                                <Select name="type" defaultValue="PUBLIC">
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PUBLIC">Public</SelectItem>
                                    <SelectItem value="COMPANY">Company</SelectItem>
                                    <SelectItem value="OPTIONAL">Optional</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Optional</Label>
                                <Select name="isOptional" defaultValue="false">
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="false">No</SelectItem>
                                    <SelectItem value="true">Yes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                                Cancel
                              </DialogClose>
                              <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Holiday
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isCalendarMode ? (
                /* CALENDAR GRID VIEW */
                <div className="space-y-4 max-w-3xl mx-auto w-full">
                  {/* Legend / Key indicators */}
                  <div className="flex flex-wrap gap-3 text-[11px] justify-end bg-muted/30 p-2 rounded-lg border border-muted-foreground/10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="font-semibold text-muted-foreground mr-1">Holidays Key:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-red-100 border border-red-300 dark:bg-red-950/40 dark:border-red-900" />
                      Public Holiday
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-blue-100 border border-blue-300 dark:bg-blue-950/40 dark:border-blue-900" />
                      Company Holiday
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900" />
                      Optional Holiday
                    </span>
                  </div>

                  {/* Calendar main wrapper */}
                  <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                    {/* Weekday names */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                      <div key={dayName} className={`text-center font-semibold text-[10px] md:text-xs py-1 uppercase tracking-wide select-none ${
                        dayName === "Sun" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                      }`}>
                        {dayName}
                      </div>
                    ))}

                    {/* Calendar cells */}
                    {calendarCells.map((cell, index) => {
                      const isToday = new Date().toDateString() === cell.date.toDateString();
                      const hasHoliday = !!cell.holiday;
                      const isCurrMonth = cell.isCurrentMonth;
                      const isSunday = cell.date.getDay() === 0;
                      
                      let cellClass = "min-h-[64px] md:min-h-[76px] flex flex-col justify-between border rounded-lg p-1.5 transition-all duration-200 relative select-none hover:shadow-xs hover:-translate-y-[1px] ";
                      
                      if (hasHoliday) {
                        const type = cell.holiday?.type;
                        if (type === "PUBLIC") {
                          cellClass += "border-l-3 border-l-red-500 bg-red-50/70 border-red-200 text-red-900 hover:bg-red-100/90 dark:bg-red-950/15 dark:border-red-900/40 dark:text-red-300";
                        } else if (type === "COMPANY") {
                          cellClass += "border-l-3 border-l-blue-500 bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100/90 dark:bg-blue-950/15 dark:border-blue-900/40 dark:text-blue-300";
                        } else {
                          cellClass += "border-l-3 border-l-emerald-500 bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/90 dark:bg-emerald-950/15 dark:border-emerald-900/40 dark:text-emerald-300";
                        }
                      } else {
                        if (isCurrMonth) {
                          if (isSunday) {
                            cellClass += "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100/40 dark:hover:bg-red-950/20";
                          } else {
                            cellClass += "bg-background border-border text-foreground hover:bg-muted/30";
                          }
                        } else {
                          if (isSunday) {
                            cellClass += "bg-red-50/10 dark:bg-red-950/5 border-red-100/10 dark:border-red-900/10 text-red-500/30 dark:text-red-400/20";
                          } else {
                            cellClass += "bg-muted/5 border-muted-foreground/5 text-muted-foreground/30";
                          }
                        }
                      }

                      if (isToday) {
                        cellClass += " ring-2 ring-primary ring-offset-2 dark:ring-offset-background";
                      }

                      const handleCellClick = () => {
                        if (hasHoliday) {
                          setSelectedHoliday(cell.holiday!);
                        } else if (isAdmin && isCurrMonth) {
                          const dateString = cell.date.toISOString().split("T")[0];
                          setPrefilledHolidayDate(dateString);
                          setHolidayOpen(true);
                        }
                      };

                      return (
                        <div
                          key={index}
                          onClick={handleCellClick}
                          className={`${cellClass} ${
                            (hasHoliday || (isAdmin && isCurrMonth)) ? "cursor-pointer" : "cursor-default"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-[10px] md:text-xs font-bold ${
                              isToday
                                ? "bg-primary text-primary-foreground h-5 w-5 flex items-center justify-center rounded-full text-[9px]"
                                : isSunday
                                ? "text-red-500 dark:text-red-400"
                                : ""
                            }`}>
                              {cell.date.getDate()}
                            </span>
                            {hasHoliday && (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          {hasHoliday && (
                            <div className="mt-0.5 text-[9px] md:text-[10px] font-medium leading-none line-clamp-1 md:line-clamp-2">
                              {cell.holiday?.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary / Stats footer */}
                  <div className="grid gap-4 sm:grid-cols-3 bg-muted/20 p-4 rounded-xl border border-muted">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Month Overview</span>
                      <p className="text-xl font-bold text-foreground">
                        {calendarCells.filter(c => c.isCurrentMonth && c.holiday).length} Holiday(s)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Year Total ({calYear})</span>
                      <p className="text-xl font-bold text-foreground">
                        {holidays.filter(h => new Date(h.date).getFullYear() === calYear).length} Holiday(s)
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Month Focus</span>
                      <p className="text-xs text-muted-foreground leading-normal">
                        {isAdmin
                          ? "HR Admin: Click on any empty cell to quickly announce a new holiday."
                          : "Holidays are highlighted. Hover or click to view holiday details."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ORIGINAL LIST TABLE VIEW WITH EDIT AND DELETE ACTIONS */
                holidays.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No holidays configured</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Holiday Name</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Optional</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map((h) => {
                        const d = new Date(h.date);
                        return (
                          <TableRow key={h.id}>
                            <TableCell>{d.toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{h.name}</TableCell>
                            <TableCell>{d.toLocaleDateString("en-US", { weekday: "long" })}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{h.type}</Badge>
                            </TableCell>
                            <TableCell>{h.isOptional ? "Yes" : "No"}</TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-900 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    onClick={() => setEditHoliday(h)}
                                    disabled={isPending}
                                    type="button"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                    onClick={() => handleDeleteHoliday(h.id)}
                                    disabled={isPending}
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )
              )}
            </CardContent>
          </Card>

          {/* Holiday Details Dialog */}
          <Dialog open={!!selectedHoliday} onOpenChange={(open) => !open && setSelectedHoliday(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Holiday Details</DialogTitle>
              </DialogHeader>
              {selectedHoliday && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-semibold text-base text-foreground">{selectedHoliday.name}</span>
                    <Badge variant={selectedHoliday.type === "PUBLIC" ? "destructive" : selectedHoliday.type === "COMPANY" ? "default" : "secondary"}>
                      {selectedHoliday.type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-foreground">{new Date(selectedHoliday.date).toLocaleDateString("en-US", { dateStyle: "long" })}</span>
                    <span className="text-muted-foreground">Day:</span>
                    <span className="font-medium text-foreground">{new Date(selectedHoliday.date).toLocaleDateString("en-US", { weekday: "long" })}</span>
                    <span className="text-muted-foreground">Optional:</span>
                    <span className="font-medium text-foreground">{selectedHoliday.isOptional ? "Yes" : "No"}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 h-9 text-xs"
                        onClick={() => {
                          setEditHoliday(selectedHoliday);
                          setSelectedHoliday(null);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit Holiday
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex items-center gap-2 h-9 text-xs"
                        disabled={isPending}
                        onClick={() => {
                          handleDeleteHoliday(selectedHoliday.id);
                          setSelectedHoliday(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Holiday
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Holiday Dialog */}
          <Dialog open={!!editHoliday} onOpenChange={(open) => !open && setEditHoliday(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Holiday</DialogTitle>
              </DialogHeader>
              {editHoliday && (
                <form action={handleUpdateHoliday} className="space-y-4">
                  <div>
                    <Label>Holiday Name *</Label>
                    <Input name="name" defaultValue={editHoliday.name} required />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      name="date"
                      type="date"
                      required
                      defaultValue={new Date(editHoliday.date).toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select name="type" defaultValue={editHoliday.type}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PUBLIC">Public</SelectItem>
                          <SelectItem value="COMPANY">Company</SelectItem>
                          <SelectItem value="OPTIONAL">Optional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Optional</Label>
                      <Select name="isOptional" defaultValue={editHoliday.isOptional ? "true" : "false"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* LEAVE BALANCES TAB */}
        <TabsContent value="balances" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle>Leave Balances</CardTitle>
                {isAdmin ? (
                  <Select
                    value={balanceEmpId}
                    onValueChange={(v) => {
                      if (!v) return;
                      setBalanceEmpId(v);
                      loadBalances(v);
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.data.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName ?? ""} ({e.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="text-sm px-3 py-1 font-medium">
                    {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName ?? ""} (${currentEmployee.employeeId})` : "Loading..."}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!balanceEmpId ? (
                <p className="text-center text-muted-foreground py-8">
                  Select an employee to view leave balances
                </p>
              ) : balances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No leave types configured
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {balances.map((b) => (
                    <Card key={b.leaveTypeId}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{b.leaveTypeName}</p>
                          <Badge variant="outline">{b.leaveTypeCode}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Annual Quota</span>
                            <span className="font-medium">{b.annualQuota}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Used</span>
                            <span className="font-medium text-red-600">{b.used}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pending</span>
                            <span className="font-medium text-amber-600">{b.pending}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span className="text-muted-foreground">Remaining</span>
                            <span className="font-bold text-green-600">{b.remaining}</span>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, (b.used / Math.max(b.annualQuota, 1)) * 100)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Leave Type Dialog */}
      <Dialog open={!!editLeaveType} onOpenChange={(open) => !open && setEditLeaveType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
          </DialogHeader>
          {editLeaveType && (
            <form key={editLeaveType.id} action={handleUpdateLeaveType} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input name="name" defaultValue={editLeaveType.name} placeholder="e.g. Casual Leave" required />
                </div>
                <div>
                  <Label>Code *</Label>
                  <Input name="code" defaultValue={editLeaveType.code} placeholder="e.g. CL" required />
                </div>
                <div>
                  <Label>Annual Quota</Label>
                  <Input name="annualQuota" type="number" defaultValue={editLeaveType.annualQuota} min={0} />
                </div>
                <div>
                  <Label>Max Carry Forward</Label>
                  <Input name="maxCarry" type="number" defaultValue={editLeaveType.maxCarry} min={0} />
                </div>
                <div>
                  <Label>Carry Forward</Label>
                  <Select name="carryForward" defaultValue={editLeaveType.carryForward ? "true" : "false"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Paid Leave</Label>
                  <Select name="isPaid" defaultValue={editLeaveType.isPaid ? "true" : "false"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditLeaveType(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Leave Type Dialog */}
      <Dialog open={!!viewLeaveType} onOpenChange={(open) => !open && setViewLeaveType(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Leave Type Details</DialogTitle>
          </DialogHeader>
          {viewLeaveType && (
            <div key={viewLeaveType.id} className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-semibold text-base text-foreground">
                  {viewLeaveType.name}
                </span>
                <Badge className={viewLeaveType.isPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                  {viewLeaveType.isPaid ? "Paid Leave" : "Unpaid Leave"}
                </Badge>
              </div>
              <div className="grid grid-cols-[130px_1fr] gap-y-2.5 text-sm">
                <span className="text-muted-foreground">Code:</span>
                <span className="font-medium text-foreground">{viewLeaveType.code}</span>
                <span className="text-muted-foreground">Annual Quota:</span>
                <span className="font-medium text-foreground">{viewLeaveType.annualQuota} {viewLeaveType.annualQuota === 1 ? "day" : "days"}</span>
                <span className="text-muted-foreground">Carry Forward:</span>
                <span className="font-medium text-foreground">{viewLeaveType.carryForward ? "Yes" : "No"}</span>
                <span className="text-muted-foreground">Max Carry Forward:</span>
                <span className="font-medium text-foreground">{viewLeaveType.maxCarry} {viewLeaveType.maxCarry === 1 ? "day" : "days"}</span>
              </div>
              <div className="flex justify-end pt-2 border-t mt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
