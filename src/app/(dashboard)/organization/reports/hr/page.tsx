import { getHRReportData } from "@/lib/actions/organization";
import { HRReportClient } from "./hr-report-client";

export const metadata = { title: "HR Report" };

export default async function HRReportPage() {
  const reportData = await getHRReportData();

  return <HRReportClient data={reportData} />;
}
