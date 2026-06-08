"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  GripVertical,
  Trash2,
  FileText,
  Calendar,
  IndianRupee,
  TrendingUp,
  Ban,
} from "lucide-react";
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  createMilestone,
  completeMilestone,
  updateProject,
  createProjectFile,
  deleteProjectFile,
} from "@/lib/actions/projects";
import { toast } from "sonner";
import type { getProject } from "@/lib/actions/projects";

type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;

const statusColors: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  ON_HOLD: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const taskStatusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  TODO: { label: "To Do", icon: Circle, color: "bg-slate-100 text-slate-700" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "bg-blue-100 text-blue-700" },
  IN_REVIEW: { label: "In Review", icon: AlertCircle, color: "bg-purple-100 text-purple-700" },
  DONE: { label: "Done", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  BLOCKED: { label: "Blocked", icon: Ban, color: "bg-red-100 text-red-700" },
};

const kanbanColumns = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

export function ProjectDetailClient({ project }: { project: Project }) {
  const [isPending, startTransition] = useTransition();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const budget = Number(project.budget ?? 0);
  const spent = Number(project.spent ?? 0);
  const budgetPercent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  async function handleCreateTask(formData: FormData) {
    startTransition(async () => {
      try {
        await createTask({
          projectId: project.id,
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          priority: formData.get("priority") as string,
          dueDate: formData.get("dueDate") as string,
          estimatedHours: formData.get("estimatedHours")
            ? Number(formData.get("estimatedHours"))
            : undefined,
        });
        toast.success("Task created");
        setTaskDialogOpen(false);
      } catch {
        toast.error("Failed to create task");
      }
    });
  }

  async function handleMoveTask(taskId: string, newStatus: string) {
    startTransition(async () => {
      try {
        await updateTaskStatus(
          taskId,
          newStatus as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED"
        );
        toast.success("Task updated");
      } catch {
        toast.error("Failed to update task");
      }
    });
  }

  async function handleDeleteTask(taskId: string) {
    startTransition(async () => {
      try {
        await deleteTask(taskId);
        toast.success("Task deleted");
      } catch {
        toast.error("Failed to delete task");
      }
    });
  }

  async function handleCreateMilestone(formData: FormData) {
    startTransition(async () => {
      try {
        await createMilestone({
          projectId: project.id,
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          dueDate: formData.get("dueDate") as string,
        });
        toast.success("Milestone created");
        setMilestoneDialogOpen(false);
      } catch {
        toast.error("Failed to create milestone");
      }
    });
  }

  async function handleToggleMilestone(id: string) {
    startTransition(async () => {
      try {
        await completeMilestone(id);
        toast.success("Milestone updated");
      } catch {
        toast.error("Failed to update milestone");
      }
    });
  }

  async function handleUpdateStatus(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProject(project.id, {
          status: formData.get("status") as
            | "PLANNING"
            | "IN_PROGRESS"
            | "ON_HOLD"
            | "COMPLETED"
            | "CANCELLED",
        });
        toast.success("Project status updated");
        setStatusDialogOpen(false);
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  async function handleCreateFile(formData: FormData) {
    startTransition(async () => {
      try {
        await createProjectFile({
          projectId: project.id,
          name: formData.get("name") as string,
          fileName: formData.get("fileName") as string,
          fileSize: formData.get("fileSize") ? Number(formData.get("fileSize")) : undefined,
          mimeType: (formData.get("mimeType") as string) || undefined,
        });
        toast.success("File record added");
        setFileDialogOpen(false);
      } catch {
        toast.error("Failed to add file");
      }
    });
  }

  async function handleDeleteFile(fileId: string) {
    startTransition(async () => {
      try {
        await deleteProjectFile(fileId);
        toast.success("File deleted");
      } catch {
        toast.error("Failed to delete file");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status] || ""} variant="secondary">
                {project.status.replace("_", " ")}
              </Badge>
              {project.code && (
                <span className="text-muted-foreground text-sm">{project.code}</span>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogTrigger render={<Button variant="outline" />}>
            Change Status
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Project Status</DialogTitle>
            </DialogHeader>
            <form action={handleUpdateStatus} className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={project.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.progress}%</div>
            <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.tasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {project.tasks.filter((t) => t.status === "DONE").length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budget > 0 ? `₹${budget.toLocaleString()}` : "-"}
            </div>
            {budget > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  ₹{spent.toLocaleString()} spent ({budgetPercent}%)
                </p>
                <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${budgetPercent > 90 ? "bg-red-500" : budgetPercent > 70 ? "bg-amber-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString()
                : "Not set"}
            </div>
            <p className="text-xs text-muted-foreground">
              to{" "}
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString()
                : "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Tasks Tab - Kanban */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <form action={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" name="title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskDesc">Description</Label>
                    <Textarea id="taskDesc" name="description" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select name="priority" defaultValue="MEDIUM">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input id="dueDate" name="dueDate" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input
                      id="estimatedHours"
                      name="estimatedHours"
                      type="number"
                      step="0.5"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button type="button" variant="outline" />}>
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

          {/* Kanban Board */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {kanbanColumns.map((col) => {
              const config = taskStatusConfig[col];
              const Icon = config.icon;
              const colTasks = project.tasks.filter((t) => t.status === col);

              return (
                <div key={col} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{config.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {colTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium text-sm truncate">{task.title}</p>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-5">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 ml-5">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  task.priority === "HIGH" || task.priority === "CRITICAL"
                                    ? "bg-red-100 text-red-700"
                                    : task.priority === "MEDIUM"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {task.priority}
                              </Badge>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2 ml-5">
                          <Select
                            value={task.status}
                            onValueChange={(val) => { if (val) handleMoveTask(task.id, val); }}
                          >
                            <SelectTrigger className="h-7 text-xs w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TODO">To Do</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="IN_REVIEW">In Review</SelectItem>
                              <SelectItem value="DONE">Done</SelectItem>
                              <SelectItem value="BLOCKED">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="flex items-center justify-center h-20 border border-dashed rounded-lg text-muted-foreground text-xs">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" /> Add Milestone
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Milestone</DialogTitle>
                </DialogHeader>
                <form action={handleCreateMilestone} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="msTitle">Title *</Label>
                    <Input id="msTitle" name="title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="msDesc">Description</Label>
                    <Textarea id="msDesc" name="description" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="msDueDate">Due Date</Label>
                    <Input id="msDueDate" name="dueDate" type="date" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Done</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.milestones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No milestones yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    project.milestones.map((ms) => (
                      <TableRow
                        key={ms.id}
                        className={ms.isCompleted ? "opacity-60" : ""}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleToggleMilestone(ms.id)}
                            disabled={isPending}
                          >
                            {ms.isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {ms.isCompleted ? (
                            <span className="line-through">{ms.title}</span>
                          ) : (
                            ms.title
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ms.description || "-"}
                        </TableCell>
                        <TableCell>
                          {ms.dueDate
                            ? new Date(ms.dueDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {ms.completedAt
                            ? new Date(ms.completedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timesheets Tab */}
        <TabsContent value="timesheets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Time Entries</CardTitle>
              <CardDescription>
                Time logged against this project.{" "}
                <Link href="/projects/timesheets" className="text-primary underline">
                  View all timesheets
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.timesheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No time entries yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    project.timesheets.map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell>
                          {new Date(ts.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{Number(ts.hours).toFixed(1)}h</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ts.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={ts.isBillable ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}>
                            {ts.isBillable ? "Billable" : "Non-billable"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              ts.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : ts.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }
                          >
                            {ts.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" /> Add File
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add File Record</DialogTitle>
                </DialogHeader>
                <form action={handleCreateFile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fileName">Display Name *</Label>
                    <Input id="fileName" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fileNamePath">File Name *</Label>
                    <Input id="fileNamePath" name="fileName" required placeholder="document.pdf" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fileSize">File Size (bytes)</Label>
                      <Input id="fileSize" name="fileSize" type="number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mimeType">MIME Type</Label>
                      <Input id="mimeType" name="mimeType" placeholder="application/pdf" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button type="button" variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.projectFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No files yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    project.projectFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {file.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{file.fileName}</TableCell>
                        <TableCell>
                          {file.fileSize > 0
                            ? file.fileSize > 1024 * 1024
                              ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                              : `${(file.fileSize / 1024).toFixed(1)} KB`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{file.mimeType}</TableCell>
                        <TableCell>v{file.version}</TableCell>
                        <TableCell>
                          {new Date(file.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
