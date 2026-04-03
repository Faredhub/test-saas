import { getVisits, getVisitStats, getContactsForSelect, getLeadsForSelect } from "@/lib/actions/sales";
import { VisitsClient } from "./visits-client";

export const metadata = { title: "Visits" };

export default async function VisitsPage() {
  const [visitsData, stats, contacts, leads] = await Promise.all([
    getVisits(),
    getVisitStats(),
    getContactsForSelect(),
    getLeadsForSelect(),
  ]);

  return (
    <VisitsClient
      initialData={visitsData}
      stats={stats}
      contacts={contacts}
      leads={leads}
    />
  );
}
