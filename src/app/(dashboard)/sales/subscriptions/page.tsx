import { getSubscriptions, getContacts } from "@/lib/actions/sales";
import { SubscriptionsClient } from "./subscriptions-client";

export const metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const [subscriptions, contactsData] = await Promise.all([
    getSubscriptions(),
    getContacts({ pageSize: 200 }),
  ]);
  return (
    <SubscriptionsClient
      initialData={subscriptions}
      contacts={contactsData.data}
    />
  );
}
