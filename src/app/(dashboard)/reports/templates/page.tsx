import { getReportTemplates } from "@/lib/actions/reports";
import { TemplatesClient } from "./templates-client";

export const metadata = { title: "Report Templates" };

export default async function ReportTemplatesPage() {
  const templates = await getReportTemplates();
  return <TemplatesClient initialTemplates={templates} />;
}
