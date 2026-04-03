import { getDatabaseStats, getRecentAuditLogs } from "@/lib/actions/organization";
import { DatabaseClient } from "./database-client";

export const metadata = { title: "Database Manager" };

export default async function DatabasePage() {
  const [stats, auditLogs] = await Promise.all([
    getDatabaseStats(),
    getRecentAuditLogs(50),
  ]);
  return <DatabaseClient initialStats={stats} initialAuditLogs={auditLogs} />;
}
