import { getTimesheets } from "@/lib/actions/projects";
import { TimesheetsClient } from "./timesheets-client";

export const metadata = { title: "Timesheets" };

export default async function TimesheetsPage() {
  const data = await getTimesheets({ pageSize: 100 });
  return <TimesheetsClient initialData={data} />;
}
