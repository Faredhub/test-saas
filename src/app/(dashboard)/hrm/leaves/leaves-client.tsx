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
  getLeaveBalance,
  getEmployees,
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
  const [balances, setBalances] = useState<LeaveBalanceData>([]);
  const [balanceEmpId, setBalanceEmpId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [leaveTypeOpen, setLeaveTypeOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

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
              <div className="flex items-center justify-between">
                <CardTitle>Leave Requests</CardTitle>
                <div className="flex gap-2">
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
                  <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                    <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-4 w-4" /> New Request
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
                                    : user?.name || user?.email || "Loading..."
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
                            <Input name="startDate" type="date" required />
                          </div>
                          <div>
                            <Label>End Date *</Label>
                            <Input name="endDate" type="date" required />
                          </div>
                        </div>
                        <div>
                          <Label>Reason</Label>
                          <Textarea name="reason" rows={3} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
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
              ) : displayedRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mb-4" />
                  <p>No leave requests found</p>
                </div>
              ) : (
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
                            {req.status === "PENDING" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-green-600"
                                  onClick={() => handleApprove(req.id)}
                                  disabled={isPending}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-red-600"
                                  onClick={() => setRejectId(req.id)}
                                  disabled={isPending}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
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
                        <Upload className="h-4 w-4" /> import
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
              <div className="flex items-center justify-between">
                <CardTitle>Holiday Calendar {new Date().getFullYear()}</CardTitle>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <a href="/office/spreadsheets?template=holidays&source=hrm-leaves">
                      <Button
                        variant="outline"
                        type="button"
                        className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary px-4 py-2 text-sm font-medium animate-in fade-in zoom-in-95 duration-200"
                      >
                        <Upload className="h-4 w-4" /> Import
                      </Button>
                    </a>
                    <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
                      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                        <Plus className="h-4 w-4" /> Add Holiday
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Holiday</DialogTitle>
                        </DialogHeader>
                        <form action={handleCreateHoliday} className="space-y-4">
                          <div>
                            <Label>Holiday Name *</Label>
                            <Input name="name" required />
                          </div>
                          <div>
                            <Label>Date *</Label>
                            <Input name="date" type="date" required />
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
                          <div className="flex justify-end gap-2">
                            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
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
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
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
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600"
                                onClick={() => handleDeleteHoliday(h.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
