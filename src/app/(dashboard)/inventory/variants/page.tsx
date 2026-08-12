import { getProductVariants, getProducts } from "@/lib/actions/inventory";
import { VariantsClient } from "./variants-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Product Variants | Inventory ERP" };

export default async function ProductVariantsPage() {
  const [variants, productsRes] = await Promise.all([
    getProductVariants(),
    getProducts({ isActive: true }),
  ]);

  const serializedVariants = variants.map((v) => ({
    ...v,
    priceOffset: Number(v.priceOffset),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }));

  const productsList = productsRes.data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
  }));

  return <VariantsClient initialVariants={serializedVariants as any} products={productsList} />;
}
