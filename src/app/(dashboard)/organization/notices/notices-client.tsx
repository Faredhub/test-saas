"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus, Search, Loader2, Pin, Megaphone, Trash2, BellRing,
  X, ChevronRight, CalendarDays, Clock, Users, AlertTriangle,
  Info, Flame, ChevronDown,
} from "lucide-react";
import { createAnnouncement, deleteAnnouncement } from "@/lib/actions/organization";
import { toast } from "sonner";
import { format, isAfter } from "date-fns";

const priorityConfig: Record<string, { label: string; gradient: string; badge: string; icon: React.ElementType }> = {
  LOW:    { label: "Low",    gradient: "from-slate-50 to-slate-100/60 dark:from-slate-900/40 dark:to-slate-800/20 border-slate-200 dark:border-slate-800",    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",    icon: Info },
  NORMAL: { label: "Normal", gradient: "from-blue-50 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-900",         badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",    icon: Info },
  HIGH:   { label: "High",   gradient: "from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-900",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", icon: AlertTriangle },
  URGENT: { label: "Urgent", gradient: "from-red-50 to-rose-100/60 dark:from-red-950/40 dark:to-red-900/20 border-red-200 dark:border-red-900",              badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",         icon: Flame },
};

const audienceConfig: Record<string, { label: string; badge: string }> = {
  ALL:        { label: "All",        badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  DEPARTMENT: { label: "Department", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300" },
  TEAM:       { label: "Team",       badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300" },
  BRANCH:     { label: "Branch",     badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
};

type Announcement = Awaited<ReturnType<typeof import("@/lib/actions/organization").getAnnouncements>>[number];

type NoticesClientProps = {
  initialData: Announcement[];
};

export function NoticesClient({ initialData }: NoticesClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<"all" | "pinned" | "active" | "expired">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const expiresAt = formData.get("expiresAt") as string;
        await createAnnouncement({
          title: formData.get("title") as string,
          content: formData.get("content") as string,
          priority: (formData.get("priority") as string) as "LOW" | "NORMAL" | "HIGH" | "URGENT",
          audience: (formData.get("audience") as string) as "ALL" | "DEPARTMENT" | "TEAM" | "BRANCH",
          isPinned: formData.get("isPinned") === "on",
          expiresAt: expiresAt || undefined,
        });
        toast.success("Announcement created and notifications sent to all users!");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create announcement");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAnnouncement(id);
        toast.success("Announcement deleted");
      } catch {
        toast.error("Failed to delete announcement");
      }
    });
  }

  const now = new Date();

  const filtered = initialData.filter((ann) => {
    const matchSearch = !search || ann.title.toLowerCase().includes(search.toLowerCase()) || ann.content.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeFilter === "pinned") return ann.isPinned;
    if (activeFilter === "active") return !ann.expiresAt || isAfter(new Date(ann.expiresAt), now);
    if (activeFilter === "expired") return !!ann.expiresAt && !isAfter(new Date(ann.expiresAt), now);
    return true;
  });

  const urgentNotices = initialData.filter((a) => a.priority === "URGENT" && (!a.expiresAt || isAfter(new Date(a.expiresAt), now)));
  const pinnedCount = initialData.filter((a) => a.isPinned).length;
  const activeCount = initialData.filter((a) => !a.expiresAt || isAfter(new Date(a.expiresAt), now)).length;
  const expiredCount = initialData.filter((a) => !!a.expiresAt && !isAfter(new Date(a.expiresAt), now)).length;

  return (
    <div className="space-y-6">
      {urgentNotices.length > 0 && !dismissedBanner && (
        <div className="relative flex items-start gap-4 rounded-2xl border border-red-300/60 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-red-900/20 dark:border-red-800/60 p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
            <BellRing className="h-4 w-4 animate-bounce" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
              Urgent Announcement{urgentNotices.length > 1 ? " ("+urgentNotices.length+")" : ""}
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5 line-clamp-1">
              {urgentNotices[0].title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
              onClick={() => { setActiveFilter("all"); setExpandedId(urgentNotices[0].id); }}
            >
              View <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
            <button
              onClick={() => setDismissedBanner(true)}
              className="rounded-full p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notices &amp; Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Broadcast important updates. Recipients get instant notification alerts.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all hover:shadow-md">
            <Plus className="h-4 w-4" />
            New Announcement
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Create Announcement
              </DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" placeholder="e.g. Office closed on Monday" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea id="content" name="content" rows={4} placeholder="Write your announcement here..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select name="priority" id="priority" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" defaultValue="NORMAL">
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Audience</Label>
                  <select name="audience" id="audience" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                    <option value="ALL">All</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="TEAM">Team</option>
                    <option value="BRANCH">Branch</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <Input id="expiresAt" name="expiresAt" type="date" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPinned" name="isPinned" className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="isPinned" className="cursor-pointer">Pin this announcement</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                  Publish and Notify All
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all" as const,     label: "All",      count: initialData.length },
            { key: "pinned" as const,  label: "Pinned",   count: pinnedCount },
            { key: "active" as const,  label: "Active",   count: activeCount },
            { key: "expired" as const, label: "Expired",  count: expiredCount },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (activeFilter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-muted/80 text-muted-foreground")}
            >
              {f.label} <span className="ml-1 opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",  value: initialData.length,    icon: Megaphone, color: "text-indigo-600" },
          { label: "Pinned", value: pinnedCount,           icon: Pin,       color: "text-amber-600" },
          { label: "Active", value: activeCount,           icon: BellRing,  color: "text-emerald-600" },
          { label: "Urgent", value: urgentNotices.length,  icon: Flame,     color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
            <span className={"p-2 rounded-lg bg-muted " + stat.color}>
              <stat.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
          <Megaphone className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No announcements found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {search ? "Try adjusting your search query." : "Create your first announcement to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ann) => {
            const cfg = priorityConfig[ann.priority] ?? priorityConfig.NORMAL;
            const audienceCfg = audienceConfig[ann.audience] ?? audienceConfig.ALL;
            const isExpired = !!ann.expiresAt && !isAfter(new Date(ann.expiresAt), now);
            const isExpanded = expandedId === ann.id;
            return (
              <div
                key={ann.id}
                className={"rounded-2xl border bg-gradient-to-br " + cfg.gradient + (isExpired ? " opacity-60" : "") + " shadow-sm transition-all hover:shadow-md"}
              >
                <div className="flex items-start justify-between gap-2 p-4 pb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {ann.isPinned && <Pin className="h-4 w-4 text-amber-500 shrink-0" />}
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{ann.title}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <ChevronDown className={"h-4 w-4 text-muted-foreground transition-transform " + (isExpanded ? "rotate-180" : "")} />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      disabled={isPending}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-4 flex flex-wrap gap-1.5 pb-2">
                  <span className={"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full " + cfg.badge}>
                    <cfg.icon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </span>
                  <span className={"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full " + audienceCfg.badge}>
                    <Users className="h-2.5 w-2.5" />
                    {audienceCfg.label}
                  </span>
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <Clock className="h-2.5 w-2.5" />
                      Expired
                    </span>
                  )}
                </div>
                <div className="px-4 pb-3">
                  <p className={"text-sm text-zinc-600 dark:text-zinc-300 " + (isExpanded ? "" : "line-clamp-2")}>
                    {ann.content}
                  </p>
                </div>
                <div className="px-4 pb-4 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(ann.createdAt), "MMM d, yyyy")}
                  </span>
                  {ann.expiresAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires {format(new Date(ann.expiresAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
