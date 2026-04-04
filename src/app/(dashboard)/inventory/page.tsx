import { getInventoryStats, getLowStockAlerts } from "@/lib/actions/inventory";
import { InventoryClient } from "./inventory-client";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const [stats, lowStock] = await Promise.all([
    getInventoryStats(),
    getLowStockAlerts(),
  ]);
  return <InventoryClient stats={stats} lowStockAlerts={lowStock} />;
}
