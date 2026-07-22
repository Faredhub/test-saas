"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
  Upload,
  Folder,
  FolderPlus,
  Filter,
  BarChart3,
  Layers,
  LayoutGrid,
  ListFilter,
  User,
  FileSpreadsheet,
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

  // New Management state extensions
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [folders, setFolders] = useState<string[]>(["Financials", "Site Photos", "Contracts", "CAD Drawings", "General"]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const budget = Number(project.budget ?? 0);
  const spent = Number(project.spent ?? 0);
  const budgetPercent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  // Compute stats for Dashboard
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let dailyTasks = 0;
  let weeklyTasks = 0;
  let monthlyTasks = 0;
  let totalTasks = 0;

  project.tasks.forEach((t) => {
    if (t.status === "DONE") {
      totalTasks++;
      // @ts-ignore - updatedAt might be a string or date depending on prisma serialization
      const d = new Date(t.updatedAt || now);
      if (d >= todayStart) dailyTasks++;
      if (d >= weekStart) weeklyTasks++;
      if (d >= monthStart) monthlyTasks++;
    }
  });

  let dailyHours = 0;
  let weeklyHours = 0;
  let monthlyHours = 0;
  let totalHours = 0;

  project.timesheets.forEach((ts) => {
    const d = new Date(ts.date);
    const h = Number(ts.hours);
    totalHours += h;
    if (d >= todayStart) dailyHours += h;
    if (d >= weekStart) weeklyHours += h;
    if (d >= monthStart) monthlyHours += h;
  });

  const taskChartData = [
    { name: "Daily", value: dailyTasks },
    { name: "Weekly", value: weeklyTasks },
    { name: "Monthly", value: monthlyTasks },
    { name: "Total", value: totalTasks },
  ];

  const hoursChartData = [
    { name: "Daily", value: dailyHours },
    { name: "Weekly", value: weeklyHours },
    { name: "Monthly", value: monthlyHours },
    { name: "Total", value: totalHours },
  ];

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
        const rawFileName = formData.get("fileName") as string;
        const displayName = formData.get("name") as string;
        const targetFolder = (formData.get("folder") as string) || "General";

        // Automatic Revision Naming if same name file exists
        const sameNameFiles = project.projectFiles.filter(
          (f) => f.fileName.toLowerCase() === rawFileName.toLowerCase() || f.name.toLowerCase() === displayName.toLowerCase()
        );

        let finalFileName = rawFileName;
        let finalVersion = 1;
        if (sameNameFiles.length > 0) {
          finalVersion = sameNameFiles.length + 1;
          const extIdx = rawFileName.lastIndexOf(".");
          if (extIdx !== -1) {
            finalFileName = `${rawFileName.substring(0, extIdx)}_v${finalVersion}${rawFileName.substring(extIdx)}`;
          } else {
            finalFileName = `${rawFileName}_v${finalVersion}`;
          }
          toast.info(`Same name file detected. Automatically saved as revision ${finalFileName} (v${finalVersion}).`);
        }

        await createProjectFile({
          projectId: project.id,
          name: `${displayName} [${targetFolder}]`,
          fileName: finalFileName,
          fileSize: formData.get("fileSize") ? Number(formData.get("fileSize")) : undefined,
          mimeType: (formData.get("mimeType") as string) || undefined,
        });
        toast.success("File added successfully");
        setFileDialogOpen(false);
      } catch {
        toast.error("Failed to add file");
      }
    });
  }

  function handleAddFolder() {
    if (!newFolderName.trim()) return;
    if (!folders.includes(newFolderName.trim())) {
      setFolders((prev) => [...prev, newFolderName.trim()]);
      toast.success(`Folder '${newFolderName.trim()}' created`);
    }
    setNewFolderName("");
    setFolderDialogOpen(false);
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
        <div className="flex items-center gap-2">
          <Link href="/office/spreadsheets?template=project-management&source=projects">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary font-semibold"
              title="Bulk Upload (Clicking it will open Knnect360 Spreadsheet to fill, Header will be located as per input columns)"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </Button>
          </Link>

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
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-4 bg-muted/60 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><TrendingUp className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="milestones" className="gap-1.5"><Layers className="h-4 w-4" /> Milestone</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><CheckCircle2 className="h-4 w-4" /> Task</TabsTrigger>
          <TabsTrigger value="timesheets" className="gap-1.5"><Clock className="h-4 w-4" /> Timesheet</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><Folder className="h-4 w-4" /> Files</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Individual Project Milestone Completion Banner */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-blue-950">Individual Project Milestone Completion</CardTitle>
                  <CardDescription className="text-blue-700">Milestone completion status for {project.name}</CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white text-sm px-3 py-1 font-semibold">
                  {project.milestones.length > 0
                    ? `${Math.round((project.milestones.filter(m => m.isCompleted).length / project.milestones.length) * 100)}% Completed`
                    : "No Milestones"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-blue-900">
                  <span>Completed: {project.milestones.filter(m => m.isCompleted).length} / {project.milestones.length} Milestones</span>
                  <span>{project.milestones.length > 0 ? Math.round((project.milestones.filter(m => m.isCompleted).length / project.milestones.length) * 100) : 0}%</span>
                </div>
                <div className="h-3 w-full bg-blue-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${project.milestones.length > 0 ? Math.round((project.milestones.filter(m => m.isCompleted).length / project.milestones.length) * 100) : 0}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Velocity</CardTitle>
                <CardDescription>Completed tasks over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-blue-600">{dailyTasks}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Daily</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-amber-600">{weeklyTasks}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Weekly</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-purple-600">{monthlyTasks}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Monthly</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-green-600">{totalTasks}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employee Hours Logged</CardTitle>
                <CardDescription>Timesheet hours logged per employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-blue-600">{dailyHours}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Daily</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-amber-600">{weeklyHours}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Weekly</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-purple-600">{monthlyHours}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Monthly</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl font-bold text-green-600">{totalHours}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Milestones (Parent) & Interlinked Tasks (Child)</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/projects/${project.id}/gantt`}>
                <Button variant="outline" size="sm" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <BarChart3 className="h-4 w-4" /> View Gantt Chart
                </Button>
              </Link>

              <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
                <DialogTrigger render={<Button />}>
                  <Plus className="mr-2 h-4 w-4" /> Add Milestone
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Project Milestone</DialogTitle>
                  </DialogHeader>
                  <form action={handleCreateMilestone} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="msTitle">Milestone Name *</Label>
                      <Input id="msTitle" name="title" required placeholder="Ex: Earthwork excavation / Pouring of Concrete" />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] text-muted-foreground mr-1">Presets:</span>
                        {["Earthwork excavation", "Pouring of Concrete", "Site Preparation", "Foundation Work", "Structural Framing", "Electrical & Plumbing"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("msTitle") as HTMLInputElement;
                              if (el) el.value = preset;
                            }}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 border px-1.5 py-0.5 rounded"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="msDesc">Description & Scope</Label>
                      <Textarea id="msDesc" name="description" rows={2} placeholder="Scope of milestone work..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="msDueDate">Due Date</Label>
                        <Input id="msDueDate" name="dueDate" type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="msDays">Number of Days (Est.)</Label>
                        <Input id="msDays" name="estimatedDays" type="number" placeholder="Ex: 14" defaultValue="7" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Milestone
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Done</TableHead>
                    <TableHead>Milestone Name (Parent)</TableHead>
                    <TableHead>Interlinked Tasks (Child)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.milestones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No milestones yet. Create your first milestone (e.g., Earthwork excavation, Pouring of Concrete).
                      </TableCell>
                    </TableRow>
                  ) : (
                    project.milestones.map((ms) => (
                      <TableRow key={ms.id} className={ms.isCompleted ? "opacity-60" : ""}>
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
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {ms.isCompleted ? <span className="line-through">{ms.title}</span> : ms.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                            <Layers className="h-3 w-3" />
                            {project.tasks.filter(t => t.parentId === ms.id).length} Linked Tasks
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{ms.description || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={ms.isCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                            {ms.isCompleted ? "Completed" : "In Progress"}
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

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md p-1 bg-muted/40">
                <Button
                  variant={taskViewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setTaskViewMode("kanban")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Drag & Drop Kanban
                </Button>
                <Button
                  variant={taskViewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setTaskViewMode("table")}
                >
                  <ListFilter className="h-3.5 w-3.5" /> Table Style
                </Button>
              </div>
            </div>

            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create & Assign Task</DialogTitle>
                </DialogHeader>
                <form action={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title *</Label>
                    <Input id="title" name="title" required placeholder="Ex: Site Visit, Survey Work, Planning, Design, Estimation" />
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground mr-1">Types:</span>
                      {["Site Visit", "Survey Work", "Planning", "Design", "Estimation", "Execution", "Inspection"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("title") as HTMLInputElement;
                            if (el) el.value = type;
                          }}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 border px-1.5 py-0.5 rounded"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
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
                    <Input id="estimatedHours" name="estimatedHours" type="number" step="0.5" placeholder="8" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button type="button" variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Task
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {taskViewMode === "kanban" ? (
            /* Kanban Board */
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
                        <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow">
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
                          <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t ml-5">
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
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
          ) : (
            /* Table Style View */
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Est. Hours</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tasks created yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      project.tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{task.title}</div>
                              {task.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">{task.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {task.estimatedHours ? `${task.estimatedHours}h` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTask(task.id)}
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
          )}
        </TabsContent>

        {/* Timesheets Tab */}
        <TabsContent value="timesheets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" /> Employee Timesheets (HR Linked)
                </CardTitle>
                <CardDescription>
                  Timesheets interlinked with HR Employees module to track logged hours per employee.
                </CardDescription>
              </div>
              <Link href="/projects/timesheets">
                <Button variant="outline" size="sm">
                  Manage All Employee Timesheets
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Logged Hours</TableHead>
                    <TableHead>Description / Task Work</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Approval Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.timesheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No time entries logged for this project yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    project.timesheets.map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell className="font-medium text-xs">
                          {new Date(ts.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-bold text-sm text-blue-600">{Number(ts.hours).toFixed(1)} hrs</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Folder Selector */}
              <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/40 text-xs">
                <Folder className="h-3.5 w-3.5 text-blue-600 ml-1" />
                <span className="font-medium text-muted-foreground mr-1">Folder:</span>
                <button
                  onClick={() => setSelectedFolder("all")}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${selectedFolder === "all" ? "bg-background shadow font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
                {folders.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFolder(f)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${selectedFolder === f ? "bg-background shadow font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Format Filter */}
              <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/40 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-600 ml-1" />
                <span className="font-medium text-muted-foreground mr-1">Format:</span>
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="bg-transparent text-xs outline-none cursor-pointer"
                >
                  <option value="all">All Formats</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="image">Images (PNG/JPG)</option>
                  <option value="spreadsheet">Spreadsheets (XLSX/CSV)</option>
                  <option value="document">Text/Word Documents</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1" />}>
                  <FolderPlus className="h-4 w-4" /> Create Folder
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="folderName">Folder Name</Label>
                      <Input
                        id="folderName"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Ex: Financials, CAD Drawings, Site Photos"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                      <Button onClick={handleAddFolder}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
                <DialogTrigger render={<Button size="sm" className="gap-1" />}>
                  <Plus className="h-4 w-4" /> Upload File
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Project File</DialogTitle>
                  </DialogHeader>
                  <form action={handleCreateFile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Title *</Label>
                      <Input id="name" name="name" required placeholder="Ex: Site Survey Plan" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fileNamePath">File Name *</Label>
                      <Input id="fileNamePath" name="fileName" required placeholder="site_survey.pdf" />
                      <p className="text-[11px] text-muted-foreground">
                        If a file with the same name exists, revision version naming (v2, v3...) will be done automatically.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="folder">Folder Category</Label>
                      <Select name="folder" defaultValue="General">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {folders.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fileSize">File Size (bytes)</Label>
                        <Input id="fileSize" name="fileSize" type="number" placeholder="204800" />
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
                        Upload
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.projectFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No project files uploaded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    project.projectFiles
                      .filter((file) => {
                        if (selectedFolder !== "all" && !file.name.includes(`[${selectedFolder}]`)) {
                          return false;
                        }
                        if (formatFilter !== "all") {
                          const fn = file.fileName.toLowerCase();
                          if (formatFilter === "pdf" && !fn.endsWith(".pdf")) return false;
                          if (formatFilter === "image" && !fn.match(/\.(png|jpg|jpeg|gif|webp)$/)) return false;
                          if (formatFilter === "spreadsheet" && !fn.match(/\.(xlsx|csv|xls)$/)) return false;
                          if (formatFilter === "document" && !fn.match(/\.(doc|docx|txt)$/)) return false;
                        }
                        return true;
                      })
                      .map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              {file.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{file.fileName}</TableCell>
                          <TableCell className="text-xs">
                            {file.fileSize > 0
                              ? file.fileSize > 1024 * 1024
                                ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                : `${(file.fileSize / 1024).toFixed(1)} KB`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{file.mimeType || "File"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 font-mono text-[10px]">
                              v{file.version}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 h-8 w-8 p-0"
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
