import { getPresentations, getTenantUsers } from "@/lib/actions/office";
import { PresentationsClient } from "./presentations-client";

export const metadata = { title: "Presentations" };

export default async function PresentationsPage() {
  const [presentations, users] = await Promise.all([
    getPresentations(),
    getTenantUsers(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <PresentationsClient
      initialPresentations={presentations as any}
      users={users as any}
    />
  );
}
