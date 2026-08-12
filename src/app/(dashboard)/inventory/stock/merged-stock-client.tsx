"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockClient } from "./stock-client";
import { ProductsClient } from "../products/products-client";
import { Package, Warehouse } from "lucide-react";

type Props = {
  initialStock: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getWarehouseStock>>;
  warehouses: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getWarehouses>>;
  initialMovements: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getStockMovements>>;
  lowStockAlerts: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getLowStockAlerts>>;
  products: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getProducts>>["data"];
  catalogProducts: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getProducts>>;
  categories: string[];
};

export function MergedStockClient({
  initialStock,
  warehouses,
  initialMovements,
  lowStockAlerts,
  products,
  catalogProducts,
  categories,
}: Props) {
  const [activeTab, setActiveTab] = useState("inventory");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "levels" || tab === "inventory" || tab === "catalog") {
      setActiveTab(tab === "catalog" ? "inventory" : tab);
    }
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Premium Main Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Stock</h1>
        <p className="text-muted-foreground">
          Manage product catalog, check stock levels, and track warehouse movements.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-2">
            <Warehouse className="h-4 w-4" />
            Stock Levels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="border-none p-0 outline-none">
          <ProductsClient
            initialProducts={catalogProducts.data.map((p) => ({
              ...p,
              costPrice: Number(p.costPrice),
              sellingPrice: Number(p.sellingPrice),
              taxRate: Number(p.taxRate),
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            })) as any}
          />
        </TabsContent>

        <TabsContent value="levels" className="border-none p-0 outline-none">
          <StockClient
            initialStock={initialStock}
            warehouses={warehouses}
            initialMovements={initialMovements}
            lowStockAlerts={lowStockAlerts}
            products={products}
            hideHeader
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
