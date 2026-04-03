import { getQuotations } from "@/lib/actions/sales";
import { QuotationsClient } from "./quotations-client";

export const metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const data = await getQuotations();
  return <QuotationsClient initialData={data} />;
}
