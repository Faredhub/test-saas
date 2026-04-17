import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/actions/sales";
import { getConfiguredGateway } from "@/lib/payment-gateway";
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

  const gateway = getConfiguredGateway();

  return <InvoiceView invoice={invoice} gateway={gateway} />;
}
