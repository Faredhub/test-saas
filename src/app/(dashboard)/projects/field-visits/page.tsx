import { getFieldVisits } from "@/lib/actions/projects";
import { getProjects } from "@/lib/actions/projects";
import { getEmployees } from "@/lib/actions/hrm";
import { getForms } from "@/lib/actions/organization";
import { FieldVisitsClient } from "./field-visits-client";

export const metadata = { title: "Field Visits" };

export default async function FieldVisitsPage() {
  const [visits, projectsData, employeesData, formTemplates] = await Promise.all([
    getFieldVisits(),
    getProjects({ pageSize: 500 }),
    getEmployees({ pageSize: 500 }),
    getForms().catch(() => []),
  ]);

  return (
    <FieldVisitsClient
      initialVisits={visits}
      projects={projectsData.projects as any}
      employees={(employeesData?.data ?? []) as any}
      formTemplates={formTemplates as any}
    />
  );
}
