"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Truck,
  Factory,
  Package,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { validateDeliveryOrder, supplyRawMaterials, receiveFinishedGoods } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface StoreProduct {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  sellingPrice: number;
  isActive: boolean;
  stockQty: number;
}

interface DeliveryOrder {
  id: string;
  deliveryNo: string;
  sourceDocument?: string | null;
  contactName: string;
  contactPhone?: string | null;
  scheduledDate: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  items: Array<{ productName: string; demandQty: number; doneQty: number }>;
}

interface ManufacturingOrder {
  id: string;
  orderNo: string;
  productName: string;
  quantity: number;
  completedQty: number;
  status: "DRAFT" | "CONFIRMED" | "IN_PROGRESS" | "QUALITY_CHECK" | "COMPLETED" | "CANCELLED";
  startDate?: string | null;
}

interface StoreClientProps {
  products: StoreProduct[];
  deliveries: DeliveryOrder[];
  mfgOrders: ManufacturingOrder[];
}

function formatRelativeDate(isoDate: string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffTime = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
}

export function StoreClient({ products, deliveries, mfgOrders }: StoreClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isPending, startTransition] = useTransition();

  const handleValidateDelivery = (id: string) => {
    startTransition(async () => {
      try {
        await validateDeliveryOrder(id);
        toast.success("Delivery Order confirmed and stock movement completed!");
      } catch (err: any) {
        toast.error(err?.message || "Failed to validate delivery order");
      }
    });
  };

  const handleSupplyRawMaterials = (id: string) => {
    startTransition(async () => {
      try {
        await supplyRawMaterials(id);
        toast.success("Raw materials issued to production!");
      } catch (err: any) {
        toast.error(err?.message || "Failed to issue raw materials");
      }
    });
  };

  const handleReceiveFinishedGoods = (id: string) => {
    startTransition(async () => {
      try {
        await receiveFinishedGoods(id);
        toast.success("Finished goods received into store inventory!");
      } catch (err: any) {
        toast.error(err?.message || "Failed to receive finished goods");
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShoppingBag className="h-8 w-8 text-amber-500" /> Site Store & eCommerce Hub
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Online storefront catalog, integrated Deliveries shipping, and Manufacturing WIP stock entries.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/site/store" target="_blank">
            <Button variant="outline" className="border-slate-300">
              <ExternalLink className="h-4 w-4 mr-2 text-blue-600" /> Open Public Storefront
            </Button>
          </Link>
          <Link href="/website/store/settings">
            <Button className="bg-amber-600 hover:bg-amber-500 text-white font-medium">
              <Settings className="h-4 w-4 mr-2" /> Store Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Active Products</p>
            <div className="text-2xl font-bold text-slate-900 mt-1">{products.length}</div>
            <p className="text-xs text-amber-600 mt-1">Live in Storefront</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Pending Deliveries</p>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {deliveries.filter((d) => d.status !== "DONE").length}
            </div>
            <p className="text-xs text-blue-600 mt-1">Waiting fulfillment</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Manufacturing WIP</p>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {mfgOrders.filter((m) => m.status === "IN_PROGRESS").length}
            </div>
            <p className="text-xs text-purple-600 mt-1">Raw material issued</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase">Completed Goods</p>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {mfgOrders.filter((m) => m.status === "COMPLETED").length}
            </div>
            <p className="text-xs text-emerald-600 mt-1">Received in stock</p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN SUBMODULE TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border">
          <TabsTrigger value="overview" className="gap-2">
            <Package className="h-4 w-4" /> Products Catalog
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2">
            <Truck className="h-4 w-4" /> Submodule: Deliveries
          </TabsTrigger>
          <TabsTrigger value="manufacturing" className="gap-2">
            <Factory className="h-4 w-4" /> Submodule: Manufacturing
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PRODUCTS CATALOG */}
        <TabsContent value="overview">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg">Site Store Products</CardTitle>
                <CardDescription>Products listed on online customer storefront.</CardDescription>
              </div>
              <Link href="/inventory/stock?tab=inventory">
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add / Import Product
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Product Name</TableHead>
                    <TableHead className="font-bold">SKU</TableHead>
                    <TableHead className="font-bold">Category</TableHead>
                    <TableHead className="font-bold">Selling Price</TableHead>
                    <TableHead className="font-bold">Available Stock</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                        No active store products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((prod) => (
                      <TableRow key={prod.id}>
                        <TableCell className="font-bold text-slate-900">{prod.name}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">{prod.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{prod.category || "General"}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">₹{prod.sellingPrice.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              prod.stockQty > 0
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }
                          >
                            {prod.stockQty} in stock
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-amber-600">
                            Active in Store
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DELIVERIES SUBMODULE */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" /> Deliveries Submodule
                </CardTitle>
                <CardDescription>
                  Reference no, contact, relative schedule date (*"1 month ago"*, *"20 days ago"*), source document, status.
                </CardDescription>
              </div>
              <Link href="/inventory/deliveries">
                <Button size="sm" variant="outline" className="text-xs">
                  Full Deliveries View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Reference No</TableHead>
                    <TableHead className="font-bold">Contact / Customer</TableHead>
                    <TableHead className="font-bold">Schedule Date</TableHead>
                    <TableHead className="font-bold">Source Document</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                        No delivery orders recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveries.map((del) => (
                      <TableRow key={del.id}>
                        <TableCell className="font-bold text-blue-600">{del.deliveryNo}</TableCell>
                        <TableCell className="font-medium text-slate-900">{del.contactName}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {formatRelativeDate(del.scheduledDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50">
                            {del.sourceDocument || "STORE-ONLINE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {del.status === "DONE" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> DONE
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{del.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {del.status !== "DONE" && (
                            <Button
                              size="sm"
                              onClick={() => handleValidateDelivery(del.id)}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
                            >
                              Validate Delivery
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MANUFACTURING SUBMODULE */}
        <TabsContent value="manufacturing">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Factory className="h-5 w-5 text-purple-600" /> Manufacturing Submodule
                </CardTitle>
                <CardDescription>
                  Proper movement of raw materials (WIP) and receiving finished goods into stock.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Production Order No</TableHead>
                    <TableHead className="font-bold">Finished Product</TableHead>
                    <TableHead className="font-bold">Target Quantity</TableHead>
                    <TableHead className="font-bold">Completed</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mfgOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                        No manufacturing production orders recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mfgOrders.map((mfg) => (
                      <TableRow key={mfg.id}>
                        <TableCell className="font-bold text-purple-600">{mfg.orderNo}</TableCell>
                        <TableCell className="font-semibold text-slate-900">{mfg.productName}</TableCell>
                        <TableCell className="font-bold text-slate-900">{mfg.quantity} units</TableCell>
                        <TableCell>{mfg.completedQty} units</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              mfg.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : mfg.status === "IN_PROGRESS"
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-slate-100 text-slate-700"
                            }
                          >
                            {mfg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {mfg.status === "CONFIRMED" || mfg.status === "DRAFT" ? (
                            <Button
                              size="sm"
                              onClick={() => handleSupplyRawMaterials(mfg.id)}
                              disabled={isPending}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7"
                            >
                              Supply Raw Materials
                            </Button>
                          ) : mfg.status === "IN_PROGRESS" ? (
                            <Button
                              size="sm"
                              onClick={() => handleReceiveFinishedGoods(mfg.id)}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
                            >
                              Receive Finished Goods
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
