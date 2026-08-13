import { Metadata } from "next";
import { SalesReportingClient } from "./reporting-client";
import { getB2BSalesOrders } from "@/lib/actions/sales";

export const metadata: Metadata = {
  title: "Sales Reporting & Performance Analysis | ERP",
  description: "Comprehensive sales analysis, graph views, pivot views, KPIs, and multi-format report exports.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SalesReportingPage() {
  const orders = await getB2BSalesOrders();
  return <SalesReportingClient orders={orders} />;
}
