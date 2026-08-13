"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Search,
  Layers,
  Pencil,
  Eye,
  Trash2,
  Tag,
  CheckCircle2,
  List,
  LayoutGrid,
  Box,
  Clock,
  Image as ImageIcon,
  X,
  SlidersHorizontal,
  ShoppingBag,
  Zap,
  Sparkles,
  Palette,
  Ruler,
  Cpu,
  PackageCheck
} from "lucide-react";
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

interface ProductAttribute {
  id: string;
  name: string;
  displayType: "Color Swatch" | "Select Dropdown" | "Pill Buttons" | "Radio";
  values: string[];
  eCommerceFilterVisible: boolean;
  variantCreationMode: "AUTOMATIC" | "DYNAMIC";
  status: "ACTIVE" | "INACTIVE";
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
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);

  const [viewVariant, setViewVariant] = useState<Variant | null>(null);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);

  const [viewingAttribute, setViewingAttribute] = useState<ProductAttribute | null>(null);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);

  const [isPending, startTransition] = useTransition();

  // Create Form State (Variants)
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

  // Edit Form State (Variants)
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editAttribute1, setEditAttribute1] = useState("");
  const [editAttribute2, setEditAttribute2] = useState("");
  const [editAttribute3, setEditAttribute3] = useState("");
  const [editPriceOffset, setEditPriceOffset] = useState("0");
  const [editStockQuantity, setEditStockQuantity] = useState("0");
  const [editBarcode, setEditBarcode] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  // Attributes Rules State (with localStorage persistence)
  const [attributesList, setAttributesList] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tixel_product_attributes_list");
      if (saved) {
        try {
          setAttributesList(JSON.parse(saved));
          return;
        } catch (e) {}
      }
      const initial: ProductAttribute[] = [
        { id: "attr-1", name: "Color", displayType: "Color Swatch", values: ["Red", "Blue", "Black"], eCommerceFilterVisible: true, variantCreationMode: "AUTOMATIC", status: "ACTIVE" },
        { id: "attr-2", name: "Size", displayType: "Pill Buttons", values: ["S", "M", "L", "XL"], eCommerceFilterVisible: true, variantCreationMode: "AUTOMATIC", status: "ACTIVE" },
        { id: "attr-3", name: "Voltage", displayType: "Select Dropdown", values: ["230 V", "415 V"], eCommerceFilterVisible: true, variantCreationMode: "AUTOMATIC", status: "ACTIVE" },
        { id: "attr-4", name: "Capacity", displayType: "Select Dropdown", values: ["1 Ton", "2 Ton"], eCommerceFilterVisible: true, variantCreationMode: "AUTOMATIC", status: "ACTIVE" },
        { id: "attr-5", name: "Material", displayType: "Pill Buttons", values: ["Steel", "Aluminium"], eCommerceFilterVisible: true, variantCreationMode: "AUTOMATIC", status: "ACTIVE" },
      ];
      setAttributesList(initial);
      localStorage.setItem("tixel_product_attributes_list", JSON.stringify(initial));
    }
  }, []);

  const saveAttributesToStorage = (newList: ProductAttribute[]) => {
    setAttributesList(newList);
    if (typeof window !== "undefined") {
      localStorage.setItem("tixel_product_attributes_list", JSON.stringify(newList));
    }
  };

  // Create Attribute Form State
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValues, setNewAttrValues] = useState("");
  const [newAttrDisplay, setNewAttrDisplay] = useState<ProductAttribute["displayType"]>("Pill Buttons");
  const [newAttrEcomFilter, setNewAttrEcomFilter] = useState(true);

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

  const handleCreateAttributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrName.trim() || !newAttrValues.trim()) {
      toast.error("Attribute Name and Values are required");
      return;
    }

    const parsedValues = newAttrValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (parsedValues.length === 0) {
      toast.error("Please enter at least one attribute value");
      return;
    }

    const newAttr: ProductAttribute = {
      id: `attr-${Date.now()}`,
      name: newAttrName.trim(),
      displayType: newAttrDisplay,
      values: parsedValues,
      eCommerceFilterVisible: newAttrEcomFilter,
      variantCreationMode: "AUTOMATIC",
      status: "ACTIVE",
    };

    const updated = [...attributesList, newAttr];
    saveAttributesToStorage(updated);
    toast.success(`Attribute "${newAttrName}" created with ${parsedValues.length} variant values!`);
    setIsAttrModalOpen(false);
    setNewAttrName("");
    setNewAttrValues("");
  };

  const handleSaveEditAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttribute) return;
    const updated = attributesList.map((a) => (a.id === editingAttribute.id ? editingAttribute : a));
    saveAttributesToStorage(updated);
    toast.success(`Attribute "${editingAttribute.name}" updated successfully`);
    setEditingAttribute(null);
  };

  const handleDeleteAttribute = (attr: ProductAttribute) => {
    const updated = attributesList.filter((a) => a.id !== attr.id);
    saveAttributesToStorage(updated);
    toast.success(`Attribute "${attr.name}" deleted successfully`);
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
            <Layers className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Product Variants & Attributes Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Define product properties (Color, Size, Voltage, Capacity, Material) and automatically generate variant SKUs with eCommerce store filter visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAttrModalOpen(true)} variant="outline" className="gap-2 border-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-amber-600" /> Add Product Attribute
          </Button>
          <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2">
            <Plus className="h-4 w-4" /> Add Product Variant
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Product Attributes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{attributesList.length}</p>
            </div>
            <SlidersHorizontal className="h-8 w-8 text-amber-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Variants</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{initialVariants.length}</p>
            </div>
            <Layers className="h-8 w-8 text-blue-500 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Product Templates</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{products.length}</p>
            </div>
            <Tag className="h-8 w-8 text-indigo-500 opacity-80" />
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
            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs (Product Variants & Product Attributes) */}
      <Tabs defaultValue="attributes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="attributes" className="gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-600" /> Attributes & Values
          </TabsTrigger>
          <TabsTrigger value="variants" className="gap-2">
            <Layers className="h-4 w-4 text-blue-600" /> Product Variants Matrix
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PRODUCT ATTRIBUTES & VALUES (SPECIFICATION IMPLEMENTATION) */}
        <TabsContent value="attributes" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <SlidersHorizontal className="h-5 w-5 text-amber-600" /> Product Attributes Configuration & Filter Rules
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Define product characteristics (Color, Size, Voltage, Capacity, Material) to automatically generate variants from a single template and enable eCommerce store filter visibility.
                  </CardDescription>
                </div>

                <Button onClick={() => setIsAttrModalOpen(true)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Add Attribute
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Attribute Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Display Type</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Attribute Values (Variations)</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">eCommerce Store Filter</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Variant Generation</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributesList.map((attr) => (
                    <TableRow key={attr.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {attr.name === "Color" && <Palette className="h-4 w-4 text-rose-500" />}
                        {attr.name === "Size" && <Ruler className="h-4 w-4 text-blue-500" />}
                        {attr.name === "Voltage" && <Zap className="h-4 w-4 text-amber-500" />}
                        {attr.name === "Capacity" && <Cpu className="h-4 w-4 text-purple-500" />}
                        {attr.name === "Material" && <Box className="h-4 w-4 text-slate-500" />}
                        <span>{attr.name}</span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          {attr.displayType}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {attr.values.map((val, idx) => (
                            <Badge key={idx} variant="secondary" className="font-mono text-xs px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border">
                              {val}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {attr.eCommerceFilterVisible ? (
                          <Badge className="bg-emerald-100 text-emerald-800 gap-1">
                            <ShoppingBag className="h-3 w-3" /> VISIBLE (Store Filter)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">
                            HIDDEN
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          AUTOMATIC
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* VIEW BUTTON (BLUE) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingAttribute(attr)}
                            title="View Attribute Details"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* EDIT BUTTON (BLACK) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAttribute(attr)}
                            title="Edit Attribute"
                            className="h-8 w-8 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* DELETE BUTTON (RED) */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAttribute(attr)}
                            title="Delete Attribute"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
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
        </TabsContent>

        {/* TAB 2: PRODUCT VARIANTS MATRIX */}
        <TabsContent value="variants" className="space-y-4">
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

              {/* Exact 3-Style View Switcher Pill */}
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
                  <Clock className="h-4 w-4" /> Activity Log
                </button>
              </div>
            </CardContent>
          </Card>

          {/* VIEW MODE 1: CARDS */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVariants.map((v) => (
                <Card key={v.id} className="bg-card text-card-foreground border border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{v.name}</h3>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">SKU: {v.sku}</p>
                      </div>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {v.product.name}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {v.attribute1 && <Badge variant="secondary">{v.attribute1}</Badge>}
                      {v.attribute2 && <Badge variant="secondary">{v.attribute2}</Badge>}
                      {v.attribute3 && <Badge variant="secondary">{v.attribute3}</Badge>}
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between text-sm">
                      <div>
                        <span className="text-xs text-slate-500">On-Hand Stock: </span>
                        <span className="font-bold text-emerald-600">{v.stockQuantity} units</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewVariant(v)} className="h-8 w-8 text-blue-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(v)} className="h-8 w-8 text-slate-700 dark:text-slate-300">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id, v.name)} className="h-8 w-8 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* VIEW MODE 2: LIST TABLE */}
          {viewMode === "list" && (
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                      <TableHead>SKU</TableHead>
                      <TableHead>Variant Name</TableHead>
                      <TableHead>Parent Product</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Stock Qty</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVariants.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm font-bold text-blue-600">{v.sku}</TableCell>
                        <TableCell className="font-semibold">{v.name}</TableCell>
                        <TableCell className="text-xs">{v.product.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {[v.attribute1, v.attribute2, v.attribute3].filter(Boolean).map((a, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">{v.stockQuantity} units</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewVariant(v)} className="h-8 w-8 text-blue-600">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(v)} className="h-8 w-8 text-slate-700 dark:text-slate-300">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id, v.name)} className="h-8 w-8 text-red-600">
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

          {/* VIEW MODE 3: ACTIVITY LOG */}
          {viewMode === "activity" && (
            <Card className="border shadow-sm p-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" /> Variant Audit Trail & Movement History
              </CardTitle>
              <div className="space-y-4">
                {filteredVariants.map((v, idx) => (
                  <div key={v.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Variant <span className="font-mono text-blue-600">{v.sku}</span> ({v.name}) active in inventory.
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Assigned to product template "{v.product.name}". Initial stock set to {v.stockQuantity} units.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE ATTRIBUTE DIALOG */}
      {isAttrModalOpen && (
        <Dialog open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-600">
                <SlidersHorizontal className="h-5 w-5 text-amber-600" /> Add Product Attribute
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateAttributeSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attribute Name *</Label>
                <Input
                  placeholder="e.g. Color / Size / Voltage / Capacity / Material"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attribute Values (Comma Separated) *</Label>
                <Input
                  placeholder="e.g. Red, Blue, Black OR S, M, L, XL OR 230 V, 415 V"
                  value={newAttrValues}
                  onChange={(e) => setNewAttrValues(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Display Type</Label>
                  <select
                    value={newAttrDisplay}
                    onChange={(e) => setNewAttrDisplay(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Color Swatch">Color Swatch</option>
                    <option value="Pill Buttons">Pill Buttons</option>
                    <option value="Select Dropdown">Select Dropdown</option>
                    <option value="Radio">Radio Buttons</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">eCommerce Store Filter</Label>
                  <select
                    value={newAttrEcomFilter ? "true" : "false"}
                    onChange={(e) => setNewAttrEcomFilter(e.target.value === "true")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="true">VISIBLE (Show in Store Filters)</option>
                    <option value="false">HIDDEN (Internal ERP Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">Create Attribute</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* VIEW ATTRIBUTE DIALOG */}
      {viewingAttribute && (
        <Dialog open={!!viewingAttribute} onOpenChange={() => setViewingAttribute(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-600">
                <Eye className="h-5 w-5 text-blue-600" /> Attribute & Filter Visibility Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Attribute Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingAttribute.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Display Mode:</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800">{viewingAttribute.displayType}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Attribute Values:</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                  {viewingAttribute.values.map((v, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">{v}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">eCommerce Visibility:</span>
                {viewingAttribute.eCommerceFilterVisible ? (
                  <Badge className="bg-emerald-100 text-emerald-800">VISIBLE (Store Filter)</Badge>
                ) : (
                  <Badge variant="outline">HIDDEN</Badge>
                )}
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Variant Generation:</span>
                <Badge className="bg-blue-100 text-blue-800">AUTOMATIC</Badge>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT ATTRIBUTE DIALOG */}
      {editingAttribute && (
        <Dialog open={!!editingAttribute} onOpenChange={() => setEditingAttribute(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Pencil className="h-5 w-5 text-slate-800" /> Edit Attribute Configuration
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEditAttribute} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Attribute Name *</Label>
                <Input
                  value={editingAttribute.name}
                  onChange={(e) => setEditingAttribute({ ...editingAttribute, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Values (Comma Separated)</Label>
                <Input
                  value={editingAttribute.values.join(", ")}
                  onChange={(e) =>
                    setEditingAttribute({
                      ...editingAttribute,
                      values: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Display Type</Label>
                  <select
                    value={editingAttribute.displayType}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, displayType: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Color Swatch">Color Swatch</option>
                    <option value="Pill Buttons">Pill Buttons</option>
                    <option value="Select Dropdown">Select Dropdown</option>
                    <option value="Radio">Radio Buttons</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">eCommerce Store Filter</Label>
                  <select
                    value={editingAttribute.eCommerceFilterVisible ? "true" : "false"}
                    onChange={(e) => setEditingAttribute({ ...editingAttribute, eCommerceFilterVisible: e.target.value === "true" })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="true">VISIBLE (Show in Store Filters)</option>
                    <option value="false">HIDDEN (Internal ERP Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 font-semibold">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE VARIANT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" /> Create Product Variant
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Parent Product *</Label>
              <Select value={productId} onValueChange={(val) => setProductId(val || "")}>
                <SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Variant Name *</Label>
                <Input placeholder="e.g. Red / Large" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Variant SKU *</Label>
                <Input placeholder="e.g. PROD-RED-L" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Color / Attr 1</Label>
                <Input placeholder="e.g. Red" value={attribute1} onChange={(e) => setAttribute1(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Size / Attr 2</Label>
                <Input placeholder="e.g. XL" value={attribute2} onChange={(e) => setAttribute2(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Voltage / Attr 3</Label>
                <Input placeholder="e.g. 230V" value={attribute3} onChange={(e) => setAttribute3(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Stock Qty</Label>
                <Input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Barcode</Label>
                <Input placeholder="Optional barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isPending} className="bg-blue-600 text-white">
                {isPending ? "Creating..." : "Create Variant"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
