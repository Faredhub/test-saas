import { getDesignReports, getDesignTemplates, getCivilReferenceData } from "@/lib/actions/civil";
import { DesignClient } from "./design-client";

export const metadata = { title: "Design Report" };

export default async function DesignPage() {
  const [reports, templates, refData] = await Promise.all([
    getDesignReports(),
    getDesignTemplates(),
    getCivilReferenceData(),
  ]);
  return (
    <DesignClient
      initialReports={reports}
      templates={templates}
      projects={refData.projects}
      clients={refData.clients}
    />
  );
}
