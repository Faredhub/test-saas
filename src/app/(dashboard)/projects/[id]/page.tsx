import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions/projects";
import { ProjectDetailClient } from "./project-detail-client";

export const metadata = { title: "Project Detail" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project} />;
}
