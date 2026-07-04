import { getDepartments, getAllEmployees } from "@/lib/actions/organization";
import { DepartmentsClient } from "./departments-client";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const [departments, employees] = await Promise.all([
    getDepartments(),
    getAllEmployees(),
  ]);
  return <DepartmentsClient initialData={departments} allEmployees={employees} />;
}
