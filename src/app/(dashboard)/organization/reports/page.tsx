import { getSavedReports } from "@/lib/actions/organization";
import { ReportsClient } from "./reports-client";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const savedReports = await getSavedReports();

  return <ReportsClient savedReports={savedReports} />;
}
