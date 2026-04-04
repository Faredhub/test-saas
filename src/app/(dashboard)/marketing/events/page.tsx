import { getEvents } from "@/lib/actions/marketing";
import { EventsClient } from "./events-client";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const eventsData = await getEvents({ pageSize: 100 });
  return <EventsClient initialData={eventsData} />;
}
