import { getSyndicationLogs } from "@/lib/actions/job-syndication";
import { RecruitmentNav } from "../recruitment-nav";
import { LogsClient } from "./logs-client";

export const metadata = { title: "Syndication Logs | HRM Recruitment" };

export default async function SyndicationLogsPage() {
  const logs = await getSyndicationLogs().catch(() => []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Syndication Logs</h1>
        <p className="text-sm text-muted-foreground">
          Audit trail of job syndication requests, API status, and sanitized response payloads.
        </p>
      </div>

      <RecruitmentNav />
      <LogsClient logs={logs} />
    </div>
  );
}
