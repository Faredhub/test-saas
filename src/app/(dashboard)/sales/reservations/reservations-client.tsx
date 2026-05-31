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
  Armchair,
  Clock,
  Loader2,
  Users,
  Phone,
  CalendarDays,
  LayoutGrid,
  List,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  createReservation,
  updateReservationStatus,
  getReservations,
} from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Reservation = {
  id: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  reservedAt: string;
  duration: number;
  status: string;
  notes: string | null;
  createdBy: { id: string; name: string | null };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABLE_COUNT = 20;

const statusColors: Record<string, string> = {
  RESERVED: "bg-yellow-100 text-yellow-700",
  SEATED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  RESERVED: "Reserved",
  SEATED: "Seated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const gridColors: Record<string, string> = {
  AVAILABLE: "border-green-300 bg-green-50 hover:bg-green-100",
  RESERVED: "border-yellow-300 bg-yellow-50 hover:bg-yellow-100",
  SEATED: "border-blue-300 bg-blue-50 hover:bg-blue-100",
  COMPLETED: "border-gray-200 bg-gray-50 hover:bg-gray-100",
};

const gridDotColors: Record<string, string> = {
  AVAILABLE: "bg-green-500",
  RESERVED: "bg-yellow-500",
  SEATED: "bg-blue-500",
  COMPLETED: "bg-gray-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: string): string {
  return new Date(date).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getDefaultDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setMinutes(0);
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReservationsClient({
  initialData,
}: {
  initialData: Reservation[];
}) {
  const [reservations, setReservations] = useState<Reservation[]>(initialData);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isPending, startTransition] = useTransition();

  // Reserve dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPartySize, setFormPartySize] = useState("2");
  const [formDateTime, setFormDateTime] = useState(getDefaultDateTime());
  const [formDuration, setFormDuration] = useState("60");
  const [formNotes, setFormNotes] = useState("");

  // ---------------------------------------------------------------------------
  // Data refresh
  // ---------------------------------------------------------------------------

  function refresh(date?: string) {
    startTransition(async () => {
      try {
        const data = await getReservations(date || selectedDate);
        setReservations(data as Reservation[]);
      } catch {
        // silent
      }
    });
  }

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    startTransition(async () => {
      try {
        const data = await getReservations(newDate);
        setReservations(data as Reservation[]);
      } catch {
        // silent
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Table status mapping
  // ---------------------------------------------------------------------------

  function getTableStatus(tableNum: string): { status: string; reservation?: Reservation } {
    // Find active reservation for this table (RESERVED or SEATED)
    const active = reservations.find(
      (r) =>
        r.tableNumber === tableNum &&
        (r.status === "RESERVED" || r.status === "SEATED")
    );
    if (active) return { status: active.status, reservation: active };

    // Check for completed reservations today
    const completed = reservations.find(
      (r) => r.tableNumber === tableNum && r.status === "COMPLETED"
    );
    if (completed) return { status: "COMPLETED", reservation: completed };

    return { status: "AVAILABLE" };
  }

  // ---------------------------------------------------------------------------
  // Create reservation
  // ---------------------------------------------------------------------------

  function openReserveDialog(tableNum?: string) {
    setSelectedTable(tableNum || "1");
    setFormName("");
    setFormPhone("");
    setFormPartySize("2");
    setFormDateTime(getDefaultDateTime());
    setFormDuration("60");
    setFormNotes("");
    setDialogOpen(true);
  }

  function handleCreate() {
    if (!formName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    startTransition(async () => {
      try {
        await createReservation({
          tableNumber: selectedTable,
          customerName: formName.trim(),
          customerPhone: formPhone.trim() || undefined,
          partySize: parseInt(formPartySize) || 2,
          reservedAt: new Date(formDateTime).toISOString(),
          duration: parseInt(formDuration) || 60,
          notes: formNotes.trim() || undefined,
        });
        toast.success(`Table ${selectedTable} reserved for ${formName.trim()}`);
        setDialogOpen(false);
        refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create reservation"
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Status updates
  // ---------------------------------------------------------------------------

  function handleStatusUpdate(id: string, status: string, label: string) {
    startTransition(async () => {
      try {
        await updateReservationStatus(id, status);
        toast.success(`Reservation marked as ${label}`);
        refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const totalToday = reservations.length;
  const reservedCount = reservations.filter(
    (r) => r.status === "RESERVED"
  ).length;
  const seatedCount = reservations.filter((r) => r.status === "SEATED").length;
  const completedCount = reservations.filter(
    (r) => r.status === "COMPLETED"
  ).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Armchair className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Table Reservations</h1>
            <p className="text-xs text-muted-foreground">
              Manage table bookings and seating
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-9 w-40"
          />
          <div className="flex overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`px-3 py-2 text-sm transition-colors ${view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`border-l px-3 py-2 text-sm transition-colors ${view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => openReserveDialog()}
            >
              <Plus className="h-4 w-4" />
              Reserve Table
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Reservation</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="res-table" className="mb-1.5 text-xs">
                      Table Number
                    </Label>
                    <select
                      id="res-table"
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {Array.from({ length: TABLE_COUNT }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          Table {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="res-party" className="mb-1.5 text-xs">
                      Party Size
                    </Label>
                    <Input
                      id="res-party"
                      type="number"
                      min="1"
                      max="50"
                      value={formPartySize}
                      onChange={(e) => setFormPartySize(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="res-name" className="mb-1.5 text-xs">
                    Customer Name *
                  </Label>
                  <Input
                    id="res-name"
                    placeholder="Customer name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="res-phone" className="mb-1.5 text-xs">
                    Phone (optional)
                  </Label>
                  <Input
                    id="res-phone"
                    placeholder="+91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="res-datetime" className="mb-1.5 text-xs">
                      Date & Time
                    </Label>
                    <Input
                      id="res-datetime"
                      type="datetime-local"
                      value={formDateTime}
                      onChange={(e) => setFormDateTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="res-duration" className="mb-1.5 text-xs">
                      Duration (min)
                    </Label>
                    <Input
                      id="res-duration"
                      type="number"
                      min="15"
                      max="480"
                      step="15"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="res-notes" className="mb-1.5 text-xs">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="res-notes"
                    placeholder="Special requests, dietary needs..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reserve
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-all duration-200 group-hover:scale-105">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalToday}</p>
              <p className="text-xs text-muted-foreground">Total Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 transition-all duration-200 group-hover:scale-105">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reservedCount}</p>
              <p className="text-xs text-muted-foreground">Reserved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 transition-all duration-200 group-hover:scale-105">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{seatedCount}</p>
              <p className="text-xs text-muted-foreground">Seated</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 transition-all duration-200 group-hover:scale-105">
              <CheckCircle className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="h-4 w-4" />
              Table Floor Plan
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Reserved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Seated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                Completed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: TABLE_COUNT }, (_, i) => {
                const tableNum = String(i + 1);
                const { status, reservation } = getTableStatus(tableNum);
                const colorClass = gridColors[status] || gridColors.AVAILABLE;
                const dotColor = gridDotColors[status] || gridDotColors.AVAILABLE;

                return (
                  <button
                    key={tableNum}
                    type="button"
                    onClick={() => {
                      if (status === "AVAILABLE") {
                        openReserveDialog(tableNum);
                      }
                    }}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${colorClass} ${status === "AVAILABLE"
                        ? "cursor-pointer active:scale-[0.97]"
                        : "cursor-default"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      <span className="text-lg font-bold">T{tableNum}</span>
                    </div>
                    {reservation ? (
                      <div className="w-full text-center">
                        <p className="truncate text-xs font-medium">
                          {reservation.customerName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatTime(reservation.reservedAt)} &middot;{" "}
                          <Users className="mr-0.5 inline h-3 w-3" />
                          {reservation.partySize}
                        </p>
                        <div className="mt-2 flex gap-1">
                          {reservation.status === "RESERVED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 flex-1 text-[10px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(
                                    reservation.id,
                                    "SEATED",
                                    "Seated"
                                  );
                                }}
                                disabled={isPending}
                              >
                                Seat
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(
                                    reservation.id,
                                    "NO_SHOW",
                                    "No Show"
                                  );
                                }}
                                disabled={isPending}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {reservation.status === "SEATED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 flex-1 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(
                                  reservation.id,
                                  "COMPLETED",
                                  "Completed"
                                );
                              }}
                              disabled={isPending}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Available</p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <List className="h-4 w-4" />
              Today&apos;s Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Armchair className="mb-3 h-12 w-12 opacity-20" />
                <p className="text-sm">No reservations for this date</p>
                <p className="text-xs">
                  Click &quot;Reserve Table&quot; to create one
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-center">Party</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-bold">
                        T{r.tableNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.customerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.customerPhone || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.partySize}
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(r.reservedAt)}</TableCell>
                      <TableCell>{r.duration} min</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[r.status]}
                        >
                          {statusLabels[r.status] || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                        {r.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "RESERVED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                  handleStatusUpdate(r.id, "SEATED", "Seated")
                                }
                                disabled={isPending}
                              >
                                <UserCheck className="mr-1 h-3.5 w-3.5" />
                                Seat
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                  handleStatusUpdate(
                                    r.id,
                                    "CANCELLED",
                                    "Cancelled"
                                  )
                                }
                                disabled={isPending}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-orange-600"
                                onClick={() =>
                                  handleStatusUpdate(r.id, "NO_SHOW", "No Show")
                                }
                                disabled={isPending}
                              >
                                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                                No Show
                              </Button>
                            </>
                          )}
                          {r.status === "SEATED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleStatusUpdate(
                                  r.id,
                                  "COMPLETED",
                                  "Completed"
                                )
                              }
                              disabled={isPending}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
