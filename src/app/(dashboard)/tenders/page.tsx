import { getTenders } from "@/lib/actions/tenders";
import { TenderClient } from "./tender-client";

export const metadata = { title: "Tender Management" };

export default async function TendersPage() {
  const tendersData = await getTenders({ pageSize: 50 });

  return <TenderClient initialData={tendersData} />;
}
