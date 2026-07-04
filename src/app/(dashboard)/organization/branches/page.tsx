import { getBranches, getAllEmployees } from "@/lib/actions/organization";
import { BranchesClient } from "./branches-client";

export const metadata = { title: "Branches" };

export default async function BranchesPage() {
  const [branches, employees] = await Promise.all([
    getBranches(),
    getAllEmployees(),
  ]);
  return <BranchesClient initialData={branches} allEmployees={employees} />;
}
