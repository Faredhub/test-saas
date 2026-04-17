"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Hash,
  Lock,
  MessageSquare,
  Users,
  Send,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  SmilePlus,
  Reply,
  AtSign,
  X,
  Megaphone,
  User,
  ImageIcon,
  FileIcon,
} from "lucide-react";
import {
  createChannel,
  getChannelMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  searchMessages,
} from "@/lib/actions/office";
import { toast } from "sonner";

type ChannelType = "GROUP" | "DIRECT" | "ANNOUNCEMENT";
type MsgType = "TEXT" | "FILE" | "IMAGE" | "SYSTEM";

type Channel = {
  id: string;
  name: string;
  description: string | null;
  type: ChannelType;
  isPrivate: boolean;
  members: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string | null };
  _count: { messages: number };
};

type Message = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  type: MsgType;
  attachments: unknown;
  mentions: unknown;
  parentId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  reactions: Record<string, string[]>;
  createdAt: Date;
  sender: { id: string; name: string | null; email: string | null; avatar: string | null };
};

type TenantUser = {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
};

type Props = {
  initialChannels: Channel[];
  users: TenantUser[];
};

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅"];

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

function UserAvatar({ user }: { user: { name: string | null; avatar: string | null } }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name ?? ""}
        className="w-9 h-9 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
      {(user.name ?? "?")[0]?.toUpperCase()}
    </div>
  );
}

