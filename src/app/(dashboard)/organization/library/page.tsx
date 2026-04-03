import { getDocuments } from "@/lib/actions/organization";
import { LibraryClient } from "./library-client";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const documents = await getDocuments();
  return <LibraryClient initialData={documents} />;
}
