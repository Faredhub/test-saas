import { getProductVariants, getProducts } from "@/lib/actions/inventory";
import { VariantsClient } from "./variants-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Product Variants | Inventory ERP" };

export default async function ProductVariantsPage() {
  try {
    const [variantsRes, productsRes] = await Promise.all([
      getProductVariants().catch(() => []),
      getProducts({ isActive: true }).catch(() => ({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 })),
    ]);

    const variants = Array.isArray(variantsRes) ? variantsRes : [];
    const products = Array.isArray(productsRes?.data) ? productsRes.data : [];

    const serializedVariants = variants.map((v) => ({
      ...v,
      priceOffset: Number(v.priceOffset || 0),
      createdAt: v.createdAt ? (v.createdAt instanceof Date ? v.createdAt.toISOString() : new Date(v.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: v.updatedAt ? (v.updatedAt instanceof Date ? v.updatedAt.toISOString() : new Date(v.updatedAt).toISOString()) : new Date().toISOString(),
    }));

    const productsList = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
    }));

    return <VariantsClient initialVariants={serializedVariants as any} products={productsList} />;
  } catch (error) {
    console.error("Error rendering ProductVariantsPage:", error);
    return <VariantsClient initialVariants={[]} products={[]} />;
  }
}
