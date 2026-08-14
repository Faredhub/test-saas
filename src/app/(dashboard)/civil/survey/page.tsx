import { getSurveyReports, getSurveyTemplates, getCivilReferenceData } from "@/lib/actions/civil";
import { SurveyClient } from "./survey-client";

export const metadata = { title: "Survey Report" };

export default async function SurveyPage() {
  const [reports, templates, refData] = await Promise.all([
    getSurveyReports(),
    getSurveyTemplates(),
    getCivilReferenceData(),
  ]);
  return (
    <SurveyClient
      initialReports={reports}
      templates={templates}
      projects={refData.projects}
      clients={refData.clients}
    />
  );
}
