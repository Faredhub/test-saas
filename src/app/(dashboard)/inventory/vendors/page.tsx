import { Suspense } from "react";
import { getVendors, getVendorProducts, getPurchaseOrders, getProducts } from "@/lib/actions/inventory";
import { getVendorBills } from "@/lib/actions/finance";
import { VendorsClient } from "./vendors-client";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Vendors Management | TixelTech ERP",
  description: "Manage vendors, product supplier pricing, RFQs, purchase orders, and finance bills integration.",
};

export default async function VendorsPage() {
  const [vendorsRes, vendorProducts, purchaseOrders, productsRes, billsRes] = await Promise.all([
    getVendors().catch(() => ({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 1 })),
    getVendorProducts().catch(() => []),
    getPurchaseOrders().catch(() => []),
    getProducts({ pageSize: 100 }).catch(() => ({ data: [], total: 0, page: 1, pageSize: 100, totalPages: 1 })),
    getVendorBills({ pageSize: 100 }).catch(() => ({ data: [], total: 0, page: 1, pageSize: 100, totalPages: 1 })),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VendorsClient
        initialVendors={vendorsRes.data}
        initialVendorProducts={vendorProducts}
        initialPurchaseOrders={purchaseOrders}
        products={productsRes.data}
        initialBills={billsRes.data}
      />
    </Suspense>
  );
}
