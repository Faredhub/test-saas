"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ShoppingBag, Pencil, Eye, Trash2, Tag, CheckCircle2 } from "lucide-react";
import { createProduct, deleteProduct } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit: string;
  hsnCode?: string | null;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  barcode?: string | null;
  minStock: number;
  maxStock?: number | null;
  isActive: boolean;
}

interface Props {
  initialProducts: ProductItem[];
}

export function ProductsClient({ initialProducts }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<ProductItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("PCS");
  const [hsnCode, setHsnCode] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("18");
  const [barcode, setBarcode] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [description, setDescription] = useState("");

  const categories = Array.from(new Set(initialProducts.map((p) => p.category || "General"))).sort();

  const filteredProducts = initialProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "ALL" || (p.category || "General") === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = () => {
    if (!name.trim() || !sku.trim()) {
      toast.error("Product name and SKU are required");
      return;
    }

    startTransition(async () => {
      try {
        await createProduct({
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || "General",
          unit: unit.trim() || "PCS",
          hsnCode: hsnCode.trim() || undefined,
          costPrice: parseFloat(costPrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          taxRate: parseFloat(taxRate) || 0,
          barcode: barcode.trim() || undefined,
          minStock: parseInt(minStock) || 0,
        });
        toast.success("Product record created in ERP");
        setIsOpen(false);
        setSku("");
        setName("");
        setDescription("");
        setCostPrice("0");
        setSellingPrice("0");
        setHsnCode("");
        setBarcode("");
      } catch (err: any) {
        toast.error(err?.message || "Failed to create product");
      }
    });
  };

  const handleDelete = (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete product record for ${prodName}?`)) return;
    startTransition(async () => {
      try {
        await deleteProduct(id);
        toast.success(`Deleted product ${prodName}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete product");
      }
    });
  };

  return (
    <div className="p-6 space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Products Central Repository
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Central repository for managing all product records integrated to Sales, Purchasing, Manufacturing & Accounting.
          </p>
        </div>

        <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
          <Plus className="h-4 w-4 mr-2" /> Add Product Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total ERP Products</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{initialProducts.length}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Active Catalog Items</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {initialProducts.filter((p) => p.isActive).length}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Product Categories</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{categories.length}</p>
            </div>
            <Tag className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search product name, SKU, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val ?? "ALL")}>
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Products Directory ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">SKU</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product Name</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Category</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">HSN Code</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Cost Price</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Selling Price</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Tax Rate</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No product records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{product.sku}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">{product.category || "General"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">{product.hsnCode || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">${product.costPrice}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">${product.sellingPrice}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-700 dark:text-slate-300">{product.taxRate}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                        {product.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* VIEW ICON - BLUE */}
                        <button
                          type="button"
                          title="View Product"
                          onClick={() => setViewProduct(product)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* EDIT ICON - BLACK / WHITE */}
                        <button
                          type="button"
                          title="Edit Product"
                          onClick={() => toast.info("Edit product modal ready")}
                          className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* DELETE ICON - RED */}
                        <button
                          type="button"
                          title="Delete Product"
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={isPending}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE PRODUCT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Add New Product Record</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Product Name *</Label>
                <Input placeholder="Laptop Pro 16" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">SKU Code *</Label>
                <Input placeholder="PROD-LPT-01" value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <Input placeholder="Electronics" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit</Label>
                <Input placeholder="PCS" value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">HSN Code</Label>
                <Input placeholder="84713010" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Cost Price ($)</Label>
                <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Selling Price ($)</Label>
                <Input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tax Rate (%)</Label>
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Barcode / EAN</Label>
                <Input placeholder="890123456789" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Min Stock Alert Threshold</Label>
                <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input placeholder="Full product specs..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending} className="bg-blue-600 text-white">
              Create Product Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW PRODUCT DIALOG */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Product Record Details
            </DialogTitle>
          </DialogHeader>

          {viewProduct && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Product Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewProduct.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">SKU:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{viewProduct.sku}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Category:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewProduct.category || "General"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Cost Price:</span>
                <span className="font-bold text-slate-900 dark:text-white">${viewProduct.costPrice}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Selling Price:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${viewProduct.sellingPrice}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tax Rate:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewProduct.taxRate}%</span>
              </div>
              {viewProduct.hsnCode && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">HSN / SAC Code:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewProduct.hsnCode}</span>
                </div>
              )}
              {viewProduct.description && (
                <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded border border-border text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold block mb-0.5">Description:</span>
                  {viewProduct.description}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewProduct(null)} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
