import { getLeads, getDeals, getSalesStats } from "@/lib/actions/sales";
import { LeadsDealsClient } from "./leads-deals-client";

export const metadata = { title: "Leads & Deals" };

export default async function LeadsDealsPage() {
  const [leadsData, dealsData, stats] = await Promise.all([
    getLeads({ pageSize: 500 }),
    getDeals({ pageSize: 500 }),
    getSalesStats(),
  ]);

  return <LeadsDealsClient leadsData={leadsData} dealsData={dealsData} stats={stats} />;
}
