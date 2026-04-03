import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/actions/sales";
import { InvoiceView } from "./invoice-view";

export const metadata = { title: "Invoice Detail" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return <InvoiceView invoice={invoice} />;
}
