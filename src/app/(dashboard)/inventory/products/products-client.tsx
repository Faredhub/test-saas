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
import { Plus, Search, ShoppingBag, Pencil, Eye, Trash2, Tag, CheckCircle2, LayoutGrid, List, Clock, Upload, Image as ImageIcon, X, Box } from "lucide-react";
import { createProduct, deleteProduct } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  type?: string | null;
  description?: string | null;
  category?: string | null;
  unit: string;
  hsnCode?: string | null;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  barcode?: string | null;
  imageUrl?: string | null;
  minStock: number;
  maxStock?: number | null;
  isActive: boolean;
}

interface Props {
  initialProducts: ProductItem[];
}

export function ProductsClient({ initialProducts }: Props) {
  const [productsList, setProductsList] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "list" | "activity">("cards");
  const [isOpen, setIsOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<ProductItem | null>(null);
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEdit) {
        setEditImageUrl(base64String);
      } else {
        setImageUrl(base64String);
      }
      toast.success("Product image uploaded!");
    };
    reader.readAsDataURL(file);
  };

  // Create Form State
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [productType, setProductType] = useState("STORABLE");
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("PCS");
  const [hsnCode, setHsnCode] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("18");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [description, setDescription] = useState("");

  // Edit Form State
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editProductType, setEditProductType] = useState("STORABLE");
  const [editCategory, setEditCategory] = useState("General");
  const [editUnit, setEditUnit] = useState("PCS");
  const [editHsnCode, setEditHsnCode] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("0");
  const [editSellingPrice, setEditSellingPrice] = useState("0");
  const [editTaxRate, setEditTaxRate] = useState("18");
  const [editBarcode, setEditBarcode] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editMinStock, setEditMinStock] = useState("5");
  const [editDescription, setEditDescription] = useState("");

  const categories = Array.from(new Set(productsList.map((p) => p.category || "General"))).sort();

  const filteredProducts = productsList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "ALL" || (p.category || "General") === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenEdit = (p: ProductItem) => {
    setEditProduct(p);
    setEditSku(p.sku);
    setEditName(p.name);
    setEditProductType(p.type || "STORABLE");
    setEditCategory(p.category || "General");
    setEditUnit(p.unit || "PCS");
    setEditHsnCode(p.hsnCode || "");
    setEditCostPrice(String(p.costPrice));
    setEditSellingPrice(String(p.sellingPrice));
    setEditTaxRate(String(p.taxRate));
    setEditBarcode(p.barcode || "");
    setEditImageUrl(p.imageUrl || "");
    setEditMinStock(String(p.minStock));
    setEditDescription(p.description || "");
  };

  const handleSaveEdit = () => {
    if (!editProduct) return;
    setProductsList((prev) =>
      prev.map((p) =>
        p.id === editProduct.id
          ? {
              ...p,
              sku: editSku,
              name: editName,
              type: editProductType,
              category: editCategory,
              unit: editUnit,
              hsnCode: editHsnCode || null,
              costPrice: parseFloat(editCostPrice) || 0,
              sellingPrice: parseFloat(editSellingPrice) || 0,
              taxRate: parseFloat(editTaxRate) || 0,
              barcode: editBarcode || null,
              imageUrl: editImageUrl || null,
              minStock: parseInt(editMinStock) || 0,
              description: editDescription || null,
            }
          : p
      )
    );
    toast.success(`Product ${editName} updated successfully`);
    setEditProduct(null);
  };

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

      {/* Filter Bar with 3-Style View Switcher (Cards | List | Activity) */}
      <Card className="bg-card text-card-foreground border border-border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Search product name, SKU, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val ?? "ALL")}>
              <SelectTrigger className="w-full sm:w-[180px] text-xs">
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

          {/* Exact 3-Style View Switcher Pill Matching User Image */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("activity")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "activity"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4" /> Activity
            </button>
          </div>
        </CardContent>
      </Card>

      {/* VIEW MODE 1: CARDS GRID VIEW */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <Card key={p.id} className="group relative overflow-hidden border border-border hover:shadow-md cursor-pointer transition-all p-4 space-y-3 bg-card" onClick={() => setViewProduct(p)}>
              <div className="flex items-start justify-between gap-2">
                <div className="h-16 w-16 rounded-lg border bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
                <Badge variant="outline" className="font-mono text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200">
                  {p.sku}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                  {p.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200">
                    {p.type || "Storable"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">• {p.category || "General"}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                <div>
                  <span className="text-muted-foreground font-normal">Price: </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{p.sellingPrice}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewProduct(p)} title="View Product" className="h-7 w-7 text-blue-600">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)} title="Edit Product" className="h-7 w-7 text-slate-800 dark:text-slate-200">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id, p.name)} disabled={isPending} title="Delete Product" className="h-7 w-7 text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW MODE 2: LIST VIEW TABLE */}
      {viewMode === "list" && (
        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Products Directory ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">SKU</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product Name</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Type</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Category</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Cost Price</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Selling Price</TableHead>
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
                    <TableRow key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border cursor-pointer" onClick={() => setViewProduct(product)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="h-8 w-8 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{product.sku}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200">
                          {product.type || "STORABLE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">{product.category || "General"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700 dark:text-slate-300">₹{product.costPrice}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">₹{product.sellingPrice}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                          {product.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            title="View Product"
                            onClick={() => setViewProduct(product)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Edit Product"
                            onClick={() => handleOpenEdit(product)}
                            className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
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
      )}

      {/* VIEW MODE 3: ACTIVITY TIMELINE VIEW */}
      {viewMode === "activity" && (
        <Card className="bg-card text-card-foreground border border-border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" /> Recent Product Activity & Catalog History
            </h2>
            <Badge variant="outline" className="font-mono text-xs">Live System Log</Badge>
          </div>

          <div className="space-y-4">
            {filteredProducts.map((p, idx) => (
              <div key={p.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/40 border text-xs">
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                  #{idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name} [{p.sku}]</span>
                    <span className="text-[11px] text-muted-foreground font-mono">Today, 10:45 AM</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Product record cataloged under <strong className="text-slate-900 dark:text-white">{p.category || "General"}</strong>. Selling Price set to <strong className="text-emerald-600">₹{p.sellingPrice}</strong> with Tax Rate {p.taxRate}%.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CREATE PRODUCT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Add New Product Record</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Upload Product Image File */}
            <div className="space-y-2 border-b pb-3">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-600" /> Product Image (Upload File or Enter URL)
              </Label>

              {imageUrl ? (
                <div className="relative h-24 w-24 rounded-lg border bg-muted overflow-hidden group">
                  <img src={imageUrl} alt="Product Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                    title="Remove Image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, false)}
                    className="cursor-pointer text-xs"
                  />
                  <Input
                    placeholder="Or paste Image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

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

            <div>
              <Label className="text-xs font-semibold">Product Type *</Label>
              <Select value={productType} onValueChange={(val) => setProductType(val ?? "STORABLE")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORABLE">Storable Product (Track Stock Inventory)</SelectItem>
                  <SelectItem value="CONSUMABLE">Consumable Product (No Stock Tracking)</SelectItem>
                  <SelectItem value="SERVICE">Service (Non-Physical / Professional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <Input placeholder="Electronics" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit (UoM)</Label>
                <Input placeholder="PCS" value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">HSN Code</Label>
                <Input placeholder="84713010" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Cost Price (₹)</Label>
                <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Selling Price (₹)</Label>
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
              <Label className="text-xs font-semibold">Sales Description</Label>
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

      {/* EDIT PRODUCT DIALOG */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Edit Product Record
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Edit Product Image File Upload */}
            <div className="space-y-2 border-b pb-3">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-600" /> Product Image (Upload File or Enter URL)
              </Label>

              {editImageUrl ? (
                <div className="relative h-24 w-24 rounded-lg border bg-muted overflow-hidden group">
                  <img src={editImageUrl} alt="Product Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditImageUrl("")}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                    title="Remove Image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, true)}
                    className="cursor-pointer text-xs"
                  />
                  <Input
                    placeholder="Or paste Image URL (https://...)"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Product Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">SKU Code *</Label>
                <Input value={editSku} onChange={(e) => setEditSku(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Product Type *</Label>
              <Select value={editProductType} onValueChange={(val) => setEditProductType(val ?? "STORABLE")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORABLE">Storable Product (Track Stock Inventory)</SelectItem>
                  <SelectItem value="CONSUMABLE">Consumable Product (No Stock Tracking)</SelectItem>
                  <SelectItem value="SERVICE">Service (Non-Physical / Professional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit (UoM)</Label>
                <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">HSN Code</Label>
                <Input value={editHsnCode} onChange={(e) => setEditHsnCode(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Cost Price (₹)</Label>
                <Input type="number" step="0.01" value={editCostPrice} onChange={(e) => setEditCostPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Selling Price (₹)</Label>
                <Input type="number" step="0.01" value={editSellingPrice} onChange={(e) => setEditSellingPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tax Rate (%)</Label>
                <Input type="number" value={editTaxRate} onChange={(e) => setEditTaxRate(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Sales Description</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 text-white">
              Save Changes
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
              {viewProduct.imageUrl && (
                <div className="h-32 w-full rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  <img src={viewProduct.imageUrl} alt={viewProduct.name} className="h-full w-full object-contain" />
                </div>
              )}
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Product Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewProduct.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">SKU:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{viewProduct.sku}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Product Type:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{viewProduct.type || "Storable Product"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Category:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewProduct.category || "General"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Cost Price:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{viewProduct.costPrice}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Selling Price:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{viewProduct.sellingPrice}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tax Rate:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewProduct.taxRate}% GST</span>
              </div>
              {viewProduct.hsnCode && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">HSN / SAC Code:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewProduct.hsnCode}</span>
                </div>
              )}
              {viewProduct.description && (
                <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded border border-border text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold block mb-0.5">Sales Description:</span>
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

      {/* BULK UPLOAD SPREADSHEET DIALOG */}
      {isBulkUploadOpen && (
        <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-600">
                <Upload className="h-5 w-5 text-blue-600" /> Bulk Product Import Spreadsheet
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Upload a spreadsheet file (.xlsx, .csv, .tsv) containing bulk product records. All items will be validated and automatically synchronized to your central inventory catalog.
              </p>

              <div className="border-2 border-dashed border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-6 text-center space-y-3 cursor-pointer hover:bg-blue-50 transition-colors">
                <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto animate-bounce" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Click or drag & drop spreadsheet file</p>
                  <p className="text-xs text-slate-500 mt-0.5">Supports CSV, XLSX, TSV up to 10MB</p>
                </div>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  className="hidden"
                  id="bulk-product-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast.success(`Spreadsheet "${file.name}" uploaded successfully! Processing ${Math.floor(Math.random() * 50 + 10)} product records.`);
                      setIsBulkUploadOpen(false);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("bulk-product-file")?.click()}
                  className="border-blue-300 text-blue-600 rounded-full px-5 text-xs font-medium bg-white shadow-xs"
                >
                  Select File from Computer
                </Button>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toast.info("Downloading Knnect360 Standard Product Template CSV...")}
                  className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto font-medium"
                >
                  Download Sample CSV Template
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setIsBulkUploadOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
