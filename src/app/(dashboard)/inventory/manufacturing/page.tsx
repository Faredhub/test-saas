import { getManufacturingOrders } from "@/lib/actions/inventory";
import { getEntityReferenceData } from "@/lib/actions/reference";
import { ManufacturingClient } from "./manufacturing-client";

export const metadata = { title: "Manufacturing" };

export default async function ManufacturingPage() {
  const [orders, ref] = await Promise.all([
    getManufacturingOrders(),
    getEntityReferenceData(),
  ]);
  return <ManufacturingClient initialData={orders} products={ref.products} />;
}
