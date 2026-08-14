"use server";

import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as Record<string, unknown>;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

export interface EntityOption {
  id: string;
  label: string;
  sublabel: string;
}

// Single source of truth for relational dropdowns across modules.
export async function getEntityReferenceData(): Promise<{
  projects: EntityOption[];
  contacts: EntityOption[];
  products: EntityOption[];
  employees: EntityOption[];
  vendors: EntityOption[];
}> {
  const { tenantId } = await getSessionOrThrow();
  const [projects, contacts, products, employees, vendors] = await Promise.all([
    prisma.project.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.contact.findMany({
      where: tenantScope(tenantId),
      select: { id: true, firstName: true, lastName: true, company: true },
      orderBy: { firstName: "asc" },
      take: 500,
    }),
    prisma.product.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.employee.findMany({
      where: tenantScope(tenantId),
      select: { id: true, firstName: true, lastName: true, designation: true },
      orderBy: { firstName: "asc" },
      take: 500,
    }),
    prisma.vendor.findMany({
      where: tenantScope(tenantId),
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);
  return {
    projects: projects.map((p) => ({ id: p.id, label: p.name, sublabel: p.code ?? "" })),
    contacts: contacts.map((c) => ({
      id: c.id,
      label: [c.firstName, c.lastName].filter(Boolean).join(" "),
      sublabel: c.company ?? "",
    })),
    products: products.map((p) => ({ id: p.id, label: p.name, sublabel: p.sku ?? "" })),
    employees: employees.map((e) => ({
      id: e.id,
      label: [e.firstName, e.lastName].filter(Boolean).join(" "),
      sublabel: e.designation ?? "",
    })),
    vendors: vendors.map((v) => ({ id: v.id, label: v.name, sublabel: v.code ?? "" })),
  };
}
