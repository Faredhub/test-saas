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
  getMarketingDashboardData,
  getInventoryDashboardData,
  getHRMDashboardData,
  getProjectsDashboardData,
  getWebsiteDashboardData,
  getOfficeDashboardData,
  getAttendanceDashboardData,
  getQuickMetrics,
} from "@/lib/actions/dashboard";
import { DashboardClient } from "./dashboard-client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [
    overview,
    sales,
    finance,
    project,
    attendance,
    hrm,
    inventory,
    tickets,
    marketing,
    marketingExt,
    inventoryExt,
    hrmExt,
    projectsExt,
    website,
    office,
    attendanceExt,
    quickMetrics,
  ] = await Promise.all([
    getDashboardOverview(),
    getSalesDashboard(),
    getFinanceDashboard(),
    getProjectDashboard(),
    getAttendanceDashboard(),
    getHrmDashboard(),
    getInventoryDashboard(),
    getTicketDashboard(),
    getMarketingDashboard(),
    getMarketingDashboardData(),
    getInventoryDashboardData(),
    getHRMDashboardData(),
    getProjectsDashboardData(),
    getWebsiteDashboardData(),
    getOfficeDashboardData(),
    getAttendanceDashboardData(),
    getQuickMetrics(),
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
      marketingExt={marketingExt}
      inventoryExt={inventoryExt}
      hrmExt={hrmExt}
      projectsExt={projectsExt}
      website={website}
      office={office}
      attendanceExt={attendanceExt}
      quickMetrics={quickMetrics}
    />
  );
}
