import { prisma } from "@/lib/db";
import { SiteStoreClient } from "./site-store-client";

export const metadata = {
  title: "Online Storefront | TixelStore",
  description: "Browse products, order enterprise hardware and software licenses online.",
};

export default async function PublicStorePage() {
  const rawProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: { warehouseStock: true },
    orderBy: { name: "asc" },
  });

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    sellingPrice: Number(p.sellingPrice),
    description: p.description,
    imageUrl: p.imageUrl,
    stockQty: p.warehouseStock.reduce((acc, ws) => acc + ws.quantity, 0),
  }));

  return <SiteStoreClient products={products} />;
}
