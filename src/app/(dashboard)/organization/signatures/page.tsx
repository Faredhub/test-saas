import { getSignatures } from "@/lib/actions/organization";
import { SignaturesClient } from "./signatures-client";

export const metadata = { title: "Signatures" };

export default async function SignaturesPage() {
  const signatures = await getSignatures();
  return <SignaturesClient initialData={signatures} />;
}
