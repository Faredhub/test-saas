import { getCustomDomains } from "@/lib/actions/website";
import { DomainsClient } from "./domains-client";

export const metadata = { title: "Custom Domains" };

export default async function DomainsPage() {
  const domains = await getCustomDomains();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DomainsClient initialDomains={domains as any} />;
}
