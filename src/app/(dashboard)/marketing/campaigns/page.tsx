import { getCampaigns, getCampaignStats, getContactSegments } from "@/lib/actions/marketing";
import { CampaignsClient } from "./campaigns-client";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const [campaignsData, stats, segments] = await Promise.all([
    getCampaigns({ pageSize: 100 }),
    getCampaignStats(),
    getContactSegments(),
  ]);

  return (
    <CampaignsClient
      initialData={campaignsData}
      stats={stats}
      segments={segments}
    />
  );
}
