import { getWhatsAppTemplates, getWhatsAppCampaigns } from "@/lib/actions/marketing";
import { WhatsAppClient } from "./whatsapp-client";

export const metadata = { title: "WhatsApp Marketing" };

export default async function WhatsAppPage() {
  const [templatesData, campaignsData] = await Promise.all([
    getWhatsAppTemplates({ pageSize: 100 }),
    getWhatsAppCampaigns({ pageSize: 100 }),
  ]);

  return (
    <WhatsAppClient
      templatesData={templatesData}
      initialData={campaignsData}
    />
  );
}
