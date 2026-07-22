"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Loader2,
  ArrowLeft,
  Trash2,
  GripVertical,
  Link2,
  Eye,
  EyeOff,
  BarChart3,
  ClipboardList,
  Copy,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import {
  createSurvey,
  updateSurvey,
  deleteSurvey,
  publishSurvey,
  unpublishSurvey,
  getSurveyResponses,
  getSurveyAnalytics,
} from "@/lib/actions/marketing";
import { toast } from "sonner";

type Question = {
  id: string;
  type: string;
  text: string;
  options?: string[];
  required?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SurveyItem = any;

type Props = {
  initialData: { data: SurveyItem[]; total: number };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Analytics = any;

export function SurveysClient({ initialData }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyItem | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<SurveyItem | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [responses, setResponses] = useState<any[] | null>(null);
  const [viewMode, setViewMode] = useState<"detail" | "analytics" | "responses">(
    "detail"
  );

  // Question builder state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);

  const surveys = initialData.data;
  const filtered = surveys.filter((s: SurveyItem) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  function addQuestion(
    target: "create" | "edit",
    type: string = "TEXT"
  ) {
    const newQ: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      text: "",
      options: type === "MULTIPLE_CHOICE" ? ["Option 1", "Option 2"] : undefined,
      required: false,
    };
    if (target === "create") {
      setQuestions((prev) => [...prev, newQ]);
    } else {
      setEditQuestions((prev) => [...prev, newQ]);
    }
  }

  function removeQuestion(target: "create" | "edit", id: string) {
    if (target === "create") {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } else {
      setEditQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  }

  function updateQuestion(
    target: "create" | "edit",
    id: string,
    updates: Partial<Question>
  ) {
    const updater = (prev: Question[]) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q));
    if (target === "create") {
      setQuestions(updater);
    } else {
      setEditQuestions(updater);
    }
  }

  function updateOption(
    target: "create" | "edit",
    questionId: string,
    idx: number,
    value: string
  ) {
    const updater = (prev: Question[]) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = [...(q.options || [])];
        opts[idx] = value;
        return { ...q, options: opts };
      });
    if (target === "create") {
      setQuestions(updater);
    } else {
      setEditQuestions(updater);
    }
  }

  function addOption(target: "create" | "edit", questionId: string) {
    const updater = (prev: Question[]) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: [...(q.options || []), `Option ${(q.options?.length ?? 0) + 1}`],
        };
      });
    if (target === "create") {
      setQuestions(updater);
    } else {
      setEditQuestions(updater);
    }
  }

  function removeOption(target: "create" | "edit", questionId: string, idx: number) {
    const updater = (prev: Question[]) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = (q.options || []).filter((_, i) => i !== idx);
        return { ...q, options: opts };
      });
    if (target === "create") {
      setQuestions(updater);
    } else {
      setEditQuestions(updater);
    }
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        if (questions.length === 0) {
          toast.error("Add at least one question");
          return;
        }
        await createSurvey({
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          questions,
        });
        toast.success("Survey created successfully");
        setIsOpen(false);
        setQuestions([]);
      } catch {
        toast.error("Failed to create survey");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    if (!editingSurvey) return;
    startTransition(async () => {
      try {
        await updateSurvey(editingSurvey.id, {
          title: formData.get("title") as string,
          description: formData.get("description") as string,
          questions: editQuestions,
        });
        toast.success("Survey updated");
        setEditingSurvey(null);
        setEditQuestions([]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update survey");
      }
    });
  }

  function handlePublish(id: string) {
    startTransition(async () => {
      try {
        await publishSurvey(id);
        toast.success("Survey published");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to publish survey");
      }
    });
  }

  function handleUnpublish(id: string) {
    startTransition(async () => {
      try {
        await unpublishSurvey(id);
        toast.success("Survey unpublished");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to unpublish survey");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this survey?")) return;
    startTransition(async () => {
      try {
        await deleteSurvey(id);
        toast.success("Survey deleted successfully");
        if (selectedSurvey?.id === id) setSelectedSurvey(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete survey");
      }
    });
  }

  function loadAnalytics(surveyId: string) {
    startTransition(async () => {
      try {
        const [analyticsData, responsesData] = await Promise.all([
          getSurveyAnalytics(surveyId),
          getSurveyResponses(surveyId),
        ]);
        setAnalytics(analyticsData);
        setResponses(responsesData);
        setViewMode("analytics");
      } catch {
        toast.error("Failed to load analytics");
      }
    });
  }

  function renderQuestionBuilder(target: "create" | "edit") {
    const qs = target === "create" ? questions : editQuestions;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Questions</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addQuestion(target, "TEXT")}
            >
              + Text
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addQuestion(target, "RATING")}
            >
              + Rating
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addQuestion(target, "MULTIPLE_CHOICE")}
            >
              + Choice
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addQuestion(target, "YES_NO")}
            >
              + Yes/No
            </Button>
          </div>
        </div>

        {qs.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No questions added yet. Use the buttons above to add questions.
          </p>
        )}

        {qs.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Q{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {q.type}
                    </Badge>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={q.required || false}
                          onChange={(e) =>
                            updateQuestion(target, q.id, {
                              required: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Required
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600"
                        onClick={() => removeQuestion(target, q.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Input
                    placeholder="Enter question text..."
                    value={q.text}
                    onChange={(e) =>
                      updateQuestion(target, q.id, { text: e.target.value })
                    }
                  />

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2 pl-4">
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300" />
                          <Input
                            value={opt}
                            onChange={(e) =>
                              updateOption(target, q.id, optIdx, e.target.value)
                            }
                            className="h-8"
                          />
                          {(q.options?.length ?? 0) > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => removeOption(target, q.id, optIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(target, q.id)}
                      >
                        + Add Option
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Survey detail / analytics view
  if (selectedSurvey) {
    const sv = selectedSurvey;
    const surveyQuestions = (sv.questions || []) as Question[];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedSurvey(null);
              setAnalytics(null);
              setResponses(null);
              setViewMode("detail");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{sv.title}</h1>
            <p className="text-muted-foreground">
              {sv._count?.responses ?? 0} responses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                sv.isPublished
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }
            >
              {sv.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "detail" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("detail")}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Questions
          </Button>
          <Button
            variant={viewMode === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => loadAnalytics(sv.id)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Analytics
          </Button>
          <Button
            variant={viewMode === "responses" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!responses) loadAnalytics(sv.id);
              setViewMode("responses");
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Responses
          </Button>
          <div className="flex-1" />
          {sv.isPublished ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnpublish(sv.id)}
              disabled={isPending}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePublish(sv.id)}
              disabled={isPending}
            >
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSurvey(sv);
              setEditQuestions([...surveyQuestions]);
              setSelectedSurvey(null);
            }}
          >
            Edit
          </Button>
        </div>

        {/* Share URL */}
        {sv.isPublished && sv.shareUrl && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-4">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/s/${sv.shareUrl}`
                  : `/s/${sv.shareUrl}`}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/s/${sv.shareUrl}`
                      : `/s/${sv.shareUrl}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Detail view - show questions */}
        {viewMode === "detail" && (
          <div className="space-y-3">
            {surveyQuestions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No questions in this survey
                </CardContent>
              </Card>
            ) : (
              surveyQuestions.map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {q.text}
                          {q.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {q.type}
                        </Badge>
                        {q.type === "MULTIPLE_CHOICE" && q.options && (
                          <ul className="mt-2 space-y-1">
                            {q.options.map((opt, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <div className="h-3 w-3 rounded-full border-2 border-gray-300" />
                                {opt}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Analytics view */}
        {viewMode === "analytics" && analytics && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Response Summary ({analytics.totalResponses} total)
                </CardTitle>
              </CardHeader>
            </Card>

            {analytics.questionAnalytics.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (qa: any, idx: number) => (
                <Card key={qa.questionId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Q{idx + 1}: {qa.text}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {qa.answered} of {analytics.totalResponses} answered &middot;{" "}
                      {qa.type}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {(qa.type === "MULTIPLE_CHOICE" || qa.type === "YES_NO") &&
                      qa.distribution && (
                        <div className="space-y-2">
                          {Object.entries(qa.distribution as Record<string, number>)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([label, count]) => {
                              const pct =
                                qa.answered > 0
                                  ? (((count as number) / qa.answered) * 100).toFixed(1)
                                  : "0";
                              return (
                                <div key={label} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{label}</span>
                                    <span className="text-muted-foreground">
                                      {count} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                      className="h-full rounded-full bg-blue-500 transition-all"
                                      style={{
                                        width: `${Math.min(parseFloat(pct), 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                    {qa.type === "RATING" && (
                      <div className="space-y-2">
                        <p className="text-lg font-semibold">
                          Average: {qa.average} / 5
                        </p>
                        {qa.distribution &&
                          Object.entries(qa.distribution as Record<string, number>)
                            .sort(([a], [b]) => Number(b) - Number(a))
                            .map(([rating, count]) => {
                              const pct =
                                qa.answered > 0
                                  ? (
                                      ((count as number) / qa.answered) *
                                      100
                                    ).toFixed(1)
                                  : "0";
                              return (
                                <div key={rating} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{"*".repeat(Number(rating))} ({rating})</span>
                                    <span className="text-muted-foreground">
                                      {count} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                      className="h-full rounded-full bg-amber-500 transition-all"
                                      style={{
                                        width: `${Math.min(parseFloat(pct), 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                      </div>
                    )}

                    {qa.type === "TEXT" && qa.sampleAnswers && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Sample responses:
                        </p>
                        <ul className="space-y-1">
                          {qa.sampleAnswers.map((ans: string, i: number) => (
                            <li
                              key={i}
                              className="rounded border bg-muted/50 px-3 py-2 text-sm"
                            >
                              {ans}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}

        {/* Responses table view */}
        {viewMode === "responses" && responses && (
          <Card>
            <CardHeader>
              <CardTitle>All Responses ({responses.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Answers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No responses yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    responses.map((r: any, idx: number) => {
                      const answers = r.answers as Record<string, unknown>;
                      const ansCount = Object.keys(answers).length;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{r.respondentName || "Anonymous"}</TableCell>
                          <TableCell>{r.respondentEmail || "-"}</TableCell>
                          <TableCell>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{ansCount} answers</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Surveys</h1>
          <p className="text-muted-foreground">
            Create surveys and collect feedback
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Overview
            </Button>
          </Link>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) setQuestions([]);
            }}
          >
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              New Survey
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Survey</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>

                {renderQuestionBuilder("create")}

                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Survey
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search surveys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Survey list */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No surveys found. Create your first survey to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s: SurveyItem) => {
                  const qCount = Array.isArray(s.questions)
                    ? s.questions.length
                    : 0;
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSurvey(s)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.title}</p>
                          {s.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{qCount}</TableCell>
                      <TableCell>{s._count?.responses ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            s.isPublished
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {s.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 cursor-pointer"
                            onClick={() => setSelectedSurvey(s)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 cursor-pointer"
                            onClick={() => {
                              setEditingSurvey(s);
                              setEditQuestions(s.questions || []);
                            }}
                            title="Edit Survey"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                            onClick={() => handleDelete(s.id)}
                            title="Delete Survey"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (s.isPublished) {
                                handleUnpublish(s.id);
                              } else {
                                handlePublish(s.id);
                              }
                            }}
                            disabled={isPending}
                            className="ml-1"
                          >
                            {s.isPublished ? "Unpublish" : "Publish"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit survey dialog */}
      <Dialog
        open={!!editingSurvey}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSurvey(null);
            setEditQuestions([]);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey</DialogTitle>
          </DialogHeader>
          {editingSurvey && (
            <form action={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={editingSurvey.title}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  rows={2}
                  defaultValue={editingSurvey.description || ""}
                />
              </div>

              {renderQuestionBuilder("edit")}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingSurvey(null);
                    setEditQuestions([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
