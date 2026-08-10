import { getProducts } from "@/lib/actions/inventory";
import { getContacts } from "@/lib/actions/sales";
import { PricelistsClient } from "./pricelists-client";

export const metadata = { title: "Pricelists & Rules | TixelTech ERP" };

export default async function PricelistsPage() {
  const [productsRes, contactsRes] = await Promise.all([
    getProducts().catch(() => ({ data: [] })),
    getContacts().catch(() => ({ data: [] })),
  ]);

  const productsList = Array.isArray(productsRes) ? productsRes : ((productsRes as any)?.data || []);
  const contactsList = Array.isArray(contactsRes) ? contactsRes : ((contactsRes as any)?.data || []);

  return <PricelistsClient products={productsList} contacts={contactsList} />;
}
