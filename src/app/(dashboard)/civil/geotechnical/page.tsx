import { getGeotechnicalReports, getGeotechnicalTemplates } from "@/lib/actions/civil";
import { GeotechnicalClient } from "./geotechnical-client";

export const metadata = { title: "Geotechnical Report" };

export default async function GeotechnicalPage() {
  const [reports, templates] = await Promise.all([
    getGeotechnicalReports(),
    getGeotechnicalTemplates(),
  ]);
  return <GeotechnicalClient initialReports={reports} templates={templates} />;
}
