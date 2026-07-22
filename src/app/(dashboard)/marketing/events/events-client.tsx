"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Loader2,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Globe,
  UserCheck,
  UserX,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  registerAttendee,
  checkInAttendee,
  cancelAttendee,
} from "@/lib/actions/marketing";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  CONFERENCE: "Conference",
  WEBINAR: "Webinar",
  WORKSHOP: "Workshop",
  MEETUP: "Meetup",
  OTHER: "Other",
};

const attendeeStatusColors: Record<string, string> = {
  REGISTERED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-amber-100 text-amber-700",
  CHECKED_IN: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventItem = any;

type Props = {
  initialData: { data: EventItem[]; total: number };
};

export function EventsClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [editIsOnline, setEditIsOnline] = useState(false);

  const events = initialData.data;
  const filtered = events.filter(
    (e: EventItem) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue && e.venue.toLowerCase().includes(search.toLowerCase()))
  );

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const cap = formData.get("capacity") as string;
        const price = formData.get("ticketPrice") as string;
        await createEvent({
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          type: formData.get("type") as string,
          venue: formData.get("venue") as string,
          isOnline,
          meetingUrl: formData.get("meetingUrl") as string,
          startDate: new Date(formData.get("startDate") as string),
          endDate: formData.get("endDate")
            ? new Date(formData.get("endDate") as string)
            : undefined,
          capacity: cap ? parseInt(cap) : undefined,
          ticketPrice: price ? parseFloat(price) : undefined,
          currency: (formData.get("currency") as string) || "INR",
        });
        toast.success("Event created successfully");
        setIsOpen(false);
        setIsOnline(false);
      } catch {
        toast.error("Failed to create event");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    if (!editingEvent) return;
    startTransition(async () => {
      try {
        const cap = formData.get("capacity") as string;
        const price = formData.get("ticketPrice") as string;
        await updateEvent(editingEvent.id, {
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          type: formData.get("type") as string,
          venue: formData.get("venue") as string,
          isOnline: editIsOnline,
          meetingUrl: formData.get("meetingUrl") as string,
          startDate: new Date(formData.get("startDate") as string),
          endDate: formData.get("endDate")
            ? new Date(formData.get("endDate") as string)
            : undefined,
          capacity: cap ? parseInt(cap) : undefined,
          ticketPrice: price ? parseFloat(price) : undefined,
          status: formData.get("status") as string,
        });
        toast.success("Event updated");
        setEditingEvent(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update event");
      }
    });
  }

  function handleRegister(formData: FormData) {
    if (!selectedEvent) return;
    startTransition(async () => {
      try {
        const paid = formData.get("paidAmount") as string;
        await registerAttendee(selectedEvent.id, {
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          paidAmount: paid ? parseFloat(paid) : undefined,
        });
        toast.success("Attendee registered");
        setRegisterOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to register attendee");
      }
    });
  }

  function handleCheckIn(id: string) {
    startTransition(async () => {
      try {
        await checkInAttendee(id);
        toast.success("Attendee checked in");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to check in");
      }
    });
  }

  function handleCancelAttendee(id: string) {
    startTransition(async () => {
      try {
        await cancelAttendee(id);
        toast.success("Attendee cancelled");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to cancel attendee");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    startTransition(async () => {
      try {
        await deleteEvent(id);
        toast.success("Event deleted successfully");
        if (selectedEvent?.id === id) setSelectedEvent(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete event");
      }
    });
  }

  // Event detail view
  if (selectedEvent) {
    const ev = selectedEvent;
    const attendees = ev.attendees || [];
    const checkedIn = attendees.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.status === "CHECKED_IN"
    ).length;
    const registered = attendees.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.status !== "CANCELLED"
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedEvent(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{ev.title}</h1>
            <p className="text-muted-foreground">
              {typeLabels[ev.type] || ev.type} &middot;{" "}
              {new Date(ev.startDate).toLocaleDateString()}
            </p>
          </div>
          <Badge className={statusColors[ev.status]}>{ev.status}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Registered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registered}
                {ev.capacity ? `/${ev.capacity}` : ""}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkedIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {ev.isOnline ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {ev.isOnline ? "Online" : ev.venue || "TBD"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {ev.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ev.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Attendees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Attendees</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingEvent(ev);
                  setEditIsOnline(ev.isOnline);
                  setSelectedEvent(null);
                }}
              >
                Edit Event
              </Button>
              <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Register Attendee
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Register Attendee</DialogTitle>
                  </DialogHeader>
                  <form action={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="att-name">Name *</Label>
                      <Input id="att-name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="att-email">Email *</Label>
                      <Input id="att-email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="att-phone">Phone</Label>
                      <Input id="att-phone" name="phone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="att-paid">Paid Amount</Label>
                      <Input
                        id="att-paid"
                        name="paidAmount"
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                        Cancel
                      </DialogClose>
                      <Button type="submit" disabled={isPending}>
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Register
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No attendees registered yet
                    </TableCell>
                  </TableRow>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  attendees.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>{a.phone || "-"}</TableCell>
                      <TableCell>{a.ticketNo || "-"}</TableCell>
                      <TableCell>
                        <Badge className={attendeeStatusColors[a.status]}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {a.status !== "CHECKED_IN" &&
                            a.status !== "CANCELLED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCheckIn(a.id)}
                                disabled={isPending}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Check In
                              </Button>
                            )}
                          {a.status !== "CANCELLED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleCancelAttendee(a.id)}
                              disabled={isPending}
                            >
                              <UserX className="mr-1 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage conferences, webinars, and meetups
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Overview
            </Button>
          </Link>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" defaultValue="CONFERENCE">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFERENCE">Conference</SelectItem>
                        <SelectItem value="WEBINAR">Webinar</SelectItem>
                        <SelectItem value="WORKSHOP">Workshop</SelectItem>
                        <SelectItem value="MEETUP">Meetup</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input id="startDate" name="startDate" type="datetime-local" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input id="venue" name="venue" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" name="capacity" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketPrice">Ticket Price</Label>
                    <Input
                      id="ticketPrice"
                      name="ticketPrice"
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" name="currency" defaultValue="INR" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isOnline"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isOnline">Online Event</Label>
                </div>

                {isOnline && (
                  <div className="space-y-2">
                    <Label htmlFor="meetingUrl">Meeting URL</Label>
                    <Input id="meetingUrl" name="meetingUrl" type="url" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={4} />
                </div>

                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Event
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Event cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No events found. Create your first event to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev: EventItem) => {
            const attendeeCount = ev.attendees?.length ?? 0;
            return (
              <Card
                key={ev.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => setSelectedEvent(ev)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {ev.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {typeLabels[ev.type] || ev.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Badge className={statusColors[ev.status]}>{ev.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onClick={() => {
                              setEditingEvent(ev);
                              setEditIsOnline(ev.isOnline);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-black dark:text-white" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                            onClick={() => handleDelete(ev.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(ev.startDate).toLocaleDateString()}
                    {ev.endDate &&
                      ` - ${new Date(ev.endDate).toLocaleDateString()}`}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {ev.isOnline ? (
                      <Globe className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    {ev.isOnline ? "Online" : ev.venue || "TBD"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {attendeeCount} registered
                    {ev.capacity ? ` / ${ev.capacity} capacity` : ""}
                  </div>
                  {ev.ticketPrice && (
                    <p className="text-sm font-medium">
                      {ev.currency} {Number(ev.ticketPrice).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit event dialog */}
      <Dialog
        open={!!editingEvent}
        onOpenChange={(open) => {
          if (!open) setEditingEvent(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <form action={handleUpdate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editingEvent.title}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select name="type" defaultValue={editingEvent.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONFERENCE">Conference</SelectItem>
                      <SelectItem value="WEBINAR">Webinar</SelectItem>
                      <SelectItem value="WORKSHOP">Workshop</SelectItem>
                      <SelectItem value="MEETUP">Meetup</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date *</Label>
                  <Input
                    id="edit-startDate"
                    name="startDate"
                    type="datetime-local"
                    defaultValue={new Date(editingEvent.startDate)
                      .toISOString()
                      .slice(0, 16)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date</Label>
                  <Input
                    id="edit-endDate"
                    name="endDate"
                    type="datetime-local"
                    defaultValue={
                      editingEvent.endDate
                        ? new Date(editingEvent.endDate).toISOString().slice(0, 16)
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-venue">Venue</Label>
                  <Input
                    id="edit-venue"
                    name="venue"
                    defaultValue={editingEvent.venue || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    name="capacity"
                    type="number"
                    defaultValue={editingEvent.capacity || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ticketPrice">Ticket Price</Label>
                  <Input
                    id="edit-ticketPrice"
                    name="ticketPrice"
                    type="number"
                    step="0.01"
                    defaultValue={editingEvent.ticketPrice || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={editingEvent.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isOnline"
                  checked={editIsOnline}
                  onChange={(e) => setEditIsOnline(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-isOnline">Online Event</Label>
              </div>

              {editIsOnline && (
                <div className="space-y-2">
                  <Label htmlFor="edit-meetingUrl">Meeting URL</Label>
                  <Input
                    id="edit-meetingUrl"
                    name="meetingUrl"
                    type="url"
                    defaultValue={editingEvent.meetingUrl || ""}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  rows={4}
                  defaultValue={editingEvent.description || ""}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEvent(null)}
                >
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
    </div>
  );
}
