import { getGeneratedReports, getReportTemplates } from "@/lib/actions/reports";
import { ReportsClient } from "./reports-client";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [reportsData, templates] = await Promise.all([
    getGeneratedReports({ pageSize: 100 }),
    getReportTemplates(),
  ]);
  return <ReportsClient initialData={reportsData} templates={templates} />;
}
