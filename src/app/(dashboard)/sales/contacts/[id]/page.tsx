import { notFound } from "next/navigation";
import { getContactById } from "@/lib/actions/sales";
import { ContactDetail } from "./contact-detail";

export const metadata = { title: "Contact Detail" };

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContactById(id);

  if (!contact) {
    notFound();
  }

  return <ContactDetail contact={contact} />;
}
