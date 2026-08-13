import { getSocialConnections } from "@/lib/actions/social";
import { SocialNav } from "../social-nav";
import { AccountsClient } from "./accounts-client";

export const metadata = { title: "Connected Accounts | Social Publishing" };

export default async function ConnectedAccountsPage() {
  const connections = await getSocialConnections().catch(() => []);
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connected Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Manage tenant social accounts for Facebook Page, Meta App, LinkedIn, and X/Twitter.
        </p>
      </div>

      <SocialNav />
      <AccountsClient initialConnections={connections} />
    </div>
  );
}
