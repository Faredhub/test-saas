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
import { Plus, Search, Layers, Pencil, Eye, Trash2, Tag, CheckCircle2, List, LayoutGrid, Box, Clock, Image as ImageIcon, X } from "lucide-react";
import { createProductVariant, deleteProductVariant } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface Variant {
  id: string;
  sku: string;
  name: string;
  attribute1?: string | null;
  attribute2?: string | null;
  attribute3?: string | null;
  priceOffset: number;
  stockQuantity: number;
  barcode?: string | null;
  imageUrl?: string | null;
  product: { id: string; name: string; sku: string };
}

interface ProductRef {
  id: string;
  name: string;
  sku: string;
}

interface Props {
  initialVariants: Variant[];
  products: ProductRef[];
}

export function VariantsClient({ initialVariants, products }: Props) {
  const [variantsList, setVariantsList] = useState<Variant[]>(initialVariants);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list" | "activity">("cards");
  const [isOpen, setIsOpen] = useState(false);
  const [viewVariant, setViewVariant] = useState<Variant | null>(null);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Form State
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [attribute1, setAttribute1] = useState("");
  const [attribute2, setAttribute2] = useState("");
  const [attribute3, setAttribute3] = useState("");
  const [priceOffset, setPriceOffset] = useState("0");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editAttribute1, setEditAttribute1] = useState("");
  const [editAttribute2, setEditAttribute2] = useState("");
  const [editAttribute3, setEditAttribute3] = useState("");
  const [editPriceOffset, setEditPriceOffset] = useState("0");
  const [editStockQuantity, setEditStockQuantity] = useState("0");
  const [editBarcode, setEditBarcode] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

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
      toast.success("Variant image uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEdit = (v: Variant) => {
    setEditVariant(v);
    setEditName(v.name);
    setEditSku(v.sku);
    setEditAttribute1(v.attribute1 || "");
    setEditAttribute2(v.attribute2 || "");
    setEditAttribute3(v.attribute3 || "");
    setEditPriceOffset(String(v.priceOffset));
    setEditStockQuantity(String(v.stockQuantity));
    setEditBarcode(v.barcode || "");
    setEditImageUrl(v.imageUrl || "");
  };

  const handleSaveEdit = () => {
    if (!editVariant) return;
    setVariantsList((prev) =>
      prev.map((v) =>
        v.id === editVariant.id
          ? {
              ...v,
              name: editName,
              sku: editSku,
              attribute1: editAttribute1 || null,
              attribute2: editAttribute2 || null,
              attribute3: editAttribute3 || null,
              priceOffset: parseFloat(editPriceOffset) || 0,
              stockQuantity: parseInt(editStockQuantity) || 0,
              barcode: editBarcode || null,
              imageUrl: editImageUrl || null,
            }
          : v
      )
    );
    toast.success(`Variant ${editName} updated successfully`);
    setEditVariant(null);
  };

  const filteredVariants = variantsList.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.product.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!productId || !name.trim() || !sku.trim()) {
      toast.error("Parent product, Variant Name, and SKU are required");
      return;
    }

    startTransition(async () => {
      try {
        await createProductVariant({
          productId,
          sku: sku.trim(),
          name: name.trim(),
          attribute1: attribute1.trim() || undefined,
          attribute2: attribute2.trim() || undefined,
          attribute3: attribute3.trim() || undefined,
          priceOffset: parseFloat(priceOffset) || 0,
          stockQuantity: parseInt(stockQuantity) || 0,
          barcode: barcode.trim() || undefined,
        });
        toast.success("Product Variant created successfully");
        setIsOpen(false);
        setSku("");
        setName("");
        setAttribute1("");
        setAttribute2("");
        setAttribute3("");
        setPriceOffset("0");
        setStockQuantity("0");
        setBarcode("");
      } catch (err: any) {
        toast.error(err?.message || "Failed to create variant");
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete variant ${name}?`)) return;
    startTransition(async () => {
      try {
        await deleteProductVariant(id);
        toast.success(`Deleted variant ${name}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete variant");
      }
    });
  };

  return (
    <div className="p-6 space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Product Variants
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage product variations (Size, Color, Material, Capacity) from single product templates.
          </p>
        </div>

        <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
          <Plus className="h-4 w-4 mr-2" /> Add Product Variant
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Variants</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{initialVariants.length}</p>
            </div>
            <Layers className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Product Templates</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{products.length}</p>
            </div>
            <Tag className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Variant Stock</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {initialVariants.reduce((sum, v) => sum + v.stockQuantity, 0)} units
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Search Bar & 3-Style View Switcher (Cards | List | Activity) */}
      <Card className="bg-card text-card-foreground border border-border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search by variant name, SKU, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Exact 3-Style View Switcher Pill Matching User Image */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-inner self-end sm:self-auto">
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
          {filteredVariants.map((v) => (
            <Card key={v.id} className="group relative overflow-hidden border border-border hover:shadow-md cursor-pointer transition-all p-4 space-y-3 bg-card" onClick={() => setViewVariant(v)}>
              <div className="flex items-start justify-between gap-2">
                <div className="h-14 w-14 rounded-lg border bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 flex items-center justify-center overflow-hidden shrink-0">
                  {v.imageUrl ? (
                    <img src={v.imageUrl} alt={v.name} className="h-full w-full object-cover" />
                  ) : (
                    <Box className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <Badge variant="outline" className="font-mono text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200">
                  {v.sku}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                  {v.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {v.product.name}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                {v.attribute1 && <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 text-[10px]">{v.attribute1}</Badge>}
                {v.attribute2 && <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 text-[10px]">{v.attribute2}</Badge>}
                {v.attribute3 && <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 text-[10px]">{v.attribute3}</Badge>}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                <div>
                  <span className="text-muted-foreground font-normal">Stock: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{v.stockQuantity} units</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewVariant(v)} title="View Info" className="h-7 w-7 text-blue-600">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(v)} title="Edit Variant" className="h-7 w-7 text-slate-800 dark:text-slate-200">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id, v.name)} disabled={isPending} title="Delete Variant" className="h-7 w-7 text-red-600">
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
        <Card className="bg-card text-card-foreground border border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Variants Directory ({filteredVariants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Variant SKU</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Variant Name</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Parent Product</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Attributes</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Price Offset</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Variant Stock</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      No product variants configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVariants.map((variant) => (
                    <TableRow key={variant.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border cursor-pointer" onClick={() => setViewVariant(variant)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="h-8 w-8 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {variant.imageUrl ? (
                            <img src={variant.imageUrl} alt={variant.name} className="h-full w-full object-cover" />
                          ) : (
                            <Box className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-blue-600 dark:text-blue-400">{variant.sku}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{variant.name}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{variant.product.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {variant.attribute1 && <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">{variant.attribute1}</Badge>}
                          {variant.attribute2 && <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">{variant.attribute2}</Badge>}
                          {variant.attribute3 && <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">{variant.attribute3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                        {variant.priceOffset >= 0 ? `+$${variant.priceOffset}` : `-$${Math.abs(variant.priceOffset)}`}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{variant.stockQuantity} units</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            title="View Variant"
                            onClick={() => setViewVariant(variant)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Edit Variant"
                            onClick={() => handleOpenEdit(variant)}
                            className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete Variant"
                            onClick={() => handleDelete(variant.id, variant.name)}
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
              <Clock className="h-5 w-5 text-purple-600" /> Recent Variant Adjustments & Stock Logs
            </h2>
            <Badge variant="outline" className="font-mono text-xs">Live System Log</Badge>
          </div>

          <div className="space-y-4">
            {filteredVariants.map((v, idx) => (
              <div key={v.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/40 border text-xs">
                <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                  #{idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{v.name} [{v.sku}]</span>
                    <span className="text-[11px] text-muted-foreground font-mono">Today, 11:15 AM</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Variant generated for parent product <strong className="text-slate-900 dark:text-white">{v.product.name}</strong>. Stock level registered at <strong className="text-emerald-600">{v.stockQuantity} units</strong>.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CREATE VARIANT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Add Product Variant</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Image File Upload for Variant */}
            <div className="space-y-2 border-b pb-3">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-600" /> Variant Image (Upload File or Enter URL)
              </Label>

              {imageUrl ? (
                <div className="relative h-20 w-20 rounded-lg border bg-muted overflow-hidden group">
                  <img src={imageUrl} alt="Variant Preview" className="h-full w-full object-cover" />
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

            <div>
              <Label className="text-xs font-semibold">Parent Product *</Label>
              <Select value={productId} onValueChange={(val) => setProductId(val ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select parent product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Variant Name *</Label>
                <Input
                  placeholder="e.g. Red / Large"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Variant SKU *</Label>
                <Input
                  placeholder="VAR-RED-L"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Attr 1 (Size)</Label>
                <Input placeholder="Large" value={attribute1} onChange={(e) => setAttribute1(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Attr 2 (Color)</Label>
                <Input placeholder="Red" value={attribute2} onChange={(e) => setAttribute2(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Attr 3 (Model)</Label>
                <Input placeholder="V2" value={attribute3} onChange={(e) => setAttribute3(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Price Offset ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceOffset}
                  onChange={(e) => setPriceOffset(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Stock Quantity</Label>
                <Input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Barcode / EAN</Label>
              <Input placeholder="890123456789" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending} className="bg-blue-600 text-white">
              Create Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW VARIANT DIALOG */}
      <Dialog open={!!viewVariant} onOpenChange={() => setViewVariant(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Variant Details
            </DialogTitle>
          </DialogHeader>

          {viewVariant && (
            <div className="space-y-3 py-2 text-sm">
              {viewVariant.imageUrl && (
                <div className="h-28 w-full rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                  <img src={viewVariant.imageUrl} alt={viewVariant.name} className="h-full w-full object-contain" />
                </div>
              )}
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Variant Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVariant.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">SKU:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{viewVariant.sku}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Parent Product:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVariant.product.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Price Offset:</span>
                <span className="font-bold text-slate-900 dark:text-white">${viewVariant.priceOffset}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Stock On Hand:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewVariant.stockQuantity} units</span>
              </div>
              {viewVariant.barcode && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Barcode:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewVariant.barcode}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewVariant(null)} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT VARIANT DIALOG */}
      <Dialog open={!!editVariant} onOpenChange={() => setEditVariant(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Edit Product Variant
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Edit Variant Image Upload */}
            <div className="space-y-2 border-b pb-3">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-600" /> Variant Image (Upload File or Enter URL)
              </Label>

              {editImageUrl ? (
                <div className="relative h-20 w-20 rounded-lg border bg-muted overflow-hidden group">
                  <img src={editImageUrl} alt="Variant Preview" className="h-full w-full object-cover" />
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
                <Label className="text-xs font-semibold">Variant Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Variant SKU *</Label>
                <Input value={editSku} onChange={(e) => setEditSku(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold">Attr 1 (Size)</Label>
                <Input value={editAttribute1} onChange={(e) => setEditAttribute1(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Attr 2 (Color)</Label>
                <Input value={editAttribute2} onChange={(e) => setEditAttribute2(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Attr 3 (Model)</Label>
                <Input value={editAttribute3} onChange={(e) => setEditAttribute3(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Price Offset ($)</Label>
                <Input type="number" step="0.01" value={editPriceOffset} onChange={(e) => setEditPriceOffset(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Stock Quantity</Label>
                <Input type="number" value={editStockQuantity} onChange={(e) => setEditStockQuantity(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Barcode / EAN</Label>
              <Input value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVariant(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
