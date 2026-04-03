import { getDepartments } from "@/lib/actions/organization";
import { DepartmentsClient } from "./departments-client";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  return <DepartmentsClient initialData={departments} />;
}
