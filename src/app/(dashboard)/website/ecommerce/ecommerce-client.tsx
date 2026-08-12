"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  ShoppingBag,
  ArrowLeft,
  Truck,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  getEcommerceOrder,
  updateOrderStatus,
} from "@/lib/actions/website";

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type EcomOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentId: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "outline" },
  SHIPPED: { label: "Shipped", variant: "outline" },
  DELIVERED: { label: "Delivered", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "Paid", variant: "default" },
  UNPAID: { label: "Unpaid", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "secondary" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function PaymentBadge({ status }: { status: string }) {
  const config = PAYMENT_STATUS_CONFIG[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-IN", opts);
}

export function EcommerceClient({ initialOrders }: { initialOrders: EcomOrder[] }) {
  const router = useRouter();
  const [orders] = useState<EcomOrder[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<EcomOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filteredOrders =
    statusFilter === "ALL"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  async function viewOrder(id: string) {
    setLoadingDetail(true);
    try {
      const order = await getEcommerceOrder(id);
      setSelectedOrder(order as unknown as EcomOrder);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    await updateOrderStatus(id, status);
    router.refresh();
    if (selectedOrder?.id === id) {
      setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
    }
  }

  if (selectedOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOrder(null)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Orders
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Order #{selectedOrder.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              {formatDate(selectedOrder.createdAt, {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={selectedOrder.status} />
            <PaymentBadge status={selectedOrder.paymentStatus} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{selectedOrder.customerName}</p>
              <p className="text-muted-foreground">{selectedOrder.customerEmail}</p>
              {selectedOrder.customerPhone && (
                <p className="text-muted-foreground">{selectedOrder.customerPhone}</p>
              )}
              {selectedOrder.shippingAddress && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Shipping Address
                  </p>
                  <p className="whitespace-pre-wrap">{selectedOrder.shippingAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span>{selectedOrder.paymentMethod || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <PaymentBadge status={selectedOrder.paymentStatus} />
              </div>
              {selectedOrder.paymentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="font-mono text-xs">{selectedOrder.paymentId}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                <span>Total</span>
                <span>{formatINR(selectedOrder.total)}</span>
              </div>
              {selectedOrder.notes && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Notes
                  </p>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.variantName || "-"}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatINR(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatINR(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 space-y-1 text-sm text-right">
              <div className="flex justify-end gap-8">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatINR(selectedOrder.tax)}</span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatINR(selectedOrder.shipping)}</span>
              </div>
              <div className="flex justify-end gap-8 font-bold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatINR(selectedOrder.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const).map((s) => (
            <Button
              key={s}
              variant={selectedOrder.status === s ? "default" : "outline"}
              size="sm"
              disabled={selectedOrder.status === s}
              onClick={() => handleStatusUpdate(selectedOrder.id, s)}
            >
              {s === "CONFIRMED" && <CheckCircle className="mr-1 h-3 w-3" />}
              {s === "SHIPPED" && <Truck className="mr-1 h-3 w-3" />}
              {s === "DELIVERED" && <Package className="mr-1 h-3 w-3" />}
              {s === "CANCELLED" && <XCircle className="mr-1 h-3 w-3" />}
              {STATUS_CONFIG[s]?.label || s}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">eCommerce</h1>
          <p className="text-muted-foreground">
            Manage online orders, cart, and checkout
          </p>
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            <ShoppingBag className="mr-1 h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-1 h-4 w-4" />
            Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? "ALL")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Orders</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {order.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customerEmail}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentBadge status={order.paymentStatus} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatINR(order.total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewOrder(order.id)}
                            disabled={loadingDetail}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Manage sales products from the inventory module.
              </p>
              <Link href="/inventory/products">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Go to Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
