"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, IndianRupee, Target, ShoppingCart,
} from "lucide-react";

type ForecastData = {
  weightedPipeline: number;
  monthlyForecast: { month: string; revenue: number }[];
  winRate: number;
  totalPipelineValue: number;
  dealCount: number;
  topDeals: {
    id: string;
    title: string;
    value: number;
    probability: number;
    weightedValue: number;
    stage: string;
    expectedCloseDate: string | null;
    ownerName: string | null;
    contactName: string | null;
  }[];
};

const stageLabels: Record<string, { label: string; color: string }> = {
  PROSPECTING: { label: "Prospecting", color: "bg-slate-100 text-slate-700" },
  QUALIFICATION: { label: "Qualification", color: "bg-blue-100 text-blue-700" },
  PROPOSAL: { label: "Proposal", color: "bg-amber-100 text-amber-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-100 text-orange-700" },
};

function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipINR = (value: any) => formatINR(Number(value));

export function ForecastClient({ data }: { data: ForecastData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales Forecast</h1>
        <p className="text-sm text-muted-foreground">
          Pipeline forecast and projected revenue for the next 6 months
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pipeline Value
            </CardTitle>
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatINR(data.totalPipelineValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {data.dealCount} open deal{data.dealCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Weighted Value
            </CardTitle>
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 tabular-nums">
              {formatINR(data.weightedPipeline)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Probability-adjusted forecast
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 tabular-nums">
              {data.winRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Historical close rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Deal Count
            </CardTitle>
            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.dealCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Open deals in pipeline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Forecast Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Monthly Forecast (Next 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyForecast.every((m) => m.revenue === 0) ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No forecast data available</p>
                <p className="text-xs">Add deals with expected close dates and probabilities to see projections</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.monthlyForecast}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(v) => formatINR(v)} className="text-xs" />
                <Tooltip formatter={tooltipINR} />
                <Bar
                  dataKey="revenue"
                  name="Expected Revenue"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Deals by Weighted Value</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No open deals found. Create deals to see your forecast.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Deal</th>
                    <th className="pb-2 font-medium">Contact</th>
                    <th className="pb-2 font-medium text-right">Value</th>
                    <th className="pb-2 font-medium text-right">Probability</th>
                    <th className="pb-2 font-medium text-right">Weighted</th>
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium">Close Date</th>
                    <th className="pb-2 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDeals.map((deal) => {
                    const stage = stageLabels[deal.stage];
                    return (
                      <tr key={deal.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{deal.title}</td>
                        <td className="py-2">{deal.contactName ?? "—"}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatINR(deal.value)}
                        </td>
                        <td className="py-2 text-right tabular-nums">{deal.probability}%</td>
                        <td className="py-2 text-right font-medium tabular-nums text-green-600">
                          {formatINR(deal.weightedValue)}
                        </td>
                        <td className="py-2">
                          {stage ? (
                            <Badge variant="outline" className={stage.color}>
                              {stage.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{deal.stage}</Badge>
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {deal.expectedCloseDate
                            ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                            : "—"}
                        </td>
                        <td className="py-2">{deal.ownerName ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
