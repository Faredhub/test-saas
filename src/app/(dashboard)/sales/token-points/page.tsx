import { getTokenPoints, getRewardsCatalog } from "@/lib/actions/sales";
import { TokenPointsClient } from "./token-points-client";

export const metadata = { title: "Token / Points | TixelTech ERP" };

export default async function TokenPointsPage() {
  const [customers, rewards] = await Promise.all([
    getTokenPoints().catch(() => []),
    getRewardsCatalog().catch(() => []),
  ]);

  return <TokenPointsClient initialCustomers={customers} initialRewards={rewards} />;
}
