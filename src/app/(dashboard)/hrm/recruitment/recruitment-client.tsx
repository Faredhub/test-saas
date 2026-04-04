"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Loader2, Briefcase, UserPlus } from "lucide-react";
import {
  getJobPostings,
  createJobPosting,
  updateJobPosting,
  getApplicants,
  createApplicant,
  updateApplicantStage,
} from "@/lib/actions/hrm";
import { toast } from "sonner";

type JobsData = Awaited<ReturnType<typeof getJobPostings>>;
type ApplicantsData = Awaited<ReturnType<typeof getApplicants>>;

const jobStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OPEN: "bg-green-100 text-green-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  CLOSED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const stageColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-700",
  SCREENING: "bg-purple-100 text-purple-700",
  INTERVIEW: "bg-amber-100 text-amber-700",
  ASSESSMENT: "bg-orange-100 text-orange-700",
  OFFER: "bg-cyan-100 text-cyan-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "ASSESSMENT", "OFFER", "HIRED", "REJECTED"] as const;

export function RecruitmentClient() {
  const [jobs, setJobs] = useState<JobsData | null>(null);
  const [applicants, setApplicants] = useState<ApplicantsData | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [jobOpen, setJobOpen] = useState(false);
  const [applicantOpen, setApplicantOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadData() {
    startTransition(async () => {
      try {
        const [jobData, appData] = await Promise.all([
          getJobPostings({ pageSize: 100 }),
          getApplicants({ jobId: selectedJob || undefined, pageSize: 100 }),
        ]);
        setJobs(jobData);
        setApplicants(appData);
      } catch {
        toast.error("Failed to load data");
      }
    });
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  async function handleCreateJob(formData: FormData) {
    startTransition(async () => {
      try {
        await createJobPosting({
          title: formData.get("title") as string,
          department: (formData.get("department") as string) || undefined,
          location: (formData.get("location") as string) || undefined,
          type: (formData.get("type") as string) || "FULL_TIME",
          experience: (formData.get("experience") as string) || undefined,
          salary: (formData.get("salary") as string) || undefined,
          description: formData.get("description") as string,
          requirements: (formData.get("requirements") as string) || undefined,
          openings: Number(formData.get("openings")) || 1,
          closingDate: (formData.get("closingDate") as string) || undefined,
          status: (formData.get("status") as "DRAFT" | "OPEN") || "DRAFT",
        });
        toast.success("Job posting created");
        setJobOpen(false);
        loadData();
      } catch {
        toast.error("Failed to create job posting");
      }
    });
  }

  async function handleJobStatusChange(id: string, status: string) {
    startTransition(async () => {
      try {
        await updateJobPosting(id, {
          status: status as "DRAFT" | "OPEN" | "ON_HOLD" | "CLOSED" | "CANCELLED",
        });
        toast.success("Status updated");
        loadData();
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  async function handleCreateApplicant(formData: FormData) {
    startTransition(async () => {
      try {
        await createApplicant({
          jobId: formData.get("jobId") as string,
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          phone: (formData.get("phone") as string) || undefined,
          resumeUrl: (formData.get("resumeUrl") as string) || undefined,
          coverLetter: (formData.get("coverLetter") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        });
        toast.success("Applicant added");
        setApplicantOpen(false);
        loadData();
      } catch {
        toast.error("Failed to add applicant");
      }
    });
  }

  async function handleStageChange(id: string, stage: string) {
    startTransition(async () => {
      try {
        await updateApplicantStage(
          id,
          stage as "APPLIED" | "SCREENING" | "INTERVIEW" | "ASSESSMENT" | "OFFER" | "HIRED" | "REJECTED"
        );
        toast.success("Stage updated");
        loadData();
      } catch {
        toast.error("Failed to update stage");
      }
    });
  }

  // Group applicants by stage for kanban
  const kanbanData = STAGES.map((stage) => ({
    stage,
    applicants: applicants?.data.filter((a) => a.stage === stage) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-muted-foreground">
            {jobs?.total ?? 0} job postings, {applicants?.total ?? 0} applicants
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={applicantOpen} onOpenChange={setApplicantOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                <UserPlus className="h-4 w-4" /> Add Applicant
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Applicant</DialogTitle>
              </DialogHeader>
              <form action={handleCreateApplicant} className="space-y-4">
                <div>
                  <Label htmlFor="a-jobId">Job Posting *</Label>
                  <Select name="jobId" required>
                    <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                    <SelectContent>
                      {jobs?.data.filter((j) => j.status === "OPEN").map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="a-name">Full Name *</Label>
                    <Input id="a-name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="a-email">Email *</Label>
                    <Input id="a-email" name="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="a-phone">Phone</Label>
                    <Input id="a-phone" name="phone" />
                  </div>
                  <div>
                    <Label htmlFor="a-resumeUrl">Resume URL</Label>
                    <Input id="a-resumeUrl" name="resumeUrl" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="a-coverLetter">Cover Letter</Label>
                  <Textarea id="a-coverLetter" name="coverLetter" rows={3} />
                </div>
                <div>
                  <Label htmlFor="a-notes">Notes</Label>
                  <Textarea id="a-notes" name="notes" rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Applicant
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" /> New Job Posting
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Job Posting</DialogTitle>
              </DialogHeader>
              <form action={handleCreateJob} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="j-title">Job Title *</Label>
                    <Input id="j-title" name="title" required />
                  </div>
                  <div>
                    <Label htmlFor="j-department">Department</Label>
                    <Input id="j-department" name="department" />
                  </div>
                  <div>
                    <Label htmlFor="j-location">Location</Label>
                    <Input id="j-location" name="location" />
                  </div>
                  <div>
                    <Label htmlFor="j-type">Type</Label>
                    <Select name="type" defaultValue="FULL_TIME">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="j-experience">Experience</Label>
                    <Input id="j-experience" name="experience" placeholder="e.g. 2-5 years" />
                  </div>
                  <div>
                    <Label htmlFor="j-salary">Salary Range</Label>
                    <Input id="j-salary" name="salary" placeholder="e.g. 5-8 LPA" />
                  </div>
                  <div>
                    <Label htmlFor="j-openings">Openings</Label>
                    <Input id="j-openings" name="openings" type="number" defaultValue={1} min={1} />
                  </div>
                  <div>
                    <Label htmlFor="j-closingDate">Closing Date</Label>
                    <Input id="j-closingDate" name="closingDate" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="j-status">Status</Label>
                    <Select name="status" defaultValue="DRAFT">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="j-description">Description *</Label>
                  <Textarea id="j-description" name="description" rows={4} required />
                </div>
                <div>
                  <Label htmlFor="j-requirements">Requirements</Label>
                  <Textarea id="j-requirements" name="requirements" rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Posting
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="postings">
        <TabsList>
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="pipeline">Applicant Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {!jobs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : jobs.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mb-4" />
                  <p>No job postings yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Openings</TableHead>
                      <TableHead>Applicants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.data.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedJob(job.id === selectedJob ? "" : job.id)}
                      >
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.department ?? "-"}</TableCell>
                        <TableCell>{job.location ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.type.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>{job.openings}</TableCell>
                        <TableCell>{job._count.applicants}</TableCell>
                        <TableCell>
                          <Badge className={jobStatusColors[job.status] ?? ""}>
                            {job.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={job.status}
                            onValueChange={(v: string | null) => v && handleJobStatusChange(job.id, v)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                              <SelectItem value="CLOSED">Closed</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <div className="mb-4">
            <Select value={selectedJob} onValueChange={(v: string | null) => setSelectedJob(v ?? "")}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Job Postings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Postings</SelectItem>
                {jobs?.data.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanData.map(({ stage, applicants: stageApps }) => (
              <div key={stage} className="min-w-[250px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={stageColors[stage] ?? ""}>{stage}</Badge>
                  <span className="text-sm text-muted-foreground">({stageApps.length})</span>
                </div>
                <div className="space-y-2">
                  {stageApps.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No applicants
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <Card key={app.id} className="p-3">
                        <div className="space-y-2">
                          <p className="font-medium text-sm">{app.name}</p>
                          <p className="text-xs text-muted-foreground">{app.email}</p>
                          {app.job && (
                            <p className="text-xs text-muted-foreground">{app.job.title}</p>
                          )}
                          <Select
                            value={app.stage}
                            onValueChange={(v: string | null) => v && handleStageChange(app.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
