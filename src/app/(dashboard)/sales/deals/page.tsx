import { getDeals } from "@/lib/actions/sales";
import { DealsClient } from "./deals-client";

export const metadata = { title: "Deals" };

export default async function DealsPage() {
  const data = await getDeals();
  return <DealsClient initialData={data} />;
}
