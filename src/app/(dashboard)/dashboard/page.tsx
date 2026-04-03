import { getDashboardOverview, getSalesDashboard, getFinanceDashboard } from "@/lib/actions/dashboard";
import { DashboardClient } from "./dashboard-client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [overview, sales, finance] = await Promise.all([
    getDashboardOverview(),
    getSalesDashboard(),
    getFinanceDashboard(),
  ]);

  return <DashboardClient overview={overview} sales={sales} finance={finance} />;
}
