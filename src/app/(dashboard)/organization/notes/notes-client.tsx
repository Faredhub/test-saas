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
import { Plus, Loader2, Pin, StickyNote, ListTodo, Users, Trash2, Square, CheckSquare } from "lucide-react";
import { createNote, deleteNote, toggleNoteComplete } from "@/lib/actions/organization";
import { toast } from "sonner";
import { format } from "date-fns";

type Note = Awaited<ReturnType<typeof import("@/lib/actions/organization").getNotes>>[number];

type NotesClientProps = {
  initialData: Note[];
};

export function NotesClient({ initialData }: NotesClientProps) {
  const [activeTab, setActiveTab] = useState<"NOTE" | "TODO">("NOTE");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const dueDate = formData.get("dueDate") as string;
        await createNote({
          title: formData.get("title") as string,
          content: formData.get("content") as string || undefined,
          type: (formData.get("type") as string) as "NOTE" | "TODO",
          isShared: formData.get("isShared") === "on",
          dueDate: dueDate || undefined,
        });
        toast.success("Created successfully");
        setIsOpen(false);
      } catch {
        toast.error("Failed to create");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteNote(id);
        toast.success("Deleted successfully");
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleNoteComplete(id);
        toast.success("Updated");
      } catch {
        toast.error("Failed to update");
      }
    });
  }

  const notes = initialData.filter((n) => n.type === "NOTE");
  const todos = initialData.filter((n) => n.type === "TODO");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes & To-Do</h1>
          <p className="text-sm text-muted-foreground">Personal notes and task tracking</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create New
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Note / To-Do</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" name="content" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    name="type"
                    id="type"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="NOTE">Note</option>
                    <option value="TODO">To-Do</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (for To-Do)</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isShared" name="isShared" className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="isShared">Share with team</Label>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("NOTE")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "NOTE"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <StickyNote className="h-4 w-4" />
          Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab("TODO")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "TODO"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListTodo className="h-4 w-4" />
          To-Do ({todos.length})
        </button>
      </div>

      {/* Notes Tab */}
      {activeTab === "NOTE" && (
        <>
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <StickyNote className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No notes yet. Create your first note to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <Card key={note.id} className={note.isPinned ? "border-amber-300" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {note.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                        <CardTitle className="text-base">{note.title}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleDelete(note.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {note.content && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                        {note.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {note.isShared && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Todo Tab */}
      {activeTab === "TODO" && (
        <>
          {todos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ListTodo className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No to-do items yet. Create your first to-do to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <Card key={todo.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(todo.id)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {todo.isCompleted ? (
                          <CheckSquare className="h-5 w-5 text-green-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <span className={`text-sm font-medium ${todo.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {todo.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {todo.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due: {format(new Date(todo.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          {todo.isShared && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(todo.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
