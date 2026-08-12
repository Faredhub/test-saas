"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import {
  updateTicket,
  assignTicket,
  resolveTicket,
  closeTicket,
  addTicketComment,
} from "@/lib/actions/projects";
import { toast } from "sonner";
import { getEmployees } from "@/lib/actions/hrm";
import type { getTicket } from "@/lib/actions/projects";

type TicketType = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  WAITING: "bg-yellow-100 text-yellow-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function TicketDetailClient({ ticket }: { ticket: TicketType }) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof getEmployees>>["data"]>([]);

  useEffect(() => {
    getEmployees({ pageSize: 500, status: "ACTIVE" }).then((res) => setEmployees(res.data)).catch(() => {});
  }, []);

  async function handleAddComment() {
    if (!comment.trim()) return;
    startTransition(async () => {
      try {
        await addTicketComment(ticket.id, comment.trim(), isInternal);
        toast.success("Comment added");
        setComment("");
        setIsInternal(false);
      } catch {
        toast.error("Failed to add comment");
      }
    });
  }

  async function handleResolve() {
    startTransition(async () => {
      try {
        await resolveTicket(ticket.id);
        toast.success("Ticket resolved");
      } catch {
        toast.error("Failed to resolve ticket");
      }
    });
  }

  async function handleClose() {
    startTransition(async () => {
      try {
        await closeTicket(ticket.id);
        toast.success("Ticket closed");
      } catch {
        toast.error("Failed to close ticket");
      }
    });
  }

  async function handleAssign(formData: FormData) {
    startTransition(async () => {
      try {
        await assignTicket(ticket.id, formData.get("assigneeId") as string);
        toast.success("Ticket assigned");
        setAssignDialogOpen(false);
      } catch {
        toast.error("Failed to assign ticket");
      }
    });
  }

  async function handleUpdateStatus(formData: FormData) {
    startTransition(async () => {
      try {
        await updateTicket(ticket.id, {
          status: formData.get("status") as "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED",
          priority: formData.get("priority") as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        });
        toast.success("Ticket updated");
        setStatusDialogOpen(false);
      } catch {
        toast.error("Failed to update ticket");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-mono text-sm">{ticket.ticketNo}</span>
              <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[ticket.status] || ""} variant="secondary">
                {ticket.status.replace("_", " ")}
              </Badge>
              <Badge className={priorityColors[ticket.priority] || ""} variant="secondary">
                {ticket.priority === "URGENT" && (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                )}
                {ticket.priority}
              </Badge>
              {ticket.category && (
                <Badge variant="outline">{ticket.category}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              Edit
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Ticket</DialogTitle>
              </DialogHeader>
              <form action={handleUpdateStatus} className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={ticket.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="WAITING">Waiting</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue={ticket.priority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <User className="mr-2 h-4 w-4" /> Assign
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Ticket</DialogTitle>
              </DialogHeader>
              <form action={handleAssign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assigneeId">Assignee</Label>
                  <Select name="assigneeId" defaultValue={ticket.assignedToId || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.userId || emp.id}>
                          {emp.firstName} {emp.lastName}
                          {emp.designation ? ` (${emp.designation})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResolve}
              disabled={isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Resolve
            </Button>
          )}
          {ticket.status === "RESOLVED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" /> Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {ticket.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({ticket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 && (
                <p className="text-center py-4 text-muted-foreground">No comments yet</p>
              )}
              {ticket.comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-4 ${c.isInternal ? "bg-amber-50 border-amber-200" : "bg-background"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{c.authorId}</span>
                      {c.isInternal && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          <Lock className="mr-1 h-3 w-3" />
                          Internal
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}

              {/* Add Comment */}
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isInternal"
                      checked={isInternal}
                      onCheckedChange={(checked) => setIsInternal(checked === true)}
                    />
                    <Label htmlFor="isInternal" className="text-sm font-normal">
                      Internal note (not visible to reporter)
                    </Label>
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={isPending || !comment.trim()}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusColors[ticket.status] || ""} variant="secondary">
                  {ticket.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <Badge className={priorityColors[ticket.priority] || ""} variant="secondary">
                  {ticket.priority}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>{ticket.category || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project</span>
                <span>{ticket.project?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reported By</span>
                <span className="font-mono text-xs">{ticket.reportedById}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned To</span>
                <span className="font-mono text-xs">{ticket.assignedToId || "Unassigned"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
              {ticket.slaDeadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SLA Deadline</span>
                  <span
                    className={
                      new Date(ticket.slaDeadline) < new Date()
                        ? "text-red-600 font-medium"
                        : ""
                    }
                  >
                    {new Date(ticket.slaDeadline).toLocaleDateString()}
                  </span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed</span>
                  <span>{new Date(ticket.closedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
