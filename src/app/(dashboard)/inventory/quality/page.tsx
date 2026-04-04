import { getQualityChecks } from "@/lib/actions/inventory";
import { QualityClient } from "./quality-client";

export const metadata = { title: "Quality Control" };

export default async function QualityPage() {
  const checks = await getQualityChecks();
  return <QualityClient initialData={checks} />;
}
