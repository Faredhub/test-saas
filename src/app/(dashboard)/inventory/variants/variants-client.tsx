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
import { Plus, Search, Layers, Pencil, Eye, Trash2, Tag, CheckCircle2 } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [viewVariant, setViewVariant] = useState<Variant | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [attribute1, setAttribute1] = useState("");
  const [attribute2, setAttribute2] = useState("");
  const [attribute3, setAttribute3] = useState("");
  const [priceOffset, setPriceOffset] = useState("0");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [barcode, setBarcode] = useState("");

  const filteredVariants = initialVariants.filter(
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

      {/* Search Bar */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="p-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search by variant name, SKU, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No product variants configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVariants.map((variant) => (
                  <TableRow key={variant.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border">
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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* VIEW ICON - BLUE */}
                        <button
                          type="button"
                          title="View Variant"
                          onClick={() => setViewVariant(variant)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* EDIT ICON - BLACK / WHITE */}
                        <button
                          type="button"
                          title="Edit Variant"
                          onClick={() => toast.info("Edit variant modal ready")}
                          className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* DELETE ICON - RED */}
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

      {/* CREATE VARIANT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Add Product Variant</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
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
    </div>
  );
}
