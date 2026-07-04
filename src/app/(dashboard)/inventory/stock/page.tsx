import {
  getWarehouseStock,
  getWarehouses,
  getStockMovements,
  getLowStockAlerts,
  getProducts,
  getProductCategories,
} from "@/lib/actions/inventory";
import { MergedStockClient } from "./merged-stock-client";

export const metadata = { title: "Stock Management" };

export default async function StockPage() {
  const [stock, warehouses, movements, lowStockAlerts, products, catalogProducts, categories] = await Promise.all([
    getWarehouseStock(),
    getWarehouses(),
    getStockMovements(),
    getLowStockAlerts(),
    getProducts({ pageSize: 100 }), // For the Record Movement dropdown selection
    getProducts(), // For the catalog tab view
    getProductCategories(),
  ]);

  return (
    <MergedStockClient
      initialStock={stock}
      warehouses={warehouses}
      initialMovements={movements}
      lowStockAlerts={lowStockAlerts}
      products={products.data}
      catalogProducts={catalogProducts}
      categories={categories}
    />
  );
}
