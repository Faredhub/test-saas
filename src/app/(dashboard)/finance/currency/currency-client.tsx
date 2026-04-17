"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { ArrowRightLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { convertAmount } from "@/lib/actions/finance";

const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "JPY",
  "AUD",
  "CAD",
];

interface CurrencyClientProps {
  rates: Record<string, number> | null;
  baseCurrency: string;
  lastUpdated: string;
}

export function CurrencyClient({
  rates,
  baseCurrency,
  lastUpdated,
}: CurrencyClientProps) {
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState(baseCurrency);
  const [toCurrency, setToCurrency] = useState("USD");
  const [result, setResult] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  if (!rates) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Multi-currency is not configured
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Add <code className="bg-muted px-1.5 py-0.5 rounded text-xs">EXCHANGERATE_API_KEY</code> to
            your environment variables to enable exchange rate lookups and
            currency conversion.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allCurrencies = Object.keys(rates).sort();

  async function handleConvert() {
    setConverting(true);
    try {
      const converted = await convertAmount(
        parseFloat(amount) || 0,
        fromCurrency,
        toCurrency
      );
      setResult(converted ?? null);
    } catch {
      setResult(null);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Converter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Currency Converter
          </CardTitle>
          <CardDescription>
            Convert between currencies using live exchange rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setResult(null);
                }}
                className="w-40"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>From</Label>
              <Select
                value={fromCurrency}
                onValueChange={(v) => {
                  if (v) setFromCurrency(v);
                  setResult(null);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To</Label>
              <Select
                value={toCurrency}
                onValueChange={(v) => {
                  if (v) setToCurrency(v);
                  setResult(null);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleConvert} disabled={converting}>
              {converting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Convert
            </Button>
          </div>

          {result !== null && (
            <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">Result</p>
              <p className="text-2xl font-semibold">
                {parseFloat(amount).toLocaleString()} {fromCurrency} ={" "}
                <span className="text-primary">
                  {result.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{" "}
                  {toCurrency}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Rates</CardTitle>
          <CardDescription>
            Base currency: {baseCurrency} | Last updated: {lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">
                  Rate (1 {baseCurrency})
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMMON_CURRENCIES.filter((c) => c !== baseCurrency).map(
                (currency) => (
                  <TableRow key={currency}>
                    <TableCell className="font-medium">{currency}</TableCell>
                    <TableCell className="text-right font-mono">
                      {rates[currency]
                        ? rates[currency].toLocaleString(undefined, {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 6,
                          })
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
