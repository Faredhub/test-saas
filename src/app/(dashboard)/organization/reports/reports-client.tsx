"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import {
  FileBarChart, Play, Save, Trash2, Download, Loader2,
  Users, ShoppingCart, Receipt, UserCircle, Activity,
  Zap,
} from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/export";
import {
  getReportData, saveReport, deleteReport,
  type ReportConfig, type ReportRow,
} from "@/lib/actions/organization";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6b7280", "#ec4899", "#06b6d4"];

type SavedReport = {
  id: string;
  title: string;
  config: unknown;
  createdAt: Date;
  createdBy: { id: string; name: string | null; firstName: string | null; lastName: string | null } | null;
};

type Props = {
  savedReports: SavedReport[];
};

const DATA_SOURCES = [
  { value: "leads", label: "Leads", icon: Users, description: "Lead counts & values" },
  { value: "deals", label: "Deals", icon: ShoppingCart, description: "Deal pipeline & values" },
  { value: "invoices", label: "Invoices", icon: Receipt, description: "Invoice totals & status" },
  { value: "contacts", label: "Contacts", icon: UserCircle, description: "Contact distribution" },
  { value: "activities", label: "Activities", icon: Activity, description: "Activity tracking" },
] as const;

const GROUP_BY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  leads: [
    { value: "source", label: "Source" },
    { value: "stage", label: "Pipeline Stage" },
    { value: "status", label: "Status" },
    { value: "owner", label: "Owner" },
    { value: "month", label: "Month" },
  ],
  deals: [
    { value: "stage", label: "Stage" },
    { value: "owner", label: "Owner" },
    { value: "month", label: "Month" },
  ],
  invoices: [
    { value: "status", label: "Status" },
    { value: "month", label: "Month" },
    { value: "contact", label: "Contact / Company" },
  ],
  contacts: [
    { value: "city", label: "City" },
    { value: "tags", label: "Tags" },
    { value: "company", label: "Company" },
    { value: "month", label: "Month" },
  ],
  activities: [
    { value: "type", label: "Type" },
    { value: "user", label: "User" },
    { value: "month", label: "Month" },
  ],
};

const METRIC_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum (Value)" },
  { value: "average", label: "Average (Value)" },
];

const REPORT_TEMPLATES = [
  {
    name: "Lead Pipeline Summary",
    config: { dataSource: "leads" as const, groupBy: "stage", metric: "count" as const },
  },
  {
    name: "Monthly Revenue",
    config: { dataSource: "invoices" as const, groupBy: "month", metric: "sum" as const },
  },
  {
    name: "Deal Win/Loss Analysis",
    config: { dataSource: "deals" as const, groupBy: "stage", metric: "count" as const },
  },
  {
    name: "Invoice Aging Report",
    config: { dataSource: "invoices" as const, groupBy: "status", metric: "sum" as const },
  },
  {
    name: "Activity Summary",
    config: { dataSource: "activities" as const, groupBy: "type", metric: "count" as const },
  },
];

