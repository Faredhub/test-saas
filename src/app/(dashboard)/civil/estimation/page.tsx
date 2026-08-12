import { getEstimations, getEstimationTemplates, getAnalysisOfRates } from "@/lib/actions/civil";
import { EstimationClient } from "./estimation-client";

export const metadata = { title: "Cost Estimation" };

export default async function EstimationPage() {
  const [estimations, templates, aorItems] = await Promise.all([
    getEstimations(),
    getEstimationTemplates(),
    getAnalysisOfRates(),
  ]);
  return (
    <EstimationClient
      initialEstimations={estimations}
      templates={templates}
      initialAOR={aorItems}
    />
  );
}
