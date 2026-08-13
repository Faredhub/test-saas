import { getQuotations } from "@/lib/actions/sales";
import { getSignatures } from "@/lib/actions/organization";
import { QuotationsClient } from "./quotations-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const [data, signatures] = await Promise.all([
    getQuotations(),
    getSignatures(),
  ]);

  // Serialize to plain JSON objects to prevent RSC Decimal/Date serialization errors
  const serializedData = JSON.parse(JSON.stringify(data));
  const serializedSignatures = JSON.parse(JSON.stringify(signatures));

  return <QuotationsClient initialData={serializedData} initialSignatures={serializedSignatures} />;
}
