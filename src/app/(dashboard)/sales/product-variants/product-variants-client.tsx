"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Star, Layers, List, LayoutGrid, Trash2, Pencil, CheckSquare, Box, ArrowUpDown, Eye } from "lucide-react";
import { toast } from "sonner";

type Props = {
  products: any[];
};

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  website: string;
  variantValues: { attribute: string; value: string }[];
  salesPrice: number;
  costPrice: number;
  onHand: number;
  forecasted: number;
  imageUrl?: string;
}

const initialVariants: ProductVariant[] = [
  {
    id: "pv-1",
    sku: "CONS_0001",
    name: "Whiteboard Pen",
    website: "My Website",
    variantValues: [],
    salesPrice: 1.20,
    costPrice: 0.00,
    onHand: 150,
    forecasted: 140,
  },
  {
    id: "pv-2",
    sku: "CONS_25630",
    name: "Screw",
    website: "My Website",
    variantValues: [],
    salesPrice: 0.20,
    costPrice: 0.10,
    onHand: 5000,
    forecasted: 4800,
  },
  {
    id: "pv-3",
    sku: "CONS_89957",
    name: "Bolt",
    website: "My Website",
    variantValues: [],
    salesPrice: 0.50,
    costPrice: 0.50,
    onHand: 2000,
    forecasted: 2000,
  },
  {
    id: "pv-4",
    sku: "DESK0005",
    name: "Customizable Desk",
    website: "My Website",
    variantValues: [
      { attribute: "Color", value: "White" },
      { attribute: "Legs", value: "Custom" },
    ],
    salesPrice: 750.00,
    costPrice: 400.00,
    onHand: 65.00,
    forecasted: 63.00,
  },
  {
    id: "pv-5",
    sku: "DESK0006",
    name: "Customizable Desk",
    website: "My Website",
    variantValues: [
      { attribute: "Color", value: "Black" },
      { attribute: "Legs", value: "Custom" },
    ],
    salesPrice: 750.00,
    costPrice: 400.00,
    onHand: 70.00,
    forecasted: 70.00,
  },
  {
    id: "pv-6",
    sku: "D_0045_G",
    name: "Stool",
    website: "My Website",
    variantValues: [{ attribute: "Color", value: "Green" }],
    salesPrice: 500.00,
    costPrice: 250.00,
    onHand: 12.00,
    forecasted: 10.00,
  },
  {
    id: "pv-7",
    sku: "D_0045_GR",
    name: "Stool",
    website: "My Website",
    variantValues: [{ attribute: "Color", value: "Gray" }],
    salesPrice: 500.00,
    costPrice: 250.00,
    onHand: 8.00,
    forecasted: 8.00,
  },
  {
    id: "pv-8",
    sku: "D_0045_N",
    name: "Stool",
    website: "My Website",
    variantValues: [{ attribute: "Color", value: "Navy" }],
    salesPrice: 500.00,
    costPrice: 250.00,
    onHand: 15.00,
    forecasted: 15.00,
  },
  {
    id: "pv-9",
    sku: "E-COM12",
    name: "Conference Chair",
    website: "My Website",
    variantValues: [{ attribute: "Legs", value: "Steel" }],
    salesPrice: 33.00,
    costPrice: 20.00,
    onHand: 26.00,
    forecasted: 26.00,
  },
  {
    id: "pv-10",
    sku: "E-COM13",
    name: "Conference Chair",
    website: "My Website",
    variantValues: [{ attribute: "Legs", value: "Aluminium" }],
    salesPrice: 39.40,
    costPrice: 25.00,
    onHand: 40.00,
    forecasted: 38.00,
  },
];

