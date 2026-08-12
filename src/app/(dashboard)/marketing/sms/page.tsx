import { getSMSCampaigns, getSMSTemplates, getSMSRecipientLists } from "@/lib/actions/marketing";
import { SMSClient } from "./sms-client";

export const metadata = { title: "SMS Marketing" };

export default async function SMSPage() {
  const [campaignsData, templates, recipientLists] = await Promise.all([
    getSMSCampaigns({ pageSize: 100 }),
    getSMSTemplates(),
    getSMSRecipientLists(),
  ]);

  return (
    <SMSClient
      initialData={campaignsData}
      templates={templates}
      recipientLists={recipientLists}
    />
  );
}
