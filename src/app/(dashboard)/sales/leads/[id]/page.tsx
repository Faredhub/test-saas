import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/actions/sales";
import { LeadDetail } from "./lead-detail";

export const metadata = { title: "Lead Detail" };

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  return <LeadDetail lead={lead} />;
}
