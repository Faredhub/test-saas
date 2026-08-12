import { getTables, getWaitingList } from "@/lib/actions/sales";
import { TableManagerClient } from "./table-manager-client";

export const metadata = { title: "Table Manager | TixelTech ERP" };

export default async function TableManagerPage() {
  const [tables, waitingList] = await Promise.all([
    getTables().catch(() => []),
    getWaitingList().catch(() => []),
  ]);

  return <TableManagerClient initialTables={tables} initialWaitingList={waitingList} />;
}
