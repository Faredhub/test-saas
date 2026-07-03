import { getTimesheets, getProjects } from "@/lib/actions/projects";
import { getEmployees } from "@/lib/actions/hrm";
import { TimesheetsClient } from "./timesheets-client";

export const metadata = { title: "Timesheets" };

export default async function TimesheetsPage() {
  const [data, employeesRes, projectsRes] = await Promise.all([
    getTimesheets({ pageSize: 100 }),
    getEmployees({ pageSize: 1000 }),
    getProjects({ pageSize: 1000 }),
  ]);
  return (
    <TimesheetsClient
      initialData={data}
      employees={employeesRes.data as any}
      projects={projectsRes.projects as any}
    />
  );
}
