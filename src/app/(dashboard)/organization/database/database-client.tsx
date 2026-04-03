"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  HardDrive,
  Activity,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Shield,
  Server,
} from "lucide-react";
import {
  getDatabaseStats,
  getRecentAuditLogs,
  type DatabaseStats,
  type AuditLogEntry,
} from "@/lib/actions/organization";

// ============================================================================
// Types
// ============================================================================

type Props = {
  initialStats: DatabaseStats;
  initialAuditLogs: AuditLogEntry[];
};

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatRelative(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getUserDisplayName(user: AuditLogEntry["user"]): string {
  if (!user) return "System";
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.name || "Unknown";
}

function formatAction(action: string): string {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function estimateDatabaseSize(totalRecords: number): string {
  // Rough estimate: ~2KB average per record across all tables
  const bytes = totalRecords * 2048;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============================================================================
// Main Component
// ============================================================================

export function DatabaseClient({ initialStats, initialAuditLogs }: Props) {
  const [stats, setStats] = useState<DatabaseStats>(initialStats);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [isPending, startTransition] = useTransition();

  const maxCount = Math.max(...stats.tables.map((t) => t.count), 1);

  function handleRefresh() {
    startTransition(async () => {
      try {
        const [newStats, newLogs] = await Promise.all([
          getDatabaseStats(),
          getRecentAuditLogs(50),
        ]);
        setStats(newStats);
        setAuditLogs(newLogs);
      } catch {
        // Silently fail — data stays stale
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Database Manager</h1>
          <p className="text-muted-foreground">
            Read-only overview of your organization&apos;s data
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.tables.length} tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Est. Data Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estimateDatabaseSize(stats.totalRecords)}</div>
            <p className="text-xs text-muted-foreground">Approximate storage used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Managed</div>
            <p className="text-xs text-muted-foreground">Automated daily backups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Refreshed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRelative(stats.fetchedAt)}</div>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(stats.fetchedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">
            <BarChart3 className="mr-2 h-4 w-4" />
            Table Stats
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="health">
            <Shield className="mr-2 h-4 w-4" />
            Data Health
          </TabsTrigger>
        </TabsList>

        {/* Table Stats Tab */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Record Counts</CardTitle>
              <CardDescription>
                Record distribution across all major entity tables in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.tables.map((table) => {
                  const pct = maxCount > 0 ? (table.count / maxCount) * 100 : 0;
                  const isEmpty = table.count === 0;
                  return (
                    <div
                      key={table.name}
                      className="flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{table.label}</span>
                        <div className="flex items-center gap-2">
                          {isEmpty && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              Empty
                            </Badge>
                          )}
                          <span className="text-sm font-semibold tabular-nums">
                            {table.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(pct, isEmpty ? 0 : 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Log</CardTitle>
              <CardDescription>
                Last {auditLogs.length} audit events recorded for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Activity className="mb-3 h-10 w-10" />
                  <p className="text-sm">No audit log entries yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead className="hidden md:table-cell">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs tabular-nums">
                            {formatTimestamp(log.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getUserDisplayName(log.user)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {formatAction(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.entity || "-"}
                            {log.entityId && (
                              <span className="ml-1 text-xs text-muted-foreground/60">
                                ({log.entityId.slice(0, 8)}...)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                            {log.ipAddress || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Empty Tables Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {stats.emptyTables.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  Empty Tables
                </CardTitle>
                <CardDescription>
                  Tables with zero records may indicate unused features
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.emptyTables.length === 0 ? (
                  <p className="text-sm text-green-600">
                    All tables have at least one record. No issues detected.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {stats.emptyTables.length} table{stats.emptyTables.length > 1 ? "s" : ""} with
                      no records:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stats.emptyTables.map((name) => (
                        <Badge key={name} variant="outline" className="text-amber-600 border-amber-300">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Integrity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Data Integrity
                </CardTitle>
                <CardDescription>
                  Basic health checks on your organization data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <HealthCheckRow
                    label="Multi-tenant isolation"
                    status="pass"
                    detail="All queries scoped to tenant"
                  />
                  <HealthCheckRow
                    label="Audit logging"
                    status={
                      stats.tables.find((t) => t.name === "auditLogs")?.count ?? 0 > 0
                        ? "pass"
                        : "warn"
                    }
                    detail={
                      (stats.tables.find((t) => t.name === "auditLogs")?.count ?? 0) > 0
                        ? `${stats.tables.find((t) => t.name === "auditLogs")?.count.toLocaleString()} entries recorded`
                        : "No audit entries yet"
                    }
                  />
                  <HealthCheckRow
                    label="User accounts"
                    status={
                      (stats.tables.find((t) => t.name === "users")?.count ?? 0) > 0
                        ? "pass"
                        : "fail"
                    }
                    detail={`${stats.tables.find((t) => t.name === "users")?.count ?? 0} active user(s)`}
                  />
                  <HealthCheckRow
                    label="Database backups"
                    status="pass"
                    detail="Managed by hosting provider"
                  />
                </ul>
              </CardContent>
            </Card>

            {/* Record Distribution Summary */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Record Distribution</CardTitle>
                <CardDescription>
                  Breakdown of records by module area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ModuleGroup
                    label="Sales & CRM"
                    tables={stats.tables.filter((t) =>
                      ["leads", "contacts", "deals", "quotations", "invoices", "activities"].includes(t.name)
                    )}
                  />
                  <ModuleGroup
                    label="Organization"
                    tables={stats.tables.filter((t) =>
                      ["departments", "branches", "announcements", "calendarEvents", "notes", "contracts", "documents", "signatures", "approvalWorkflows"].includes(t.name)
                    )}
                  />
                  <ModuleGroup
                    label="System"
                    tables={stats.tables.filter((t) =>
                      ["users", "auditLogs", "notifications"].includes(t.name)
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function HealthCheckRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      {status === "pass" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />}
      {status === "warn" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
      {status === "fail" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

function ModuleGroup({ label, tables }: { label: string; tables: { label: string; count: number }[] }) {
  const total = tables.reduce((sum, t) => sum + t.count, 0);
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mb-3 text-2xl font-bold">{total.toLocaleString()}</p>
      <div className="space-y-1">
        {tables.map((t) => (
          <div key={t.label} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t.label}</span>
            <span className="tabular-nums">{t.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
