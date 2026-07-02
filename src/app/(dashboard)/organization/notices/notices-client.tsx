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
import { Plus, Search, Loader2, Pin, Megaphone, Trash2 } from "lucide-react";
import { createAnnouncement, deleteAnnouncement } from "@/lib/actions/organization";
import { toast } from "sonner";
import { format } from "date-fns";

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const audienceColors: Record<string, string> = {
  ALL: "bg-purple-100 text-purple-700",
  DEPARTMENT: "bg-cyan-100 text-cyan-700",
  TEAM: "bg-teal-100 text-teal-700",
  BRANCH: "bg-indigo-100 text-indigo-700",
};

type Announcement = Awaited<ReturnType<typeof import("@/lib/actions/organization").getAnnouncements>>[number];

type NoticesClientProps = {
  initialData: Announcement[];
};

export function NoticesClient({ initialData }: NoticesClientProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        toast.success("Announcement created successfully");
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

  const filtered = initialData.filter((ann) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      ann.title.toLowerCase().includes(s) ||
      ann.content.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notices & Announcements</h1>
          <p className="text-sm text-muted-foreground">Broadcast important updates to your organization</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Announcement
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea id="content" name="content" rows={4} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    name="priority"
                    id="priority"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    defaultValue="NORMAL"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Audience</Label>
                  <select
                    name="audience"
                    id="audience"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="ALL">All</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="TEAM">Team</option>
                    <option value="BRANCH">Branch</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input id="expiresAt" name="expiresAt" type="date" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPinned" name="isPinned" className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="isPinned">Pin this announcement</Label>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Announcement
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="mx-auto h-8 w-8 mb-2 opacity-50" />
            No announcements found. Create your first announcement to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ann) => (
            <Card key={ann.id} className={ann.isPinned ? "border-amber-300" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ann.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                    <CardTitle className="text-base">{ann.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(ann.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={priorityColors[ann.priority] ?? ""}>
                    {ann.priority}
                  </Badge>
                  <Badge className={audienceColors[ann.audience] ?? ""}>
                    {ann.audience}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {ann.content}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {format(new Date(ann.createdAt), "MMM d, yyyy")}
                  {ann.expiresAt && (
                    <span> &middot; Expires {format(new Date(ann.expiresAt), "MMM d, yyyy")}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
