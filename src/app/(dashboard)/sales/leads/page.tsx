import { getLeads, getSalesStats } from "@/lib/actions/sales";
import { LeadsClient } from "./leads-client";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const [leadsData, stats] = await Promise.all([
    getLeads(),
    getSalesStats(),
  ]);

  return <LeadsClient initialData={leadsData} stats={stats} />;
}
