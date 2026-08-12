import { getKiosks } from "@/lib/actions/sales";
import { KioskClient } from "./kiosk-client";

export const metadata = { title: "Kiosk Management" };

export default async function KioskPage() {
  const kiosks = (await getKiosks()).map((k) => ({
    ...k,
    createdAt: k.createdAt instanceof Date ? k.createdAt.toISOString() : k.createdAt,
    updatedAt: k.updatedAt instanceof Date ? k.updatedAt.toISOString() : k.updatedAt,
    pairedAt: k.pairedAt instanceof Date ? k.pairedAt.toISOString() : k.pairedAt,
    lastSeenAt: k.lastSeenAt instanceof Date ? k.lastSeenAt.toISOString() : k.lastSeenAt,
  }));

  return <KioskClient initialData={kiosks} />;
}
