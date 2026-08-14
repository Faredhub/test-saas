import {
  getEstimations,
  getEstimationTemplates,
  getAnalysisOfRates,
  getScheduleOfRates,
  getCivilReferenceData,
} from "@/lib/actions/civil";
import { EstimationClient } from "./estimation-client";

export const metadata = { title: "Estimation / Quantity Take-off" };

export default async function EstimationPage() {
  const [estimations, templates, aorItems, sorItems, refData] = await Promise.all([
    getEstimations(),
    getEstimationTemplates(),
    getAnalysisOfRates(),
    getScheduleOfRates(),
    getCivilReferenceData(),
  ]);
  return (
    <EstimationClient
      initialEstimations={estimations}
      templates={templates}
      initialAOR={aorItems}
      initialSOR={sorItems}
      projects={refData.projects}
      clients={refData.clients}
    />
  );
}
