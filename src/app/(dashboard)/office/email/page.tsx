import { getEmailAccounts } from "@/lib/actions/office";
import { getMailServerForUser } from "@/lib/actions/mailbox";
import { EmailClient } from "./email-client";

export const metadata = { title: "Email" };

export default async function EmailPage() {
  const [accounts, mailServer] = await Promise.all([getEmailAccounts(), getMailServerForUser()]);
  return (
    <EmailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialAccounts={accounts as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mailServer={mailServer as any}
    />
  );
}
