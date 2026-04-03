import { getActiveOrders } from "@/lib/actions/sales";
import { OrdersClient } from "./orders-client";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const orders = await getActiveOrders();

  return <OrdersClient initialOrders={orders} />;
}
