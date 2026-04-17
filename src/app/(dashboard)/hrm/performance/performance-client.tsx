"use client";

import { useState, useEffect, useTransition } from "react";
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
  Plus, Loader2, Star, Target, TrendingUp, Pencil,
} from "lucide-react";
import {
  getPerformanceReviews,
  createPerformanceReview,
  updatePerformanceReview,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getEmployees,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type ReviewsData = Awaited<ReturnType<typeof getPerformanceReviews>>;
type GoalsData = Awaited<ReturnType<typeof getGoals>>;
type EmployeesData = Awaited<ReturnType<typeof getEmployees>>;

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
          className={`h-5 w-5 ${
            star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          } ${onChange ? "cursor-pointer" : ""}`}
          onClick={() => onChange?.(star)}
        />
      ))}
    </div>
  );
}

export function PerformanceClient() {
  const [reviews, setReviews] = useState<ReviewsData | null>(null);
  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [employees, setEmployees] = useState<EmployeesData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editReview, setEditReview] = useState<ReviewsData["data"][0] | null>(null);
  const [editGoal, setEditGoal] = useState<GoalsData["data"][0] | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadData() {
    startTransition(async () => {
      try {
        const [revData, goalData, empData] = await Promise.all([
          getPerformanceReviews({ pageSize: 100 }),
          getGoals({ pageSize: 100 }),
          getEmployees({ pageSize: 100 }),
        ]);
        setReviews(revData);
        setGoals(goalData);
        setEmployees(empData);
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
    startTransition(async () => {
      try {
        await deleteGoal(id);
        toast.success("Goal cancelled");
        loadData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const empList = employees?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-sm text-muted-foreground">Reviews and goal tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviews?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
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
        <Card>
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
          <div className="flex justify-end">
            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />New Review
              </DialogTrigger>
              <DialogContent className="max-w-lg">
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
                      <Label>Reviewer ID</Label>
                      <Input name="reviewerId" placeholder="Reviewer user ID" required />
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
                          {["ANNUAL","SEMI_ANNUAL","QUARTERLY","PROBATION","PROJECT_BASED"].map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Overall Rating (1-5)</Label>
                    <Input name="overallRating" type="number" min={1} max={5} />
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews?.data.map((r) => (
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
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setEditReview(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Edit Review</DialogTitle></DialogHeader>
              {editReview && (
                <form action={handleUpdateReview} className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select name="status" defaultValue={editReview.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["DRAFT","SELF_REVIEW","MANAGER_REVIEW","COMPLETED","ACKNOWLEDGED"].map((s) => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Overall Rating (1-5)</Label>
                    <Input name="overallRating" type="number" min={1} max={5} defaultValue={editReview.overallRating ?? ""} />
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
        </TabsContent>

        {/* GOALS TAB */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
              <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />New Goal
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
                <form action={handleCreateGoal} className="space-y-4">
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
                          {["PERFORMANCE","DEVELOPMENT","TEAM","COMPANY"].map((c) => (
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
                          {["LOW","MEDIUM","HIGH","CRITICAL"].map((p) => (
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
            {goals?.data.map((g) => (
              <Card key={g.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.title}</span>
                      <Badge className={goalStatusColors[g.status] ?? ""}>{g.status.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline">{g.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(g as any).employee?.firstName} {(g as any).employee?.lastName}
                      {g.targetDate ? ` -- Due: ${new Date(g.targetDate).toLocaleDateString()}` : ""}
                    </p>
                    {g.description && <p className="text-sm text-gray-600">{g.description}</p>}
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{g.progress}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditGoal(g)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {g.status !== "CANCELLED" && g.status !== "COMPLETED" && (
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteGoal(g.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!goals || goals.data.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No goals found
                </CardContent>
              </Card>
            )}
          </div>

          {/* Edit Goal Dialog */}
          <Dialog open={!!editGoal} onOpenChange={(open) => !open && setEditGoal(null)}>
            <DialogContent className="max-w-lg">
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
                          {["NOT_STARTED","IN_PROGRESS","COMPLETED","CANCELLED","OVERDUE"].map((s) => (
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
