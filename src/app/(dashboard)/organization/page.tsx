import { redirect } from "next/navigation";

export const metadata = { title: "Organization" };

export default function OrganizationPage() {
  redirect("/organization/settings");
}
