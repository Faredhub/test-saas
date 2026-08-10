import { getVendors } from "@/lib/actions/inventory";
import { BillsClient } from "./bills-client";

export const metadata = { title: "Vendor Bills | TixelTech ERP" };

export default async function BillsPage() {
  const vendorsRes = await getVendors().catch(() => ({ data: [], total: 0, page: 1, pageSize: 100, totalPages: 1 }));

  return <BillsClient registeredVendors={vendorsRes.data} />;
}
