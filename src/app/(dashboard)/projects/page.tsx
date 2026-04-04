import { getProjects } from "@/lib/actions/projects";
import { ProjectsClient } from "./projects-client";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const data = await getProjects({ pageSize: 100 });
  return <ProjectsClient initialData={data} />;
}
