"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Square,
  Plus,
  Loader2,
  Trash2,
  ListTodo,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  getNotes,
  createNote,
  toggleNoteComplete,
  deleteNote,
} from "@/lib/actions/organization";
import { toast } from "sonner";

type Note = Awaited<ReturnType<typeof getNotes>>[number];

export function SidebarTodoWidget() {
  const pathname = usePathname();
  const [todos, setTodos] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load persistence state and run fetch
  useEffect(() => {
    setHasMounted(true);
    const saved = localStorage.getItem("sidebar_todo_expanded");
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  const fetchTodos = async () => {
    try {
      const data = await getNotes();
      // Show only incomplete TODO items in this quick widget
      const pendingTodos = data.filter((n) => n.type === "TODO" && !n.isCompleted);
      setTodos(pendingTodos);
    } catch (error) {
      console.error("Failed to fetch sidebar todos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when pathname changes (e.g. user navigates) or on mount
  useEffect(() => {
    fetchTodos();
  }, [pathname]);

  const toggleExpansion = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    localStorage.setItem("sidebar_todo_expanded", String(nextState));
  };

  const handleToggleComplete = (id: string) => {
    // Optimistic UI update: fade out the item immediately
    setTodos((prev) => prev.filter((t) => t.id !== id));
    
    startTransition(async () => {
      try {
        await toggleNoteComplete(id);
        toast.success("Task completed");
      } catch (error) {
        toast.error("Failed to update task");
        fetchTodos(); // Revert on failure
      }
    });
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createNote({
        title: newTodo.trim(),
        type: "TODO",
      });
      // Append new item to the top
      setTodos((prev) => [created, ...prev]);
      setNewTodo("");
      toast.success("Task added");
    } catch (error) {
      toast.error("Failed to add task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    
    startTransition(async () => {
      try {
        await deleteNote(id);
        toast.success("Task deleted");
      } catch (error) {
        toast.error("Failed to delete task");
        fetchTodos(); // Revert on failure
      }
    });
  };

  if (!hasMounted) return null;

  return (
    <div className="mx-3 mb-3 p-3 rounded-2xl bg-muted/40 border border-muted/50 backdrop-blur-md transition-all duration-300">
      {/* Widget Header */}
      <button
        onClick={toggleExpansion}
        className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="font-semibold text-[10px] tracking-wider text-muted-foreground/80 group-hover:text-foreground uppercase flex items-center gap-1.5 transition-colors">
          <ListTodo className="h-3.5 w-3.5 text-primary/70" />
          To-Do Checklist
          {todos.length > 0 && (
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {todos.length}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {/* Task List */}
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
                </div>
              ) : todos.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/75 py-2 text-center">
                  All caught up! 🎉
                </p>
              ) : (
                <div className="max-h-[160px] overflow-y-auto pr-0.5 space-y-1.5 scrollbar-thin">
                  <AnimatePresence initial={false}>
                    {todos.slice(0, 4).map((todo) => (
                      <motion.div
                        key={todo.id}
                        layout
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex items-center justify-between rounded-lg p-1.5 hover:bg-background/40 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => handleToggleComplete(todo.id)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-foreground shrink-0 focus:outline-none"
                          >
                            <Square className="h-4 w-4 text-muted-foreground/60 hover:text-primary transition-colors" />
                          </button>
                          <span className="text-xs text-foreground/80 font-medium truncate">
                            {todo.title}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          disabled={isPending}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity p-0.5"
                          title="Delete task"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {todos.length > 4 && (
                    <p className="text-[9px] text-center text-muted-foreground/70 font-medium pt-0.5">
                      + {todos.length - 4} more items
                    </p>
                  )}
                </div>
              )}

              {/* Quick Add Form */}
              <form onSubmit={handleAddTodo} className="relative mt-2">
                <input
                  type="text"
                  placeholder="Add a task..."
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  disabled={isSubmitting}
                  className="h-8 bg-background/50 border border-input rounded-xl px-2.5 pr-8 text-xs w-full focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50 transition-all focus:border-primary/45"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newTodo.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-lg hover:bg-primary hover:text-primary-foreground text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-all duration-150"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>

              {/* View All Link */}
              <div className="pt-1 flex justify-center">
                <Link
                  href="/organization/notes"
                  className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span>Manage tasks</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
