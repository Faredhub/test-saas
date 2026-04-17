import { getSpreadsheets } from "@/lib/actions/office";
import { SpreadsheetsClient } from "./spreadsheets-client";

export const metadata = { title: "Spreadsheets" };

export default async function SpreadsheetsPage() {
  const sheets = await getSpreadsheets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SpreadsheetsClient initialSheets={sheets as any} />;
}
