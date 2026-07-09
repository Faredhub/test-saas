import { getRoles, getAllPermissions, getUsersWithRoles } from "@/lib/actions/rbac";
import { RolesClient } from "./roles-client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const metadata = { title: "Role Management" };

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  const tenantId = user.tenantId as string;

  const [roles, permissions, users, designations] = await Promise.all([
    getRoles(),
    getAllPermissions(),
    getUsersWithRoles(),
    prisma.designation.findMany({
      where: { tenantId },
      include: {
        department: { select: { id: true, name: true } },
        roles: { include: { role: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return <RolesClient initialRoles={roles} allPermissions={permissions} users={users} initialDesignations={designations} />;
}
