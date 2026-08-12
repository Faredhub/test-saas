import { getEcommerceOrders } from "@/lib/actions/website";
import { EcommerceClient } from "./ecommerce-client";

export const metadata = { title: "eCommerce" };

export default async function EcommercePage() {
  const orders = await getEcommerceOrders();
  return <EcommerceClient initialOrders={orders} />;
}
