"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2, MessageSquare, Clock, AlertTriangle, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { getPublicTicket, addPublicComment } from "@/lib/actions/projects";
import { toast } from "sonner";
import Link from "next/link";

type TicketData = Awaited<ReturnType<typeof getPublicTicket>>;

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
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

const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <Clock className="h-4 w-4" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4" />,
  WAITING: <Clock className="h-4 w-4" />,
  RESOLVED: <CheckCircle2 className="h-4 w-4" />,
  CLOSED: <CheckCircle2 className="h-4 w-4" />,
};

export default function PublicTicketPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<TicketData>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isPending, startTransition] = useTransition();

  function loadTicket() {
    setLoading(true);
    getPublicTicket(ticketId)
      .then((data) => {
        if (!data) setNotFound(true);
        else setTicket(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTicket(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    startTransition(async () => {
      try {
        await addPublicComment(ticketId, {
          content: comment,
          authorName: authorName || undefined,
        });
        toast.success("Comment added");
        setComment("");
        loadTicket();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add comment");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Ticket not found</h2>
        <p className="text-muted-foreground">
          The ticket ID you provided does not match any existing ticket.
        </p>
        <Link href="/portal/tickets">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Lookup</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/tickets" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Back to Ticket Lookup
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{ticket.ticketNo}</p>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge className={statusColors[ticket.status] ?? ""}>
                <span className="mr-1">{statusIcons[ticket.status]}</span>
                {ticket.status.replace(/_/g, " ")}
              </Badge>
              <Badge className={priorityColors[ticket.priority] ?? ""}>{ticket.priority}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.description && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
            {ticket.category && <span>Category: {ticket.category}</span>}
            {ticket.resolvedAt && <span>Resolved: {new Date(ticket.resolvedAt).toLocaleDateString()}</span>}
            {ticket.closedAt && <span>Closed: {new Date(ticket.closedAt).toLocaleDateString()}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Comments ({ticket.comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No comments yet</p>
          )}
          {ticket.comments.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <p className="whitespace-pre-wrap text-sm">{c.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))}

          {/* Add comment form */}
          {ticket.status !== "CLOSED" && (
            <form onSubmit={handleComment} className="space-y-3 border-t pt-4">
              <div>
                <Label>Your Name (optional)</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label>Comment</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  required
                />
              </div>
              <Button type="submit" disabled={isPending || !comment.trim()}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Comment
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
