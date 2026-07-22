"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Loader2, CalendarDays, MapPin, Clock, Trash2, Bell, RefreshCw, ChevronDown } from "lucide-react";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/actions/organization";
import { toast } from "sonner";
import { format } from "date-fns";

const typeColors: Record<string, string> = {
  MEETING: "bg-blue-100 text-blue-700",
  APPOINTMENT: "bg-green-100 text-green-700",
  REMINDER: "bg-amber-100 text-amber-700",
  TASK_DEADLINE: "bg-red-100 text-red-700",
  OTHER: "bg-slate-100 text-slate-700",
};

type CalendarEvent = Awaited<ReturnType<typeof import("@/lib/actions/organization").getCalendarEvents>>[number];

type SyncConfig = {
  googleConfigured: boolean;
  outlookConfigured: boolean;
  googleConnected: boolean;
  outlookConnected: boolean;
  googleAuthUrl: string | null;
  outlookAuthUrl: string | null;
};

type CalendarClientProps = {
  initialData: CalendarEvent[];
  syncConfig?: SyncConfig;
};

export function CalendarClient({ initialData, syncConfig }: CalendarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const reminderVal = formData.get("reminder") as string;
        const startRaw = formData.get("startTime") as string;
        const endRaw = formData.get("endTime") as string;

        const startTimeIso = startRaw ? new Date(startRaw).toISOString() : startRaw;
        const endTimeIso = endRaw ? new Date(endRaw).toISOString() : endRaw;

        await createCalendarEvent({
          title: formData.get("title") as string,
          description: formData.get("description") as string || undefined,
          startTime: startTimeIso,
          endTime: endTimeIso,
          location: formData.get("location") as string || undefined,
          type: (formData.get("type") as string) as "MEETING" | "APPOINTMENT" | "REMINDER" | "TASK_DEADLINE" | "OTHER",
          reminderMinutes: reminderVal === "none" ? null : parseInt(reminderVal, 10),
        });
        toast.success("Event created successfully");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create event");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCalendarEvent(id);
        toast.success("Event deleted");
      } catch {
        toast.error("Failed to delete event");
      }
    });
  }

  // Group events by date
  const grouped = initialData.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Manage events and schedules</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar Sync dropdown -- only shown when at least one provider is configured */}
          {syncConfig &&
            (syncConfig.googleConfigured || syncConfig.outlookConfigured) && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
                  <RefreshCw className="h-4 w-4" />
                  Sync
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {syncConfig.googleConfigured && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (syncConfig.googleConnected) {
                          toast.info("Google Calendar sync started");
                        } else if (syncConfig.googleAuthUrl) {
                          window.location.href = syncConfig.googleAuthUrl;
                        }
                      }}
                    >
                      {syncConfig.googleConnected
                        ? "Sync Google Calendar"
                        : "Connect Google Calendar"}
                    </DropdownMenuItem>
                  )}
                  {syncConfig.outlookConfigured && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (syncConfig.outlookConnected) {
                          toast.info("Outlook Calendar sync started");
                        } else if (syncConfig.outlookAuthUrl) {
                          window.location.href = syncConfig.outlookAuthUrl;
                        }
                      }}
                    >
                      {syncConfig.outlookConnected
                        ? "Sync Outlook Calendar"
                        : "Connect Outlook Calendar"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Event
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input id="startTime" name="startTime" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input id="endTime" name="endTime" type="datetime-local" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    name="type"
                    id="type"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="APPOINTMENT">Appointment</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="TASK_DEADLINE">Task Deadline</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder" className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" /> Reminder
                </Label>
                <select
                  name="reminder"
                  id="reminder"
                  defaultValue="15"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="none">No reminder</option>
                  <option value="5">5 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                </select>
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

      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="mx-auto h-8 w-8 mb-2 opacity-50" />
            No events this month. Create your first event to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {format(new Date(dateKey + "T00:00:00"), "EEEE, MMMM d, yyyy")}
              </h2>
              <div className="space-y-2">
                {grouped[dateKey].map((event) => (
                  <Card key={event.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.title}</span>
                            <Badge className={typeColors[event.type] ?? ""}>
                              {event.type.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                            {event.reminderMinutes != null && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Bell className="h-3 w-3" />
                                {event.reminderMinutes >= 60
                                  ? `${event.reminderMinutes / 60}h before`
                                  : `${event.reminderMinutes}m before`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(event.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
