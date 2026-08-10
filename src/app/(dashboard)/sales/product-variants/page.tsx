import { getProducts } from "@/lib/actions/inventory";
import { ProductVariantsClient } from "./product-variants-client";

export const metadata = { title: "Product Variants | TixelTech ERP" };

export default async function ProductVariantsPage() {
  const productsRes = await getProducts().catch(() => ({ data: [] }));
  const productsList = Array.isArray(productsRes) ? productsRes : ((productsRes as any)?.data || []);

  return <ProductVariantsClient products={productsList} />;
}
