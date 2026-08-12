import { getProducts } from "@/lib/actions/inventory";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Central Products Repository | Inventory ERP" };

export default async function ProductsPage() {
  const productsRes = await getProducts({ pageSize: 100 });

  const productsList = productsRes.data.map((p) => ({
    ...p,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    taxRate: Number(p.taxRate),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProductsClient initialProducts={productsList as any} />;
}
