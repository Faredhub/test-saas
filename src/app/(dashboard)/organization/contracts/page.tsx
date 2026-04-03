import { getContracts } from "@/lib/actions/organization";
import { getContacts } from "@/lib/actions/sales";
import { ContractsClient } from "./contracts-client";

export const metadata = { title: "Contracts" };

export default async function ContractsPage() {
  const [contracts, contacts] = await Promise.all([
    getContracts(),
    getContacts(),
  ]);
  return <ContractsClient initialData={contracts} contacts={contacts} />;
}
