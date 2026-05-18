import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PushSubscription } from "@/components/push-subscription";
import { CallProvider } from "@/components/call-provider";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-screen overflow-hidden">
      <DashboardShell>{children}</DashboardShell>
      <PushSubscription />
      <CallProvider />
    </div>
  );
}
