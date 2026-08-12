"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import {
  parseBankStatement,
  reconcileTransactions,
  saveReconciliation,
  getReconciliations,
} from "@/lib/actions/bank-reconciliation";
import type { ParsedTransaction, ReconciliationEntry } from "@/lib/actions/bank-reconciliation";
import { toast } from "sonner";

type ReconciliationHistory = Awaited<ReturnType<typeof getReconciliations>>;

const matchStatusColors: Record<string, string> = {
  MATCHED: "bg-green-100 text-green-700",
  SUGGESTED: "bg-amber-100 text-amber-700",
  UNMATCHED: "bg-red-100 text-red-700",
};

const matchStatusIcons: Record<string, React.ReactNode> = {
  MATCHED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  SUGGESTED: <HelpCircle className="h-4 w-4 text-amber-600" />,
  UNMATCHED: <AlertCircle className="h-4 w-4 text-red-600" />,
};

export default function BankReconciliationPage() {
  const [csvContent, setCsvContent] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[] | null>(null);
  const [reconciled, setReconciled] = useState<{
    matched: ReconciliationEntry[];
    suggested: ReconciliationEntry[];
    unmatched: ReconciliationEntry[];
  } | null>(null);
  const [history, setHistory] = useState<ReconciliationHistory | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadHistory();
  }, []);

  function loadHistory() {
    startTransition(async () => {
      try {
        const data = await getReconciliations({ pageSize: 10 });
        setHistory(data);
      } catch {
        // History load is non-critical
      }
    });
  }

  function handleParse() {
    if (!csvContent.trim()) {
      toast.error("Please paste or upload a CSV bank statement");
      return;
    }
    startTransition(async () => {
      try {
        const parsed = await parseBankStatement(csvContent);
        setParsedTransactions(parsed);
        toast.success(`Parsed ${parsed.length} transactions`);

        // Auto-reconcile
        const result = await reconcileTransactions(parsed);
        setReconciled(result);
        toast.success(
          `Matched: ${result.matched.length}, Suggested: ${result.suggested.length}, Unmatched: ${result.unmatched.length}`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    });
  }

  function handleSave() {
    if (!reconciled) return;
    if (!bankName.trim()) {
      toast.error("Please enter the bank name");
      return;
    }
    startTransition(async () => {
      try {
        const allTransactions = [
          ...reconciled.matched,
          ...reconciled.suggested,
          ...reconciled.unmatched,
        ];
        await saveReconciliation({
          bankName,
          accountNo,
          statementDate: new Date().toISOString().split("T")[0],
          transactions: allTransactions,
        });
        toast.success("Reconciliation saved");
        loadHistory();
        // Reset form
        setCsvContent("");
        setParsedTransactions(null);
        setReconciled(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) setCsvContent(text);
    };
    reader.readAsText(file);
  }

  const allEntries = reconciled
    ? [...reconciled.matched, ...reconciled.suggested, ...reconciled.unmatched]
    : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Bank Reconciliation</h1>
        <p className="text-muted-foreground mt-1">
          Import bank statements and match transactions against system records
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bank Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g., HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNo">Account Number</Label>
              <Input
                id="accountNo"
                placeholder="e.g., XXXX1234"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvPaste">Or Paste CSV Content</Label>
            <textarea
              id="csvPaste"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={"Date,Description,Debit,Credit,Balance\n2024-01-15,Payment from Client A,,50000,150000\n2024-01-16,Office Rent,25000,,125000"}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
            />
          </div>

          <Button onClick={handleParse} disabled={isPending || !csvContent.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Parse & Reconcile
          </Button>
        </CardContent>
      </Card>

      {/* Results Table */}
      {allEntries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Reconciliation Results ({allEntries.length} transactions)
              </CardTitle>
              <div className="flex gap-2">
                <Badge className={matchStatusColors.MATCHED}>
                  {reconciled?.matched.length ?? 0} Matched
                </Badge>
                <Badge className={matchStatusColors.SUGGESTED}>
                  {reconciled?.suggested.length ?? 0} Suggested
                </Badge>
                <Badge className={matchStatusColors.UNMATCHED}>
                  {reconciled?.unmatched.length ?? 0} Unmatched
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Match Status</TableHead>
                    <TableHead>Matched To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEntries.map((entry, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        entry.matchStatus === "MATCHED"
                          ? "bg-green-50"
                          : entry.matchStatus === "SUGGESTED"
                            ? "bg-amber-50"
                            : "bg-red-50"
                      }
                    >
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.type === "DEBIT" ? "destructive" : "default"}>
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {matchStatusIcons[entry.matchStatus]}
                          <Badge className={matchStatusColors[entry.matchStatus]}>
                            {entry.matchStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.matchedTo ?? "No match"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Reconciliation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      {history && history.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Matched</TableHead>
                    <TableHead className="text-right">Unmatched</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.map((record) => {
                    const meta = record.metadata as Record<string, unknown> | null;
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{(meta?.bankName as string) ?? "N/A"}</TableCell>
                        <TableCell>{(meta?.accountNo as string) ?? "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {(meta?.transactionCount as number) ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={matchStatusColors.MATCHED}>
                            {(meta?.matchedCount as number) ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={matchStatusColors.UNMATCHED}>
                            {(meta?.unmatchedCount as number) ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.user?.name || record.user?.email?.split("@")[0] || "System"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
