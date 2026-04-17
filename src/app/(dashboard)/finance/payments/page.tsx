import { getConfiguredGateway } from "@/lib/payment-gateway";
import { PaymentsClient } from "./payments-client";

export const metadata = { title: "Online Payments" };

export default function PaymentsPage() {
  const gateway = getConfiguredGateway();
  return <PaymentsClient gateway={gateway} />;
}
