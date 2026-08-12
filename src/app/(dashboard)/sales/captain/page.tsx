import { getCaptains, getAllDeliveries } from "@/lib/actions/sales";
import { CaptainClient } from "./captain-client";

export const metadata = { title: "Captain Management | TixelTech ERP" };

export default async function CaptainPage() {
  const [captains, deliveries] = await Promise.all([
    getCaptains().catch(() => []),
    getAllDeliveries().catch(() => []),
  ]);

  return <CaptainClient initialCaptains={captains} initialDeliveries={deliveries} />;
}
