import { getContracts, getSignatures } from "@/lib/actions/organization";
import { getContacts } from "@/lib/actions/sales";
import { ContractsClient } from "./contracts-client";

export const metadata = { title: "Contracts" };

export default async function ContractsPage() {
  const [contracts, contacts, signatures] = await Promise.all([
    getContracts(),
    getContacts(),
    getSignatures().catch(() => []),
  ]);
  return <ContractsClient initialData={contracts} contacts={contacts} userSignatures={signatures} />;
}

