"use client";

import { useState } from "react";
import { syndicateJobToPortals, unpublishJobSyndication } from "@/lib/actions/job-syndication";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Share2, CheckCircle2, AlertTriangle, RotateCw, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";

type Props = {
  jobs: any[];
  portals: any[];
};

export function SyndicationClient({ jobs, portals }: Props) {
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedPortalIds, setSelectedPortalIds] = useState<string[]>(portals.map((p) => p.id));
  const [submitting, setSubmitting] = useState(false);

  const togglePortal = (id: string) => {
    setSelectedPortalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSyndicate = async () => {
    if (!selectedJob || selectedPortalIds.length === 0) {
      toast.error("Please select at least one job portal");
      return;
    }

    setSubmitting(true);
    try {
      const res = await syndicateJobToPortals({
        jobId: selectedJob.id,
        portalIds: selectedPortalIds,
      });

      toast.success(`Job syndicated across ${selectedPortalIds.length} portals`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Syndication failed");
    } finally {
      setSubmitting(false);
      setSelectedJob(null);
    }
  };

  const handleUnpublish = async (syndicationId: string) => {
    if (!confirm("Are you sure you want to unpublish this job from the portal?")) return;
    try {
      await unpublishJobSyndication(syndicationId);
      toast.success("Job unpublished from portal");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to unpublish");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Recruitment Jobs</CardTitle>
          <CardDescription>Select jobs to syndicate across partner portals</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No job postings created in recruitment workspace yet.
            </div>
          ) : (
            <div className="space-y-6">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-base flex items-center gap-2">
                        {job.title}
                        <Badge variant="outline">{job.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Location: {job.location || "Remote"} • Department: {job.department || "General"} • Openings: {job.openings}
                      </p>
                    </div>

                    <Button size="sm" onClick={() => setSelectedJob(job)}>
                      <Share2 className="h-4 w-4 mr-1" /> Syndicate Job
                    </Button>
                  </div>

                  {/* Syndicated Portals List */}
                  {job.syndications?.length > 0 && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">Syndicated Portals:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {job.syndications.map((syn: any) => (
                          <div key={syn.id} className="p-3 border rounded bg-muted/20 flex flex-col justify-between gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{syn.portal.name}</span>
                              <Badge variant={syn.status === "PUBLISHED" ? "default" : "destructive"}>
                                {syn.status}
                              </Badge>
                            </div>

                            {syn.errorMessage && (
                              <p className="text-[11px] text-red-600 dark:text-red-400 truncate">
                                {syn.errorMessage}
                              </p>
                            )}

                            {syn.status === "PUBLISHED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs w-full mt-1"
                                onClick={() => handleUnpublish(syn.id)}
                              >
                                Unpublish
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Syndicate Modal */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Syndicate Job: {selectedJob.title}</DialogTitle>
              <DialogDescription>Select target portals to publish this job posting.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {portals.map((portal) => (
                <div key={portal.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`p-${portal.id}`}
                    checked={selectedPortalIds.includes(portal.id)}
                    onCheckedChange={() => togglePortal(portal.id)}
                  />
                  <label htmlFor={`p-${portal.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                    <div className="font-semibold">{portal.name}</div>
                    <div className="text-xs text-muted-foreground">Provider: {portal.provider}</div>
                  </label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedJob(null)}>Cancel</Button>
              <Button disabled={submitting} onClick={handleSyndicate}>
                {submitting ? "Publishing..." : "Publish to Selected Portals"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
