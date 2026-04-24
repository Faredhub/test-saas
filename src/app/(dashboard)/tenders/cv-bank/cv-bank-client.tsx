"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  User,
  Briefcase,
  X,
  Loader2,
  Trash2,
  Pencil,
  Users,
  Star,
} from "lucide-react";
import {
  createCVRecord,
  updateCVRecord,
  deleteCVRecord,
  searchCVsByKeywords,
  getCVsForProject,
} from "@/lib/actions/cv-bank";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CVData = Awaited<
  ReturnType<typeof import("@/lib/actions/cv-bank").getCVRecords>
>;
type CVRow = CVData["data"][number];
type ScoredCV = CVRow & { matchScore?: number };

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export function CVBankClient({ initialData }: { initialData: CVData }) {
  const [isPending, startTransition] = useTransition();

  // Search state
  const [searchText, setSearchText] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<ScoredCV[] | null>(null);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editCV, setEditCV] = useState<CVRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchResults, setMatchResults] = useState<ScoredCV[]>([]);

  // Keyword chip management
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchText.trim()) {
      e.preventDefault();
      const kw = searchText.trim();
      if (!keywords.includes(kw)) {
        const updated = [...keywords, kw];
        setKeywords(updated);
        triggerSearch(updated);
      }
      setSearchText("");
    }
  }

  function removeKeyword(kw: string) {
    const updated = keywords.filter((k) => k !== kw);
    setKeywords(updated);
    if (updated.length > 0) {
      triggerSearch(updated);
    } else {
      setSearchResults(null);
    }
  }

  function triggerSearch(kws: string[]) {
    startTransition(async () => {
      try {
        const results = await searchCVsByKeywords(kws);
        setSearchResults(results as ScoredCV[]);
      } catch {
        toast.error("Search failed");
      }
    });
  }

  // Create / Edit handlers
  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const skillsRaw = formData.get("skills") as string;
        const certsRaw = formData.get("certifications") as string;
        await createCVRecord({
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          designation: formData.get("designation") as string,
          department: formData.get("department") as string,
          qualifications: formData.get("qualifications") as string,
          experience: Number(formData.get("experience")) || undefined,
          skills: skillsRaw
            ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          certifications: certsRaw
            ? certsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        });
        toast.success("CV record created");
        setCreateOpen(false);
      } catch {
        toast.error("Failed to create CV record");
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editCV) return;
    startTransition(async () => {
      try {
        const skillsRaw = formData.get("skills") as string;
        const certsRaw = formData.get("certifications") as string;
        await updateCVRecord(editCV.id, {
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          designation: formData.get("designation") as string,
          department: formData.get("department") as string,
          qualifications: formData.get("qualifications") as string,
          experience: Number(formData.get("experience")) || undefined,
          skills: skillsRaw
            ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          certifications: certsRaw
            ? certsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        });
        toast.success("CV record updated");
        setEditCV(null);
      } catch {
        toast.error("Failed to update CV record");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCVRecord(id);
        toast.success("CV record deleted");
        setConfirmDeleteId(null);
      } catch {
        toast.error("Failed to delete CV record");
      }
    });
  }

  async function handleMatchToProject(formData: FormData) {
    startTransition(async () => {
      try {
        const skillsRaw = formData.get("requiredSkills") as string;
        const certsRaw = formData.get("requiredCerts") as string;
        const minExp = Number(formData.get("minExperience")) || undefined;
        const results = await getCVsForProject({
          skills: skillsRaw
            ? skillsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          certifications: certsRaw
            ? certsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          minExperience: minExp,
        });
        setMatchResults(results as ScoredCV[]);
        toast.success(`Found ${results.length} matching CV(s)`);
      } catch {
        toast.error("Failed to match CVs");
      }
    });
  }

  // Choose which data to display
  const displayData: ScoredCV[] = searchResults ?? initialData.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CV Bank</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee CVs for tender submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMatchOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Match to Project
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add CV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total CVs</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialData.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active CVs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialData.data.filter((cv) => cv.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Experience
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialData.data.length > 0
                ? (
                    initialData.data.reduce(
                      (sum, cv) => sum + (cv.experience ?? 0),
                      0
                    ) / initialData.data.length
                  ).toFixed(1)
                : "0"}{" "}
              yrs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar with Keyword Chips */}
      <div className="space-y-2">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Type a keyword and press Enter to search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Keywords:</span>
            {keywords.map((kw) => (
              <Badge
                key={kw}
                variant="secondary"
                className="cursor-pointer gap-1 pr-1"
                onClick={() => removeKeyword(kw)}
              >
                {kw}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                setKeywords([]);
                setSearchResults(null);
              }}
            >
              Clear all
            </Button>
          </div>
        )}
        {searchResults !== null && (
          <p className="text-xs text-muted-foreground">
            {searchResults.length} result(s) found
          </p>
        )}
      </div>

      {/* CV Cards Grid */}
      {displayData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {keywords.length > 0
              ? "No CVs match the selected keywords."
              : "No CV records yet. Click \"Add CV\" to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayData.map((cv) => (
            <Card key={cv.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{cv.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {cv.designation ?? "No designation"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditCV(cv)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setConfirmDeleteId(cv.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Experience:</span>
                  <span className="font-medium">
                    {cv.experience != null ? `${cv.experience} years` : "N/A"}
                  </span>
                </div>
                {cv.department && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Dept:</span>
                    <span className="font-medium">{cv.department}</span>
                  </div>
                )}
                {(cv.skills as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(cv.skills as string[]).slice(0, 6).map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {(cv.skills as string[]).length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(cv.skills as string[]).length - 6}
                      </Badge>
                    )}
                  </div>
                )}
                {"matchScore" in cv &&
                  cv.matchScore != null &&
                  cv.matchScore > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-700">
                        Match Score: {cv.matchScore}
                      </span>
                    </div>
                  )}
                {!cv.isActive && (
                  <Badge variant="destructive" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create CV Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add CV Record</DialogTitle>
          </DialogHeader>
          <CVForm
            onSubmit={handleCreate}
            isPending={isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit CV Dialog */}
      <Dialog
        open={!!editCV}
        onOpenChange={(open) => !open && setEditCV(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit CV Record</DialogTitle>
          </DialogHeader>
          {editCV && (
            <CVForm
              onSubmit={handleUpdate}
              isPending={isPending}
              onCancel={() => setEditCV(null)}
              defaultValues={editCV}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete CV Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove this CV record. This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match to Project Dialog */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match CVs to Project Requirements</DialogTitle>
          </DialogHeader>
          <form action={handleMatchToProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requiredSkills">
                Required Skills (comma separated)
              </Label>
              <Input
                id="requiredSkills"
                name="requiredSkills"
                placeholder="e.g. AutoCAD, Surveying, RCC Design"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredCerts">
                Required Certifications (comma separated)
              </Label>
              <Input
                id="requiredCerts"
                name="requiredCerts"
                placeholder="e.g. PMP, ISO 9001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minExperience">
                Minimum Experience (years)
              </Label>
              <Input
                id="minExperience"
                name="minExperience"
                type="number"
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Find Matches
            </Button>
          </form>

          {matchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">
                {matchResults.length} matching CV(s)
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {matchResults.map((cv) => (
                  <Card key={cv.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{cv.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cv.designation} | {cv.experience ?? 0} yrs
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(cv.skills as string[])?.slice(0, 4).map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-4 w-4 fill-yellow-400" />
                        <span className="text-sm font-bold">
                          {cv.matchScore}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CV Form
// ---------------------------------------------------------------------------

function CVForm({
  onSubmit,
  isPending,
  onCancel,
  defaultValues,
}: {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  onCancel: () => void;
  defaultValues?: Partial<CVRow>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues?.name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience">Experience (years)</Label>
          <Input
            id="experience"
            name="experience"
            type="number"
            defaultValue={defaultValues?.experience ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input
            id="designation"
            name="designation"
            defaultValue={defaultValues?.designation ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            defaultValue={defaultValues?.department ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Textarea
          id="qualifications"
          name="qualifications"
          rows={2}
          defaultValue={defaultValues?.qualifications ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills (comma separated)</Label>
        <Input
          id="skills"
          name="skills"
          placeholder="e.g. AutoCAD, Primavera, RCC Design"
          defaultValue={
            (defaultValues?.skills as string[])?.join(", ") ?? ""
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="certifications">Certifications (comma separated)</Label>
        <Input
          id="certifications"
          name="certifications"
          placeholder="e.g. PMP, ISO 9001 Lead Auditor"
          defaultValue={
            (defaultValues?.certifications as string[])?.join(", ") ?? ""
          }
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Save Changes" : "Create CV"}
        </Button>
      </div>
    </form>
  );
}
