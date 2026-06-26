import { getSpreadsheets, getTenantUsers } from "@/lib/actions/office";
import { SpreadsheetsClient } from "./spreadsheets-client";

export const metadata = { title: "Spreadsheets" };

export default async function SpreadsheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; source?: string }>;
}) {
  const [sheets, users, params] = await Promise.all([
    getSpreadsheets(),
    getTenantUsers(),
    searchParams,
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <SpreadsheetsClient
      initialSheets={sheets as any}
      users={users as any}
      templateType={params.template}
      sourceRoute={params.source}
    />
  );
}
