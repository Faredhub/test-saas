import { getLotSerialNumbers, getProducts } from "@/lib/actions/inventory";
import { LotsClient } from "./lots-client";


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lots & Serial Numbers | Inventory ERP" };

export default async function LotsPage() {
  try {
    const [lotsRes, productsRes] = await Promise.all([
      getLotSerialNumbers().catch(() => []),
      getProducts({ isActive: true }).catch(() => ({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 })),
    ]);

    const lots = Array.isArray(lotsRes) ? lotsRes : [];
    const products = Array.isArray(productsRes?.data) ? productsRes.data : [];

    const serializedLots = lots.map((l) => ({
      ...l,
      onHandQty: Number(l.onHandQty || 0),
      mfgDate: l.mfgDate ? (l.mfgDate instanceof Date ? l.mfgDate.toISOString() : new Date(l.mfgDate).toISOString()) : null,
      expiryDate: l.expiryDate ? (l.expiryDate instanceof Date ? l.expiryDate.toISOString() : new Date(l.expiryDate).toISOString()) : null,
      createdAt: l.createdAt ? (l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: l.updatedAt ? (l.updatedAt instanceof Date ? l.updatedAt.toISOString() : new Date(l.updatedAt).toISOString()) : new Date().toISOString(),
    }));

    const productsList = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
    }));

    return <LotsClient initialLots={serializedLots as any} products={productsList} />;
  } catch (error) {
    console.error("Error rendering LotsPage:", error);
    return <LotsClient initialLots={[]} products={[]} />;
  }
}
