import { getSalesTeams } from "@/lib/actions/sales";
import { SalesTeamsClient } from "./teams-client";

export const metadata = { title: "Sales Teams | TixelTech ERP" };

export default async function SalesTeamsPage() {
  const teams = await getSalesTeams().catch(() => []);

  return <SalesTeamsClient initialTeams={teams} />;
}
