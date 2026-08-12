import { getVendorReportData } from "@/lib/actions/organization";
import { VendorReportClient } from "./vendor-report-client";

export const metadata = { title: "Vendor Report" };

export default async function VendorReportPage() {
  const reportData = await getVendorReportData();

  return <VendorReportClient data={reportData} />;
}
