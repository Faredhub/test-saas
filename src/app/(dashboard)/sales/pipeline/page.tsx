import { getDeals, getSalesStats } from "@/lib/actions/sales";
import { PipelineClient } from "./pipeline-client";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const [dealsData, stats] = await Promise.all([
    getDeals({ pageSize: 500 }),
    getSalesStats(),
  ]);

  return <PipelineClient deals={dealsData.data} stats={stats} />;
}