function formatValue(value: number, metric: string): string {
  if (metric === "sum" || metric === "average") {
    if (value >= 100000) return `\u20B9${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `\u20B9${(value / 1000).toFixed(1)}K`;
    return `\u20B9${value.toLocaleString("en-IN")}`;
  }
  return value.toLocaleString("en-IN");
}

export function ReportsClient({ savedReports: initialSaved }: Props) {
  const [isPending, startTransition] = useTransition();

  // Builder state
  const [dataSource, setDataSource] = useState<string>("leads");
  const [groupBy, setGroupBy] = useState<string>("source");
  const [metric, setMetric] = useState<string>("count");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Results state
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [activeConfig, setActiveConfig] = useState<ReportConfig | null>(null);

  // Saved reports state
  const [saved, setSaved] = useState(initialSaved);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  // When data source changes, reset groupBy to first available option
  const handleDataSourceChange = (val: string | null) => {
    if (!val) return;
    setDataSource(val);
    const options = GROUP_BY_OPTIONS[val];
    if (options && options.length > 0) {
      setGroupBy(options[0].value);
    }
  };

  const runReport = (config?: ReportConfig) => {
    const cfg: ReportConfig = config ?? {
      dataSource: dataSource as ReportConfig["dataSource"],
      groupBy,
      metric: metric as ReportConfig["metric"],
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
    };

    startTransition(async () => {
      try {
        const data = await getReportData(cfg);
        setReportData(data);
        setActiveConfig(cfg);
        // Sync builder controls with config
        setDataSource(cfg.dataSource);
        setGroupBy(cfg.groupBy);
        setMetric(cfg.metric);
        if (cfg.dateRange) {
          setDateFrom(cfg.dateRange.from);
          setDateTo(cfg.dateRange.to);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate report");
      }
    });
  };

  const handleSave = () => {
    if (!activeConfig) return;
    if (!saveTitle.trim()) {
      toast.error("Please enter a report title");
      return;
    }
    startTransition(async () => {
      try {
        await saveReport({ title: saveTitle.trim(), config: activeConfig });
        // Refresh saved list
        const updated = await import("@/lib/actions/organization").then((m) => m.getSavedReports());
        setSaved(updated);
        setSaveTitle("");
        setShowSaveInput(false);
        toast.success("Report saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save report");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteReport(id);
        setSaved((prev) => prev.filter((r) => r.id !== id));
        toast.success("Report deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete report");
      }
    });
  };

  const handleExportCSV = () => {
    if (!reportData || !activeConfig) return;
    const headers = ["Group", activeConfig.metric === "count" ? "Count" : "Value"];
    const rows = reportData.map((r) => [r.group, String(r.value)]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`report-${activeConfig.dataSource}-${activeConfig.groupBy}`, csv);
  };

  const isTimeSeries = groupBy === "month" || activeConfig?.groupBy === "month";

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Build custom reports from your data</p>
        </div>
        {reportData && (
          <div className="flex gap-2">
            {!showSaveInput ? (
              <Button variant="outline" size="sm" onClick={() => setShowSaveInput(true)}>
                <Save className="mr-2 h-4 w-4" /> Save Report
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Report name..."
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-48"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveInput(false)}>
                  Cancel
                </Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left Column: Builder + Saved */}
        <div className="space-y-6">
          {/* Report Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-5 w-5" />
                Report Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Data Source */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  1. Data Source
                </Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {DATA_SOURCES.map((ds) => (
                    <button
                      key={ds.value}
                      onClick={() => handleDataSourceChange(ds.value)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        dataSource === ds.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-transparent hover:bg-muted"
                      }`}
                    >
                      <ds.icon className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-medium">{ds.label}</div>
                        <div className="text-xs text-muted-foreground">{ds.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Group By */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  2. Group By
                </Label>
                <Select value={groupBy} onValueChange={(val) => val && setGroupBy(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(GROUP_BY_OPTIONS[dataSource] ?? []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 3: Metric */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  3. Metric
                </Label>
                <Select value={metric} onValueChange={(val) => val && setMetric(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 4: Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  4. Date Range (optional)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="To"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                  >
                    Clear dates
                  </Button>
                )}
              </div>

              {/* Generate */}
              <Button className="w-full" onClick={() => runReport()} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5" />
                Quick Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {REPORT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => runReport(tpl.config)}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <FileBarChart className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {tpl.name}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Saved Reports */}
          {saved.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Save className="h-5 w-5" />
                  Saved Reports
                  <Badge variant="secondary" className="ml-auto">{saved.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {saved.map((report) => {
                  const cfg = report.config as ReportConfig;
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <button
                        onClick={() => runReport(cfg)}
                        disabled={isPending}
                        className="flex-1 text-left text-sm"
                      >
                        <div className="font-medium">{report.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {cfg.dataSource} / {cfg.groupBy} / {cfg.metric}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {!reportData ? (
            <Card className="flex min-h-[400px] items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileBarChart className="mx-auto mb-4 h-12 w-12 opacity-30" />
                <p className="text-lg font-medium">No report generated yet</p>
                <p className="text-sm">Use the builder or pick a template to get started</p>
              </div>
            </Card>
          ) : reportData.length === 0 ? (
            <Card className="flex min-h-[400px] items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileBarChart className="mx-auto mb-4 h-12 w-12 opacity-30" />
                <p className="text-lg font-medium">No data found</p>
                <p className="text-sm">Try adjusting your filters or date range</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Groups</p>
                    <p className="text-2xl font-bold">{reportData.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      {activeConfig?.metric === "count" ? "Total Count" : "Total Value"}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatValue(
                        reportData.reduce((s, r) => s + r.value, 0),
                        activeConfig?.metric ?? "count",
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Top Group</p>
                    <p className="text-2xl font-bold truncate" title={reportData[0]?.group}>
                      {reportData[0]?.group ?? "-"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {activeConfig?.dataSource ? activeConfig.dataSource.charAt(0).toUpperCase() + activeConfig.dataSource.slice(1) : "Report"}
                    {" "}by {activeConfig?.groupBy}
                    {activeConfig?.metric !== "count" && ` (${activeConfig?.metric})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {isTimeSeries ? (
                        <LineChart data={reportData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="group" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(val: any) => [formatValue(Number(val), activeConfig?.metric ?? "count"), activeConfig?.metric ?? "count"]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: "#3b82f6", r: 4 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={reportData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="group" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={80} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(val: any) => [formatValue(Number(val), activeConfig?.metric ?? "count"), activeConfig?.metric ?? "count"]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {reportData.map((_, i) => (
                              <rect key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Data Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>{activeConfig?.groupBy ? activeConfig.groupBy.charAt(0).toUpperCase() + activeConfig.groupBy.slice(1) : "Group"}</TableHead>
                        <TableHead className="text-right">
                          {activeConfig?.metric === "count" ? "Count" : activeConfig?.metric === "sum" ? "Total Value" : "Average Value"}
                        </TableHead>
                        <TableHead className="text-right w-24">% Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row, i) => {
                        const total = reportData.reduce((s, r) => s + r.value, 0);
                        const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0";
                        return (
                          <TableRow key={row.group}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{row.group}</TableCell>
                            <TableCell className="text-right">
                              {formatValue(row.value, activeConfig?.metric ?? "count")}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
