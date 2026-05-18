"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Send,
  Headphones,
  MessageCircle,
  Settings,
  X,
  CheckCircle,
  User,
  Clock,
  XCircle,
  Zap,
} from "lucide-react";
import {
  createChatWidget,
  updateChatWidget,
  addChatMessage,
  closeConversation,
  resolveConversation,
} from "@/lib/actions/website";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvoItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageItem = any;
type CannedResponse = { shortcut: string; text: string };

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

export function ChatClient({
  initialWidgets,
  initialConversations,
}: {
  initialWidgets: WidgetItem[];
  initialConversations: ConvoItem[];
}) {
  const [widgets, setWidgets] = useState<WidgetItem[]>(initialWidgets);
  const [conversations, setConversations] =
    useState<ConvoItem[]>(initialConversations);
  const [selectedConvo, setSelectedConvo] = useState<ConvoItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [pending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Message input
  const [messageText, setMessageText] = useState("");

  // Widget form state
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetItem | null>(null);
  const [wName, setWName] = useState("");
  const [wGreeting, setWGreeting] = useState("");
  const [wColor, setWColor] = useState("#3b82f6");
  const [wPosition, setWPosition] = useState("bottom-right");
  const [wActive, setWActive] = useState(true);
  const [wOfflineMsg, setWOfflineMsg] = useState("");
  const [wCannedResponses, setWCannedResponses] = useState<CannedResponse[]>(
    []
  );
  const [newShortcut, setNewShortcut] = useState("");
  const [newCannedText, setNewCannedText] = useState("");

  const filteredConvos = conversations.filter((c: ConvoItem) => {
    return statusFilter === "ALL" || c.status === statusFilter;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvo]);

  const openWidgetCreate = () => {
    setEditingWidget(null);
    setWName("Support Chat");
    setWGreeting("Hi! How can we help you?");
    setWColor("#3b82f6");
    setWPosition("bottom-right");
    setWActive(true);
    setWOfflineMsg("We're offline. Leave a message!");
    setWCannedResponses([]);
    setWidgetDialogOpen(true);
  };

  const openWidgetEdit = (widget: WidgetItem) => {
    setEditingWidget(widget);
    setWName(widget.name);
    setWGreeting(widget.greeting);
    setWColor(widget.color);
    setWPosition(widget.position);
    setWActive(widget.isActive);
    setWOfflineMsg(widget.offlineMsg);
    setWCannedResponses(
      Array.isArray(widget.cannedResponses)
        ? (widget.cannedResponses as CannedResponse[])
        : []
    );
    setWidgetDialogOpen(true);
  };

  const handleSaveWidget = () => {
    startTransition(async () => {
      const payload = {
        name: wName,
        greeting: wGreeting,
        color: wColor,
        position: wPosition,
        isActive: wActive,
        offlineMsg: wOfflineMsg,
        cannedResponses: wCannedResponses,
      };
      if (editingWidget) {
        const updated = await updateChatWidget(editingWidget.id, payload);
        setWidgets((prev) =>
          prev.map((w: WidgetItem) =>
            w.id === editingWidget.id ? { ...w, ...updated } : w
          )
        );
      } else {
        const created = await createChatWidget(payload);
        setWidgets((prev) => [created, ...prev]);
      }
      setWidgetDialogOpen(false);
    });
  };

  const addCannedResponse = () => {
    if (!newShortcut.trim() || !newCannedText.trim()) return;
    setWCannedResponses([
      ...wCannedResponses,
      { shortcut: newShortcut.trim(), text: newCannedText.trim() },
    ]);
    setNewShortcut("");
    setNewCannedText("");
  };

  const removeCanned = (idx: number) => {
    setWCannedResponses(wCannedResponses.filter((_, i) => i !== idx));
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConvo) return;
    startTransition(async () => {
      await addChatMessage(selectedConvo.id, {
        text: messageText,
        sender: "Agent",
        isAgent: true,
      });
      const messages = Array.isArray(selectedConvo.messages)
        ? [...selectedConvo.messages]
        : [];
      messages.push({
        sender: "Agent",
        text: messageText,
        timestamp: new Date().toISOString(),
        isAgent: true,
      });
      const updated = { ...selectedConvo, messages };
      setSelectedConvo(updated);
      setConversations((prev) =>
        prev.map((c: ConvoItem) => (c.id === selectedConvo.id ? updated : c))
      );
      setMessageText("");
    });
  };

  const handleClose = (convoId: string) => {
    startTransition(async () => {
      await closeConversation(convoId);
      setConversations((prev) =>
        prev.map((c: ConvoItem) =>
          c.id === convoId ? { ...c, status: "CLOSED" } : c
        )
      );
      if (selectedConvo?.id === convoId) {
        setSelectedConvo((prev: ConvoItem | null) =>
          prev ? { ...prev, status: "CLOSED" } : null
        );
      }
    });
  };

  const handleResolve = (convoId: string) => {
    startTransition(async () => {
      await resolveConversation(convoId);
      setConversations((prev) =>
        prev.map((c: ConvoItem) =>
          c.id === convoId ? { ...c, status: "RESOLVED" } : c
        )
      );
      if (selectedConvo?.id === convoId) {
        setSelectedConvo((prev: ConvoItem | null) =>
          prev ? { ...prev, status: "RESOLVED" } : null
        );
      }
    });
  };

  const applyCannedResponse = (text: string) => {
    setMessageText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Chat</h1>
          <p className="text-muted-foreground">
            Manage chat widgets and conversations
          </p>
        </div>
      </div>

      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations">
            <MessageCircle className="h-4 w-4 mr-2" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="widgets">
            <Settings className="h-4 w-4 mr-2" />
            Widgets
          </TabsTrigger>
        </TabsList>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {filteredConvos.length} conversation
              {filteredConvos.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {filteredConvos.length === 0 && !selectedConvo ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  No conversations
                </h3>
                <p className="text-muted-foreground text-sm">
                  Conversations will appear here when visitors start chatting
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
              {/* Conversation list */}
              <Card className="lg:col-span-1 overflow-hidden flex flex-col">
                <CardHeader className="pb-2 shrink-0">
                  <CardTitle className="text-sm">Conversations</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                  {filteredConvos.map((convo: ConvoItem) => {
                    const msgs = Array.isArray(convo.messages)
                      ? convo.messages
                      : [];
                    const lastMsg =
                      msgs.length > 0 ? msgs[msgs.length - 1] : null;
                    return (
                      <div
                        key={convo.id}
                        className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedConvo?.id === convo.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedConvo(convo)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">
                            {convo.visitorName || "Anonymous"}
                          </span>
                          <Badge
                            className={`text-[10px] ${
                              STATUS_COLORS[convo.status] || ""
                            }`}
                            variant="secondary"
                          >
                            {convo.status}
                          </Badge>
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMsg.text}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{convo.widget?.name}</span>
                          <span>
                            {new Date(convo.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Message thread */}
              <Card className="lg:col-span-2 overflow-hidden flex flex-col">
                {selectedConvo ? (
                  <>
                    <CardHeader className="pb-2 shrink-0 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">
                            {selectedConvo.visitorName || "Anonymous"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {selectedConvo.visitorEmail || "No email"}{" "}
                            {selectedConvo.assignedTo
                              ? `| Assigned to ${selectedConvo.assignedTo.name}`
                              : "| Unassigned"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedConvo.status !== "RESOLVED" &&
                            selectedConvo.status !== "CLOSED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleResolve(selectedConvo.id)
                                }
                                disabled={pending}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Resolve
                              </Button>
                            )}
                          {selectedConvo.status !== "CLOSED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClose(selectedConvo.id)}
                              disabled={pending}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Close
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                      {(Array.isArray(selectedConvo.messages)
                        ? selectedConvo.messages
                        : []
                      ).map((msg: MessageItem, idx: number) => (
                        <div
                          key={idx}
                          className={`flex ${
                            msg.isAgent ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 ${
                              msg.isAgent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{msg.text}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                msg.isAgent
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {msg.sender}{" "}
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </CardContent>

                    {/* Canned responses quick bar */}
                    {selectedConvo.status !== "CLOSED" && (
                      <>
                        {widgets.length > 0 && (
                          <div className="px-4 pb-1">
                            {(() => {
                              const widget = widgets.find(
                                (w: WidgetItem) =>
                                  w.id === selectedConvo.widgetId
                              );
                              const canned = widget?.cannedResponses as
                                | CannedResponse[]
                                | undefined;
                              if (!canned || canned.length === 0) return null;
                              return (
                                <div className="flex gap-1 flex-wrap">
                                  {canned.map(
                                    (cr: CannedResponse, i: number) => (
                                      <Button
                                        key={i}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-6"
                                        onClick={() =>
                                          applyCannedResponse(cr.text)
                                        }
                                      >
                                        <Zap className="h-3 w-3 mr-1" />
                                        {cr.shortcut}
                                      </Button>
                                    )
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        <div className="p-4 pt-2 border-t shrink-0">
                          <div className="flex gap-2">
                            <Input
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Type a message..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={!messageText.trim() || pending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">
                        Select a conversation to view messages
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={openWidgetCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Widget
            </Button>
          </div>

          {widgets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No chat widgets</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create a widget to enable live chat on your site
                </p>
                <Button onClick={openWidgetCreate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Widget
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {widgets.map((widget: WidgetItem) => (
                <Card key={widget.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {widget.name}
                      </CardTitle>
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: widget.color }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={widget.isActive ? "default" : "secondary"}
                      >
                        {widget.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Position</span>
                      <span className="capitalize">
                        {widget.position.replace("-", " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Conversations
                      </span>
                      <span>{widget._count?.conversations ?? 0}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic truncate">
                      &ldquo;{widget.greeting}&rdquo;
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openWidgetEdit(widget)}
                    >
                      <Settings className="h-3.5 w-3.5 mr-2" />
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Widget Create/Edit Dialog */}
      <Dialog open={widgetDialogOpen} onOpenChange={setWidgetDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWidget ? "Configure Widget" : "New Chat Widget"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Widget Name</Label>
                <Input
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  placeholder="Support Chat"
                />
              </div>
              <div className="space-y-2">
                <Label>Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={wColor}
                    onChange={(e) => setWColor(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={wColor}
                    onChange={(e) => setWColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Greeting Message</Label>
              <Input
                value={wGreeting}
                onChange={(e) => setWGreeting(e.target.value)}
                placeholder="Hi! How can we help you?"
              />
            </div>

            <div className="space-y-2">
              <Label>Offline Message</Label>
              <Input
                value={wOfflineMsg}
                onChange={(e) => setWOfflineMsg(e.target.value)}
                placeholder="We're offline. Leave a message!"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={wPosition} onValueChange={(v) => v && setWPosition(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={wActive} onCheckedChange={setWActive} />
                <Label>Active</Label>
              </div>
            </div>

            {/* Canned Responses */}
            <div className="space-y-3">
              <Label>Canned Responses</Label>
              {wCannedResponses.length > 0 && (
                <div className="space-y-2">
                  {wCannedResponses.map((cr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm bg-muted/50 rounded p-2"
                    >
                      <Badge variant="outline" className="shrink-0">
                        /{cr.shortcut}
                      </Badge>
                      <span className="flex-1 truncate">{cr.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCanned(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <Input
                  value={newShortcut}
                  onChange={(e) => setNewShortcut(e.target.value)}
                  placeholder="Shortcut"
                />
                <Input
                  value={newCannedText}
                  onChange={(e) => setNewCannedText(e.target.value)}
                  placeholder="Response text"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCannedResponse();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCannedResponse}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWidgetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWidget}
              disabled={!wName.trim() || pending}
            >
              {pending
                ? "Saving..."
                : editingWidget
                  ? "Update Widget"
                  : "Create Widget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
