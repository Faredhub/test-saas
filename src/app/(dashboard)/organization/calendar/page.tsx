import { getCalendarEvents } from "@/lib/actions/organization";
import { CalendarClient } from "./calendar-client";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const events = await getCalendarEvents();
  return <CalendarClient initialData={events} />;
}
