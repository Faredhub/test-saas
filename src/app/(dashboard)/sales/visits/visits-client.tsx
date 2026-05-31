"use client";

import { useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  MapPin,
  Clock,
  CheckCircle,
  Loader2,
  LogOut,
  XCircle,
  CalendarDays,
} from "lucide-react";
import {
  createVisit,
  completeVisit,
  cancelVisit,
  getVisits,
} from "@/lib/actions/sales";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatDuration(checkIn: string | Date, checkOut?: string | Date | null): string {
  const start = new Date(checkIn);
  const end = checkOut ? new Date(checkOut) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

type ContactOption = { id: string; firstName: string; lastName: string | null; company: string | null };
type LeadOption = { id: string; firstName: string; lastName: string | null; company: string | null };

type VisitsClientProps = {
  initialData: Awaited<ReturnType<typeof getVisits>>;
  stats: { todayVisits: number; inProgress: number; completedThisWeek: number };
  contacts: ContactOption[];
  leads: LeadOption[];
};

export function VisitsClient({ initialData, stats, contacts, leads }: VisitsClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkOutId, setCheckOutId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter data client-side from initialData
  const filteredData = initialData.data.filter((v) => {
    if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (new Date(v.checkInAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(v.checkInAt) > to) return false;
    }
    return true;
  });

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createVisit({
          contactId: (formData.get("contactId") as string) || undefined,
          leadId: (formData.get("leadId") as string) || undefined,
          purpose: formData.get("purpose") as string,
          location: (formData.get("location") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Visit logged successfully");
        setIsOpen(false);
      } catch {
        toast.error("Failed to log visit");
      }
    });
  }

  async function handleCheckOut(formData: FormData) {
    if (!checkOutId) return;
    startTransition(async () => {
      try {
        await completeVisit(
          checkOutId,
          formData.get("outcome") as string,
          (formData.get("notes") as string) || undefined
        );
        toast.success("Visit completed");
        setCheckOutOpen(false);
        setCheckOutId(null);
      } catch {
        toast.error("Failed to complete visit");
      }
    });
  }

  async function handleCancel(id: string) {
    startTransition(async () => {
      try {
        await cancelVisit(id);
        toast.success("Visit cancelled");
      } catch {
        toast.error("Failed to cancel visit");
      }
    });
  }

  function openCheckOut(id: string) {
    setCheckOutId(id);
    setCheckOutOpen(true);
  }

  function contactLabel(c: ContactOption) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
    return c.company ? `${name} (${c.company})` : name;
  }

  function leadLabel(l: LeadOption) {
    const name = [l.firstName, l.lastName].filter(Boolean).join(" ");
    return l.company ? `${name} (${l.company})` : name;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visit Log</h1>
          <p className="text-muted-foreground">Track field visits and check-ins</p>
        </div>

        {/* Log Visit Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Log Visit
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log New Visit</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactId">Contact</Label>
                  <select
                    name="contactId"
                    id="contactId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">-- Select contact --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {contactLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadId">Lead</Label>
                  <select
                    name="leadId"
                    id="leadId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">-- Select lead --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {leadLabel(l)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Input name="purpose" id="purpose" required placeholder="e.g. Product demo, Follow-up, Support" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input name="location" id="location" placeholder="e.g. Client office, Bengaluru" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea name="notes" id="notes" rows={3} placeholder="Additional notes..." />
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Check In
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
     <div className="grid gap-4 sm:grid-cols-3">
  <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">Today&apos;s Visits</CardTitle>
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.todayVisits}</div>
    </CardContent>
  </Card>
  <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">In Progress</CardTitle>
      <Clock className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.inProgress}</div>
    </CardContent>
  </Card>
  <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
      <CheckCircle className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
    </CardContent>
  </Card>
</div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            className="w-[160px]"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            className="w-[160px]"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(statusFilter !== "ALL" || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Visits Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Contact / Lead</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No visits found. Log your first visit to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((visit) => {
                  const contactName = visit.contact
                    ? [visit.contact.firstName, visit.contact.lastName].filter(Boolean).join(" ")
                    : null;
                  const leadName = visit.lead
                    ? [visit.lead.firstName, visit.lead.lastName].filter(Boolean).join(" ")
                    : null;

                  return (
                    <TableRow key={visit.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(visit.checkInAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {visit.user.name || visit.user.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contactName && (
                          <div>
                            <span className="font-medium">{contactName}</span>
                            {visit.contact?.company && (
                              <span className="ml-1 text-muted-foreground text-xs">
                                ({visit.contact.company})
                              </span>
                            )}
                          </div>
                        )}
                        {leadName && (
                          <div className="text-muted-foreground">
                            <span className="text-xs">Lead:</span>{" "}
                            <span className="font-medium">{leadName}</span>
                          </div>
                        )}
                        {!contactName && !leadName && (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {visit.purpose}
                      </TableCell>
                      <TableCell className="text-sm">
                        {visit.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="max-w-[120px] truncate">{visit.location}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[visit.status] || ""}
                        >
                          {statusLabels[visit.status] || visit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDuration(visit.checkInAt, visit.checkOutAt)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {visit.outcome || (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {visit.status === "IN_PROGRESS" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCheckOut(visit.id)}
                              disabled={isPending}
                            >
                              <LogOut className="mr-1 h-3 w-3" />
                              Check Out
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancel(visit.id)}
                              disabled={isPending}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Check Out Dialog */}
      <Dialog open={checkOutOpen} onOpenChange={setCheckOutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out</DialogTitle>
          </DialogHeader>
          <form action={handleCheckOut} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome *</Label>
              <select
                name="outcome"
                id="outcome"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">-- Select outcome --</option>
                <option value="Successful">Successful</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Not Available">Not Available</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="No Interest">No Interest</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkoutNotes">Notes</Label>
              <Textarea name="notes" id="checkoutNotes" rows={3} placeholder="Visit summary, key takeaways..." />
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Visit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
