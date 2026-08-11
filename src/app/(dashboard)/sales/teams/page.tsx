import { getSalesTeams, getSalesTeamFormData } from "@/lib/actions/sales";
import { SalesTeamsClient } from "./teams-client";

export const metadata = { title: "Sales Teams | TixelTech ERP" };

export default async function SalesTeamsPage() {
  const [teams, formData] = await Promise.all([
    getSalesTeams().catch(() => []),
    getSalesTeamFormData().catch(() => ({ users: [], contacts: [], quotations: [], orders: [] })),
  ]);

  return <SalesTeamsClient initialTeams={teams} formData={formData} />;
}
