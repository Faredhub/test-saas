import { getAssetsReportData } from "@/lib/actions/organization";
import { AssetsReportClient } from "./assets-report-client";

export const metadata = { title: "Assets Report" };

export default async function AssetsReportPage() {
  const reportData = await getAssetsReportData();

  return <AssetsReportClient data={reportData} />;
}
