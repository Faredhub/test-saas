import { getDocuments, getTenantUsers } from "@/lib/actions/office";
import { DocumentsClient } from "./documents-client";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const [docs, users] = await Promise.all([getDocuments(), getTenantUsers()]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DocumentsClient initialDocs={docs as any} users={users as any} />;
}
