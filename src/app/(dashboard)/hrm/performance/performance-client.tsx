"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Loader2, Star, Target, TrendingUp, Pencil, Upload, Download, Eye, Trash2,
} from "lucide-react";
import {
  getPerformanceReviews,
  createPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getEmployees,
  importPerformanceReviews,
  importGoals,
  getCurrentEmployee,
} from "@/lib/actions/hrm";
import { getUsersWithRoles } from "@/lib/actions/rbac";
import * as XLSX from "xlsx";
import { toast } from "sonner";


type ReviewsData = Awaited<ReturnType<typeof getPerformanceReviews>>;
type GoalsData = Awaited<ReturnType<typeof getGoals>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;
type UsersData = Awaited<ReturnType<typeof getUsersWithRoles>>;

const reviewStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SELF_REVIEW: "bg-blue-100 text-blue-700",
  MANAGER_REVIEW: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  ACKNOWLEDGED: "bg-purple-100 text-purple-700",
};

const goalStatusColors: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  OVERDUE: "bg-orange-100 text-orange-700",
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${onChange ? "cursor-pointer" : ""}`}
          onClick={() => onChange?.(star)}
        />
      ))}
    </div>
  );
}

function getGoalReview(keyResults: any) {
  if (!keyResults) return null;
  let items: any[] = [];
  try {
    items = typeof keyResults === "string" ? JSON.parse(keyResults) : keyResults;
  } catch {
    items = [];
  }
  if (!Array.isArray(items)) return null;
  const reviewObj = items.find((item: any) => item.isReview || item.title === "ManagerReview");
  if (!reviewObj) return null;
  return {
    rating: Number(reviewObj.rating || reviewObj.current || 0),
    comment: String(reviewObj.comment || reviewObj.unit || ""),
    reviewerName: reviewObj.reviewerName,
    reviewedAt: reviewObj.reviewedAt,
  };
}

export function PerformanceClient() {
  const [reviews, setReviews] = useState<ReviewsData | null>(null);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [users, setUsers] = useState<UsersData | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ employee: any; isAdmin: boolean } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editReview, setEditReview] = useState<ReviewsData["data"][0] | null>(null);
  const [viewReviewDetails, setViewReviewDetails] = useState<ReviewsData["data"][0] | null>(null);
  const [editGoal, setEditGoal] = useState<GoalsData["data"][0] | null>(null);
  const [reviewGoal, setReviewGoal] = useState<GoalsData["data"][0] | null>(null);
  const [reviewStarRating, setReviewStarRating] = useState<number>(5);
  const [reviewCommentsText, setReviewCommentsText] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  const goalFileInputRef = useRef<HTMLInputElement>(null);

  function handleDeleteReview(id: string) {
    if (!confirm("Are you sure you want to delete this performance review? This action cannot be undone.")) return;
    startTransition(async () => {
      try {
        const res = await deletePerformanceReview(id);
        if (res.success) {
          toast.success("Performance review deleted successfully");
          loadData();
        } else {
          toast.error(res.error || "Failed to delete review");
        }
      } catch {
        toast.error("Failed to delete review");
      }
    });
  }

  function loadData() {
    startTransition(async () => {
      try {
        const [revData, goalData, empData, userData, currEmp] = await Promise.all([
          getPerformanceReviews({ pageSize: 100 }),
          getGoals({ pageSize: 100 }),
          getEmployees({ pageSize: 100 }),
          getUsersWithRoles(),
          getCurrentEmployee(),
        ]);
        setReviews(revData);
        setGoals(goalData);
        setEmployees(empData);
        setUsers(userData);
        setSessionInfo(currEmp);
      } catch {
        toast.error("Failed to load data");
      }
    });
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateReview(formData: FormData) {
    startTransition(async () => {
      try {
        await createPerformanceReview({
          employeeId: formData.get("employeeId") as string,
          reviewerId: formData.get("reviewerId") as string,
          period: formData.get("period") as string,
          type: formData.get("type") as string,
          overallRating: Number(formData.get("overallRating")) || undefined,
          strengths: formData.get("strengths") as string || undefined,
          improvements: formData.get("improvements") as string || undefined,
          comments: formData.get("comments") as string || undefined,
        });
        toast.success("Review created");
        setReviewOpen(false);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create review");
      }
    });
  }

  async function handleUpdateReview(formData: FormData) {
    if (!editReview) return;
    startTransition(async () => {
      try {
        await updatePerformanceReview(editReview.id, {
          status: formData.get("status") as string,
          overallRating: Number(formData.get("overallRating")) || undefined,
          strengths: formData.get("strengths") as string || undefined,
          improvements: formData.get("improvements") as string || undefined,
          comments: formData.get("comments") as string || undefined,
        });
        toast.success("Review updated");
        setEditReview(null);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update review");
      }
    });
  }

  async function handleCreateGoal(formData: FormData) {
    startTransition(async () => {
      try {
        await createGoal({
          employeeId: formData.get("employeeId") as string,
          title: formData.get("title") as string,
          description: formData.get("description") as string || undefined,
          category: formData.get("category") as string,
          targetDate: formData.get("targetDate") as string || undefined,
          priority: formData.get("priority") as string,
        });
        toast.success("Goal created");
        setGoalOpen(false);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create goal");
      }
    });
  }

  async function handleUpdateGoal(formData: FormData) {
    if (!editGoal) return;
    startTransition(async () => {
      try {
        await updateGoal(editGoal.id, {
          title: formData.get("title") as string,
          description: formData.get("description") as string || undefined,
          progress: Number(formData.get("progress")) || 0,
          status: formData.get("status") as string,
        });
        toast.success("Goal updated");
        setEditGoal(null);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update goal");
      }
    });
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    startTransition(async () => {
      try {
        await deleteGoal(id);
        toast.success("Goal deleted successfully");
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete goal");
      }
    });
  }

  async function handleSaveGoalReview(formData: FormData) {
    if (!reviewGoal) return;
    const progress = Number(formData.get("progress")) || reviewGoal.progress;
    const status = (formData.get("status") as string) || reviewGoal.status;
    const comment = (formData.get("comment") as string) || reviewCommentsText;

    const reviewerName = sessionInfo?.employee 
      ? `${sessionInfo.employee.firstName} ${sessionInfo.employee.lastName}` 
      : "Manager";

    const keyResults = [
      {
        isReview: true,
        title: "ManagerReview",
        rating: reviewStarRating,
        comment,
        reviewerName,
        reviewedAt: new Date().toISOString(),
        target: 5,
        current: reviewStarRating,
        unit: comment,
      }
    ];

    startTransition(async () => {
      try {
        await updateGoal(reviewGoal.id, {
          progress,
          status,
          keyResults,
        });
        toast.success("Goal review and star rating submitted successfully!");
        setReviewGoal(null);
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review goal");
      }
    });
  }

  function handleDownloadReviewTemplate() {
    const headers = [
      {
        "Employee ID or Email": "EMP-001",
        "Reviewer Email or ID": "reviewer@example.com",
        "Period": "Q1 2026",
        "Type": "ANNUAL",
        "Overall Rating": 4,
        "Strengths": "Excellent communication skills and strong technical delivery.",
        "Improvements": "Could focus more on mentoring junior team members.",
        "Comments": "Great performance overall.",
        "Status": "DRAFT"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reviews Template");
    XLSX.writeFile(workbook, "performance_reviews_template.xlsx");
    toast.success("Reviews Excel template downloaded!");
  }

  function handleDownloadGoalTemplate() {
    const headers = [
      {
        "Employee ID or Email": "EMP-001",
        "Title": "Learn Next.js 16",
        "Description": "Understand App Router, server actions, and build a demo app.",
        "Category": "DEVELOPMENT",
        "Priority": "MEDIUM",
        "Target Date": "2026-12-31",
        "Progress": 20,
        "Status": "IN_PROGRESS"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Goals Template");
    XLSX.writeFile(workbook, "goals_template.xlsx");
    toast.success("Goals Excel template downloaded!");
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>, type: "reviews" | "goals") {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const fileData = evt.target?.result;
            if (!fileData) return;
            const workbook = XLSX.read(fileData, { type: "binary" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            if (type === "reviews") {
              const reviewsToImport = json.map((row) => ({
                employeeIdOrEmail: String(row.employeeIdOrEmail || row["Employee ID or Email"] || row["Employee ID"] || row["Employee Email"] || "").trim(),
                reviewerEmailOrId: String(row.reviewerEmailOrId || row["Reviewer Email or ID"] || row["Reviewer Email"] || row["Reviewer ID"] || "").trim(),
                period: String(row.period || row["Period"] || "").trim(),
                type: String(row.type || row["Type"] || "ANNUAL").trim(),
                overallRating: row.overallRating || row["Overall Rating"] ? Number(row.overallRating || row["Overall Rating"]) : undefined,
                strengths: String(row.strengths || row["Strengths"] || "").trim() || undefined,
                improvements: String(row.improvements || row["Improvements"] || row["Areas for Improvement"] || "").trim() || undefined,
                comments: String(row.comments || row["Comments"] || "").trim() || undefined,
                status: String(row.status || row["Status"] || "DRAFT").trim(),
              }));

              const res = await importPerformanceReviews(reviewsToImport);
              if (res && res.success) {
                if (res.errors && res.errors.length > 0) {
                  toast.warning(`Imported ${res.count} reviews with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                } else {
                  toast.success(`Successfully imported ${res.count} reviews!`);
                }
                loadData();
              } else {
                toast.error(res?.error || "Failed to import reviews");
              }
            } else {
              const goalsToImport = json.map((row) => ({
                employeeIdOrEmail: String(row.employeeIdOrEmail || row["Employee ID or Email"] || row["Employee ID"] || row["Employee Email"] || "").trim(),
                title: String(row.title || row["Title"] || "").trim(),
                description: String(row.description || row["Description"] || "").trim() || undefined,
                category: String(row.category || row["Category"] || "PERFORMANCE").trim(),
                priority: String(row.priority || row["Priority"] || "MEDIUM").trim(),
                targetDate: row.targetDate || row["Target Date"] ? String(row.targetDate || row["Target Date"]).trim() : undefined,
                progress: row.progress || row["Progress"] ? Number(row.progress || row["Progress"]) : undefined,
                status: String(row.status || row["Status"] || "NOT_STARTED").trim(),
              }));

              const res = await importGoals(goalsToImport);
              if (res && res.success) {
                if (res.errors && res.errors.length > 0) {
                  toast.warning(`Imported ${res.count} goals with some errors:\n${res.errors.slice(0, 3).join("\n")}`);
                } else {
                  toast.success(`Successfully imported ${res.count} goals!`);
                }
                loadData();
              } else {
                toast.error(res?.error || "Failed to import goals");
              }
            }
          } catch (err: any) {
            toast.error(`Error parsing Excel: ${err.message}`);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
      if (type === "reviews" && reviewFileInputRef.current) reviewFileInputRef.current.value = "";
      if (type === "goals" && goalFileInputRef.current) goalFileInputRef.current.value = "";
    });
  }

  const empList = employees?.data ?? [];

  const isManagerOrHR = sessionInfo ? (
    sessionInfo.isAdmin ||
    Boolean((sessionInfo as any).isHROrManager) ||
    Boolean(sessionInfo.employee?.designation?.name?.toLowerCase().includes("manager")) ||
    Boolean(sessionInfo.employee?.designation?.name?.toLowerCase().includes("hr")) ||
    Boolean(sessionInfo.employee?.designation?.name?.toLowerCase().includes("lead")) ||
    Boolean(sessionInfo.employee?.designation?.name?.toLowerCase().includes("head")) ||
    Boolean(sessionInfo.employee?.designation?.name?.toLowerCase().includes("director"))
  ) : true;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-sm text-muted-foreground">Reviews and goal tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviews?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goals?.data.filter((g) => g.status === "IN_PROGRESS" || g.status === "NOT_STARTED").length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Goals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goals?.data.filter((g) => g.status === "COMPLETED").length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        {/* REVIEWS TAB */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              {isManagerOrHR 
                ? "Manage and publish employee performance evaluations." 
                : "View your performance reviews. Reviews are conducted and created by HR & Managers."}
            </p>
            {isManagerOrHR && (
              <div className="flex justify-end gap-2 items-center shrink-0">
                <input
                  type="file"
                  ref={reviewFileInputRef}
                  onChange={(e) => handleExcelUpload(e, "reviews")}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                <a href="/office/spreadsheets?template=performance-reviews&source=hrm-performance">
                  <Button
                    variant="outline"
                    type="button"
                    className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary h-9 text-xs"
                  >
                    <Upload className="h-4 w-4" /> Bulk Upload
                  </Button>
                </a>
                <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                  <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                    <Plus className="h-4 w-4" /> New Review
                  </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-w-lg">
                <DialogHeader><DialogTitle>Create Performance Review</DialogTitle></DialogHeader>
                <form action={handleCreateReview} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employee</Label>
                      <Select name="employeeId" required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {empList.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reviewer</Label>
                      <Select name="reviewerId" required>
                        <SelectTrigger><SelectValue placeholder="Select Reviewer" /></SelectTrigger>
                        <SelectContent>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name || u.email?.split("@")[0] || "Unknown"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Period</Label>
                      <Input name="period" placeholder="Q1 2026" required />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select name="type" defaultValue="ANNUAL">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["ANNUAL", "SEMI_ANNUAL", "QUARTERLY", "PROBATION", "PROJECT_BASED"].map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Overall Rating</Label>
                    <Select name="overallRating" defaultValue="5">
                      <SelectTrigger><SelectValue placeholder="Select Rating" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((r) => (
                          <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? "s" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Strengths</Label>
                    <Textarea name="strengths" rows={2} />
                  </div>
                  <div>
                    <Label>Areas for Improvement</Label>
                    <Textarea name="improvements" rows={2} />
                  </div>
                  <div>
                    <Label>Comments</Label>
                    <Textarea name="comments" rows={2} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews?.data.map((r) => {
                  const isReviewer = sessionInfo?.employee ? r.reviewerId === sessionInfo.employee.userId : false;
                  const isSelf = sessionInfo?.employee ? r.employeeId === sessionInfo.employee.id : false;
                  const canEdit = sessionInfo?.isAdmin || isReviewer || isSelf;
                  const canDelete = sessionInfo?.isAdmin;

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {(r as any).employee?.firstName} {(r as any).employee?.lastName}
                      </TableCell>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>{r.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {r.overallRating ? <StarRating value={r.overallRating} /> : <span className="text-gray-400">--</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={reviewStatusColors[r.status] ?? ""}>{r.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(r as any).reviewer?.name ?? "--"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Details"
                            onClick={() => setViewReviewDetails(r)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-900 hover:text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                              title="Edit Review"
                              onClick={() => setEditReview(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Review"
                              onClick={() => handleDeleteReview(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!reviews || reviews.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No reviews found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Edit Review Dialog */}
          <Dialog open={!!editReview} onOpenChange={(open) => !open && setEditReview(null)}>
            <DialogContent className="sm:max-w-lg max-w-lg">
              <DialogHeader><DialogTitle>Edit Review</DialogTitle></DialogHeader>
              {editReview && (
                <form action={handleUpdateReview} className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select name="status" defaultValue={editReview.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["DRAFT", "SELF_REVIEW", "MANAGER_REVIEW", "COMPLETED", "ACKNOWLEDGED"].map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Overall Rating</Label>
                    <Select name="overallRating" defaultValue={String(editReview.overallRating ?? "5")}>
                      <SelectTrigger><SelectValue placeholder="Select Rating" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((r) => (
                          <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? "s" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Strengths</Label>
                    <Textarea name="strengths" rows={2} defaultValue={editReview.strengths ?? ""} />
                  </div>
                  <div>
                    <Label>Areas for Improvement</Label>
                    <Textarea name="improvements" rows={2} defaultValue={editReview.improvements ?? ""} />
                  </div>
                  <div>
                    <Label>Comments</Label>
                    <Textarea name="comments" rows={2} defaultValue={editReview.comments ?? ""} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditReview(null)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* View Review Details Dialog */}
          <Dialog open={!!viewReviewDetails} onOpenChange={(open) => !open && setViewReviewDetails(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Performance Review Details</DialogTitle>
              </DialogHeader>
              {viewReviewDetails && (
                <div className="space-y-4">
                  {/* Autofocus dummy button to prevent scrolling to bottom of modal */}
                  <button className="sr-only" autoFocus aria-hidden="true">Focus Trap Fix</button>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Employee</span>
                      <span className="font-semibold">
                        {(viewReviewDetails as any).employee?.firstName} {(viewReviewDetails as any).employee?.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Reviewer</span>
                      <span className="font-semibold">{(viewReviewDetails as any).reviewer?.name ?? "--"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Period</span>
                      <span className="font-medium">{viewReviewDetails.period}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Review Type</span>
                      <span className="font-medium">{viewReviewDetails.type.replace(/_/g, " ")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Status</span>
                      <Badge className={reviewStatusColors[viewReviewDetails.status] ?? ""}>
                        {viewReviewDetails.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Overall Rating</span>
                      <div className="mt-1">
                        {viewReviewDetails.overallRating ? (
                          <StarRating value={viewReviewDetails.overallRating} />
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </div>
                    </div>
                    {viewReviewDetails.strengths && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-xs mb-1">Strengths</span>
                        <p className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">{viewReviewDetails.strengths}</p>
                      </div>
                    )}
                    {viewReviewDetails.improvements && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-xs mb-1">Areas of Improvement</span>
                        <p className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">{viewReviewDetails.improvements}</p>
                      </div>
                    )}
                    {viewReviewDetails.comments && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-xs mb-1">Comments</span>
                        <p className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">{viewReviewDetails.comments}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <DialogClose render={<Button type="button" variant="outline" />}>
                      Close
                    </DialogClose>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* GOALS TAB */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-end gap-2 items-center">
            <input
              type="file"
              ref={goalFileInputRef}
              onChange={(e) => handleExcelUpload(e, "goals")}
              accept=".xlsx, .xls"
              className="hidden"
            />

            {isManagerOrHR && (
              <a href="/office/spreadsheets?template=goals&source=hrm-performance">
                <Button
                  variant="outline"
                  type="button"
                  className="flex items-center gap-2 cursor-pointer border-primary/30 hover:border-primary/60 text-primary"
                >
                  <Upload className="h-4 w-4" /> Bulk Upload
                </Button>
              </a>
            )}
            <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
                <Plus className="h-4 w-4" />New Goal
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-w-lg">
                <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
                <form action={handleCreateGoal} className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    {isManagerOrHR ? (
                      <Select name="employeeId" required>
                        <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                        <SelectContent>
                          {empList.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <input type="hidden" name="employeeId" value={sessionInfo?.employee?.id || ""} />
                        <Input
                          value={sessionInfo?.employee ? `${sessionInfo.employee.firstName} ${sessionInfo.employee.lastName ?? ""}` : "Current Employee"}
                          disabled
                          className="bg-muted"
                        />
                      </>
                    )}
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input name="title" placeholder="Goal title" required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea name="description" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select name="category" defaultValue="PERFORMANCE">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["PERFORMANCE", "DEVELOPMENT", "TEAM", "COMPANY"].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select name="priority" defaultValue="MEDIUM">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input name="targetDate" type="date" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {goals?.data.map((g) => {
              const review = getGoalReview(g.keyResults);

              return (
                <Card key={g.id} className="hover:shadow-sm transition-all border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base text-foreground">{g.title}</span>
                          <Badge className={goalStatusColors[g.status] ?? ""}>{g.status.replace(/_/g, " ")}</Badge>
                          <Badge variant="outline" className="text-xs">{g.category}</Badge>
                          <Badge variant="secondary" className="text-xs">{g.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Employee: <span className="font-medium text-foreground">{(g as any).employee?.firstName} {(g as any).employee?.lastName}</span>
                          {g.targetDate ? ` • Target: ${new Date(g.targetDate).toLocaleDateString()}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs border-amber-300 text-amber-800 bg-amber-50/80 hover:bg-amber-100 cursor-pointer font-medium"
                          onClick={() => {
                            setReviewGoal(g);
                            setReviewStarRating(review?.rating || 5);
                            setReviewCommentsText(review?.comment || "");
                          }}
                          title="Review & Rate Goal"
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {review ? "Edit Manager Review" : "Review Goal"}
                        </Button>

                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditGoal(g)} title="Edit Goal">
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          onClick={() => handleDeleteGoal(g.id)}
                          title="Delete Goal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {g.description && <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md">{g.description}</p>}

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Goal Progress</span>
                        <span className="font-bold text-foreground">{g.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Manager Review Box */}
                    {review ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> Manager Rating & Review:
                          </span>
                          <StarRating value={review.rating} />
                        </div>
                        {review.comment && (
                          <p className="text-amber-950 font-medium italic pl-2 border-l-2 border-amber-400 mt-1">
                            &quot;{review.comment}&quot;
                          </p>
                        )}
                        {review.reviewerName && (
                          <p className="text-[10px] text-amber-700/80 text-right mt-1 font-medium">
                            Reviewed by {review.reviewerName} {review.reviewedAt ? `on ${new Date(review.reviewedAt).toLocaleDateString()}` : ""}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50/40 px-3 py-2 rounded border border-dashed border-amber-200">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Star className="h-3.5 w-3.5 text-amber-400" /> Awaiting Manager Star Review
                        </span>
                        <span className="text-[11px] underline cursor-pointer text-amber-800" onClick={() => {
                          setReviewGoal(g);
                          setReviewStarRating(5);
                          setReviewCommentsText("");
                        }}>Click to Review</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {(!goals || goals.data.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No goals found
                </CardContent>
              </Card>
            )}
          </div>

          {/* Manager Goal Review Dialog */}
          <Dialog open={!!reviewGoal} onOpenChange={(open) => !open && setReviewGoal(null)}>
            <DialogContent className="sm:max-w-lg max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-500" /> Manager Goal Review & Star Rating
                </DialogTitle>
              </DialogHeader>
              {reviewGoal && (
                <form action={handleSaveGoalReview} className="space-y-4 pt-2">
                  <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1">
                    <p className="font-semibold text-sm">{reviewGoal.title}</p>
                    <p className="text-muted-foreground">
                      Employee: <span className="font-medium text-foreground">{(reviewGoal as any).employee?.firstName} {(reviewGoal as any).employee?.lastName}</span>
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Manager Star Rating (1 to 5 Stars) *</Label>
                    <div className="pt-2 pb-1">
                      <StarRating value={reviewStarRating} onChange={setReviewStarRating} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click on stars to rate this goal achievement ({reviewStarRating} Star{reviewStarRating > 1 ? "s" : ""}).
                    </p>
                  </div>

                  <div>
                    <Label>Manager Review Comments / Feedback</Label>
                    <Textarea
                      name="comment"
                      rows={3}
                      value={reviewCommentsText}
                      onChange={(e) => setReviewCommentsText(e.target.value)}
                      placeholder="Provide manager feedback, guidance, or performance summary for this goal..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Update Progress (%)</Label>
                      <Input name="progress" type="number" min={0} max={100} defaultValue={reviewGoal.progress} />
                    </div>
                    <div>
                      <Label>Goal Status</Label>
                      <Select name="status" defaultValue={reviewGoal.status}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"].map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setReviewGoal(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Review & Rating
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Goal Dialog */}
          <Dialog open={!!editGoal} onOpenChange={(open) => !open && setEditGoal(null)}>
            <DialogContent className="sm:max-w-lg max-w-lg">
              <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
              {editGoal && (
                <form action={handleUpdateGoal} className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input name="title" defaultValue={editGoal.title} required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea name="description" rows={2} defaultValue={editGoal.description ?? ""} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Progress (%)</Label>
                      <Input name="progress" type="number" min={0} max={100} defaultValue={editGoal.progress} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select name="status" defaultValue={editGoal.status}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"].map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditGoal(null)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
