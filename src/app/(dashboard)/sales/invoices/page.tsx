import { getInvoices } from "@/lib/actions/sales";
import { InvoicesClient } from "./invoices-client";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const data = await getInvoices();
  return <InvoicesClient initialData={data} />;
}
