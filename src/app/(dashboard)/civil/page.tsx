import { getCivilOverviewStats } from "@/lib/actions/civil";
import { CivilOverviewClient } from "./civil-overview-client";

export const metadata = { title: "Civil Engineering Reports" };

export default async function CivilPage() {
  const stats = await getCivilOverviewStats();
  return <CivilOverviewClient stats={stats} />;
}
