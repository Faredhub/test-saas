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
import { Plus, Loader2, Briefcase, UserPlus, Download, Upload, Eye, Pencil, Trash2, ArrowLeft, Send, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type RecruitmentField = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  width?: number; // col-span 1 to 4
  options?: string[];
  permissions?: string[];
};

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

  // Recruitment Form & Workflow Builder States
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<"admin" | "recruiter" | "interviewer" | "candidate">("admin");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTemplate, setActiveTemplate] = useState("Software Engineer");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [stages, setStages] = useState<string[]>(["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]);
  const [newStageName, setNewStageName] = useState("");
  
  // Dynamic offer letter template body
  const [offerLetterBody, setOfferLetterBody] = useState(
    "Dear [Candidate_Name],\n\nWe are pleased to offer you the position of [Job_Title] at TixelTech. Your joining date is scheduled for [Joining_Date].\n\nBest Regards,\nHR Team"
  );
  
  // Interview round scorecards
  const [candidateRating, setCandidateRating] = useState<number>(4);
  const [interviewerFeedback, setInterviewerFeedback] = useState("Strong coding skills and system design logic.");
  
  // Mock parser profiles
  const [parsedProfile, setParsedProfile] = useState<{ name: string; email: string; skills: string } | null>(null);

  const [fields, setFields] = useState<RecruitmentField[]>([
    { id: "r1", type: "job_title", label: "Job Title", width: 2, required: true },
    { id: "r2", type: "department", label: "Department", width: 2 },
    { id: "r3", type: "first_name", label: "First Name", width: 2, required: true },
    { id: "r4", type: "last_name", label: "Last Name", width: 2, required: true },
    { id: "r5", type: "email", label: "Email Address", width: 2, required: true },
    { id: "r6", type: "resume", label: "Resume Upload Link", width: 4, required: true },
    { id: "r7", type: "linkedin", label: "LinkedIn Profile URL", width: 4 },
  ]);

  const [fillerResponses, setFillerResponses] = useState<Record<string, string>>({});

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

  // Recruitment Form & Workflow Builder Helpers
  function addRecruitmentField(type: string, label: string) {
    const id = Date.now().toString();
    const newField: RecruitmentField = {
      id,
      type,
      label,
      placeholder: `Enter ${label.toLowerCase()}...`,
      width: 4,
      required: false,
    };
    
    if (type === "dropdown" || type === "radio" || type === "checkbox") {
      newField.options = ["Option A", "Option B", "Option C"];
    }
    
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(id);
    toast.success(`Component '${label}' added to application template`);
  }

  function duplicateRecruitmentField(id: string) {
    const target = fields.find((f) => f.id === id);
    if (!target) return;
    const duplicated = {
      ...target,
      id: Date.now().toString(),
      label: `${target.label} (Copy)`,
    };
    setFields((prev) => [...prev, duplicated]);
    toast.success("Field duplicated");
  }

  function deleteRecruitmentField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    toast.success("Field deleted from template");
  }

  function updateRecruitmentFieldProperty(id: string, prop: keyof RecruitmentField, value: any) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [prop]: value } : f))
    );
  }

  function handlePublishRecruitmentTemplate() {
    localStorage.setItem(`recruitment_template_${activeTemplate}`, JSON.stringify(fields));
    localStorage.setItem(`recruitment_stages_${activeTemplate}`, JSON.stringify(stages));
    toast.success(`Template and hiring workflow for '${activeTemplate}' published successfully!`);
  }

  function loadRecruitmentTemplate(templateName: string) {
    setActiveTemplate(templateName);
    const savedFields = localStorage.getItem(`recruitment_template_${templateName}`);
    const savedStages = localStorage.getItem(`recruitment_stages_${templateName}`);
    
    if (savedFields) {
      setFields(JSON.parse(savedFields));
    } else {
      if (templateName === "Software Engineer") {
        setFields([
          { id: "r1", type: "job_title", label: "Job Title", width: 2, required: true },
          { id: "r2", type: "department", label: "Department", width: 2 },
          { id: "r3", type: "first_name", label: "First Name", width: 2, required: true },
          { id: "r4", type: "last_name", label: "Last Name", width: 2, required: true },
          { id: "r5", type: "email", label: "Email Address", width: 2, required: true },
          { id: "r6", type: "resume", label: "Resume Upload Link", width: 4, required: true },
          { id: "r7", type: "linkedin", label: "LinkedIn Profile URL", width: 4 },
        ]);
      } else if (templateName === "Marketing Manager") {
        setFields([
          { id: "m1", type: "job_title", label: "Job Title", width: 2, required: true },
          { id: "m2", type: "first_name", label: "First Name", width: 2, required: true },
          { id: "m3", type: "last_name", label: "Last Name", width: 2, required: true },
          { id: "m4", type: "email", label: "Email Address", width: 2, required: true },
          { id: "m5", type: "text", label: "Portfolio URL Link", width: 4, required: true },
          { id: "m6", type: "textarea", label: "Campaign Experience Notes", width: 4 },
        ]);
      } else {
        setFields([
          { id: "h1", type: "job_title", label: "Job Title", width: 2, required: true },
          { id: "h2", type: "first_name", label: "First Name", width: 2, required: true },
          { id: "h3", type: "last_name", label: "Last Name", width: 2, required: true },
          { id: "h4", type: "email", label: "Email Address", width: 2, required: true },
          { id: "h5", type: "textarea", label: "Recruitment Tools Experience", width: 4 },
        ]);
      }
    }

    if (savedStages) {
      setStages(JSON.parse(savedStages));
    } else {
      setStages(["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]);
    }
    toast.success(`Loaded recruitment workspace for '${templateName}'`);
  }

  function handleAddWorkflowStage() {
    if (!newStageName.trim()) return;
    if (stages.includes(newStageName.trim())) {
      toast.error("Stage already exists");
      return;
    }
    setStages((prev) => [...prev, newStageName.trim()]);
    setNewStageName("");
    toast.success("Hiring workflow stage added!");
  }

  function handleDeleteWorkflowStage(stageToDelete: string) {
    setStages((prev) => prev.filter((s) => s !== stageToDelete));
    toast.success("Stage removed from hiring workflow");
  }

  function triggerResumeParsing() {
    // Simulate dynamic auto parsing of candidates profile info
    setParsedProfile({
      name: "Rohan Das",
      email: "rohan.das@tixeltech.com",
      skills: "React, Node.js, Next.js, TypeScript, PostgreSQL",
    });
    setFillerResponses((prev) => ({
      ...prev,
      "r3": "Rohan",
      "r4": "Das",
      "r5": "rohan.das@tixeltech.com",
    }));
    toast.success("Resume parsed! Extracted candidate name and contact credentials.");
  }

  async function handleCandidateSubmit() {
    startTransition(async () => {
      try {
        const payloadJson = JSON.stringify({
          templateName: activeTemplate,
          fillerResponses,
          scorecard: { rating: candidateRating, feedback: interviewerFeedback },
        });

        // Save candidate responses dynamically in database applicant notes field
        const openJobs = jobs?.data.filter((j) => j.status === "OPEN") || [];
        const jobId = selectedJob || (openJobs[0]?.id || "");
        if (!jobId) {
          toast.error("No active job postings to submit candidate profiles");
          return;
        }

        await createApplicant({
          jobId,
          name: `${fillerResponses["r3"] || "Dynamic"} ${fillerResponses["r4"] || "Applicant"}`.trim(),
          email: fillerResponses["r5"] || `dynamic-${Date.now()}@example.com`,
          notes: `[DYNAMIC_RECRUIT_RESPONSE]:${payloadJson}`,
        });

        toast.success("Application submitted successfully!");
        setIsBuilderOpen(false);
        setFillerResponses({});
        setParsedProfile(null);
        loadData();
      } catch {
        toast.error("Failed to submit applicant profile");
      }
    });
  }

  // Group applicants by stage for kanban
  const kanbanData = STAGES.map((stage) => ({
    stage,
    applicants: applicants?.data.filter((a) => a.stage === stage) ?? [],
  }));

  if (isBuilderOpen) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100/60 overflow-hidden font-sans select-none animate-in fade-in duration-200">
        
        {/* Sticky Top Navbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 hover:bg-slate-100 text-blue-600 font-semibold" onClick={() => setIsBuilderOpen(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            
            <div className="flex items-center gap-2 border-l pl-3">
              <span className="text-xs text-muted-foreground font-medium">Job Template:</span>
              <Select value={activeTemplate} onValueChange={(val) => loadRecruitmentTemplate(val || "")}>
                <SelectTrigger className="w-48 h-7 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Software Engineer", "Marketing Manager", "HR Executive"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs font-semibold">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 border-l pl-3 text-xs">
              <span className="text-muted-foreground">Mode:</span>
              <div className="flex bg-muted p-0.5 rounded-lg border">
                {(["admin", "recruiter", "interviewer", "candidate"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setBuilderMode(mode)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                      builderMode === mode ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live previews */}
            <div className="flex bg-muted p-0.5 rounded-lg border">
              {(["desktop", "tablet", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPreviewDevice(d)}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                    previewDevice === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>

            {builderMode === "admin" ? (
              <Button
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-normal animate-pulse"
                onClick={handlePublishRecruitmentTemplate}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Publish Template
              </Button>
            ) : builderMode === "candidate" ? (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-normal"
                onClick={handleCandidateSubmit}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Submit Application
              </Button>
            ) : null}
          </div>
        </div>

        {/* Builder Panels Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left panel - components list toolbox (Only in Admin mode) */}
          {builderMode === "admin" && (
            <div className="w-[240px] border-r bg-background shrink-0 flex flex-col justify-start select-none shadow-sm z-10">
              <div className="p-3 border-b flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Components Toolbox</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search fields..." className="pl-8 h-7 text-xs" />
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4 pb-8">
                  {/* Job Information */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Job Information</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "job_title", label: "Job Title" },
                        { type: "job_code", label: "Job Code" },
                        { type: "department", label: "Department" },
                        { type: "designation", label: "Designation" },
                        { type: "employment_type", label: "Employment" },
                        { type: "salary_range", label: "Salary Range" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addRecruitmentField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Applicant Fields */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Applicant Fields</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "first_name", label: "First Name" },
                        { type: "last_name", label: "Last Name" },
                        { type: "email", label: "Email ID" },
                        { type: "mobile", label: "Mobile" },
                        { type: "resume", label: "Resume Upload" },
                        { type: "linkedin", label: "LinkedIn URL" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addRecruitmentField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom & Advanced */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase block">Custom Components</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { type: "text", label: "Text Field" },
                        { type: "textarea", label: "Text Area" },
                        { type: "dropdown", label: "Dropdown Select" },
                        { type: "rating", label: "Rating Stars" },
                      ].map((c) => (
                        <button
                          key={c.type}
                          onClick={() => addRecruitmentField(c.type, c.label)}
                          className="p-2 border rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-left text-[10px] font-semibold text-slate-700 flex flex-col gap-0.5 shadow-sm"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Center recruitment builder workspace */}
          <div className="flex-1 flex overflow-y-auto bg-slate-200/40 p-6 items-center justify-start flex-col relative select-text">
            
            {builderMode === "recruiter" ? (
              // Recruiter pipeline Kanban Board view
              <div className="w-full max-w-[960px] bg-background border rounded-xl shadow-xl p-6 flex flex-col gap-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Job Posting Workflow Pipeline</span>
                    <h2 className="text-lg font-bold text-slate-800">{activeTemplate} Workflow Stages</h2>
                  </div>

                  {/* HR add custom stages overlay */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add stage..."
                      className="h-8 text-xs w-40"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                    />
                    <Button onClick={handleAddWorkflowStage} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      + Add Stage
                    </Button>
                  </div>
                </div>

                {/* Stages List Grid */}
                <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                  {stages.map((stage) => (
                    <div key={stage} className="min-w-[220px] bg-slate-50 border rounded-lg p-3 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b pb-1.5">
                        <span className="text-xs font-bold text-slate-700">{stage}</span>
                        <button
                          onClick={() => handleDeleteWorkflowStage(stage)}
                          className="text-[10px] text-destructive hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Mock candidate card in pipeline */}
                      {stage === "Applied" && (
                        <div className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-1.5 hover:shadow transition-all select-none">
                          <span className="text-xs font-bold text-slate-800">Rohan Das</span>
                          <span className="text-[10px] text-muted-foreground">rohan.das@tixeltech.com</span>
                          <span className="text-[9.5px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold w-fit">Software Engineer</span>
                        </div>
                      )}
                      
                      {stage === "Interview" && (
                        <div className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-1.5 hover:shadow transition-all select-none border-l-4 border-l-amber-500">
                          <span className="text-xs font-bold text-slate-800">Priya Sharma</span>
                          <span className="text-[10px] text-muted-foreground">priya.sharma@example.com</span>
                          <span className="text-[9.5px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold w-fit">Frontend Developer</span>
                        </div>
                      )}

                      <div className="text-center text-muted-foreground/40 text-[10px] border border-dashed py-4 rounded-md">
                        Drop Candidate Here
                      </div>
                    </div>
                  ))}
                </div>

                {/* Offer Letter Builder editor dashboard mockup */}
                <div className="border-t pt-5 mt-3 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">Dynamic Offer Letter Template Builder</h3>
                    <p className="text-xs text-muted-foreground">Modify company offer letters with merge tags: `[Candidate_Name]`, `[Job_Title]`, `[Joining_Date]`</p>
                  </div>
                  <Textarea
                    rows={4}
                    value={offerLetterBody}
                    onChange={(e) => setOfferLetterBody(e.target.value)}
                    className="font-mono text-xs text-foreground p-3 border rounded bg-slate-50/50"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.success("Offer Letter Template saved!");
                      }}
                      className="text-xs font-semibold"
                    >
                      Save Letter Template
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const compiled = offerLetterBody
                          .replace("[Candidate_Name]", "Rohan Das")
                          .replace("[Job_Title]", activeTemplate)
                          .replace("[Joining_Date]", "20 July 2026");
                        alert(`Offer Letter Preview:\n\n${compiled}`);
                      }}
                      className="text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Compile & Preview Letter
                    </Button>
                  </div>
                </div>
              </div>
            ) : builderMode === "interviewer" ? (
              // Interview scorecards panel
              <div className="w-full max-w-[720px] bg-background border rounded-xl shadow-xl p-6 flex flex-col gap-5 animate-in zoom-in-95">
                <div className="border-b pb-3">
                  <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Interviewer Scorecard Ratings</span>
                  <h2 className="text-lg font-bold text-slate-800">Technical Round Evaluation Dashboard</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border bg-slate-50 p-3 rounded-lg">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800">Candidate: Rohan Das</span>
                      <span className="text-[10px] text-muted-foreground block">Applying for {activeTemplate}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded">Scorecard: Draft</span>
                  </div>

                  {/* Rating Stars */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Overall Interview Rating</Label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setCandidateRating(star)}
                          className={`text-xl transition-all ${
                            star <= candidateRating ? "text-amber-500 scale-110" : "text-slate-300 hover:text-amber-400"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-slate-600 ml-2">({candidateRating} / 5 stars)</span>
                    </div>
                  </div>

                  {/* Written feedback */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Interview Round Notes & Written Feedback</Label>
                    <Textarea
                      rows={3}
                      value={interviewerFeedback}
                      onChange={(e) => setInterviewerFeedback(e.target.value)}
                      className="text-xs p-2.5 border rounded"
                      placeholder="Enter details on technical expertise, coding round results, soft skills..."
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={() => toast.success("Draft feedback saved")}>
                      Save Draft
                    </Button>
                    <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => {
                      toast.success("Scorecard submitted to HR Admin panel!");
                    }}>
                      Submit Scorecard
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Admin builder canvas or candidate filler portal
              <div
                style={{
                  width: previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
                  maxWidth: "880px",
                }}
                className="bg-background border rounded-xl shadow-xl flex flex-col min-h-[500px] p-6 transition-all duration-300 relative"
              >
                <div className="border-b pb-3 mb-5 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{activeTemplate} Application Form</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">Grid Layout (4 Cols)</span>
                </div>

                {/* Candidate parser dashboard trigger */}
                {builderMode === "candidate" && (
                  <div className="mb-4 p-3 border border-blue-200 bg-blue-50/50 rounded-lg flex items-center justify-between">
                    <div className="space-y-0.5 text-xs text-blue-900 pr-4">
                      <span className="font-bold block">Smart Resume Parser Integration</span>
                      <span className="text-[11px] text-muted-foreground">Upload your resume to automatically extract contact info and complete fields.</span>
                    </div>
                    <Button
                      onClick={triggerResumeParsing}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" /> Parse Resume File
                    </Button>
                  </div>
                )}

                {/* Grid drop zone */}
                <div className="grid grid-cols-4 gap-4 flex-1 items-start content-start">
                  {fields.map((field) => {
                    const isSelected = selectedFieldId === field.id;
                    const colSpanClass =
                      field.width === 1 ? "col-span-1" :
                      field.width === 2 ? "col-span-2" :
                      field.width === 3 ? "col-span-3" : "col-span-4";

                    return (
                      <div
                        key={field.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFieldId(field.id);
                        }}
                        className={`${colSpanClass} p-3 border rounded-lg relative transition-all group select-none ${
                          isSelected ? "border-blue-500 bg-blue-50/5 ring-1 ring-blue-200" : "hover:border-blue-300 hover:bg-slate-50/40 bg-white"
                        }`}
                      >
                        {/* Admin duplicate/delete formats buttons */}
                        {builderMode === "admin" && (
                          <div className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateRecruitmentField(field.id);
                              }}
                              className="p-1 rounded bg-white hover:bg-slate-100 border text-[9px] font-bold"
                            >
                              Copy
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecruitmentField(field.id);
                              }}
                              className="p-1 rounded bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700 text-[9px] font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-semibold text-slate-800">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </span>
                        </div>

                        {/* Rendering dynamic templates */}
                        {builderMode === "admin" ? (
                          <div className="text-xs text-muted-foreground/60 border border-dashed rounded px-3 py-1.5 bg-slate-50 select-none">
                            {field.placeholder || `[${field.type.toUpperCase()} PREVIEW]`}
                          </div>
                        ) : (
                          // Interactive filler elements
                          <div className="w-full text-xs font-sans text-foreground">
                            {field.type === "resume" ? (
                              <div className="flex flex-col gap-1 border border-dashed rounded bg-slate-50/50 p-2 text-center text-muted-foreground/70 cursor-pointer">
                                <span>Drag and drop Resume pdf/docx file</span>
                              </div>
                            ) : (field.type === "text" || field.type === "first_name" || field.type === "last_name" || field.type === "designation" || field.type === "job_title" || field.type === "job_code" || field.type === "department" || field.type === "salary_range" || field.type === "linkedin") ? (
                              <Input
                                placeholder={field.placeholder}
                                className="text-xs h-8 text-foreground"
                                value={fillerResponses[field.id] ?? ""}
                                onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                              />
                            ) : (field.type === "email" || field.type === "phone" || field.type === "mobile") ? (
                              <Input
                                placeholder={field.placeholder}
                                className="text-xs h-8 text-foreground"
                                value={fillerResponses[field.id] ?? ""}
                                onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                              />
                            ) : field.type === "textarea" ? (
                              <Textarea
                                placeholder={field.placeholder}
                                className="text-xs h-16 resize-none"
                                value={fillerResponses[field.id] ?? ""}
                                onChange={(e) => setFillerResponses({ ...fillerResponses, [field.id]: e.target.value })}
                              />
                            ) : field.type === "dropdown" ? (
                              <Select
                                value={fillerResponses[field.id] ?? ""}
                                onValueChange={(val) => setFillerResponses({ ...fillerResponses, [field.id]: val || "" })}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder={field.placeholder ?? "Select option"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options || []).map((opt) => (
                                    <SelectItem key={opt} value={opt} className="text-xs font-semibold">{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder={field.placeholder}
                                className="text-xs h-8 text-foreground"
                              />
                            )}

                            {field.helpText && (
                              <p className="text-[10px] text-muted-foreground/60 mt-1 italic font-medium">
                                {field.helpText}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right properties format editor side control panel */}
          {builderMode === "admin" && (
            <div className="w-[240px] border-l bg-background shrink-0 flex flex-col select-none p-3.5 shadow-sm z-10 gap-4 overflow-y-auto animate-in slide-in-from-right duration-200">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase border-b pb-1.5">Properties Panel</span>
              
              {selectedFieldId ? (() => {
                const target = fields.find((f) => f.id === selectedFieldId);
                if (!target) return null;

                return (
                  <div className="flex flex-col gap-3.5 text-xs">
                    {/* General configurations */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Field Label Title</Label>
                      <Input
                        value={target.label}
                        onChange={(e) => updateRecruitmentFieldProperty(target.id, "label", e.target.value)}
                        className="h-8 text-xs font-semibold text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Field Placeholder Text</Label>
                      <Input
                        value={target.placeholder ?? ""}
                        onChange={(e) => updateRecruitmentFieldProperty(target.id, "placeholder", e.target.value)}
                        className="h-8 text-xs text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Help Description Text</Label>
                      <Input
                        value={target.helpText ?? ""}
                        onChange={(e) => updateRecruitmentFieldProperty(target.id, "helpText", e.target.value)}
                        className="h-8 text-xs text-foreground"
                      />
                    </div>

                    {/* Width sizing */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                        <span>Column Width Grid Span</span>
                        <span className="font-bold text-blue-600 font-mono">{target.width ?? 4} / 4 Cols</span>
                      </div>
                      <input
                        type="range" min="1" max="4" step="1"
                        value={target.width ?? 4}
                        onChange={(e) => updateRecruitmentFieldProperty(target.id, "width", parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1"
                      />
                    </div>

                    {/* Validations check lists */}
                    <div className="space-y-2 border-t pt-3 mt-1.5">
                      <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block">Validations & Rules</span>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!target.required}
                          onChange={(e) => updateRecruitmentFieldProperty(target.id, "required", e.target.checked)}
                          className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10.5px] text-slate-700">Required Validation Field</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!target.disabled}
                          onChange={(e) => updateRecruitmentFieldProperty(target.id, "disabled", e.target.checked)}
                          className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10.5px] text-slate-700">Disabled Component Input</span>
                      </label>
                    </div>

                    {/* Options list for selection */}
                    {(target.type === "dropdown" || target.type === "radio" || target.type === "checkbox") && (
                      <div className="space-y-1.5 border-t pt-3 mt-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Selectable Options List</Label>
                        <textarea
                          rows={3}
                          value={(target.options || []).join("\n")}
                          onChange={(e) => updateRecruitmentFieldProperty(target.id, "options", e.target.value.split("\n"))}
                          className="w-full text-xs font-mono border rounded p-1.5 focus:outline-none"
                          placeholder="One option per line..."
                        />
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="text-center text-muted-foreground/60 text-xs py-12">
                  Select any component field card on the builder canvas to configure properties details.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Response values debugger bottom bar */}
        <div className="h-7 bg-blue-600 text-white shrink-0 flex items-center justify-between px-4 text-[10.5px] font-mono select-none">
          <span>Application Fields: {fields.length} dynamic items | Active template: {activeTemplate}</span>
          <span className="hover:underline cursor-pointer">ATS Database Sync: Active</span>
        </div>
      </div>
    );
  }

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

          {/* Recruitment Builder Trigger */}
          <Button
            onClick={() => {
              setBuilderMode("admin");
              setIsBuilderOpen(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Pencil className="h-4 w-4" /> Configure Workflows
          </Button>

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
                              variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                              onClick={() => setViewJob(job)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-black hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
                              onClick={() => setEditJob(job)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
