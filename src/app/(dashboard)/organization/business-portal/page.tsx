import { getBusinessPortal, getOrgRoles, getOrgUsers } from "@/lib/actions/organization";
import { BusinessPortalClient } from "./business-portal-client";

export const metadata = { title: "Business Portal" };

export default async function BusinessPortalPage() {
  const [portal, users, roles] = await Promise.all([
    getBusinessPortal(),
    getOrgUsers(),
    getOrgRoles(),
  ]);

  return <BusinessPortalClient portal={portal} users={users} roles={roles} />;
}
