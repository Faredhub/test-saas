import { getTenantMailServer } from "@/lib/actions/mail-servers";
import { MailServersClient } from "./mail-servers-client";

export const metadata = { title: "Mail Server" };

export default async function MailServerPage() {
  let initial: Awaited<ReturnType<typeof getTenantMailServer>> | null = null;
  let error: string | null = null;
  try {
    initial = await getTenantMailServer();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load mail server config";
  }
  return <MailServersClient initial={initial} initialError={error} />;
}
