"use client";

import { useState, useTransition, useMemo } from "react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Loader2,
  CalendarDays,
  MapPin,
  Clock,
  Trash2,
  Bell,
  RefreshCw,
  ChevronDown,
  Download,
  Edit3,
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Video,
  UserCheck,
  BellRing,
} from "lucide-react";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/organization";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

const typeColors: Record<string, string> = {
  MEETING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  APPOINTMENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  REMINDER: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  TASK_DEADLINE: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

const typeLabels: Record<string, string> = {
  MEETING: "Meeting",
  APPOINTMENT: "Appointment",
  REMINDER: "Reminder",
  TASK_DEADLINE: "Task Deadline",
  OTHER: "Other",
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

function formatDateForInput(dateStr?: string | Date) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarClient({ initialData, syncConfig }: CalendarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTypeForNew, setSelectedTypeForNew] = useState<"MEETING" | "APPOINTMENT" | "REMINDER" | "TASK_DEADLINE" | "OTHER">("MEETING");
  const [selectedDateForNew, setSelectedDateForNew] = useState<Date | null>(null);

  const [isPending, startTransition] = useTransition();

  // Metrics computation
  const metrics = useMemo(() => {
    const total = initialData.length;
    const meetings = initialData.filter((e) => e.type === "MEETING").length;
    const appointments = initialData.filter((e) => e.type === "APPOINTMENT").length;
    const reminders = initialData.filter((e) => e.type === "REMINDER").length;
    return { total, meetings, appointments, reminders };
  }, [initialData]);

  // Filtering
  const filteredEvents = useMemo(() => {
    return initialData.filter((event) => {
      if (activeTab !== "ALL" && event.type !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(q);
        const descMatch = event.description?.toLowerCase().includes(q) ?? false;
        const locMatch = event.location?.toLowerCase().includes(q) ?? false;
        if (!titleMatch && !descMatch && !locMatch) return false;
      }
      return true;
    });
  }, [initialData, activeTab, searchQuery]);

  // Group events by date for list view
  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {});
  }, [filteredEvents]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEvents).sort();
  }, [groupedEvents]);

  // Month grid dates calculation
  const calendarGridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  function handleOpenCreate(type?: "MEETING" | "APPOINTMENT" | "REMINDER" | "TASK_DEADLINE" | "OTHER", date?: Date) {
    if (type) setSelectedTypeForNew(type);
    if (date) setSelectedDateForNew(date);
    else setSelectedDateForNew(null);
    setIsOpen(true);
  }

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
          description: (formData.get("description") as string) || undefined,
          startTime: startTimeIso,
          endTime: endTimeIso,
          location: (formData.get("location") as string) || undefined,
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

  async function handleUpdate(formData: FormData) {
    if (!editingEvent) return;
    startTransition(async () => {
      try {
        const reminderVal = formData.get("reminder") as string;
        const startRaw = formData.get("startTime") as string;
        const endRaw = formData.get("endTime") as string;

        const startTimeIso = startRaw ? new Date(startRaw).toISOString() : startRaw;
        const endTimeIso = endRaw ? new Date(endRaw).toISOString() : endRaw;

        await updateCalendarEvent(editingEvent.id, {
          title: formData.get("title") as string,
          description: (formData.get("description") as string) || undefined,
          startTime: startTimeIso,
          endTime: endTimeIso,
          location: (formData.get("location") as string) || undefined,
          type: (formData.get("type") as string) as "MEETING" | "APPOINTMENT" | "REMINDER" | "TASK_DEADLINE" | "OTHER",
          reminderMinutes: reminderVal === "none" ? null : parseInt(reminderVal, 10),
        });
        toast.success("Event updated successfully");
        setEditingEvent(null);
      } catch {
        toast.error("Failed to update event");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCalendarEvent(id);
        toast.success("Event deleted");
        if (editingEvent?.id === id) setEditingEvent(null);
      } catch {
        toast.error("Failed to delete event");
      }
    });
  }

  function handleExportICS() {
    if (!filteredEvents.length) {
      toast.error("No events to export");
      return;
    }
    let icsData =
      "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TixelTech ERP//Calendar Module//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";
    filteredEvents.forEach((ev) => {
      const startIso = new Date(ev.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
      const endIso = new Date(ev.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "");
      icsData += "BEGIN:VEVENT\n";
      icsData += `UID:${ev.id}@tixeltech.com\n`;
      icsData += `SUMMARY:${(ev.title || "").replace(/\n/g, " ")}\n`;
      if (ev.description) icsData += `DESCRIPTION:${ev.description.replace(/\n/g, " ")}\n`;
      if (ev.location) icsData += `LOCATION:${ev.location.replace(/\n/g, " ")}\n`;
      icsData += `DTSTART:${startIso}\n`;
      icsData += `DTEND:${endIso}\n`;
      if (ev.reminderMinutes != null) {
        icsData += "BEGIN:VALARM\n";
        icsData += "ACTION:DISPLAY\n";
        icsData += `DESCRIPTION:Reminder: ${ev.title}\n`;
        icsData += `TRIGGER:-PT${ev.reminderMinutes}M\n`;
        icsData += "END:VALARM\n";
      }
      icsData += "END:VEVENT\n";
    });
    icsData += "END:VCALENDAR";

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `calendar-events-${format(new Date(), "yyyy-MM-dd")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Web/Mobile Calendar file (.ics) downloaded successfully");
  }

  // Pre-fill default dates for new event modal
  const defaultStartDate = selectedDateForNew
    ? formatDateForInput(selectedDateForNew)
    : formatDateForInput(new Date());
  const defaultEndDate = selectedDateForNew
    ? formatDateForInput(new Date(selectedDateForNew.getTime() + 30 * 60 * 1000))
    : formatDateForInput(new Date(Date.now() + 30 * 60 * 1000));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Schedule, manage, and sync meetings, appointments, and reminders across web and mobile calendars
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* iCal Web/Mobile Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportICS}
            className="inline-flex items-center gap-1.5 text-xs font-medium"
            title="Export calendar file compatible with iOS, Android, Google, and Outlook calendars"
          >
            <Download className="h-3.5 w-3.5" />
            Sync / Export (.ics)
          </Button>

          {/* Calendar Sync dropdown -- only shown when at least one provider is configured */}
          {syncConfig && (syncConfig.googleConfigured || syncConfig.outlookConfigured) && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <RefreshCw className="h-3.5 w-3.5" />
                Cloud Sync
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
                    {syncConfig.googleConnected ? "Sync Google Calendar" : "Connect Google Calendar"}
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
                    {syncConfig.outlookConnected ? "Sync Outlook Calendar" : "Connect Outlook Calendar"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportICS}>
                  Download iCal / Mobile Sync File (.ics)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* New Event Button with Dropdown for specific preset options */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New Event
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenCreate("MEETING")}>
                <Video className="mr-2 h-4 w-4 text-blue-500" /> Add Meeting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenCreate("APPOINTMENT")}>
                <UserCheck className="mr-2 h-4 w-4 text-emerald-500" /> Add Appointment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenCreate("REMINDER")}>
                <BellRing className="mr-2 h-4 w-4 text-amber-500" /> Add Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenCreate("TASK_DEADLINE")}>
                <Clock className="mr-2 h-4 w-4 text-rose-500" /> Add Task Deadline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenCreate("OTHER")}>
                <CalendarDays className="mr-2 h-4 w-4 text-slate-500" /> Add Other Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition-colors hover:border-primary/50 ${activeTab === "ALL" ? "border-primary bg-primary/5" : ""}`}
          onClick={() => setActiveTab("ALL")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">All schedules</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors hover:border-blue-500/50 ${activeTab === "MEETING" ? "border-blue-500 bg-blue-500/5" : ""}`}
          onClick={() => setActiveTab("MEETING")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400">Meetings</CardTitle>
            <Video className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{metrics.meetings}</div>
            <p className="text-xs text-muted-foreground">Internal & client syncs</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors hover:border-emerald-500/50 ${activeTab === "APPOINTMENT" ? "border-emerald-500 bg-emerald-500/5" : ""}`}
          onClick={() => setActiveTab("APPOINTMENT")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Appointments</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{metrics.appointments}</div>
            <p className="text-xs text-muted-foreground">Scheduled visits</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors hover:border-amber-500/50 ${activeTab === "REMINDER" ? "border-amber-500 bg-amber-500/5" : ""}`}
          onClick={() => setActiveTab("REMINDER")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400">Reminders</CardTitle>
            <BellRing className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{metrics.reminders}</div>
            <p className="text-xs text-muted-foreground">Alerts & to-dos</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search & Category Tabs & View Mode */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "ALL", label: "All Events" },
            { id: "MEETING", label: "Meetings" },
            { id: "APPOINTMENT", label: "Appointments" },
            { id: "REMINDER", label: "Reminders" },
            { id: "TASK_DEADLINE", label: "Deadlines" },
            { id: "OTHER", label: "Other" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="text-xs h-8 px-3"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search title or location..."
              className="pl-8 h-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2 text-xs"
              title="Timeline List View"
            >
              <List className="h-3.5 w-3.5 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 px-2 text-xs"
              title="Month Grid View"
            >
              <Grid className="h-3.5 w-3.5 mr-1" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === "grid" && (
        <Card className="p-4 space-y-4">
          {/* Month Header Nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-semibold min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 text-center font-medium text-xs text-muted-foreground border-b pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGridDays.map((day, idx) => {
              const isCurrentM = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const dayEvents = filteredEvents.filter((ev) => isSameDay(new Date(ev.startTime), day));

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenCreate("MEETING", day)}
                  className={`min-h-[90px] border rounded-md p-1.5 flex flex-col justify-start transition-colors cursor-pointer hover:bg-muted/50 ${
                    !isCurrentM ? "bg-muted/20 opacity-40" : "bg-card"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center ${
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[60px]">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(ev);
                        }}
                        className={`text-[10px] truncate px-1 py-0.5 rounded font-medium border ${typeColors[ev.type] ?? ""}`}
                        title={`${ev.title} (${format(new Date(ev.startTime), "h:mm a")})`}
                      >
                        {format(new Date(ev.startTime), "HH:mm")} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground font-medium pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* List Timeline View */}
      {viewMode === "list" && (
        <>
          {sortedDates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarDays className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="font-medium text-sm">No events found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {searchQuery || activeTab !== "ALL"
                    ? "Try resetting your search or filter to see more events."
                    : "Schedule your first meeting, appointment, or reminder to get started."}
                </p>
                <Button size="sm" onClick={() => handleOpenCreate()}>
                  <Plus className="mr-1.5 h-4 w-4" /> Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey} className="space-y-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {format(new Date(dateKey + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                  </h2>

                  <div className="space-y-2">
                    {groupedEvents[dateKey].map((event) => (
                      <Card key={event.id} className="transition-all hover:shadow-sm">
                        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {event.type === "MEETING" && <Video className="h-4 w-4 text-blue-500" />}
                              {event.type === "APPOINTMENT" && <UserCheck className="h-4 w-4 text-emerald-500" />}
                              {event.type === "REMINDER" && <BellRing className="h-4 w-4 text-amber-500" />}
                              {event.type === "TASK_DEADLINE" && <Clock className="h-4 w-4 text-rose-500" />}
                              {event.type === "OTHER" && <CalendarDays className="h-4 w-4 text-slate-500" />}
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-sm">{event.title}</span>
                                <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${typeColors[event.type] ?? ""}`}>
                                  {typeLabels[event.type] || event.type}
                                </Badge>
                              </div>

                              {event.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {event.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
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
                                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                    <Bell className="h-3 w-3" />
                                    Notification Alert:{" "}
                                    {event.reminderMinutes >= 1440
                                      ? `${event.reminderMinutes / 1440} day(s) before`
                                      : event.reminderMinutes >= 60
                                      ? `${event.reminderMinutes / 60} hour(s) before`
                                      : `${event.reminderMinutes} mins before`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setEditingEvent(event)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(event.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE EVENT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Schedule Event
            </DialogTitle>
          </DialogHeader>

          <form action={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" name="title" placeholder="e.g. Executive Sync / Client Consultation" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">Category / Type *</Label>
                <select
                  name="type"
                  id="type"
                  defaultValue={selectedTypeForNew}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="MEETING">Meeting</option>
                  <option value="APPOINTMENT">Appointment</option>
                  <option value="REMINDER">Reminder</option>
                  <option value="TASK_DEADLINE">Task Deadline</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder" className="flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5 text-amber-500" /> Notification Alert
                </Label>
                <select
                  name="reminder"
                  id="reminder"
                  defaultValue="15"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="none">No alert notification</option>
                  <option value="5">5 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="120">2 hours before</option>
                  <option value="1440">1 day before</option>
                  <option value="2880">2 days before</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  defaultValue={defaultStartDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  defaultValue={defaultEndDate}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Link</Label>
              <Input id="location" name="location" placeholder="e.g. Conference Room A or Google Meet link" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Agenda</Label>
              <Textarea id="description" name="description" rows={3} placeholder="Add notes, agenda items, or attendee details..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule Event
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT EVENT DIALOG */}
      {editingEvent && (
        <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Edit Event: {editingEvent.title}
              </DialogTitle>
            </DialogHeader>

            <form action={handleUpdate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Event Title *</Label>
                <Input id="edit-title" name="title" defaultValue={editingEvent.title} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Category / Type *</Label>
                  <select
                    name="type"
                    id="edit-type"
                    defaultValue={editingEvent.type}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="APPOINTMENT">Appointment</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="TASK_DEADLINE">Task Deadline</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-reminder" className="flex items-center gap-1">
                    <Bell className="h-3.5 w-3.5 text-amber-500" /> Notification Alert
                  </Label>
                  <select
                    name="reminder"
                    id="edit-reminder"
                    defaultValue={editingEvent.reminderMinutes != null ? editingEvent.reminderMinutes.toString() : "none"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="none">No alert notification</option>
                    <option value="5">5 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="120">2 hours before</option>
                    <option value="1440">1 day before</option>
                    <option value="2880">2 days before</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-startTime">Start Time *</Label>
                  <Input
                    id="edit-startTime"
                    name="startTime"
                    type="datetime-local"
                    defaultValue={formatDateForInput(editingEvent.startTime)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endTime">End Time *</Label>
                  <Input
                    id="edit-endTime"
                    name="endTime"
                    type="datetime-local"
                    defaultValue={formatDateForInput(editingEvent.endTime)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location / Link</Label>
                <Input
                  id="edit-location"
                  name="location"
                  defaultValue={editingEvent.location ?? ""}
                  placeholder="e.g. Conference Room A or Google Meet link"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description / Agenda</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  defaultValue={editingEvent.description ?? ""}
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(editingEvent.id)}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingEvent(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
