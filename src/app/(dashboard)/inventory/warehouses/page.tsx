import { getWarehouses } from "@/lib/actions/inventory";
import { WarehousesClient } from "./warehouses-client";

export const metadata = { title: "Warehouses" };

export default async function WarehousesPage() {
  const warehouses = await getWarehouses();
  return <WarehousesClient initialData={warehouses} />;
}
