import { getSpreadsheets } from "@/lib/actions/office";
import { SpreadsheetsClient } from "./spreadsheets-client";

export const metadata = { title: "Spreadsheets" };

export default async function SpreadsheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; source?: string }>;
}) {
  const [sheets, params] = await Promise.all([
    getSpreadsheets(),
    searchParams,
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <SpreadsheetsClient
      initialSheets={sheets as any}
      templateType={params.template}
      sourceRoute={params.source}
    />
  );
}
