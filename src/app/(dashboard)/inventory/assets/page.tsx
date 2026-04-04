import { getAssets, getMaintenanceRequests } from "@/lib/actions/inventory";
import { AssetsClient } from "./assets-client";

export const metadata = { title: "Assets" };

export default async function AssetsPage() {
  const [assets, maintenance] = await Promise.all([
    getAssets(),
    getMaintenanceRequests(),
  ]);
  return <AssetsClient initialAssets={assets} initialMaintenance={maintenance} />;
}
