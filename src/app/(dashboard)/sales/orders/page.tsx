import { getB2BSalesOrders } from "@/lib/actions/sales";
import { OrdersClient } from "./orders-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Sales Orders | TixelTech ERP" };

export default async function OrdersPage() {
  const orders = await getB2BSalesOrders().catch(() => []);

  return <OrdersClient initialOrders={orders} />;
}
