import { getOrgSettings, getOrgUsers, getOrgRoles } from "@/lib/actions/organization";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Organization Settings" };

export default async function SettingsPage() {
  const [settings, users, roles] = await Promise.all([
    getOrgSettings(),
    getOrgUsers(),
    getOrgRoles(),
  ]);
  return <SettingsClient initialData={settings} users={users} roles={roles} />;
}
