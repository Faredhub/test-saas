import { getManufacturingOrders } from "@/lib/actions/inventory";
import { ManufacturingClient } from "./manufacturing-client";

export const metadata = { title: "Manufacturing" };

export default async function ManufacturingPage() {
  const orders = await getManufacturingOrders();
  return <ManufacturingClient initialData={orders} />;
}
