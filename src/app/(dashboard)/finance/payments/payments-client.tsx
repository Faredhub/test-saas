"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  CreditCard,
  Search,
  Loader2,
  Info,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { getOnlinePayments } from "@/lib/actions/finance";

type Gateway = "razorpay" | "stripe" | null;

type PaymentData = Awaited<ReturnType<typeof getOnlinePayments>>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

const gatewayColors: Record<string, string> = {
  RAZORPAY: "bg-blue-100 text-blue-700",
  STRIPE: "bg-purple-100 text-purple-700",
};

export function PaymentsClient({ gateway }: { gateway: Gateway }) {
  const [data, setData] = useState<PaymentData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getOnlinePayments({
          search: search || undefined,
          method:
            methodFilter !== "ALL"
              ? (methodFilter as "RAZORPAY" | "STRIPE")
              : undefined,
          page,
          pageSize: 25,
        });
        setData(result);
      } catch {
        // Data will remain null
      }
    });
  }, [search, methodFilter, page]);

  if (!gateway) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Online Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            Track payments received through Razorpay or Stripe
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-4 p-6">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">
                No Payment Gateway Configured
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                To accept online payments, set up Razorpay or Stripe by adding
                the required environment variables. For Razorpay, add{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
                  RAZORPAY_KEY_ID
                </code>{" "}
                and{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
                  RAZORPAY_KEY_SECRET
                </code>
                . For Stripe, add{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
                  STRIPE_SECRET_KEY
                </code>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Online Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            Payments received via{" "}
            <Badge variant="outline" className="ml-1 text-xs capitalize">
              {gateway}
            </Badge>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice no. or reference..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={methodFilter}
          onValueChange={(v) => {
            if (v) setMethodFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Gateways</SelectItem>
            <SelectItem value="RAZORPAY">Razorpay</SelectItem>
            <SelectItem value="STRIPE">Stripe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.data.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No online payments found.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(payment.paidAt), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/sales/invoices/${payment.invoiceId}`}
                          className="inline-flex items-center gap-1 font-mono text-sm text-blue-600 hover:underline"
                        >
                          {payment.invoiceNo ?? payment.invoiceId}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`border-0 text-xs ${gatewayColors[payment.method] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {payment.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                        {payment.reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages} ({data.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
