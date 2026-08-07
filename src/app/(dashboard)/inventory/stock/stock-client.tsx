"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, AlertTriangle, ArrowUpDown } from "lucide-react";
import { recordStockMovement, getWarehouseStock, getStockMovements } from "@/lib/actions/inventory";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "sonner";
import type { StockMovementType } from "@/generated/prisma/enums";

type Props = {
  initialStock: Awaited<ReturnType<typeof getWarehouseStock>>;
  warehouses: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getWarehouses>>;
  initialMovements: Awaited<ReturnType<typeof getStockMovements>>;
  lowStockAlerts: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getLowStockAlerts>>;
  products: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getProducts>>["data"];
  hideHeader?: boolean;
};

const movementTypes: { value: StockMovementType; label: string }[] = [
  { value: "IN", label: "Stock In" },
  { value: "OUT", label: "Stock Out" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "RETURN", label: "Return" },
];

const movementBadgeColor: Record<string, string> = {
  IN: "bg-green-100 text-green-800",
  OUT: "bg-red-100 text-red-800",
  TRANSFER: "bg-blue-100 text-blue-800",
  ADJUSTMENT: "bg-yellow-100 text-yellow-800",
  RETURN: "bg-purple-100 text-purple-800",
};

export function StockClient({ initialStock, warehouses, initialMovements, lowStockAlerts, products, hideHeader }: Props) {
  const { canCreate } = usePermission();
  const [stock, setStock] = useState(initialStock);
  const [movements, setMovements] = useState(initialMovements);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [movementType, setMovementType] = useState<StockMovementType>("IN");
  const [isPending, startTransition] = useTransition();

  function refreshData(whId?: string) {
    startTransition(async () => {
      try {
        const wId = whId === "all" ? undefined : (whId || (warehouseFilter === "all" ? undefined : warehouseFilter));
        const [newStock, newMovements] = await Promise.all([
          getWarehouseStock(wId),
          getStockMovements({ warehouseId: wId }),
        ]);
        setStock(newStock);
        setMovements(newMovements);
      } catch {
        // ignore
      }
    });
  }

  function handleWarehouseChange(value: string) {
    setWarehouseFilter(value);
    refreshData(value);
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await recordStockMovement({
          productId: formData.get("productId") as string,
          warehouseId: formData.get("warehouseId") as string,
          type: movementType,
          quantity: parseInt(formData.get("quantity") as string),
          reference: (formData.get("reference") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
          targetWarehouseId: movementType === "TRANSFER" ? (formData.get("targetWarehouseId") as string) : undefined,
        });
        toast.success("Stock movement recorded");
        setIsOpen(false);
        refreshData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to record movement");
      }
    });
  }

  return (
    <div className={hideHeader ? "space-y-6" : "space-y-6 p-6"}>
      <div className="flex items-center justify-between">
        {!hideHeader ? (
          <div>
            <h1 className="text-3xl font-bold">Stock Management</h1>
            <p className="text-muted-foreground mt-1">Track stock levels and movements across warehouses</p>
          </div>
        ) : (
          <div />
        )}
        {canCreate("stock") && (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Record Movement
          </Button>
        )}
      </div>

      {/* Warehouse Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Label>Warehouse:</Label>
            <Select value={warehouseFilter} onValueChange={(v: string | null) => handleWarehouseChange(v ?? "all")}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>{wh.name} ({wh.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
          <TabsTrigger value="alerts">
            Low Stock Alerts
            {lowStockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{lowStockAlerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Stock Levels */}
        <TabsContent value="levels">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No stock records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    stock.map((item) => {
                      const available = item.quantity - item.reservedQty;
                      const isLow = item.product.minStock > 0 && item.quantity < item.product.minStock;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.product.sku}</TableCell>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell>{item.warehouse.name}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.product.unit}</TableCell>
                          <TableCell className="text-right">{item.reservedQty}</TableCell>
                          <TableCell className="text-right font-semibold">{available}</TableCell>
                          <TableCell>
                            {item.quantity === 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movement History */}
        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No movements recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.data.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{new Date(m.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={movementBadgeColor[m.type] ?? ""}>{m.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{m.product.name}</span>
                            <span className="block text-xs text-muted-foreground">{m.product.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>{m.warehouse?.name ?? "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{m.quantity}</TableCell>
                        <TableCell className="text-sm">{m.reference ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold">Products Below Minimum Stock Level</h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No low stock alerts
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockAlerts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category ?? "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{item.totalStock}</TableCell>
                        <TableCell className="text-right">{item.minStock}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {item.minStock - item.totalStock}
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

      {/* Record Movement Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" /> Record Stock Movement
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as StockMovementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {movementTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productId">Product *</Label>
              <select name="productId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouseId">{movementType === "TRANSFER" ? "Source Warehouse *" : "Warehouse *"}</Label>
              <select name="warehouseId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>
            {movementType === "TRANSFER" && (
              <div className="space-y-2">
                <Label htmlFor="targetWarehouseId">Target Warehouse *</Label>
                <select name="targetWarehouseId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select target warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" name="quantity" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (PO/SO Number)</Label>
              <Input id="reference" name="reference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Movement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
