import { getQualityChecks } from "@/lib/actions/inventory";
import { getEntityReferenceData } from "@/lib/actions/reference";
import { QualityClient } from "./quality-client";

export const metadata = { title: "Quality Control" };

export default async function QualityPage() {
  const [checks, ref] = await Promise.all([
    getQualityChecks(),
    getEntityReferenceData(),
  ]);
  return <QualityClient initialData={checks} products={ref.products} employees={ref.employees} />;
}
