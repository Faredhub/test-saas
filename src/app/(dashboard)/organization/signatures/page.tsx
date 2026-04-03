import { getSignatures, getSignatureRequests, getOrgUsers } from "@/lib/actions/organization";
import { auth } from "@/lib/auth";
import { SignaturesClient } from "./signatures-client";

export const metadata = { title: "Signatures" };

export default async function SignaturesPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUserId = (session?.user as any)?.id as string;

  const [signatures, requests, orgUsers] = await Promise.all([
    getSignatures(),
    getSignatureRequests(),
    getOrgUsers(),
  ]);
  return (
    <SignaturesClient
      initialData={signatures}
      initialRequests={requests}
      orgUsers={orgUsers}
      currentUserId={currentUserId}
    />
  );
}
