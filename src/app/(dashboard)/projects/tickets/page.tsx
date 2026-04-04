import { getTickets } from "@/lib/actions/projects";
import { TicketsClient } from "./tickets-client";

export const metadata = { title: "Tickets" };

export default async function TicketsPage() {
  const data = await getTickets({ pageSize: 100 });
  return <TicketsClient initialData={data} />;
}
