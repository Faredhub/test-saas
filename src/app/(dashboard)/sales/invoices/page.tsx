import { getInvoices, getContacts } from "@/lib/actions/sales";
import { InvoicesClient } from "./invoices-client";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const [invoices, contacts] = await Promise.all([
    getInvoices(),
    getContacts({ pageSize: 500 }),
  ]);
  return <InvoicesClient initialData={invoices} initialContacts={contacts.data} />;
}