export function ProductVariantsClient({ products }: Props) {
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  // View & Edit dialog states
  const [viewVariant, setViewVariant] = useState<ProductVariant | null>(null);
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);

  // Edit fields state
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editWebsite, setEditWebsite] = useState("My Website");
  const [editSalesPrice, setEditSalesPrice] = useState(100);
  const [editCostPrice, setEditCostPrice] = useState(50);
  const [editOnHand, setEditOnHand] = useState(10);
  const [editAttributeStr, setEditAttributeStr] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [website, setWebsite] = useState("My Website");
  const [salesPrice, setSalesPrice] = useState(100);
  const [costPrice, setCostPrice] = useState(50);
  const [onHand, setOnHand] = useState(10);
  const [attributeStr, setAttributeStr] = useState("Color: Blue, Size: XL");
  const [imageUrl, setImageUrl] = useState("");

  function toggleFavorite(id: string) {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
    toast.success("Updated favorite variants");
  }

  function toggleSelectAll() {
    if (Object.keys(selectedItems).length === variants.length) {
      setSelectedItems({});
    } else {
      const all: Record<string, boolean> = {};
      variants.forEach((v) => { all[v.id] = true; });
      setSelectedItems(all);
    }
  }

  function toggleSelectItem(id: string) {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleOpenEdit(v: ProductVariant) {
    setEditVariant(v);
    setEditName(v.name);
    setEditSku(v.sku);
    setEditWebsite(v.website || "My Website");
    setEditSalesPrice(v.salesPrice);
    setEditCostPrice(v.costPrice);
    setEditOnHand(v.onHand);
    setEditAttributeStr(v.variantValues.map((vv) => `${vv.attribute}: ${vv.value}`).join(", "));
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editVariant) return;

    const parsedValues = editAttributeStr.split(",").map((s) => {
      const parts = s.split(":");
      return {
        attribute: parts[0]?.trim() || "Attribute",
        value: parts[1]?.trim() || parts[0]?.trim() || "Default",
      };
    });

    setVariants((prev) =>
      prev.map((v) =>
        v.id === editVariant.id
          ? {
              ...v,
              name: editName,
              sku: editSku,
              website: editWebsite,
              salesPrice: editSalesPrice,
              costPrice: editCostPrice,
              onHand: editOnHand,
              forecasted: editOnHand,
              variantValues: parsedValues,
            }
          : v
      )
    );
    toast.success("Product variant updated successfully!");
    setEditVariant(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Variant name is required");

    const parsedValues = attributeStr.split(",").map((s) => {
      const parts = s.split(":");
      return {
        attribute: parts[0]?.trim() || "Attribute",
        value: parts[1]?.trim() || parts[0]?.trim() || "Default",
      };
    });

    const newVariant: ProductVariant = {
      id: `pv-${Date.now()}`,
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      name,
      website,
      variantValues: parsedValues,
      salesPrice,
      costPrice,
      onHand,
      forecasted: onHand,
      imageUrl,
    };

    setVariants([newVariant, ...variants]);
    toast.success("Product variant created!");
    setIsOpen(false);
    setName("");
    setSku("");
  }

  function handleDelete(id: string) {
    setVariants(variants.filter((v) => v.id !== id));
    toast.success("Product variant removed");
  }

  const filteredVariants = variants.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.sku.toLowerCase().includes(search.toLowerCase()) ||
    v.variantValues.some((vv) => vv.value.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Product Variants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage SKU-level product variants, attribute values, cost prices, on-hand inventory & forecasts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Top Right View Mode Switcher */}
          <div className="flex items-center bg-muted p-1 rounded-lg border text-xs gap-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1 text-xs h-8"
              title="List View"
            >
              <List className="h-4 w-4" /> List
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="gap-1 text-xs h-8"
              title="Kanban Cards View"
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </Button>
          </div>

          <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> New Variant
          </Button>
        </div>
      </div>

      {/* Filter Bar with Search */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variant SKU, name, attribute..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          1-{filteredVariants.length} / {filteredVariants.length}
        </div>
      </div>

      {/* VIEW MODE 1: LIST VIEW TABLE */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={Object.keys(selectedItems).length > 0 && Object.keys(selectedItems).length === variants.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Internal Reference</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Name</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Website</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Variant Values</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Sales Price</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Cost</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">On Hand</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Forecasted</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => setViewVariant(v)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selectedItems[v.id]}
                        onChange={() => toggleSelectItem(v.id)}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleFavorite(v.id)} className="text-slate-400 hover:text-amber-500">
                        <Star className={`h-4 w-4 ${favorites[v.id] ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-sm text-slate-700">{v.sku}</TableCell>
                    <TableCell className="font-bold text-slate-900">{v.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.website}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {v.variantValues.map((vv, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] px-2">
                            {vv.attribute}: {vv.value}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      ₹{v.salesPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      ₹{v.costPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-blue-600">
                      {v.onHand.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-purple-600">
                      {v.forecasted.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewVariant(v)}
                          title="View General Information"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(v)}
                          title="Edit Variant"
                          className="h-8 w-8 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(v.id)}
                          title="Delete Variant"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                        >
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

      {/* VIEW MODE 2: KANBAN CARDS GRID */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredVariants.map((v) => (
            <Card key={v.id} className="group relative overflow-hidden border hover:shadow-md cursor-pointer transition-all p-4 space-y-3" onClick={() => setViewVariant(v)}>
              <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => toggleFavorite(v.id)} className="text-slate-400 hover:text-amber-500">
                  <Star className={`h-4 w-4 ${favorites[v.id] ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
                <div className="h-14 w-14 rounded-md border bg-muted/60 flex items-center justify-center overflow-hidden shrink-0">
                  {v.imageUrl ? (
                    <img src={v.imageUrl} alt={v.name} className="h-full w-full object-cover" />
                  ) : (
                    <Box className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {v.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  [{v.sku}]
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                {v.variantValues.map((vv, idx) => (
                  <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
                    {vv.attribute}: {vv.value}
                  </Badge>
                ))}
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                <div>
                  <span className="text-muted-foreground font-normal">Price: </span>
                  <span className="font-mono text-emerald-600">₹{v.salesPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewVariant(v)} title="View Info" className="h-7 w-7 text-blue-600">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(v)} title="Edit Variant" className="h-7 w-7 text-slate-800 dark:text-slate-200">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} title="Delete Variant" className="h-7 w-7 text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW VARIANT GENERAL INFORMATION DIALOG */}
      {viewVariant && (
        <Dialog open={!!viewVariant} onOpenChange={(open) => { if (!open) setViewVariant(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
                <span>{viewVariant.name}</span>
                <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-200">{viewVariant.sku}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="bg-muted/30 rounded-lg p-3 border space-y-3 text-sm">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-purple-600" /> General Product Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Product Name:</span> <p className="font-bold text-slate-900">{viewVariant.name}</p></div>
                  <div><span className="text-muted-foreground">Internal Reference (SKU):</span> <p className="font-mono font-semibold">{viewVariant.sku}</p></div>
                  <div><span className="text-muted-foreground">Product Type:</span> <p className="font-semibold text-slate-800">Storable Product</p></div>
                  <div><span className="text-muted-foreground">Category:</span> <p className="font-semibold text-slate-800">General / Office Supplies</p></div>
                  <div><span className="text-muted-foreground">Sales Price:</span> <p className="font-mono font-bold text-emerald-600">₹{viewVariant.salesPrice.toFixed(2)}</p></div>
                  <div><span className="text-muted-foreground">Cost Price:</span> <p className="font-mono font-semibold text-slate-700">₹{viewVariant.costPrice.toFixed(2)}</p></div>
                  <div><span className="text-muted-foreground">Tax Rate:</span> <p className="font-semibold text-slate-800">18.00% GST</p></div>
                  <div><span className="text-muted-foreground">Unit of Measure (UoM):</span> <p className="font-semibold text-slate-800">PCS (Units)</p></div>
                  <div><span className="text-muted-foreground">Website:</span> <p className="font-semibold text-blue-600">{viewVariant.website}</p></div>
                  <div><span className="text-muted-foreground">On Hand Stock:</span> <p className="font-mono font-bold text-blue-600">{viewVariant.onHand.toFixed(2)} PCS</p></div>
                </div>
              </div>

              {/* Variant Attribute Values */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground">Variant Specific Attributes:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewVariant.variantValues.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Standard Default Variant</span>
                  ) : (
                    viewVariant.variantValues.map((vv, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-900 border-purple-300 text-xs px-2.5 py-0.5">
                        {vv.attribute}: {vv.value}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Sales Description */}
              <div className="text-xs space-y-1 border-t pt-2">
                <span className="font-semibold text-muted-foreground">Sales Description:</span>
                <p className="text-muted-foreground">Premium commercial product variant suitable for quotation line items and sales orders.</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => { handleOpenEdit(viewVariant); setViewVariant(null); }} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit Variant
              </Button>
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT VARIANT MODAL */}
      {editVariant && (
        <Dialog open={!!editVariant} onOpenChange={(open) => { if (!open) setEditVariant(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" /> Edit Product Variant
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Variant Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Internal Reference (SKU)</Label>
                <Input value={editSku} onChange={(e) => setEditSku(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Variant Attributes & Values (e.g. Color: White, Size: L)</Label>
                <Input value={editAttributeStr} onChange={(e) => setEditAttributeStr(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sales Price (₹)</Label>
                  <Input type="number" step="0.01" value={editSalesPrice} onChange={(e) => setEditSalesPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price (₹)</Label>
                  <Input type="number" step="0.01" value={editCostPrice} onChange={(e) => setEditCostPrice(Number(e.target.value))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>On Hand Stock Qty</Label>
                <Input type="number" value={editOnHand} onChange={(e) => setEditOnHand(Number(e.target.value))} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE VARIANT MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" /> New Product Variant
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Variant Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Customizable Desk" />
            </div>

            <div className="space-y-2">
              <Label>Internal Reference (SKU)</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. DESK0005" />
            </div>

            <div className="space-y-2">
              <Label>Variant Attributes & Values (e.g. Color: White, Size: L)</Label>
              <Input value={attributeStr} onChange={(e) => setAttributeStr(e.target.value)} placeholder="Color: White, Size: L" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sales Price (₹)</Label>
                <Input type="number" step="0.01" value={salesPrice} onChange={(e) => setSalesPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Cost Price (₹)</Label>
                <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>On Hand Qty</Label>
                <Input type="number" value={onHand} onChange={(e) => setOnHand(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Product Image URL</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Create Variant</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
