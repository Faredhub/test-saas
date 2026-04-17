import { getCallHistory, getTenantUsers } from "@/lib/actions/office";
import { CallsClient } from "./calls-client";

export const metadata = { title: "Calls" };

export default async function CallsPage() {
  const [history, users] = await Promise.all([
    getCallHistory(),
    getTenantUsers(),
  ]);
  return (
    <CallsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialHistory={history as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      users={users as any}
    />
  );
}
