import { getEmailAccounts } from "@/lib/actions/office";
import { EmailClient } from "./email-client";

export const metadata = { title: "Email" };

export default async function EmailPage() {
  const accounts = await getEmailAccounts();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <EmailClient initialAccounts={accounts as any} />;
}
