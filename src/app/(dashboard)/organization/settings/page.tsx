import { getOrgSettings, getOrgUsers, getOrgRoles } from "@/lib/actions/organization";
import { SettingsClient } from "./settings-client";
import { auth } from "@/lib/auth";

export const metadata = { title: "Organization Settings" };

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user as any;
  const userRoles = user?.roles as string[] || [];
  const isAdmin = userRoles.some(
    (r) => r === "Admin" || r === "Super Admin" || r === "HR Admin" || r === "HR Manager"
  );

  const [settings, users, roles] = await Promise.all([
    getOrgSettings(),
    getOrgUsers(),
    getOrgRoles(),
  ]);
  return (
    <SettingsClient
      initialData={settings}
      users={users}
      roles={roles}
      isAdmin={isAdmin}
    />
  );
}
