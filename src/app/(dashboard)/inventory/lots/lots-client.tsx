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
import { Plus, Search, QrCode, Pencil, Eye, Trash2, ShieldCheck, Activity } from "lucide-react";
import { createLotSerialNumber, deleteLotSerialNumber } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface LotSerial {
  id: string;
  number: string;
  type: "LOT" | "SERIAL";
  productId: string;
  product: { id: string; name: string; sku: string };
  variant?: { id: string; name: string; sku: string } | null;
  onHandQty: number;
  mfgDate?: string | null;
  expiryDate?: string | null;
  activities?: string | null;
  status: string;
  notes?: string | null;
}

interface ProductRef {
  id: string;
  name: string;
  sku: string;
}

interface Props {
  initialLots: LotSerial[];
  products: ProductRef[];
}

export function LotsClient({ initialLots, products }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isOpen, setIsOpen] = useState(false);
  const [viewLot, setViewLot] = useState<LotSerial | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [number, setNumber] = useState("");
  const [type, setType] = useState<"LOT" | "SERIAL">("LOT");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [onHandQty, setOnHandQty] = useState("10");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [activities, setActivities] = useState("Received into Central Warehouse");
  const [notes, setNotes] = useState("");

  const filteredLots = initialLots.filter((l) => {
    const matchesSearch =
      l.number.toLowerCase().includes(search.toLowerCase()) ||
      l.product.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "ALL" || l.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreate = () => {
    if (!number.trim() || !productId) {
      toast.error("Lot/Serial Number and Product are required");
      return;
    }

    startTransition(async () => {
      try {
        await createLotSerialNumber({
          number: number.trim(),
          type,
          productId,
          onHandQty: parseFloat(onHandQty) || 1,
          mfgDate: mfgDate || undefined,
          expiryDate: expiryDate || undefined,
          activities: activities.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("Lot / Serial Number created successfully");
        setIsOpen(false);
        setNumber("");
        setType("LOT");
        setOnHandQty("10");
        setMfgDate("");
        setExpiryDate("");
        setNotes("");
      } catch (err: any) {
        toast.error(err?.message || "Failed to create lot/serial number");
      }
    });
  };

  const handleDelete = (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete Lot/Serial ${num}?`)) return;
    startTransition(async () => {
      try {
        await deleteLotSerialNumber(id);
        toast.success(`Deleted Lot/Serial ${num}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete lot/serial number");
      }
    });
  };

  return (
    <div className="p-6 space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Lots & Serial Numbers
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Track and trace batch Lot Numbers and unique Serial Numbers throughout product lifecycle.
          </p>
        </div>

        <Button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
          <Plus className="h-4 w-4 mr-2" /> Add Lot / Serial Number
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Batch Lot Batches</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {initialLots.filter((l) => l.type === "LOT").length}
              </p>
            </div>
            <QrCode className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Serial Numbers Tracked</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {initialLots.filter((l) => l.type === "SERIAL").length}
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Tracked On-Hand</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {initialLots.reduce((sum, l) => sum + Number(l.onHandQty), 0)} units
              </p>
            </div>
            <Activity className="h-8 w-8 text-emerald-500 dark:text-emerald-400 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search lot / serial number or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {["ALL", "LOT", "SERIAL"].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
                className="text-xs"
              >
                {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card text-card-foreground border border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Lot & Serial Number Directory ({filteredLots.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-border">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Lot / Serial Number</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Type</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Activities & Lifecycle</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mfg Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Expiry Date</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">On Hand Qty</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No lot or serial numbers recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLots.map((lot) => (
                  <TableRow key={lot.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-border">
                    <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <QrCode className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      {lot.number}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lot.type === "LOT" ? "default" : "secondary"} className="text-xs">
                        {lot.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{lot.product.name}</TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{lot.activities || "Active"}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {lot.mfgDate ? new Date(lot.mfgDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{lot.onHandQty}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* VIEW ICON - BLUE */}
                        <button
                          type="button"
                          title="View Lot"
                          onClick={() => setViewLot(lot)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* EDIT ICON - BLACK / WHITE */}
                        <button
                          type="button"
                          title="Edit Lot"
                          onClick={() => toast.info("Edit lot modal ready")}
                          className="text-slate-900 dark:text-slate-100 hover:text-black dark:hover:text-white transition-colors p-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* DELETE ICON - RED */}
                        <button
                          type="button"
                          title="Delete Lot"
                          onClick={() => handleDelete(lot.id, lot.number)}
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

      {/* CREATE LOT DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle>Add Lot / Serial Number</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Type *</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOT">LOT (Batch)</SelectItem>
                    <SelectItem value="SERIAL">SERIAL (Unique)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold">Lot / Serial Number *</Label>
                <Input
                  placeholder={type === "LOT" ? "LOT-202608-001" : "SN-987654321"}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Associated Product *</Label>
              <Select value={productId} onValueChange={(val) => setProductId(val ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select product" />
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
                <Label className="text-xs font-semibold">Manufacture Date</Label>
                <Input type="date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Expiry Date</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">On-Hand Quantity</Label>
              <Input type="number" step="0.01" value={onHandQty} onChange={(e) => setOnHandQty(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-semibold">Initial Activity / Origin Log</Label>
              <Input
                placeholder="e.g. Received from Supplier / Manufactured in Batch 4"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending} className="bg-blue-600 text-white">
              Save Lot / Serial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW LOT DIALOG */}
      <Dialog open={!!viewLot} onOpenChange={() => setViewLot(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-blue-600 dark:text-blue-400">
              <QrCode className="h-5 w-5" /> {viewLot?.number}
            </DialogTitle>
          </DialogHeader>

          {viewLot && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Type:</span>
                <Badge variant="outline" className="font-bold">{viewLot.type}</Badge>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Product:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewLot.product.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">On-Hand Quantity:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewLot.onHandQty} units</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Manufacture Date:</span>
                <span className="text-slate-900 dark:text-white">{viewLot.mfgDate ? new Date(viewLot.mfgDate).toLocaleDateString() : "-"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Expiry Date:</span>
                <span className="text-slate-900 dark:text-white">{viewLot.expiryDate ? new Date(viewLot.expiryDate).toLocaleDateString() : "-"}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Lifecycle Activity Trace:</span>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded border border-border text-xs font-mono text-slate-800 dark:text-slate-200">
                  {viewLot.activities || "No activity logged"}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewLot(null)} className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
