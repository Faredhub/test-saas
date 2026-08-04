import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { EmployeesClient } from "./employees-client";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) {
    redirect("/login");
  }

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

  const hasEmpAccess = await hasPermission(user.id, {
    module: "hrm",
    action: "read",
    resource: "employees",
  });

  if (!isAdmin && !hasEmpAccess) {
    redirect("/hrm");
  }

  return <EmployeesClient />;
}
