import { runSimulation } from "@/lib/actions/sales";
import { SimulationClient } from "./simulation-client";

export const metadata = { title: "Sales Simulation | TixelTech ERP" };

export default async function SimulationPage() {
  const initialResult = await runSimulation({
    scenario: "Financial",
    params: { revenueGrowth: 8, costChange: 3, interestRate: 7, taxRate: 25 },
  }).catch(() => null);

  return <SimulationClient initialResult={initialResult} />;
}
