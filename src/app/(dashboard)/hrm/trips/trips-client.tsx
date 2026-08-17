"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Route,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  User,
  ArrowRight,
  Briefcase,
  AlertCircle,
  Plane,
} from "lucide-react";
import {
  createTrip,
  updateTrip,
  updateTripStatus,
  deleteTrip,
  getTrips,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type TripItem = Awaited<ReturnType<typeof getTrips>>["data"][number];

interface TripsClientProps {
  initialTrips: TripItem[];
  employees: { id: string; firstName: string; lastName?: string | null }[];
  vehicles: { id: string; registrationNo: string; make?: string | null; model?: string | null }[];
  projects: { id: string; name: string; code?: string | null }[];
}

export function TripsClient({
  initialTrips,
  employees,
  vehicles,
  projects,
}: TripsClientProps) {
  const [trips, setTrips] = useState<TripItem[]>(initialTrips);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTripItem, setEditTripItem] = useState<TripItem | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const empList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const vehList = useMemo(() => (Array.isArray(vehicles) ? vehicles : []), [vehicles]);
  const projList = useMemo(() => (Array.isArray(projects) ? projects : []), [projects]);

  // Refresh trips data from backend
  const refreshData = () => {
    startTransition(async () => {
      try {
        const res = await getTrips({ pageSize: 100 });
        setTrips(res.data);
      } catch {
        toast.error("Failed to refresh trip requests");
      }
    });
  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const q = search.toLowerCase().trim();
      const empName = t.employee ? `${t.employee.firstName} ${t.employee.lastName}`.toLowerCase() : "";
      const matchSearch =
        !q ||
        t.purpose.toLowerCase().includes(q) ||
        t.startLocation.toLowerCase().includes(q) ||
        t.endLocation.toLowerCase().includes(q) ||
        empName.includes(q);

      return matchStatus && matchSearch;
    });
  }, [trips, statusFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = trips.length;
    const pending = trips.filter((t) => t.status === "PENDING").length;
    const approved = trips.filter((t) => t.status === "APPROVED" || t.status === "IN_PROGRESS").length;
    const completed = trips.filter((t) => t.status === "COMPLETED").length;
    const totalCost = trips.reduce((acc, t) => acc + (t.allocatedCost || 0), 0);
    return { total, pending, approved, completed, totalCost };
  }, [trips]);

  // Handle Form Actions
  async function handleCreate(formData: FormData) {
    const purpose = formData.get("purpose") as string;
    const startLocation = formData.get("startLocation") as string;
    const endLocation = formData.get("endLocation") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const employeeId = formData.get("employeeId") as string;
    const vehicleId = formData.get("vehicleId") as string;
    const projectId = formData.get("projectId") as string;
    const estimatedCost = Number(formData.get("estimatedCost")) || 0;

    if (!purpose || !startLocation || !endLocation || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createTrip({
          purpose,
          startLocation,
          endLocation,
          startDate,
          endDate,
          employeeId: employeeId || undefined,
          vehicleId: vehicleId || undefined,
          projectId: projectId || undefined,
          allocatedCost: estimatedCost || undefined,
        });

        if (res.success) {
          toast.success("Trip request submitted successfully!");
          setCreateOpen(false);
          refreshData();
        } else {
          toast.error("Failed to create trip request");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to submit trip request");
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editTripItem) return;

    const purpose = formData.get("purpose") as string;
    const startLocation = formData.get("startLocation") as string;
    const endLocation = formData.get("endLocation") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const employeeId = formData.get("employeeId") as string;
    const vehicleId = formData.get("vehicleId") as string;
    const projectId = formData.get("projectId") as string;
    const estimatedCost = Number(formData.get("estimatedCost")) || 0;

    startTransition(async () => {
      try {
        const res = await updateTrip(editTripItem.id, {
          purpose,
          startLocation,
          endLocation,
          startDate,
          endDate,
          employeeId: employeeId || null,
          vehicleId: vehicleId || null,
          projectId: projectId || null,
          allocatedCost: estimatedCost || null,
        });

        if (res.success) {
          toast.success("Trip request details updated");
          setEditTripItem(null);
          refreshData();
        } else {
          toast.error(res.error || "Failed to update trip request");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update trip request");
      }
    });
  }

  async function handleStatusChange(tripId: string, status: string) {
    startTransition(async () => {
      try {
        const res = await updateTripStatus(tripId, status);
        if (res.success) {
          toast.success(`Trip request status updated to ${status}`);
          refreshData();
        } else {
          toast.error(res.error || "Status update failed");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update status");
      }
    });
  }

  async function handleDeleteConfirm() {
    if (!deleteTripId) return;
    startTransition(async () => {
      try {
        const res = await deleteTrip(deleteTripId);
        if (res.success) {
          toast.success("Trip request deleted successfully");
          setDeleteTripId(null);
          refreshData();
        } else {
          toast.error(res.error || "Failed to delete trip request");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete trip request");
      }
    });
  }

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" /> Employee Trip Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage employee travel requisitions, business trip approvals, and travel expense budgets.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Create Trip Request
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-primary" /> New Employee Trip Requisition
              </DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4 pt-2">
              <div>
                <Label>Trip Purpose & Business Reason *</Label>
                <Input
                  name="purpose"
                  placeholder="e.g. Client Onboarding Meeting & Site Visit"
                  required
                />
              </div>

              <div>
                <Label>Employee *</Label>
                <Select name="employeeId" required>
                  <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                  <SelectContent>
                    {empList.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Location (From) *</Label>
                  <Input name="startLocation" placeholder="e.g. Mumbai HQ" required />
                </div>
                <div>
                  <Label>Destination (To) *</Label>
                  <Input name="endLocation" placeholder="e.g. Delhi Office" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Departure Date *</Label>
                  <Input name="startDate" type="date" required />
                </div>
                <div>
                  <Label>Return Date *</Label>
                  <Input name="endDate" type="date" required />
                </div>
                <div>
                  <Label>Estimated Budget (₹)</Label>
                  <Input name="estimatedCost" type="number" placeholder="15000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Project / Client Allocation (Optional)</Label>
                  <Select name="projectId">
                    <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                    <SelectContent>
                      {projList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Company Vehicle (If Applicable)</Label>
                  <Select name="vehicleId">
                    <SelectTrigger><SelectValue placeholder="Select Fleet Vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehList.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.make} {v.model} ({v.registrationNo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Requisition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Requests</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pending HR Approval</p>
            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Approved Requests</p>
            <p className="text-xl font-bold text-emerald-600">{stats.approved}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-3 bg-green-500/10 text-green-700 rounded-lg">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Completed Trips</p>
            <p className="text-xl font-bold">{stats.completed}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 text-violet-600 rounded-lg">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Travel Budget</p>
            <p className="text-xl font-bold">₹{stats.totalCost.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request purpose, employee, location..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Status:</span>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "")}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="All Requests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Requisitions</SelectItem>
                <SelectItem value="PENDING">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Trips Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground text-left text-xs font-semibold">
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Requisition & Purpose</th>
                <th className="p-3.5">Route</th>
                <th className="p-3.5">Travel Dates</th>
                <th className="p-3.5">Estimated Budget</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-muted/30 transition-colors">
                  {/* Employee */}
                  <td className="p-3.5 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {trip.employee?.firstName?.[0] || <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-xs">
                          {trip.employee ? `${trip.employee.firstName} ${trip.employee.lastName}` : "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Requisition & Purpose */}
                  <td className="p-3.5">
                    <p className="font-semibold text-foreground text-xs">{trip.purpose}</p>
                    {trip.project && (
                      <Badge variant="outline" className="text-[10px] mt-1 border-blue-200 text-blue-600 bg-blue-50/50">
                        {trip.project.name}
                      </Badge>
                    )}
                  </td>

                  {/* Route */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-foreground">{trip.startLocation}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground">{trip.endLocation}</span>
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </span>
                    </div>
                  </td>

                  {/* Budget / Cost */}
                  <td className="p-3.5 text-xs font-semibold text-slate-800">
                    {trip.allocatedCost ? `₹${trip.allocatedCost.toLocaleString()}` : "-"}
                  </td>

                  {/* Status */}
                  <td className="p-3.5">{getStatusBadge(trip.status)}</td>

                  {/* Actions */}
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {trip.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            onClick={() => handleStatusChange(trip.id, "APPROVED")}
                            title="Approve Request"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                            onClick={() => handleStatusChange(trip.id, "REJECTED")}
                            title="Reject Request"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {trip.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer"
                          onClick={() => handleStatusChange(trip.id, "COMPLETED")}
                        >
                          Mark Complete
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        onClick={() => setEditTripItem(trip)}
                        title="Edit Request"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        onClick={() => setDeleteTripId(trip.id)}
                        title="Delete Request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    <p className="text-sm font-medium">No trip requisitions found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;Create Trip Request&quot; to submit an employee travel requisition.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Trip Request Modal */}
      <Dialog open={!!editTripItem} onOpenChange={(open) => !open && setEditTripItem(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Trip Request
            </DialogTitle>
          </DialogHeader>
          {editTripItem && (
            <form action={handleUpdate} className="space-y-4 pt-2">
              <div>
                <Label>Trip Purpose & Reason *</Label>
                <Input name="purpose" defaultValue={editTripItem.purpose} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <Select name="employeeId" defaultValue={editTripItem.employeeId || ""}>
                    <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                    <SelectContent>
                      {empList.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project / Client</Label>
                  <Select name="projectId" defaultValue={editTripItem.projectId || ""}>
                    <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                    <SelectContent>
                      {projList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Location (From) *</Label>
                  <Input name="startLocation" defaultValue={editTripItem.startLocation} required />
                </div>
                <div>
                  <Label>Destination (To) *</Label>
                  <Input name="endLocation" defaultValue={editTripItem.endLocation} required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Departure Date *</Label>
                  <Input
                    name="startDate"
                    type="date"
                    defaultValue={new Date(editTripItem.startDate).toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div>
                  <Label>Return Date *</Label>
                  <Input
                    name="endDate"
                    type="date"
                    defaultValue={new Date(editTripItem.endDate).toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div>
                  <Label>Estimated Budget (₹)</Label>
                  <Input
                    name="estimatedCost"
                    type="number"
                    defaultValue={editTripItem.allocatedCost || ""}
                  />
                </div>
              </div>

              <div>
                <Label>Company Vehicle (If Applicable)</Label>
                <Select name="vehicleId" defaultValue={editTripItem.vehicleId || ""}>
                  <SelectTrigger><SelectValue placeholder="Select Fleet Vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehList.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.registrationNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditTripItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTripId} onOpenChange={(open) => !open && setDeleteTripId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> Confirm Requisition Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this trip request? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteTripId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Requisition
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
