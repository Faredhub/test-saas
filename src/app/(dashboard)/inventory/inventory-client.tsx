"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle, Warehouse, IndianRupee, Wrench, ClipboardCheck, Factory } from "lucide-react";
import type { getInventoryStats, getLowStockAlerts } from "@/lib/actions/inventory";

type Props = {
  stats: Awaited<ReturnType<typeof getInventoryStats>>;
  lowStockAlerts: Awaited<ReturnType<typeof getLowStockAlerts>>;
};

export function InventoryClient({ stats, lowStockAlerts }: Props) {
  const cards = [
    {
      title: "Total Products",
      value: stats.productCount,
      icon: Package,
      href: "/inventory/products",
      color: "text-blue-600",
    },
    {
      title: "Low Stock Alerts",
      value: stats.lowStockAlerts,
      icon: AlertTriangle,
      href: "/inventory/stock",
      color: "text-red-600",
    },
    {
      title: "Stock Value",
      value: `₹${stats.stockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      icon: IndianRupee,
      href: "/inventory/stock",
      color: "text-green-600",
    },
    {
      title: "Warehouses",
      value: stats.warehouseCount,
      icon: Warehouse,
      href: "/inventory/warehouses",
      color: "text-purple-600",
    },
  ];

  const quickLinks = [
    { title: "Products", description: "Manage product catalog & SKUs", href: "/inventory/products", icon: Package },
    { title: "Stock", description: "Stock movements & levels", href: "/inventory/stock", icon: Warehouse },
    { title: "Warehouses", description: "Warehouse locations", href: "/inventory/warehouses", icon: Warehouse },
    { title: "Manufacturing", description: "Production orders & BOM", href: "/inventory/manufacturing", icon: Factory },
    { title: "Assets", description: "Asset tracking & maintenance", href: "/inventory/assets", icon: Wrench },
    { title: "Quality", description: "Quality control checks", href: "/inventory/quality", icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory & Supply Chain</h1>
        <p className="text-muted-foreground mt-1">Manage products, stock, warehouses, manufacturing, and assets</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.title} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <link.icon className="h-6 w-6 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold">{link.title}</h3>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Low Stock Alerts Table */}
      {lowStockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
              <Badge variant="destructive">{lowStockAlerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockAlerts.slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category ?? "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{item.totalStock}</TableCell>
                    <TableCell className="text-right">{item.minStock}</TableCell>
                    <TableCell>
                      {item.totalStock === 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}