"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table2,
  Coffee,
  Users,
  Clock,
  RefreshCw,
} from "lucide-react";
import { updateTableStatus, assignTable, getTables, getWaitingList } from "@/lib/actions/sales";
import { toast } from "sonner";

type Table = Awaited<ReturnType<typeof getTables>>[number];
type WaitingEntry = Awaited<ReturnType<typeof getWaitingList>>[number];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  AVAILABLE: { color: "bg-emerald-100 border-emerald-500 text-emerald-700", label: "Available" },
  OCCUPIED: { color: "bg-red-100 border-red-500 text-red-700", label: "Occupied" },
  RESERVED: { color: "bg-amber-100 border-amber-500 text-amber-700", label: "Reserved" },
  CLEANING: { color: "bg-blue-100 border-blue-500 text-blue-700", label: "Cleaning" },
};

const STATUS_CYCLE: Record<string, string> = {
  AVAILABLE: "OCCUPIED",
  OCCUPIED: "CLEANING",
  CLEANING: "AVAILABLE",
  RESERVED: "OCCUPIED",
};

type Props = {
  initialTables: Table[];
  initialWaitingList: WaitingEntry[];
};

export function TableManagerClient({ initialTables, initialWaitingList }: Props) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>(initialWaitingList);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTableClick(table: Table) {
    setSelectedTable(table);
  }

  function handleStatusChange(tableId: string, newStatus: string) {
    startTransition(async () => {
      try {
        await updateTableStatus(tableId, newStatus);
        const updated = await getTables();
        setTables(updated);
        setSelectedTable(null);
        toast.success(`Table status changed to ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      } catch {
        toast.error("Failed to update table status");
      }
    });
  }

  function handleAssignTable(waitingId: string, tableId: string) {
    startTransition(async () => {
      try {
        await assignTable(waitingId, tableId);
        const [updatedTables, updatedWaiting] = await Promise.all([
          getTables(),
          getWaitingList(),
        ]);
        setTables(updatedTables);
        setWaitingList(updatedWaiting);
        toast.success("Table assigned successfully");
      } catch {
        toast.error("Failed to assign table");
      }
    });
  }

  function refreshData() {
    startTransition(async () => {
      const [updatedTables, updatedWaiting] = await Promise.all([
        getTables(),
        getWaitingList(),
      ]);
      setTables(updatedTables);
      setWaitingList(updatedWaiting);
    });
  }

  const availableTables = tables.filter((t) => t.status === "AVAILABLE");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Table Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage restaurant tables, statuses, and waiting list assignments.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={refreshData} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Layout Grid */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Table2 className="h-4 w-4 text-blue-600" />
              Floor Layout
            </CardTitle>
            <CardDescription>Click a table to change its status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
              {tables.map((table) => {
                const config = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.AVAILABLE;
                return (
                  <button
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${config.color} ${
                      selectedTable?.id === table.id ? "ring-2 ring-offset-2 ring-blue-600" : ""
                    } ${table.shape === "circle" ? "rounded-full aspect-square" : "aspect-square"}`}
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-1">
                      <span className="text-sm font-bold">{table.name}</span>
                      <span className="text-xs">{table.capacity}p</span>
                      <Badge variant="outline" className="text-[10px]">
                        {config.label}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Table Actions */}
            {selectedTable && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      Table {selectedTable.name} ({selectedTable.capacity} seats)
                    </p>
                    <Badge
                      className={`mt-1 ${STATUS_CONFIG[selectedTable.status]?.color ?? ""}`}
                      variant="outline"
                    >
                      {STATUS_CONFIG[selectedTable.status]?.label ?? selectedTable.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={selectedTable.status === status ? "default" : "outline"}
                        className={selectedTable.status === status ? "bg-blue-600 hover:bg-blue-700" : ""}
                        onClick={() => handleStatusChange(selectedTable.id, status)}
                        disabled={isPending || selectedTable.status === status}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Waiting List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              Waiting List
            </CardTitle>
            <CardDescription>
              {waitingList.length} party/waiting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitingList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No one in the waiting list.
              </p>
            ) : (
              waitingList.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{entry.customerName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {entry.partySize} guests
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.phone}</p>
                  {entry.assignedTableId ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                      Assigned to {entry.assignedTableId}
                    </Badge>
                  ) : availableTables.length > 0 ? (
                    <Select
                      onValueChange={(tableId) => handleAssignTable(entry.id, tableId)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTables.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.capacity}p)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-amber-600">No tables available</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-xs text-muted-foreground font-medium">Legend:</span>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 ${config.color}`} />
                <span className="text-xs">{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
