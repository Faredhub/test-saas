import { getWebsiteStats } from "@/lib/actions/website";
import { WebsiteOverviewClient } from "./website-client";

export const metadata = { title: "Website & CMS" };

export default async function WebsitePage() {
  const stats = await getWebsiteStats();
  return <WebsiteOverviewClient stats={stats} />;
}