export function MessagingClient({ initialChannels, users }: Props) {
  const [channels, setChannels] = useState(initialChannels);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Message input
  const [messageInput, setMessageInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Thread state
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState("");

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Emoji picker
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);

  // Channel search
  const [channelSearch, setChannelSearch] = useState("");

  // Message search
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState<Array<{
    id: string;
    content: string;
    createdAt: Date;
    sender: { id: string; name: string | null; email: string | null; avatar: string | null };
    channel: { id: string; name: string | null };
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create channel dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState<ChannelType>("GROUP");
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);

  const groupChannels = channels.filter(
    (c) =>
      c.type !== "DIRECT" &&
      c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );
  const dmChannels = channels.filter(
    (c) =>
      c.type === "DIRECT" &&
      c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    setIsLoadingMessages(true);
    setThreadParent(null);
    getChannelMessages(activeChannel.id)
      .then((data) => setMessages(data as unknown as Message[]))
      .catch(() => setMessages([]))
      .finally(() => setIsLoadingMessages(false));
  }, [activeChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load thread messages
  useEffect(() => {
    if (!threadParent || !activeChannel) return;
    getChannelMessages(activeChannel.id, { parentId: threadParent.id })
      .then((data) => setThreadMessages(data as unknown as Message[]))
      .catch(() => setThreadMessages([]));
  }, [threadParent, activeChannel]);

  function handleCreateChannel() {
    if (!newChannelName.trim()) return;
    startTransition(async () => {
      try {
        const ch = await createChannel({
          name: newChannelName,
          description: newChannelDesc || undefined,
          type: newChannelType,
          isPrivate: newChannelPrivate,
          memberIds: newChannelMembers,
        });
        setChannels((prev) => [ch as unknown as Channel, ...prev]);
        setCreateOpen(false);
        setNewChannelName("");
        setNewChannelDesc("");
        setNewChannelType("GROUP");
        setNewChannelPrivate(false);
        setNewChannelMembers([]);
        setActiveChannel(ch as unknown as Channel);
        toast.success("Channel created");
      } catch {
        toast.error("Failed to create channel");
      }
    });
  }

  function handleSendMessage() {
    if (!messageInput.trim() || !activeChannel) return;
    const content = messageInput;
    const mentionMatches = content.match(/@(\w+)/g);
    const mentionIds = mentionMatches
      ? mentionMatches
          .map((m) => {
            const name = m.slice(1).toLowerCase();
            return users.find(
              (u) =>
                u.name?.toLowerCase().includes(name) ||
                u.email?.toLowerCase().includes(name)
            );
          })
          .filter(Boolean)
          .map((u) => u!.id)
      : [];

    setMessageInput("");
    startTransition(async () => {
      try {
        const msg = await sendMessage({
          channelId: activeChannel.id,
          content,
          mentions: mentionIds,
        });
        setMessages((prev) => [...prev, msg as unknown as Message]);
      } catch {
        toast.error("Failed to send message");
      }
    });
  }

  function handleSendThread() {
    if (!threadInput.trim() || !activeChannel || !threadParent) return;
    const content = threadInput;
    setThreadInput("");
    startTransition(async () => {
      try {
        const msg = await sendMessage({
          channelId: activeChannel.id,
          content,
          parentId: threadParent.id,
        });
        setThreadMessages((prev) => [...prev, msg as unknown as Message]);
      } catch {
        toast.error("Failed to send reply");
      }
    });
  }

  function handleEditMessage(msgId: string) {
    if (!editContent.trim()) return;
    startTransition(async () => {
      try {
        await editMessage(msgId, editContent);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: editContent, isEdited: true } : m))
        );
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: editContent, isEdited: true } : m))
        );
        setEditingMsgId(null);
        setEditContent("");
      } catch {
        toast.error("Failed to edit message");
      }
    });
  }

  function handleDeleteMessage(msgId: string) {
    startTransition(async () => {
      try {
        await deleteMessage(msgId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
          )
        );
        setThreadMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
          )
        );
      } catch {
        toast.error("Failed to delete message");
      }
    });
  }

  function handleReaction(msgId: string, emoji: string) {
    startTransition(async () => {
      try {
        await addReaction(msgId, emoji);
        // Optimistic update
        const updateReactions = (msgs: Message[]) =>
          msgs.map((m) => {
            if (m.id !== msgId) return m;
            const reactions = { ...(m.reactions ?? {}) };
            const currentUserId = "current"; // We don't have the user id in the client, so we toggle optimistically
            const users = reactions[emoji] ?? [];
            if (users.includes(currentUserId)) {
              reactions[emoji] = users.filter((u) => u !== currentUserId);
              if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
              reactions[emoji] = [...users, currentUserId];
            }
            return { ...m, reactions };
          });
        setMessages(updateReactions);
        setThreadMessages(updateReactions);
        setEmojiPickerMsgId(null);
      } catch {
        toast.error("Failed to add reaction");
      }
    });
  }

  function handleMentionSelect(user: TenantUser) {
    const atIdx = messageInput.lastIndexOf("@");
    if (atIdx >= 0) {
      setMessageInput(messageInput.slice(0, atIdx) + `@${user.name ?? user.email} `);
    }
    setShowMentions(false);
    inputRef.current?.focus();
  }

  function handleMessageInputChange(value: string) {
    setMessageInput(value);
    const atIdx = value.lastIndexOf("@");
    if (atIdx >= 0 && atIdx === value.length - 1) {
      setShowMentions(true);
      setMentionFilter("");
    } else if (atIdx >= 0) {
      const afterAt = value.slice(atIdx + 1);
      if (!afterAt.includes(" ")) {
        setShowMentions(true);
        setMentionFilter(afterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }

  const handleMsgSearch = useCallback(
    (query: string) => {
      setMsgSearch(query);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (!query.trim()) {
        setMsgSearchResults([]);
        setShowSearchPanel(false);
        return;
      }
      setShowSearchPanel(true);
      searchTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const result = await searchMessages({ query: query.trim(), pageSize: 20 });
          setMsgSearchResults(result.data as typeof msgSearchResults);
        } catch {
          setMsgSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    []
  );

  function handleSearchResultClick(channelId: string) {
    const ch = channels.find((c) => c.id === channelId);
    if (ch) {
      setActiveChannel(ch);
    }
    setShowSearchPanel(false);
    setMsgSearch("");
    setMsgSearchResults([]);
  }

  function highlightMatch(text: string, query: string) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text.length > 120 ? text.slice(0, 120) + "..." : text;
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + query.length + 40);
    const snippet = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
    const matchStart = idx - start + (start > 0 ? 3 : 0);
    return (
      <>
        {snippet.slice(0, matchStart)}
        <mark className="bg-yellow-200 rounded px-0.5">{snippet.slice(matchStart, matchStart + query.length)}</mark>
        {snippet.slice(matchStart + query.length)}
      </>
    );
  }

  const filteredMentionUsers = users.filter(
    (u) =>
      !mentionFilter ||
      u.name?.toLowerCase().includes(mentionFilter) ||
      u.email?.toLowerCase().includes(mentionFilter)
  );

  function renderMessage(msg: Message, isThread = false) {
    const isEditing = editingMsgId === msg.id;
    return (
      <div
        key={msg.id}
        className={`group flex gap-3 px-4 py-2 hover:bg-muted/30 ${msg.isDeleted ? "opacity-50" : ""}`}
      >
        <UserAvatar user={msg.sender} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{msg.sender.name ?? msg.sender.email}</span>
            <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
            {msg.isEdited && (
              <span className="text-xs text-muted-foreground italic">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditMessage(msg.id);
                  if (e.key === "Escape") {
                    setEditingMsgId(null);
                    setEditContent("");
                  }
                }}
                className="text-sm"
                autoFocus
              />
              <Button size="sm" onClick={() => handleEditMessage(msg.id)}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingMsgId(null);
                  setEditContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {msg.type === "IMAGE" && (
                <div className="mt-1 mb-2">
                  <div className="w-48 h-32 bg-muted rounded flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              )}
              {msg.type === "FILE" && (
                <div className="mt-1 mb-2 flex items-center gap-2 p-2 bg-muted rounded w-fit">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Attached file</span>
                </div>
              )}
              {msg.type === "SYSTEM" ? (
                <p className="text-sm text-muted-foreground italic mt-0.5">{msg.content}</p>
              ) : (
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                  {msg.content.split(/(@\w+)/g).map((part, i) =>
                    part.startsWith("@") ? (
                      <span key={i} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              )}
            </>
          )}

          {/* Reactions */}
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(msg.id, emoji)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded-full text-xs hover:bg-muted/80 border"
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{(userIds as string[]).length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Actions (visible on hover) */}
          {!msg.isDeleted && !isEditing && (
            <div className="hidden group-hover:flex items-center gap-0.5 mt-1">
              {!isThread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setThreadParent(msg)}
                >
                  <Reply className="h-3 w-3 mr-1" /> Reply
                </Button>
              )}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)
                  }
                >
                  <SmilePlus className="h-3 w-3" />
                </Button>
                {emojiPickerMsgId === msg.id && (
                  <div className="absolute bottom-full left-0 mb-1 bg-background border rounded-lg shadow-lg p-2 flex gap-1 z-50">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="hover:bg-muted rounded p-1 text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setEditingMsgId(msg.id);
                  setEditContent(msg.content);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600"
                onClick={() => handleDeleteMessage(msg.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    if (date !== lastDate) {
      groupedMessages.push({ date, messages: [msg] });
      lastDate = date;
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left sidebar - channels */}
      <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Search channels..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Group channels */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Channels
              </span>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger className="text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="channel-name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newChannelDesc}
                        onChange={(e) => setNewChannelDesc(e.target.value)}
                        placeholder="What is this channel about?"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newChannelType}
                        onValueChange={(v) => setNewChannelType(v as ChannelType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GROUP">Group</SelectItem>
                          <SelectItem value="DIRECT">Direct Message</SelectItem>
                          <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPrivate"
                        checked={newChannelPrivate}
                        onChange={(e) => setNewChannelPrivate(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isPrivate">Private channel</Label>
                    </div>
                    <div>
                      <Label>Members</Label>
                      <ScrollArea className="max-h-40 border rounded p-2 mt-1">
                        <div className="space-y-1">
                          {users.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={newChannelMembers.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewChannelMembers((prev) => [...prev, user.id]);
                                  } else {
                                    setNewChannelMembers((prev) =>
                                      prev.filter((id) => id !== user.id)
                                    );
                                  }
                                }}
                                className="rounded"
                              />
                              {user.name ?? user.email}
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        Cancel
                      </DialogClose>
                      <Button
                        onClick={handleCreateChannel}
                        disabled={isPending || !newChannelName.trim()}
                      >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-0.5">
              {groupChannels.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No channels yet</p>
              ) : (
                groupChannels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      activeChannel?.id === ch.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {ch.isPrivate ? (
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                    ) : ch.type === "ANNOUNCEMENT" ? (
                      <Megaphone className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))
              )}
            </div>

            {/* DM channels */}
            <div className="flex items-center px-2 py-1 mt-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Direct Messages
              </span>
            </div>
            <div className="space-y-0.5">
              {dmChannels.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No direct messages</p>
              ) : (
                dmChannels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      activeChannel?.id === ch.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="p-3 border-b flex items-center gap-2 shrink-0">
              {activeChannel.isPrivate ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground" />
              )}
              <h2 className="font-semibold">{activeChannel.name}</h2>
              {activeChannel.description && (
                <span className="text-sm text-muted-foreground ml-2">
                  {activeChannel.description}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={msgSearch}
                    onChange={(e) => handleMsgSearch(e.target.value)}
                    placeholder="Search messages..."
                    className="pl-7 h-8 w-48 text-sm"
                  />
                  {showSearchPanel && (
                    <div className="absolute top-full right-0 mt-1 w-96 max-h-80 overflow-y-auto bg-background border rounded-lg shadow-lg z-50">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : msgSearchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No messages found
                        </div>
                      ) : (
                        msgSearchResults.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleSearchResultClick(r.channel.id)}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted border-b last:border-b-0"
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-primary">#{r.channel.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {r.sender.name ?? r.sender.email}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDate(r.createdAt)} {formatTime(r.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground line-clamp-2">
                              {highlightMatch(r.content, msgSearch)}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <Users className="h-4 w-4" />
                {(activeChannel.members as Array<{ userId: string }>)?.length ?? 0} members
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 py-2">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No messages yet. Be the first to say something!
                  </p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {group.date}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    {group.messages.map((msg) => renderMessage(msg))}
                  </div>
                ))
              )}
              <div ref={messageEndRef} />
            </ScrollArea>

            {/* Message input */}
            <div className="p-3 border-t shrink-0 relative">
              {showMentions && filteredMentionUsers.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-background border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                  {filteredMentionUsers.slice(0, 8).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleMentionSelect(user)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-sm text-left"
                    >
                      <UserAvatar user={user} />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={messageInput}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message #${activeChannel.name}... (type @ to mention)`}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isPending}
                  size="sm"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold">Team Messaging</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Select a channel from the sidebar or create a new one to start a conversation.
            </p>
          </div>
        )}
      </div>

      {/* Thread panel */}
      {threadParent && (
        <div className="w-80 border-l flex flex-col shrink-0">
          <div className="p-3 border-b flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-sm">Thread</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setThreadParent(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {/* Original message */}
            <div className="border-b">{renderMessage(threadParent, true)}</div>

            {/* Thread replies */}
            {threadMessages.length > 0 && (
              <div className="py-1">
                <div className="px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                    {threadMessages.length} {threadMessages.length === 1 ? "reply" : "replies"}
                  </span>
                </div>
                {threadMessages.map((msg) => renderMessage(msg, true))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendThread();
                  }
                }}
                placeholder="Reply..."
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                onClick={handleSendThread}
                disabled={!threadInput.trim() || isPending}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
