import { getCampaign } from "@/lib/actions/marketing";
import { EmailBuilderClient } from "./email-builder-client";

export const metadata = { title: "Email Builder" };

export default async function EmailBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; templateId?: string }>;
}) {
  const params = await searchParams;
  let initialHtml: string | undefined;
  let campaignData: { id: string; name: string; status: string } | undefined;

  if (params.campaignId) {
    try {
      const campaign = await getCampaign(params.campaignId);
      initialHtml = campaign.content || undefined;
      campaignData = {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      };
    } catch {
      // Campaign not found – start with blank
    }
  }

  return (
    <EmailBuilderClient
      campaignId={params.campaignId}
      templateId={params.templateId}
      initialHtml={initialHtml}
      campaignData={campaignData}
    />
  );
}
