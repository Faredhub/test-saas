import { getWarehouseStock, getWarehouses, getStockMovements, getLowStockAlerts, getProducts } from "@/lib/actions/inventory";
import { StockClient } from "./stock-client";

export const metadata = { title: "Stock Management" };

export default async function StockPage() {
  const [stock, warehouses, movements, lowStockAlerts, products] = await Promise.all([
    getWarehouseStock(),
    getWarehouses(),
    getStockMovements(),
    getLowStockAlerts(),
    getProducts({ pageSize: 100 }),
  ]);
  return (
    <StockClient
      initialStock={stock}
      warehouses={warehouses}
      initialMovements={movements}
      lowStockAlerts={lowStockAlerts}
      products={products.data}
    />
  );
}
