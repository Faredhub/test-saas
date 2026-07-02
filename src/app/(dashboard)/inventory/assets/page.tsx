import { getAssets, getMaintenanceRequests } from "@/lib/actions/inventory";
import { getUsersWithRoles } from "@/lib/actions/rbac";
import { AssetsClient } from "./assets-client";

export const metadata = { title: "Assets" };

export default async function AssetsPage() {
  const [assets, maintenance, users] = await Promise.all([
    getAssets(),
    getMaintenanceRequests(),
    getUsersWithRoles(),
  ]);
  return <AssetsClient initialAssets={assets} initialMaintenance={maintenance} users={users} />;
}
