"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2, BarChart3, FileText, Scale, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { getTrialBalance, getFinancialStatements } from "@/lib/actions/finance";

type TrialBalanceData = Awaited<ReturnType<typeof getTrialBalance>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinancialStatementData = any;

const typeColors: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-700",
  LIABILITY: "bg-red-100 text-red-700",
  EQUITY: "bg-purple-100 text-purple-700",
  REVENUE: "bg-green-100 text-green-700",
  EXPENSE: "bg-orange-100 text-orange-700",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

export function ReportsClient() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [pnl, setPnl] = useState<FinancialStatementData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<FinancialStatementData | null>(null);
  const [cashFlow, setCashFlow] = useState<FinancialStatementData | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateRange = {
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  };

  function loadTrialBalance() {
    startTransition(async () => {
      try {
        const data = await getTrialBalance(Object.keys(dateRange).length > 0 ? dateRange : undefined);
        setTrialBalance(data);
      } catch {
        toast.error("Failed to load trial balance");
      }
    });
  }

  function loadPnL() {
    startTransition(async () => {
      try {
        const data = await getFinancialStatements("PNL", Object.keys(dateRange).length > 0 ? dateRange : undefined);
        setPnl(data);
      } catch {
        toast.error("Failed to load P&L statement");
      }
    });
  }

  function loadBalanceSheet() {
    startTransition(async () => {
      try {
        const data = await getFinancialStatements("BALANCE_SHEET", Object.keys(dateRange).length > 0 ? dateRange : undefined);
        setBalanceSheet(data);
      } catch {
        toast.error("Failed to load balance sheet");
      }
    });
  }

  function loadCashFlow() {
    startTransition(async () => {
      try {
        const data = await getFinancialStatements("CASH_FLOW", Object.keys(dateRange).length > 0 ? dateRange : undefined);
        setCashFlow(data);
      } catch {
        toast.error("Failed to load cash flow statement");
      }
    });
  }

  function renderAccountTable(accounts: Array<{ id: string; code: string; name: string; type: string; balance: number }>, label: string) {
    if (!accounts || accounts.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No {label.toLowerCase()} accounts found.</p>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono">{a.code}</TableCell>
              <TableCell>{a.name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(Math.abs(a.balance))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">Trial Balance, Profit & Loss, Balance Sheet, Cash Flow</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[180px]" />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[180px]" />
            </div>
            <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear Dates</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trial-balance">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trial-balance" className="gap-1"><Scale className="h-4 w-4" />Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl" className="gap-1"><BarChart3 className="h-4 w-4" />P&L</TabsTrigger>
          <TabsTrigger value="balance-sheet" className="gap-1"><FileText className="h-4 w-4" />Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow" className="gap-1"><ArrowDownUp className="h-4 w-4" />Cash Flow</TabsTrigger>
        </TabsList>

        {/* TRIAL BALANCE */}
        <TabsContent value="trial-balance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Trial Balance</h2>
            <Button onClick={loadTrialBalance} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </div>
          {trialBalance && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={trialBalance.isBalanced ? "default" : "destructive"}>
                    {trialBalance.isBalanced ? "Balanced" : "Not Balanced"}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.accounts.filter((a) => a.debit !== 0 || a.credit !== 0).map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.code}</TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell><Badge className={`border-0 text-xs ${typeColors[account.type] ?? ""}`}>{account.type}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{account.debit > 0 ? formatCurrency(account.debit) : "—"}</TableCell>
                        <TableCell className="text-right font-mono">{account.credit > 0 ? formatCurrency(account.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3} className="text-right">Totals</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(trialBalance.totalDebit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(trialBalance.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PROFIT & LOSS */}
        <TabsContent value="pnl" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Profit & Loss Statement</h2>
            <Button onClick={loadPnL} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </div>
          {pnl && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(pnl.totalRevenue)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-red-600">{formatCurrency(pnl.totalExpenses)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${pnl.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(pnl.netProfit)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(pnl.revenue, "Revenue")}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(pnl.expenses, "Expense")}</CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* BALANCE SHEET */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Balance Sheet</h2>
            <Button onClick={loadBalanceSheet} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </div>
          {balanceSheet && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Assets</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-blue-600">{formatCurrency(balanceSheet.totalAssets)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Liabilities</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-red-600">{formatCurrency(balanceSheet.totalLiabilities)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Equity</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-purple-600">{formatCurrency(balanceSheet.totalEquity)}</div>
                    {balanceSheet.retainedEarnings !== 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Incl. retained earnings: {formatCurrency(balanceSheet.retainedEarnings)}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(balanceSheet.assets, "Asset")}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(balanceSheet.liabilities, "Liability")}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Equity</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(balanceSheet.equity, "Equity")}</CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* CASH FLOW */}
        <TabsContent value="cash-flow" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Cash Flow Statement</h2>
            <Button onClick={loadCashFlow} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </div>
          {cashFlow && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Operating</CardTitle></CardHeader>
                  <CardContent><div className={`text-lg font-bold ${cashFlow.totalOperating >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(cashFlow.totalOperating)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Investing</CardTitle></CardHeader>
                  <CardContent><div className="text-lg font-bold text-blue-600">{formatCurrency(cashFlow.totalInvesting)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Financing</CardTitle></CardHeader>
                  <CardContent><div className="text-lg font-bold text-purple-600">{formatCurrency(cashFlow.totalFinancing)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Cash Flow</CardTitle></CardHeader>
                  <CardContent><div className={`text-lg font-bold ${cashFlow.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(cashFlow.netCashFlow)}</div></CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Operating Activities</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(cashFlow.operating, "Operating")}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Investing Activities</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(cashFlow.investing, "Investing")}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Financing Activities</CardTitle></CardHeader>
                <CardContent>{renderAccountTable(cashFlow.financing, "Financing")}</CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
