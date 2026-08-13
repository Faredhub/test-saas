import { getJobPortals } from "@/lib/actions/job-syndication";
import { RecruitmentNav } from "../recruitment-nav";
import { PortalsClient } from "./portals-client";

export const metadata = { title: "Job Portals | HRM Recruitment" };

export default async function JobPortalsPage() {
  const portals = await getJobPortals().catch(() => []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job Portals</h1>
        <p className="text-sm text-muted-foreground">
          Configure partner portal adapters, credentials, sandbox mode, and field mapping rules.
        </p>
      </div>

      <RecruitmentNav />
      <PortalsClient initialPortals={portals} />
    </div>
  );
}
