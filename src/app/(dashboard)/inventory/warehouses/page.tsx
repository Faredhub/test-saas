import { getWarehouses } from "@/lib/actions/inventory";
import { WarehousesClient } from "./warehouses-client";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";

export const metadata = { title: "Warehouses" };

export default async function WarehousesPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const user = session.user as any;
  const tenantId = user.tenantId as string;

  const [warehouses, branches, departments, employees, products] = await Promise.all([
    getWarehouses(),
    prisma.branch.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <WarehousesClient
      initialData={warehouses}
      branches={branches}
      departments={departments}
      employees={employees}
      products={products}
    />
  );
}
