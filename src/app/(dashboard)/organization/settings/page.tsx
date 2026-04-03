import { getOrgSettings } from "@/lib/actions/organization";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Organization Settings" };

export default async function SettingsPage() {
  const settings = await getOrgSettings();
  return <SettingsClient initialData={settings} />;
}
