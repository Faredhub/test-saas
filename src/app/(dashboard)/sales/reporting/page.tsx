import { Metadata } from "next";
import { SalesReportingClient } from "./reporting-client";
import { getB2BSalesOrders, getQuotations, getDeals } from "@/lib/actions/sales";
import { getProducts } from "@/lib/actions/inventory";

export const metadata: Metadata = {
  title: "Sales Reporting & Performance Analysis | ERP",
  description: "Comprehensive sales analysis, graph views, pivot views, KPIs, and multi-format report exports.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SalesReportingPage() {
  const [orders, rawQuotations, rawDeals, rawProducts] = await Promise.all([
    getB2BSalesOrders().catch(() => []),
    getQuotations({ pageSize: 100 }).catch(() => ({ data: [], total: 0 })),
    getDeals({ pageSize: 100 }).catch(() => ({ data: [], total: 0 })),
    getProducts({ pageSize: 100 }).catch(() => ({ data: [], total: 0 })),
  ]);

  const quotations = Array.isArray(rawQuotations?.data) ? rawQuotations.data : [];
  const deals = Array.isArray(rawDeals?.data) ? rawDeals.data : [];
  const products = Array.isArray(rawProducts?.data) ? rawProducts.data : [];

  return (
    <SalesReportingClient
      orders={orders as any[]}
      quotations={quotations as any[]}
      deals={deals as any[]}
      products={products as any[]}
    />
  );
}
