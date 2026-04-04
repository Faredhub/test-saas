import { getProducts, getProductCategories, getWarehouses } from "@/lib/actions/inventory";
import { ProductsClient } from "./products-client";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const [products, categories, warehouses] = await Promise.all([
    getProducts(),
    getProductCategories(),
    getWarehouses(),
  ]);
  return <ProductsClient initialData={products} categories={categories} warehouses={warehouses} />;
}
