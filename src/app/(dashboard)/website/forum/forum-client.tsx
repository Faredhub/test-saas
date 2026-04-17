"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Lock,
  ThumbsUp,
  ArrowLeft,
  CheckCircle2,
  Eye,
  User,
  Clock,
  Send,
} from "lucide-react";
import {
  createForumTopic,
  addForumReply,
  togglePinTopic,
  toggleLockTopic,
  upvoteTopic,
  markBestAnswer,
} from "@/lib/actions/website";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TopicItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReplyItem = any;

const CATEGORIES = [
  "general",
  "announcements",
  "support",
  "feature-requests",
  "off-topic",
];

export function ForumClient({
  initialTopics,
}: {
  initialTopics: TopicItem[];
}) {
  const [topics, setTopics] = useState<TopicItem[]>(initialTopics);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const [pending, startTransition] = useTransition();

  // Create topic form
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  // Reply form
  const [replyText, setReplyText] = useState("");

  const filtered = topics.filter((t: TopicItem) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "ALL" || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const openCreate = () => {
    setNewTitle("");
    setNewBody("");
    setNewCategory("general");
    setDialogOpen(true);
  };

  const handleCreateTopic = () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    startTransition(async () => {
      const created = await createForumTopic({
        title: newTitle,
        body: newBody,
        category: newCategory,
      });
      setTopics((prev) => [created, ...prev]);
      setDialogOpen(false);
    });
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedTopic) return;
    startTransition(async () => {
      await addForumReply(selectedTopic.id, { body: replyText });
      // Optimistic update for the reply
      const replies = Array.isArray(selectedTopic.replies)
        ? [...selectedTopic.replies]
        : [];
      replies.push({
        id: crypto.randomUUID(),
        authorId: "current",
        authorName: "You",
        body: replyText,
        isBestAnswer: false,
        upvotes: 0,
        createdAt: new Date().toISOString(),
      });
      const updated = { ...selectedTopic, replies };
      setSelectedTopic(updated);
      setTopics((prev) =>
        prev.map((t: TopicItem) => (t.id === selectedTopic.id ? updated : t))
      );
      setReplyText("");
    });
  };

  const handlePin = (topicId: string) => {
    startTransition(async () => {
      const updated = await togglePinTopic(topicId);
      setTopics((prev) =>
        prev.map((t: TopicItem) => (t.id === topicId ? { ...t, isPinned: updated.isPinned } : t))
      );
      if (selectedTopic?.id === topicId) {
        setSelectedTopic((prev: TopicItem | null) =>
          prev ? { ...prev, isPinned: updated.isPinned } : null
        );
      }
    });
  };

  const handleLock = (topicId: string) => {
    startTransition(async () => {
      const updated = await toggleLockTopic(topicId);
      setTopics((prev) =>
        prev.map((t: TopicItem) => (t.id === topicId ? { ...t, isLocked: updated.isLocked } : t))
      );
      if (selectedTopic?.id === topicId) {
        setSelectedTopic((prev: TopicItem | null) =>
          prev ? { ...prev, isLocked: updated.isLocked } : null
        );
      }
    });
  };

  const handleUpvote = (topicId: string) => {
    startTransition(async () => {
      await upvoteTopic(topicId);
      setTopics((prev) =>
        prev.map((t: TopicItem) =>
          t.id === topicId ? { ...t, upvotes: t.upvotes + 1 } : t
        )
      );
      if (selectedTopic?.id === topicId) {
        setSelectedTopic((prev: TopicItem | null) =>
          prev ? { ...prev, upvotes: prev.upvotes + 1 } : null
        );
      }
    });
  };

  const handleMarkBest = (topicId: string, replyId: string) => {
    startTransition(async () => {
      await markBestAnswer(topicId, replyId);
      if (selectedTopic?.id === topicId) {
        const replies = (selectedTopic.replies as ReplyItem[]).map(
          (r: ReplyItem) => ({
            ...r,
            isBestAnswer: r.id === replyId ? !r.isBestAnswer : false,
          })
        );
        const updated = { ...selectedTopic, replies };
        setSelectedTopic(updated);
        setTopics((prev) =>
          prev.map((t: TopicItem) => (t.id === topicId ? updated : t))
        );
      }
    });
  };

  // Detail view for a selected topic
  if (selectedTopic) {
    const replies = Array.isArray(selectedTopic.replies)
      ? (selectedTopic.replies as ReplyItem[])
      : [];

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setSelectedTopic(null)}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to topics
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTopic.isPinned && (
                    <Badge variant="secondary">
                      <Pin className="h-3 w-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                  {selectedTopic.isLocked && (
                    <Badge variant="destructive">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                  <Badge variant="outline">{selectedTopic.category}</Badge>
                </div>
                <CardTitle className="text-xl">
                  {selectedTopic.title}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {selectedTopic.author?.name || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(selectedTopic.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {selectedTopic.viewCount} views
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpvote(selectedTopic.id)}
                  disabled={pending}
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                  {selectedTopic.upvotes}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePin(selectedTopic.id)}
                  disabled={pending}
                >
                  <Pin className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLock(selectedTopic.id)}
                  disabled={pending}
                >
                  <Lock className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {selectedTopic.body}
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </h3>

          {replies.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No replies yet. Be the first to respond.
              </CardContent>
            </Card>
          )}

          {replies.map((reply: ReplyItem) => (
            <Card
              key={reply.id}
              className={
                reply.isBestAnswer ? "border-green-500 border-2" : ""
              }
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {reply.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                      {reply.isBestAnswer && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Best Answer
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleMarkBest(selectedTopic.id, reply.id)
                    }
                    disabled={pending}
                    title="Mark as best answer"
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        reply.isBestAnswer
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply box */}
        {!selectedTopic.isLocked && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={!replyText.trim() || pending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {pending ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTopic.isLocked && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <Lock className="h-5 w-5 mx-auto mb-2" />
              This topic is locked. No new replies can be added.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Topic list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forum</h1>
          <p className="text-muted-foreground">
            Community discussions and support
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Topic
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No topics yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Start a discussion by creating the first topic
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Topic
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((topic: TopicItem) => {
            const replyCount = Array.isArray(topic.replies)
              ? topic.replies.length
              : 0;
            return (
              <Card
                key={topic.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedTopic(topic)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {topic.isPinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        {topic.isLocked && (
                          <Lock className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span className="font-medium truncate">
                          {topic.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {topic.category}
                        </Badge>
                        <span>{topic.author?.name || "Unknown"}</span>
                        <span>
                          {new Date(topic.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1" title="Upvotes">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {topic.upvotes}
                      </div>
                      <div className="flex items-center gap-1" title="Replies">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {replyCount}
                      </div>
                      <div className="flex items-center gap-1" title="Views">
                        <Eye className="h-3.5 w-3.5" />
                        {topic.viewCount}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create topic dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What's your topic about?"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={(v) => v && setNewCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() +
                        cat.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Describe your topic in detail..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTopic}
              disabled={!newTitle.trim() || !newBody.trim() || pending}
            >
              {pending ? "Creating..." : "Create Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
