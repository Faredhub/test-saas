import { getRoles, getAllPermissions, getUsersWithRoles } from "@/lib/actions/rbac";
import { RolesClient } from "./roles-client";

export const metadata = { title: "Role Management" };

export default async function RolesPage() {
  const [roles, permissions, users] = await Promise.all([
    getRoles(),
    getAllPermissions(),
    getUsersWithRoles(),
  ]);
  return <RolesClient initialRoles={roles} allPermissions={permissions} users={users} />;
}
