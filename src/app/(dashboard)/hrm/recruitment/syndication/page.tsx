import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getJobPortals } from "@/lib/actions/job-syndication";
import { RecruitmentNav } from "../recruitment-nav";
import { SyndicationClient } from "./syndication-client";

export const metadata = { title: "Job Syndication | HRM Recruitment" };

export default async function JobSyndicationPage() {
  const session = await auth();
  const user = session?.user as { id: string; tenantId: string } | undefined;
  if (!user?.tenantId) return <div className="p-6">Unauthorized</div>;

  const [jobs, portals] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { tenantId: user.tenantId },
      include: {
        syndications: {
          include: { portal: { select: { name: true, provider: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getJobPortals().catch(() => []),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Job Syndication</h1>
        <p className="text-sm text-muted-foreground">
          Publish ERP recruitment job postings directly to partner job portals (LinkedIn Jobs, Indeed, Naukri, Glassdoor).
        </p>
      </div>

      <RecruitmentNav />
      <SyndicationClient jobs={jobs} portals={portals} />
    </div>
  );
}
