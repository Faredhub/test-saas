"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Loader2, Briefcase, UserPlus, Download, Upload, Eye, Pencil, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  getJobPostings,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
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

// Shared select class for consistent premium styling
const SELECT_CLS = [
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
  "appearance-none pr-10 outline-none cursor-pointer transition-colors",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]",
  "bg-[size:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat",
].join(" ");

export function RecruitmentClient() {
  const [jobs, setJobs] = useState<JobsData | null>(null);
  const [applicants, setApplicants] = useState<ApplicantsData | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [jobOpen, setJobOpen] = useState(false);
  const [applicantOpen, setApplicantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("postings");
  const [viewJob, setViewJob] = useState<any | null>(null);
  const [editJob, setEditJob] = useState<any | null>(null);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleEditJob(formData: FormData) {
    if (!editJob) return;
    startTransition(async () => {
      try {
        await updateJobPosting(editJob.id, {
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
          status: formData.get("status") as any,
        });
        toast.success("Job posting updated");
        setEditJob(null);
        loadData();
      } catch {
        toast.error("Failed to update job posting");
      }
    });
  }

  async function handleDeleteJob(id: string) {
    startTransition(async () => {
      try {
        await deleteJobPosting(id);
        toast.success("Job posting deleted");
        setDeleteConfirmJob(null);
        loadData();
      } catch {
        toast.error("Failed to delete job posting");
      }
    });
  }


  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Excel Template Download ──────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    if (activeTab === "pipeline") {
      const sample = [
        {
          "Name": "Priya Sharma",
          "Email": "priya.sharma@example.com",
          "Phone": "9876543210",
          "Job Title (for reference)": "Frontend Developer",
          "Resume URL": "https://drive.google.com/file/example",
          "Cover Letter": "I am passionate about building great UIs.",
          "Notes": "Referred by current employee",
        },
        {
          "Name": "Arjun Mehta",
          "Email": "arjun.mehta@example.com",
          "Phone": "9123456789",
          "Job Title (for reference)": "Backend Developer",
          "Resume URL": "",
          "Cover Letter": "5 years of Node.js experience.",
          "Notes": "Walk-in candidate",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sample);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Applicants");
      XLSX.writeFile(wb, "applicants_template.xlsx");
      toast.success("Applicants template downloaded!");
    } else {
      const sample = [
        {
          "Title": "Frontend Developer",
          "Department": "Engineering",
          "Location": "Bengaluru / Remote",
          "Type": "FULL_TIME",
          "Experience Required": "2-5 years",
          "Salary Range": "8-12 LPA",
          "Description": "Build responsive React applications.",
          "Requirements": "React, TypeScript, CSS",
          "No. of Openings": 2,
          "Closing Date": "2026-12-31"
        },
        {
          "Title": "Backend Developer",
          "Department": "Engineering",
          "Location": "Bengaluru",
          "Type": "FULL_TIME",
          "Experience Required": "3+ years",
          "Salary Range": "10-15 LPA",
          "Description": "Design REST APIs and databases.",
          "Requirements": "Node.js, PostgreSQL, Prisma",
          "No. of Openings": 1,
          "Closing Date": "2026-11-30"
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sample);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Job Postings");
      XLSX.writeFile(wb, "job_postings_template.xlsx");
      toast.success("Job Postings template downloaded!");
    }
  };

  // ── Excel Import ─────────────────────────────────────────────────────────────
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const openJobs = jobs?.data.filter((j) => j.status === "OPEN") ?? [];
        if (openJobs.length === 0) {
          toast.error("No open job postings found. Create one first before importing applicants.");
          return;
        }
        // Default to first open job if only one, otherwise user's selected job
        const defaultJobId = selectedJob || openJobs[0].id;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = evt.target?.result;
            if (!data) return;

            const workbook = XLSX.read(data, { type: "binary" });
            const ws = workbook.Sheets[workbook.SheetNames[0]];
            const json: any[] = XLSX.utils.sheet_to_json(ws);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            let successCount = 0;
            for (const row of json) {
              const name = String(row["Name"] || row.name || "").trim();
              const email = String(row["Email"] || row.email || "").trim();
              if (!name || !email) continue;

              try {
                await createApplicant({
                  jobId: defaultJobId,
                  name,
                  email,
                  phone: String(row["Phone"] || row.phone || "").trim() || undefined,
                  resumeUrl: String(row["Resume URL"] || row.resumeUrl || "").trim() || undefined,
                  coverLetter: String(row["Cover Letter"] || row.coverLetter || "").trim() || undefined,
                  notes: String(row["Notes"] || row.notes || "").trim() || undefined,
                });
                successCount++;
              } catch (err) {
                console.error(`Failed to import applicant "${name}":`, err);
              }
            }

            if (successCount > 0) {
              toast.success(`Imported ${successCount} applicant${successCount > 1 ? "s" : ""} successfully!`);
              loadData();
            } else {
              toast.error("No valid applicants found. Ensure Name and Email columns are filled.");
            }
          } catch (err: any) {
            toast.error(`Error parsing Excel: ${err.message}`);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  // ── Server Actions ───────────────────────────────────────────────────────────
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

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruitment</h1>
          <p className="text-muted-foreground">
            {jobs?.total ?? 0} job postings · {applicants?.total ?? 0} applicants
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleImportExcel}
          />

          {/* <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button> */}

          <a href={activeTab === "pipeline"
            ? "/office/spreadsheets?template=applicants&source=hrm-recruitment"
            : "/office/spreadsheets?template=job-postings&source=hrm-recruitment"
          }>
            <Button
              variant="outline"
              className="gap-2"
              disabled={isPending}
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </a>

          {/* Add Applicant */}
          <Dialog open={applicantOpen} onOpenChange={setApplicantOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <UserPlus className="h-4 w-4" /> Add Applicant
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Applicant</DialogTitle>
              </DialogHeader>
              <form action={handleCreateApplicant} className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="a-jobId">Job Posting *</Label>
                  <Select name="jobId" required>
                    <SelectTrigger id="a-jobId">
                      <SelectValue placeholder="Select a job posting" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs?.data.filter((j) => j.status === "OPEN").map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="a-name">Full Name *</Label>
                    <Input id="a-name" name="name" required placeholder="e.g. Priya Sharma" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="a-email">Email *</Label>
                    <Input id="a-email" name="email" type="email" required placeholder="name@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="a-phone">Phone</Label>
                    <Input id="a-phone" name="phone" placeholder="e.g. 9876543210" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="a-resumeUrl">Resume URL</Label>
                    <Input id="a-resumeUrl" name="resumeUrl" placeholder="https://..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="a-coverLetter">Cover Letter</Label>
                  <Textarea id="a-coverLetter" name="coverLetter" rows={3} placeholder="Applicant's cover letter..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="a-notes">Notes</Label>
                  <Textarea id="a-notes" name="notes" rows={2} placeholder="Internal notes about this applicant..." />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
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

          {/* New Job Posting */}
          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> New Job Posting
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Job Posting</DialogTitle>
              </DialogHeader>
              <form action={handleCreateJob} className="space-y-4 pt-1">
                {/* Title — full width */}
                <div className="space-y-2">
                  <Label htmlFor="j-title">Job Title *</Label>
                  <Input id="j-title" name="title" required placeholder="e.g. Senior Frontend Developer" />
                </div>

                {/* 2-col grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="j-department">Department</Label>
                    <Input id="j-department" name="department" placeholder="e.g. Engineering" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-location">Location</Label>
                    <Input id="j-location" name="location" placeholder="e.g. Bengaluru / Remote" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-type">Employment Type</Label>
                    <Select name="type" defaultValue="FULL_TIME">
                      <SelectTrigger id="j-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="INTERN">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-experience">Experience Required</Label>
                    <Input id="j-experience" name="experience" placeholder="e.g. 2–5 years" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-salary">Salary Range</Label>
                    <Input id="j-salary" name="salary" placeholder="e.g. 8–12 LPA" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-openings">No. of Openings</Label>
                    <Input id="j-openings" name="openings" type="number" defaultValue={1} min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-closingDate">Closing Date</Label>
                    <Input id="j-closingDate" name="closingDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="j-status">Initial Status</Label>
                    <Select name="status" defaultValue="DRAFT">
                      <SelectTrigger id="j-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="j-description">Job Description *</Label>
                  <Textarea
                    id="j-description"
                    name="description"
                    rows={4}
                    required
                    placeholder="Describe the role, responsibilities, and what the team does..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="j-requirements">Requirements</Label>
                  <Textarea
                    id="j-requirements"
                    name="requirements"
                    rows={3}
                    placeholder="Skills, qualifications, and must-haves for this role..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
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

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="pipeline">Applicant Pipeline</TabsTrigger>
        </TabsList>

        {/* ── Job Postings Tab ── */}
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
                  <p>No job postings yet. Click "New Job Posting" to create one.</p>
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
                      <TableHead>Change Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.data.map((job) => (
                      <TableRow
                        key={job.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/40 ${selectedJob === job.id ? "bg-primary/5" : ""}`}
                        onClick={() => setSelectedJob(job.id === selectedJob ? "" : job.id)}
                      >
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell className="text-muted-foreground">{job.department ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{job.location ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{job.type.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>{job.openings}</TableCell>
                        <TableCell>{job._count.applicants}</TableCell>
                        <TableCell>
                          <Badge className={`${jobStatusColors[job.status] ?? ""} border-0 text-xs`}>
                            {job.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={job.status}
                            onValueChange={(v: string | null) => v && handleJobStatusChange(job.id, v)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
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
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                              onClick={() => setViewJob(job)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                              onClick={() => setEditJob(job)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteConfirmJob(job)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Applicant Pipeline (Kanban) Tab ── */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="mb-4">
            <Select value={selectedJob} onValueChange={(v: string | null) => setSelectedJob(v ?? "")}>
              <SelectTrigger className="w-72">
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

          {!applicants ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {kanbanData.map(({ stage, applicants: stageApps }) => (
                <div key={stage} className="min-w-[220px] flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${stageColors[stage] ?? ""} border-0 text-xs font-semibold`}>
                      {stage}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({stageApps.length})</span>
                  </div>
                  <div className="space-y-2">
                    {stageApps.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        No applicants
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <Card key={app.id} className="p-3 hover:shadow-sm transition-shadow">
                          <div className="space-y-2">
                            <p className="font-semibold text-sm leading-tight">{app.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.email}</p>
                            {app.job && (
                              <p className="text-xs text-primary/70 font-medium truncate">{app.job.title}</p>
                            )}
                            <Select
                              value={app.stage}
                              onValueChange={(v: string | null) => v && handleStageChange(app.id, v)}
                            >
                              <SelectTrigger className="h-7 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAGES.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
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
          )}
        </TabsContent>
      </Tabs>

      {/* View Job Dialog */}
      <Dialog open={!!viewJob} onOpenChange={(open) => { if (!open) setViewJob(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Job Posting Details</DialogTitle></DialogHeader>
          {viewJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Job Title</span>
                  <span className="font-semibold">{viewJob.title}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Status</span>
                  <Badge className={`${jobStatusColors[viewJob.status] ?? ""} border-0 text-xs`}>
                    {viewJob.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Department</span>
                  <span>{viewJob.department || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Location</span>
                  <span>{viewJob.location || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Employment Type</span>
                  <span>{viewJob.type.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Experience Required</span>
                  <span>{viewJob.experience || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Salary Range</span>
                  <span>{viewJob.salary || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Number of Openings</span>
                  <span>{viewJob.openings}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Closing Date</span>
                  <span>{viewJob.closingDate ? new Date(viewJob.closingDate).toLocaleDateString("en-IN") : "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Created At</span>
                  <span>{new Date(viewJob.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Job Description</span>
                <p className="text-sm border rounded-md p-2 bg-muted/20 whitespace-pre-wrap">{viewJob.description}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Requirements</span>
                <p className="text-sm border rounded-md p-2 bg-muted/20 whitespace-pre-wrap">{viewJob.requirements || "—"}</p>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewJob(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editJob} onOpenChange={(open) => { if (!open) setEditJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Job Posting</DialogTitle></DialogHeader>
          {editJob && (
            <form action={handleEditJob} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="edit-j-title">Job Title *</Label>
                <Input id="edit-j-title" name="title" required defaultValue={editJob.title} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-j-department">Department</Label>
                  <Input id="edit-j-department" name="department" defaultValue={editJob.department || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-location">Location</Label>
                  <Input id="edit-j-location" name="location" defaultValue={editJob.location || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-type">Employment Type</Label>
                  <Select name="type" defaultValue={editJob.type}>
                    <SelectTrigger id="edit-j-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-experience">Experience Required</Label>
                  <Input id="edit-j-experience" name="experience" defaultValue={editJob.experience || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-salary">Salary Range</Label>
                  <Input id="edit-j-salary" name="salary" defaultValue={editJob.salary || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-openings">No. of Openings</Label>
                  <Input id="edit-j-openings" name="openings" type="number" defaultValue={editJob.openings} min={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-closingDate">Closing Date</Label>
                  <Input id="edit-j-closingDate" name="closingDate" type="date" defaultValue={editJob.closingDate ? new Date(editJob.closingDate).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-j-status">Status</Label>
                  <Select name="status" defaultValue={editJob.status}>
                    <SelectTrigger id="edit-j-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-j-description">Job Description *</Label>
                <Textarea id="edit-j-description" name="description" rows={4} required defaultValue={editJob.description} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-j-requirements">Requirements</Label>
                <Textarea id="edit-j-requirements" name="requirements" rows={3} defaultValue={editJob.requirements || ""} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditJob(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Job Confirmation */}
      <Dialog open={!!deleteConfirmJob} onOpenChange={(open) => { if (!open) setDeleteConfirmJob(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Job Posting</DialogTitle></DialogHeader>
          {deleteConfirmJob && (
            <div className="space-y-4">
              <p>Are you sure you want to delete the job posting for <strong>{deleteConfirmJob.title}</strong>? This action cannot be undone and will delete all applicants associated with it.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmJob(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDeleteJob(deleteConfirmJob.id)} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
