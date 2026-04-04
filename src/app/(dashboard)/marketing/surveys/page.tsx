import { getSurveys } from "@/lib/actions/marketing";
import { SurveysClient } from "./surveys-client";

export const metadata = { title: "Surveys" };

export default async function SurveysPage() {
  const surveysData = await getSurveys({ pageSize: 100 });
  return <SurveysClient initialData={surveysData} />;
}
