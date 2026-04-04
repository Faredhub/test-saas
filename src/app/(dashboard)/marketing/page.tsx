import { getCampaignStats, getEvents, getSurveys } from "@/lib/actions/marketing";
import { MarketingOverviewClient } from "./marketing-client";

export const metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const [campaignStats, eventsData, surveysData] = await Promise.all([
    getCampaignStats(),
    getEvents({ pageSize: 5 }),
    getSurveys({ pageSize: 5 }),
  ]);

  return (
    <MarketingOverviewClient
      campaignStats={campaignStats}
      upcomingEvents={eventsData.data}
      recentSurveys={surveysData.data}
    />
  );
}
