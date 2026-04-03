import { notFound } from "next/navigation";
import { getDealById } from "@/lib/actions/sales";
import { DealDetail } from "./deal-detail";

export const metadata = { title: "Deal Detail" };

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDealById(id);

  if (!deal) {
    notFound();
  }

  return <DealDetail deal={deal} />;
}
