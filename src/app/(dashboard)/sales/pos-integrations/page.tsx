import { getPOSIntegrations, getPOSOrders } from "@/lib/actions/sales";
import { POSIntegrationsClient } from "./pos-integrations-client";

export const metadata = { title: "POS Integrations | TixelTech ERP" };

export default async function POSIntegrationsPage() {
  const [integrations, orders] = await Promise.all([
    getPOSIntegrations().catch(() => []),
    getPOSOrders().catch(() => []),
  ]);

  return <POSIntegrationsClient initialIntegrations={integrations} initialOrders={orders} />;
}
