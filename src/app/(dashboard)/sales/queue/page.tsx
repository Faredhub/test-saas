import { getQueueTokens } from "@/lib/actions/sales";
import { QueueClient } from "./queue-client";

export const metadata = { title: "Queue Management" };

export default async function QueuePage() {
  const tokens = await getQueueTokens();

  return <QueueClient initialData={tokens} />;
}
