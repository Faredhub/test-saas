import { getBranches } from "@/lib/actions/organization";
import { BranchesClient } from "./branches-client";

export const metadata = { title: "Branches" };

export default async function BranchesPage() {
  const branches = await getBranches();
  return <BranchesClient initialData={branches} />;
}
