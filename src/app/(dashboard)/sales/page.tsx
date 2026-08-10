import { getSalesOverviewMetrics } from "@/lib/actions/sales";
import { SalesOverviewClient } from "./sales-overview-client";

export const metadata = { title: "Sales Overview | TixelTech ERP" };

export default async function SalesPage() {
  const stats = await getSalesOverviewMetrics().catch(() => ({
    leadsCount: 0,
    customersCount: 0,
    invoicesCount: 0,
    invoicesTotalAmount: 0,
    openDealsCount: 0,
    pipelineValue: 0,
    winRate: 0,
    closeRate: 0,
    avgDayToClose: 0,
    avgOpenDealAge: 0,
    topDeals: [],
    dealTracking: [],
    salesForecasting: [],
  }));

  return <SalesOverviewClient stats={stats} />;
}
