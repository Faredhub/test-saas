import { getChannels, getTenantUsers } from "@/lib/actions/office";
import { MessagingClient } from "./messaging-client";

export const metadata = { title: "Messaging" };

export default async function MessagingPage() {
  const [channels, users] = await Promise.all([getChannels(), getTenantUsers()]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <MessagingClient initialChannels={channels as any} users={users as any} />;
}
