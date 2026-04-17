import { getProjectTemplates } from "@/lib/actions/projects";
import { TemplatesClient } from "./templates-client";

export const metadata = { title: "Project Templates" };

export default async function TemplatesPage() {
  const templates = await getProjectTemplates();
  return <TemplatesClient initialTemplates={templates} />;
}
