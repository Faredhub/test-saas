import { getTickets } from "@/lib/actions/projects";
import { getAllEmployees } from "@/lib/actions/organization";
import { TicketsClient } from "./tickets-client";

export const metadata = { title: "Tickets" };

export default async function TicketsPage() {
  const [data, employees] = await Promise.all([
    getTickets({ pageSize: 100 }),
    getAllEmployees().catch(() => []),
  ]);
  return <TicketsClient initialData={data} employees={employees} />;
}
