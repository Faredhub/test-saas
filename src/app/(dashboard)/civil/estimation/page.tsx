import {
  getEstimations,
  getEstimationTemplates,
  getAnalysisOfRates,
  getScheduleOfRates,
} from "@/lib/actions/civil";
import { EstimationClient } from "./estimation-client";

export const metadata = { title: "Estimation / Quantity Take-off" };

export default async function EstimationPage() {
  const [estimations, templates, aorItems, sorItems] = await Promise.all([
    getEstimations(),
    getEstimationTemplates(),
    getAnalysisOfRates(),
    getScheduleOfRates(),
  ]);
  return (
    <EstimationClient
      initialEstimations={estimations}
      templates={templates}
      initialAOR={aorItems}
      initialSOR={sorItems}
    />
  );
}
