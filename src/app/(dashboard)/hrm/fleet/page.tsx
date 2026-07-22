import { auth } from "@/lib/auth";
import { FleetClient } from "./fleet-client";

export const metadata = { title: "Fleet Management" };

export default async function FleetPage() {
  const session = await auth();
  return <FleetClient currentUser={session?.user} />;
}
