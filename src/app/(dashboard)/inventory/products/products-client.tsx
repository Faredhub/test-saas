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
import { Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import { createProduct, updateProduct, deleteProduct, getProducts } from "@/lib/actions/inventory";
import { toast } from "sonner";

type Props = {
  initialData: Awaited<ReturnType<typeof getProducts>>;
  categories: string[];
  warehouses: Awaited<ReturnType<typeof import("@/lib/actions/inventory").getWarehouses>>;
};

export function ProductsClient({ initialData, categories }: Props) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function refreshData(filters?: { search?: string; category?: string }) {
    startTransition(async () => {
      try {
        const result = await getProducts({
          search: filters?.search || search || undefined,
          category: filters?.category === "all" ? undefined : (filters?.category || (categoryFilter === "all" ? undefined : categoryFilter)),
        });
        setData(result);
      } catch {
        // ignore refresh errors
      }
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
    refreshData({ search: value });
  }

  function handleCategoryChange(value: string) {
    setCategoryFilter(value);
    refreshData({ category: value });
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const payload = {
          sku: formData.get("sku") as string,
          name: formData.get("name") as string,
          description: (formData.get("description") as string) || undefined,
          category: (formData.get("category") as string) || undefined,
          unit: (formData.get("unit") as string) || "PCS",
          hsnCode: (formData.get("hsnCode") as string) || undefined,
          costPrice: parseFloat(formData.get("costPrice") as string) || 0,
          sellingPrice: parseFloat(formData.get("sellingPrice") as string) || 0,
          taxRate: parseFloat(formData.get("taxRate") as string) || 0,
          barcode: (formData.get("barcode") as string) || undefined,
          minStock: parseInt(formData.get("minStock") as string) || 0,
          maxStock: parseInt(formData.get("maxStock") as string) || undefined,
        };

        if (editId) {
          await updateProduct(editId, payload);
          toast.success("Product updated");
        } else {
          await createProduct(payload);
          toast.success("Product created");
        }
        setIsOpen(false);
        setEditId(null);
        refreshData();
      } catch {
        toast.error(editId ? "Failed to update product" : "Failed to create product");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteProduct(id);
        toast.success("Product deleted");
        setConfirmDeleteId(null);
        refreshData();
      } catch {
        toast.error("Failed to delete product");
      }
    });
  }

  function openEdit(product: (typeof data.data)[0]) {
    setEditId(product.id);
    setIsOpen(true);
  }

  const editProduct = editId ? data.data.find((p) => p.id === editId) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage product catalog and SKUs</p>
        </div>
        <Button onClick={() => { setEditId(null); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or barcode..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v: string | null) => handleCategoryChange(v ?? "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((product) => {
                  const totalStock = product.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
                  const isLowStock = product.minStock > 0 && totalStock < product.minStock;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.barcode && (
                            <span className="block text-xs text-muted-foreground">Barcode: {product.barcode}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category ?? "-"}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right">{Number(product.costPrice).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</TableCell>
                      <TableCell className="text-right">{Number(product.sellingPrice).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</TableCell>
                      <TableCell className="text-right">
                        <span className={isLowStock ? "text-red-600 font-semibold" : ""}>{totalStock}</span>
                      </TableCell>
                      <TableCell>
                        {!product.isActive ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : isLowStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(product.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => {
                  startTransition(async () => {
                    const result = await getProducts({ page: data.page - 1, search: search || undefined, category: categoryFilter === "all" ? undefined : categoryFilter });
                    setData(result);
                  });
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => {
                  startTransition(async () => {
                    const result = await getProducts({ page: data.page + 1, search: search || undefined, category: categoryFilter === "all" ? undefined : categoryFilter });
                    setData(result);
                  });
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" name="sku" required defaultValue={editProduct?.sku ?? ""} readOnly={!!editId} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required defaultValue={editProduct?.name ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={editProduct?.description ?? ""} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" defaultValue={editProduct?.category ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" defaultValue={editProduct?.unit ?? "PCS"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsnCode">HSN Code</Label>
                <Input id="hsnCode" name="hsnCode" defaultValue={editProduct?.hsnCode ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input id="costPrice" name="costPrice" type="number" step="0.01" defaultValue={editProduct ? Number(editProduct.costPrice) : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" defaultValue={editProduct ? Number(editProduct.sellingPrice) : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={editProduct ? Number(editProduct.taxRate) : ""} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" name="barcode" defaultValue={editProduct?.barcode ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Min Stock</Label>
                <Input id="minStock" name="minStock" type="number" defaultValue={editProduct?.minStock ?? 0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input id="maxStock" name="maxStock" type="number" defaultValue={editProduct?.maxStock ?? ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this product? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={isPending} onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
