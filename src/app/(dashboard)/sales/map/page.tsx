import { getAllContactsForMap, getContactCitiesAndStates } from "@/lib/actions/sales";
import { MapClient } from "./map-client";

export const metadata = { title: "Customer Map" };

export default async function CustomerMapPage() {
  const [contacts, filters] = await Promise.all([
    getAllContactsForMap(),
    getContactCitiesAndStates(),
  ]);

  return <MapClient initialContacts={contacts} filterOptions={filters} />;
}
