import { getFieldVisits } from "@/lib/actions/projects";
import { getProjects } from "@/lib/actions/projects";
import { getEmployees } from "@/lib/actions/hrm";
import { getForms } from "@/lib/actions/organization";
import { getEntityReferenceData } from "@/lib/actions/reference";
import { FieldVisitsClient } from "./field-visits-client";

export const metadata = { title: "Field Visits" };

export default async function FieldVisitsPage() {
  const [visits, projectsData, employeesData, formTemplates, ref] = await Promise.all([
    getFieldVisits(),
    getProjects({ pageSize: 500 }),
    getEmployees({ pageSize: 500 }),
    getForms().catch(() => []),
    getEntityReferenceData(),
  ]);

  return (
    <FieldVisitsClient
      initialVisits={visits}
      projects={projectsData.projects as any}
      employees={(employeesData?.data ?? []) as any}
      formTemplates={formTemplates as any}
      contacts={ref.contacts}
    />
  );
}
