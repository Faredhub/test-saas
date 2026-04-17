import { notFound } from "next/navigation";
import { getReportById } from "@/lib/actions/reports";
import { ReportDetailClient } from "./report-detail-client";

export const metadata = { title: "Report Detail" };

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(id);

  if (!report) {
    notFound();
  }

  return <ReportDetailClient report={report} />;
}
