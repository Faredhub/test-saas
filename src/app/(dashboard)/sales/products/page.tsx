import { getProducts, getWarehouses } from "@/lib/actions/inventory";
import { SalesProductsClient } from "./sales-products-client";

export const metadata = { title: "Sales Products & Variants | TixelTech ERP" };

export default async function SalesProductsPage() {
  const [productsRes, warehouses] = await Promise.all([
    getProducts().catch(() => ({ data: [] })),
    getWarehouses().catch(() => []),
  ]);

  const productsList = Array.isArray(productsRes) ? productsRes : (productsRes?.data || []);
  const categoriesList = ["General", "Storable", "Consumable", "Services", "Furniture", "Electronics"];

  return (
    <SalesProductsClient
      initialProducts={productsList}
      categories={categoriesList}
      warehouses={warehouses}
    />
  );
}
