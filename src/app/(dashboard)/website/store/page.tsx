import { getProducts, getDeliveryOrders } from "@/lib/actions/inventory";
import { prisma, tenantScope } from "@/lib/db";
import { auth } from "@/lib/auth";
import { StoreClient } from "./store-client";

export const metadata = { title: "Site Store & eCommerce Hub" };

export default async function WebsiteStorePage() {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId || "";

  const [rawProducts, rawDeliveries, rawMfgOrders] = await Promise.all([
    getProducts({ isActive: true }),
    getDeliveryOrders(),
    prisma.manufacturingOrder.findMany({
      where: tenantScope(tenantId),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const products = rawProducts.data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    sellingPrice: Number(p.sellingPrice),
    isActive: p.isActive,
    stockQty: p.warehouseStock.reduce((acc, ws) => acc + ws.quantity, 0),
  }));

  const deliveries = rawDeliveries.map((d) => ({
    id: d.id,
    deliveryNo: d.deliveryNo,
    sourceDocument: d.sourceDocument,
    contactName: d.contactName,
    contactPhone: d.contactPhone,
    scheduledDate: d.scheduledDate.toISOString(),
    status: d.status,
    items: d.items.map((it) => ({
      productName: it.productName,
      demandQty: it.demandQty,
      doneQty: it.doneQty,
    })),
  }));

  const mfgOrders = rawMfgOrders.map((m) => ({
    id: m.id,
    orderNo: m.orderNo,
    productName: m.productName,
    quantity: m.quantity,
    completedQty: m.completedQty,
    status: m.status,
    startDate: m.startDate ? m.startDate.toISOString() : null,
  }));

  return (
    <StoreClient
      products={products}
      deliveries={deliveries as any}
      mfgOrders={mfgOrders as any}
    />
  );
}
