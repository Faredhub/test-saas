import { getPresentations } from "@/lib/actions/office";
import { PresentationsClient } from "./presentations-client";

export const metadata = { title: "Presentations" };

export default async function PresentationsPage() {
  const presentations = await getPresentations();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PresentationsClient initialPresentations={presentations as any} />;
}
