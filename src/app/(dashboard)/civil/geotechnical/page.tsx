import { getGeotechnicalReports, getGeotechnicalTemplates, getCivilReferenceData } from "@/lib/actions/civil";
import { GeotechnicalClient } from "./geotechnical-client";

export const metadata = { title: "Geotechnical Report" };

export default async function GeotechnicalPage() {
  const [reports, templates, refData] = await Promise.all([
    getGeotechnicalReports(),
    getGeotechnicalTemplates(),
    getCivilReferenceData(),
  ]);
  return (
    <GeotechnicalClient
      initialReports={reports}
      templates={templates}
      projects={refData.projects}
      clients={refData.clients}
    />
  );
}
