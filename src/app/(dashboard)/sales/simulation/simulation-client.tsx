"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Play,
  DollarSign,
  Target,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { runSimulation } from "@/lib/actions/sales";
import { toast } from "sonner";

type SimulationResult = Awaited<ReturnType<typeof runSimulation>>;

const SCENARIOS = [
  "Project Outcomes",
  "Financial",
  "Sales",
  "Marketing",
  "Supply Chain",
  "HR",
];

const SCENARIO_FIELDS: Record<string, { key: string; label: string; step?: number }[]> = {
  "Project Outcomes": [
    { key: "revenueGrowth", label: "Revenue Growth (%)" },
    { key: "costChange", label: "Cost Change (%)" },
    { key: "headcountChange", label: "Headcount Change (%)" },
    { key: "timelineMonths", label: "Timeline (Months)" },
  ],
  Financial: [
    { key: "revenueGrowth", label: "Revenue Growth (%)" },
    { key: "costChange", label: "Cost Change (%)" },
    { key: "interestRate", label: "Interest Rate (%)", step: 0.1 },
    { key: "taxRate", label: "Tax Rate (%)" },
  ],
  Sales: [
    { key: "revenueGrowth", label: "Revenue Growth (%)" },
    { key: "dealVolumeChange", label: "Deal Volume Change (%)" },
    { key: "avgDealChange", label: "Avg Deal Size Change (%)" },
    { key: "winRateChange", label: "Win Rate Change (%)" },
  ],
  Marketing: [
    { key: "leadGrowth", label: "Lead Growth (%)" },
    { key: "conversionChange", label: "Conversion Change (%)" },
    { key: "budgetChange", label: "Budget Change (%)" },
    { key: "channelMix", label: "Channel Mix Change (%)" },
  ],
  "Supply Chain": [
    { key: "inventoryChange", label: "Inventory Change (%)" },
    { key: "logisticsCostChange", label: "Logistics Cost Change (%)" },
    { key: "deliveryTimeChange", label: "Delivery Time Change (%)" },
    { key: "fillRateChange", label: "Fill Rate Change (%)" },
  ],
  HR: [
    { key: "headcountChange", label: "Headcount Change (%)" },
    { key: "salaryChange", label: "Salary Change (%)" },
    { key: "attritionChange", label: "Attrition Change (%)" },
    { key: "productivityChange", label: "Productivity Change (%)" },
  ],
};

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

type Props = {
  initialResult: SimulationResult | null;
};

export function SimulationClient({ initialResult }: Props) {
  const [scenario, setScenario] = useState("Financial");
  const [params, setParams] = useState<Record<string, number>>({
    revenueGrowth: 8,
    costChange: 3,
    interestRate: 7,
    taxRate: 25,
  });
  const [result, setResult] = useState<SimulationResult | null>(initialResult);
  const [isPending, startTransition] = useTransition();

  function handleScenarioChange(value: string | null) {
    if (!value) return;
    setScenario(value);
    setResult(null);
    const defaults = SCENARIO_FIELDS[value].reduce(
      (acc, f) => ({ ...acc, [f.key]: 0 }),
      {}
    );
    setParams(defaults);
  }

  function handleParamChange(key: string, value: string) {
    setParams((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  function handleRunSimulation() {
    startTransition(async () => {
      try {
        const res = await runSimulation({ scenario, params });
        setResult(res);
        toast.success("Simulation completed");
      } catch {
        toast.error("Simulation failed");
      }
    });
  }

  const fields = SCENARIO_FIELDS[scenario] ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Simulation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run &quot;what if&quot; scenarios to project business outcomes across different dimensions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Scenario Configuration
            </CardTitle>
            <CardDescription>Select scenario type and adjust parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scenario Type</Label>
              <Select value={scenario} onValueChange={handleScenarioChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Parameters
              </Label>
              {fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <Input
                    type="number"
                    step={field.step ?? 1}
                    value={params[field.key] ?? 0}
                    onChange={(e) => handleParamChange(field.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <Button
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleRunSimulation}
              disabled={isPending}
            >
              <Play className="h-4 w-4" />
              {isPending ? "Running..." : "Run Simulation"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Simulation Results
            </CardTitle>
            <CardDescription>Current vs Projected comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className="border-l-4 border-l-blue-600">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Revenue Impact</div>
                      <div
                        className={`text-xl font-bold ${result.summary.isPositive ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {result.summary.isPositive ? "+" : ""}
                        {formatINR(result.summary.revenueImpact)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-600">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Profit Impact</div>
                      <div
                        className={`text-xl font-bold ${result.summary.isPositive ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {result.summary.isPositive ? "+" : ""}
                        {formatINR(result.summary.profitImpact)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-600">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Overall Impact</div>
                      <div className="flex items-center gap-1">
                        {result.summary.isPositive ? (
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <span
                          className={`text-xl font-bold ${result.summary.isPositive ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {result.summary.isPositive ? "+" : ""}
                          {result.summary.impactPercent}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bar Chart */}
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={result.chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="current" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Current" />
                      <Bar dataKey="projected" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Simulated" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">Select a scenario and click Run Simulation to see results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
