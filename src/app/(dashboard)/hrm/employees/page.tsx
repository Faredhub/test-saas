import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EmployeesClient } from "./employees-client";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await auth();
  const user = session?.user as any;
  const userRoles = (user?.roles as string[]) || [];

  const isAdmin =
    userRoles.length === 0 || // Fallback if roles array not populated yet
    userRoles.some(
      (r) =>
        r === "Admin" ||
        r === "Super Admin" ||
        r === "HR Admin" ||
        r === "HR Manager" ||
        (typeof r === "string" && r.toLowerCase().includes("admin"))
    );

  if (!isAdmin) {
    redirect("/hrm");
  }

  return <EmployeesClient />;
}
