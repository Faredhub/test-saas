import {
  getDashboardOverview,
  getSalesDashboard,
  getFinanceDashboard,
  getProjectDashboard,
  getAttendanceDashboard,
  getHrmDashboard,
  getInventoryDashboard,
  getTicketDashboard,
  getMarketingDashboard,
} from "@/lib/actions/dashboard";
import { DashboardClient } from "./dashboard-client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [overview, sales, finance, project, attendance, hrm, inventory, tickets, marketing] =
    await Promise.all([
      getDashboardOverview(),
      getSalesDashboard(),
      getFinanceDashboard(),
      getProjectDashboard(),
      getAttendanceDashboard(),
      getHrmDashboard(),
      getInventoryDashboard(),
      getTicketDashboard(),
      getMarketingDashboard(),
    ]);

  return (
    <DashboardClient
      overview={overview}
      sales={sales}
      finance={finance}
      project={project}
      attendance={attendance}
      hrm={hrm}
      inventory={inventory}
      tickets={tickets}
      marketing={marketing}
    />
  );
}
