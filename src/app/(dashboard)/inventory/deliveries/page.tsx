import { getDeliveryOrders, getProducts, getManufacturingOrders } from "@/lib/actions/inventory";
import { DeliveriesClient } from "./deliveries-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Deliveries & Shipping | Inventory" };

export default async function DeliveriesPage() {
  const [rawDeliveries, rawProducts, rawMfg] = await Promise.all([
    getDeliveryOrders(),
    getProducts({ isActive: true }),
    getManufacturingOrders(),
  ]);

  const deliveries = rawDeliveries.map((d) => ({
    id: d.id,
    deliveryNo: d.deliveryNo,
    sourceDocument: d.sourceDocument,
    contactName: d.contactName,
    contactPhone: d.contactPhone,
    scheduledDate: d.scheduledDate.toISOString(),
    status: d.status,
    notes: d.notes,
    items: d.items.map((it) => ({
      id: it.id,
      productName: it.productName,
      demandQty: it.demandQty,
      doneQty: it.doneQty,
    })),
  }));

  // Collect unique products from both Inventory Products catalog AND Manufacturing orders
  const productSet = new Set<string>();
  rawProducts.data.forEach((p) => {
    if (p.name) productSet.add(p.name);
  });
  rawMfg.data.forEach((m) => {
    if (m.productName) productSet.add(m.productName);
  });

  const availableProducts = Array.from(productSet).sort();

  return <DeliveriesClient deliveries={deliveries as any} availableProducts={availableProducts} />;
}
