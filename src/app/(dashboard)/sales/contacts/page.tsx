import { getContacts } from "@/lib/actions/sales";
import { ContactsClient } from "./contacts-client";

export const metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const data = await getContacts();
  return <ContactsClient initialData={data} />;
}
