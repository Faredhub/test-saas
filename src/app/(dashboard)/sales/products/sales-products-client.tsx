"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Search, Loader2, Pencil, Trash2, LayoutGrid, List, Clock, Star, Package, Layers, Sparkles, Filter, Download, Upload, Eye, CheckSquare, Phone, Mail, Calendar, FileText, CheckCircle2, ShieldCheck, Tag, Box, ArrowUpDown,
} from "lucide-react";
import { createProduct, updateProduct, deleteProduct, getProducts } from "@/lib/actions/inventory";
import { toast } from "sonner";

type Product = any;

type Props = {
  initialProducts: Product[];
  categories: string[];
  warehouses: any[];
};

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);
}

export function SalesProductsClient({ initialProducts, categories, warehouses }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "activity">("kanban");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [productType, setProductType] = useState<"STORABLE" | "CONSUMABLE" | "SERVICE">("STORABLE");
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("PCS");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Product Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variantSizes, setVariantSizes] = useState("S, M, L, XL");
  const [variantColors, setVariantColors] = useState("Black, Blue, White");
  const [variantMaterial, setVariantMaterial] = useState("Steel");

  function resetForm() {
    setName("");
    setSku("");
    setProductType("STORABLE");
    setCategory("General");
    setUnit("PCS");
    setCostPrice(0);
    setSellingPrice(0);
    setTaxRate(18);
    setDescription("");
    setImageUrl("");
    setHasVariants(false);
    setEditId(null);
  }

  function handleOpenCreate() {
    resetForm();
    setIsOpen(true);
  }

  function handleOpenEdit(prod: Product) {
    setEditId(prod.id);
    setName(prod.name);
    setSku(prod.sku);
    setProductType((prod as any).type || "STORABLE");
    setCategory(prod.category || "General");
    setUnit(prod.unit || "PCS");
    setCostPrice(Number(prod.costPrice) || 0);
    setSellingPrice(Number(prod.sellingPrice) || 0);
    setTaxRate(Number(prod.taxRate) || 18);
    setDescription(prod.description || "");
    setImageUrl((prod as any).imageUrl || "");
    setIsOpen(true);
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
    toast.success("Updated favorite products");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Product name is required");

    startTransition(async () => {
      try {
        const payload = {
          name,
          sku: sku || `SKU-${Date.now().toString().slice(-5)}`,
          type: productType,
          category,
          unit,
          costPrice,
          sellingPrice,
          taxRate,
          description,
          imageUrl,
          variantsCount: hasVariants ? (variantSizes.split(",").length * variantColors.split(",").length) : 0,
        };

        if (editId) {
          await updateProduct(editId, payload as any);
          toast.success("Product updated successfully");
        } else {
          await createProduct(payload as any);
          toast.success("New product & variants created!");
        }

        const fresh: any = await getProducts();
        setProducts(Array.isArray(fresh) ? fresh : fresh?.data || []);
        setIsOpen(false);
        resetForm();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save product");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    startTransition(async () => {
      try {
        await deleteProduct(id);
        toast.success("Product removed");
        const fresh: any = await getProducts();
        setProducts(Array.isArray(fresh) ? fresh : fresh?.data || []);
      } catch (err) {
        toast.error("Failed to delete product");
      }
    });
  }

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "ALL" || p.category === categoryFilter;
    const matchType = typeFilter === "ALL" || (p as any).type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Products & Variants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create storable, consumable & service products with multi-attribute variant matrix generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher Top Right (Kanban, List, Activity) */}
          <div className="flex items-center bg-muted p-1 rounded-lg border text-xs gap-1">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="gap-1 text-xs h-8"
              title="Kanban Card View"
            >
              <LayoutGrid className="h-4 w-4" /> Cards
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1 text-xs h-8"
              title="List Table View"
            >
              <List className="h-4 w-4" /> List
            </Button>
            <Button
              variant={viewMode === "activity" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("activity")}
              className="gap-1 text-xs h-8"
              title="Activity Matrix View"
            >
              <Clock className="h-4 w-4" /> Activity
            </Button>
          </div>

          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> New Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Product Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Product Types</SelectItem>
              <SelectItem value="STORABLE">Storable Product</SelectItem>
              <SelectItem value="CONSUMABLE">Consumable Product</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW MODE 1: KANBAN CARDS GRID (Matches user screenshot 2) */}
      {/* ==================================================================== */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const isFav = favorites[product.id];
            const variantsCount = (product as any).variantsCount || 0;
            return (
              <Card key={product.id} className="group relative overflow-hidden hover:shadow-md transition-all border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className="text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                    <div className="h-16 w-16 rounded-md bg-muted/60 border flex items-center justify-center overflow-hidden">
                      {(product as any).imageUrl ? (
                        <img src={(product as any).imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Box className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      [{product.sku}]
                    </p>
                  </div>

                  {variantsCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700 border">
                      {variantsCount} Variants
                    </Badge>
                  )}

                  <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="text-slate-500 font-normal">Price: </span>
                      <span className="font-mono text-emerald-600">{formatINR(Number(product.sellingPrice))}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">On hand: </span>
                      <span className="font-mono text-blue-600">{product.stockQuantity ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(product)}
                      className="h-7 w-7 text-slate-700 hover:bg-slate-100"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product.id)}
                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW MODE 2: TABLE LIST VIEW (Matches user screenshot 3) */}
      {/* ==================================================================== */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><CheckSquare className="h-4 w-4 text-muted-foreground" /></TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Internal Reference (SKU)</TableHead>
                  <TableHead className="text-right">Sales Price</TableHead>
                  <TableHead className="text-right">Sales Taxes</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Forecasted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell><input type="checkbox" className="rounded border-slate-300" /></TableCell>
                    <TableCell>
                      <button onClick={() => toggleFavorite(p.id)} className="text-slate-400 hover:text-amber-500">
                        <Star className={`h-4 w-4 ${favorites[p.id] ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">{formatINR(Number(p.sellingPrice))}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.taxRate}%</TableCell>
                    <TableCell className="text-right font-mono text-blue-600 font-semibold">{p.stockQuantity ?? 0}</TableCell>
                    <TableCell className="text-right font-mono text-purple-600">{(p.stockQuantity ?? 0) + 10}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)} className="h-8 w-8 text-black hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* VIEW MODE 3: ACTIVITY MATRIX VIEW (Matches user screenshot 4) */}
      {/* ==================================================================== */}
      {viewMode === "activity" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Product</TableHead>
                  <TableHead className="text-center">To-Do</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">Call</TableHead>
                  <TableHead className="text-center">Meeting</TableHead>
                  <TableHead className="text-center">Document</TableHead>
                  <TableHead className="text-center">Request Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-xs">
                      <div>{p.name}</div>
                      <span className="font-mono text-[10px] text-muted-foreground">[{p.sku}]</span>
                    </TableCell>
                    <TableCell className="text-center"><CheckSquare className="h-4 w-4 mx-auto text-slate-300 hover:text-blue-500 cursor-pointer" /></TableCell>
                    <TableCell className="text-center"><Mail className="h-4 w-4 mx-auto text-slate-300 hover:text-amber-500 cursor-pointer" /></TableCell>
                    <TableCell className="text-center"><Phone className="h-4 w-4 mx-auto text-slate-300 hover:text-emerald-500 cursor-pointer" /></TableCell>
                    <TableCell className="text-center"><Calendar className="h-4 w-4 mx-auto text-slate-300 hover:text-purple-500 cursor-pointer" /></TableCell>
                    <TableCell className="text-center"><FileText className="h-4 w-4 mx-auto text-slate-300 hover:text-cyan-500 cursor-pointer" /></TableCell>
                    <TableCell className="text-center"><ShieldCheck className="h-4 w-4 mx-auto text-slate-300 hover:text-rose-500 cursor-pointer" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editId ? "Edit Product" : "Create Product & Variants"}</DialogTitle>
            <DialogDescription>Define product details, SKU, sales price, UoM, and variant matrix rules.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="prod-name">Product Name *</Label>
                <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Office Chair Ergonomic" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-sku">Product Code (SKU)</Label>
                <Input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. CONS_89957" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Select value={productType} onValueChange={(v: any) => setProductType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STORABLE">Storable Product</SelectItem>
                    <SelectItem value="CONSUMABLE">Consumable Product</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Furniture" />
              </div>

              <div className="space-y-2">
                <Label>Unit of Measure (UoM)</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="PCS, KG, LTR, MTR" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sales Price (₹)</Label>
                <Input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} />
              </div>

              <div className="space-y-2">
                <Label>Cost Price (₹)</Label>
                <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
              </div>

              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              </div>
            </div>

            {/* Product Image URL with Live Thumbnail Preview */}
            <div className="space-y-2">
              <Label htmlFor="prod-img">Product Image URL</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md border bg-muted/60 flex items-center justify-center overflow-hidden shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Product preview" className="h-full w-full object-cover" />
                  ) : (
                    <Box className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="prod-img"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1505740420928-5e560c06d30e"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Product Variants Matrix Generator */}
            <div className="p-3 border rounded-md bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" /> Automatic Variant Generation
                </Label>
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
              </div>

              {hasVariants && (
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <Label className="text-[11px]">Size Attributes (comma separated)</Label>
                    <Input value={variantSizes} onChange={(e) => setVariantSizes(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Color Attributes (comma separated)</Label>
                    <Input value={variantColors} onChange={(e) => setVariantColors(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-desc">Sales Description</Label>
              <Textarea id="prod-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detailed product specifications for client proposals..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
