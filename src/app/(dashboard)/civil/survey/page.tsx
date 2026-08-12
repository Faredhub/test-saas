import { getSurveyReports, getSurveyTemplates } from "@/lib/actions/civil";
import { SurveyClient } from "./survey-client";

export const metadata = { title: "Survey Report" };

export default async function SurveyPage() {
  const [reports, templates] = await Promise.all([
    getSurveyReports(),
    getSurveyTemplates(),
  ]);
  return <SurveyClient initialReports={reports} templates={templates} />;
}
