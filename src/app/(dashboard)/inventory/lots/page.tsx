import { getLotSerialNumbers, getProducts } from "@/lib/actions/inventory";
import { LotsClient } from "./lots-client";


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Lots & Serial Numbers | Inventory ERP" };

export default async function LotsPage() {
  const [lots, productsRes] = await Promise.all([
    getLotSerialNumbers(),
    getProducts({ isActive: true }),
  ]);

  const serializedLots = lots.map((l) => ({
    ...l,
    onHandQty: Number(l.onHandQty),
    mfgDate: l.mfgDate ? l.mfgDate.toISOString() : null,
    expiryDate: l.expiryDate ? l.expiryDate.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  const productsList = productsRes.data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
  }));

  return <LotsClient initialLots={serializedLots as any} products={productsList} />;
}
