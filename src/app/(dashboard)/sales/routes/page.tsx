import { getContactLocations } from "@/lib/actions/sales";
import { RoutesClient } from "./routes-client";

export const metadata = { title: "Route Planner" };

export default async function RoutePlannerPage() {
  const contacts = await getContactLocations();
  return <RoutesClient initialContacts={contacts} />;
}
