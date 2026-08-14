import { getProjects } from "@/lib/actions/projects";
import { getEntityReferenceData } from "@/lib/actions/reference";
import { ProjectsClient } from "./projects-client";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const [data, ref] = await Promise.all([
    getProjects({ pageSize: 100 }),
    getEntityReferenceData(),
  ]);
  return <ProjectsClient initialData={data} contacts={ref.contacts} />;
}
