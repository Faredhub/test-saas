"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Pencil, Trash2, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const sample = [
      {
        "SKU": "SKU-001",
        "Name": "Office Chair - Ergonomic",
        "Description": "High-back ergonomic chair with lumbar support",
        "Category": "Furniture",
        "Unit": "PCS",
        "HSN Code": "94013000",
        "Cost Price": 4500,
        "Selling Price": 6999,
        "Tax Rate (%)": 18,
        "Barcode": "8901234567890",
        "Min Stock": 5,
        "Max Stock": 50
      },
      {
        "SKU": "SKU-002",
        "Name": "A4 Paper Ream",
        "Description": "500 sheets, 75 GSM white copy paper",
        "Category": "Stationery",
        "Unit": "REAM",
        "HSN Code": "48025590",
        "Cost Price": 180,
        "Selling Price": 250,
        "Tax Rate (%)": 12,
        "Barcode": "",
        "Min Stock": 20,
        "Max Stock": 200
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "products_template.xlsx");
    toast.success("Products template downloaded!");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const binaryData = evt.target?.result;
            if (!binaryData) return;

            const workbook = XLSX.read(binaryData, { type: "binary" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
              toast.error("The Excel file is empty.");
              return;
            }

            let successCount = 0;
            for (const row of json) {
              const sku = String(row["SKU"] || row.sku || "").trim();
              const name = String(row["Name"] || row.name || "").trim();
              if (!sku || !name) continue;

              try {
                await createProduct({
                  sku,
                  name,
                  description: String(row["Description"] || row.description || "").trim() || undefined,
                  category: String(row["Category"] || row.category || "").trim() || undefined,
                  unit: String(row["Unit"] || row.unit || "PCS").trim(),
                  hsnCode: String(row["HSN Code"] || row.hsnCode || "").trim() || undefined,
                  costPrice: parseFloat(String(row["Cost Price"] || row.costPrice || "0")) || 0,
                  sellingPrice: parseFloat(String(row["Selling Price"] || row.sellingPrice || "0")) || 0,
                  taxRate: parseFloat(String(row["Tax Rate (%)"] || row.taxRate || "0")) || 0,
                  barcode: String(row["Barcode"] || row.barcode || "").trim() || undefined,
                  minStock: parseInt(String(row["Min Stock"] || row.minStock || "0")) || 0,
                  maxStock: parseInt(String(row["Max Stock"] || row.maxStock || "")) || undefined,
                });
                successCount++;
              } catch (err) {
                console.error(`Failed to import product "${name}":`, err);
              }
            }

            if (successCount > 0) {
              toast.success(`Successfully imported ${successCount} product${successCount > 1 ? "s" : ""}!`);
              refreshData();
            } else {
              toast.error("No valid products found. Make sure SKU and Name columns are filled.");
            }
          } catch (err: any) {
            toast.error(`Error parsing Excel: ${err.message}`);
          }
        };
        reader.readAsBinaryString(file);
      } catch (err: any) {
        toast.error(`Failed to read file: ${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage product catalog and SKUs</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Template
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Excel
          </Button>

          <Button onClick={() => { setEditId(null); setIsOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
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
