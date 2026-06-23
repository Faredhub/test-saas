import { getLeads, getSalesStats } from "@/lib/actions/sales";
import { LeadsClient } from "../leads/leads-client";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const [leadsData, stats] = await Promise.all([
    getLeads({ pageSize: 500 }),
    getSalesStats(),
  ]);

  return <LeadsClient initialData={leadsData} stats={stats} />;
}
