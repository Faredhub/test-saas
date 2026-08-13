import { getDeliveryOrders, getProducts, getManufacturingOrders } from "@/lib/actions/inventory";
import { DeliveriesClient } from "./deliveries-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Deliveries & Shipping | Inventory" };

export default async function DeliveriesPage() {
  try {
    const [rawDeliveries, rawProducts, rawMfg] = await Promise.all([
      getDeliveryOrders().catch(() => []),
      getProducts({ isActive: true }).catch(() => ({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 })),
      getManufacturingOrders().catch(() => ({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 })),
    ]);

    const deliveriesList = Array.isArray(rawDeliveries) ? rawDeliveries : [];

    const deliveries = deliveriesList.map((d) => ({
      id: d.id,
      deliveryNo: d.deliveryNo,
      sourceDocument: d.sourceDocument ?? null,
      contactName: d.contactName,
      contactPhone: d.contactPhone ?? null,
      scheduledDate: d.scheduledDate
        ? (d.scheduledDate instanceof Date ? d.scheduledDate.toISOString() : new Date(d.scheduledDate).toISOString())
        : new Date().toISOString(),
      status: d.status,
      notes: d.notes ?? null,
      items: Array.isArray(d.items)
        ? d.items.map((it) => ({
            id: it.id,
            productName: it.productName,
            demandQty: it.demandQty,
            doneQty: it.doneQty,
          }))
        : [],
    }));

    // Collect unique products from both Inventory Products catalog AND Manufacturing orders
    const productSet = new Set<string>();
    if (rawProducts?.data && Array.isArray(rawProducts.data)) {
      rawProducts.data.forEach((p) => {
        if (p.name) productSet.add(p.name);
      });
    }
    if (rawMfg?.data && Array.isArray(rawMfg.data)) {
      rawMfg.data.forEach((m) => {
        if (m.productName) productSet.add(m.productName);
      });
    }

    const availableProducts = Array.from(productSet).sort();

    return <DeliveriesClient deliveries={deliveries as any} availableProducts={availableProducts} />;
  } catch (error) {
    console.error("Error rendering DeliveriesPage:", error);
    return <DeliveriesClient deliveries={[]} availableProducts={[]} />;
  }
}
