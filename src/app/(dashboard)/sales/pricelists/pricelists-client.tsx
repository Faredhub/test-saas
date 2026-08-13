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
import { Plus, Tag, Search, GripVertical, CheckSquare, List, LayoutGrid, Trash2, Pencil, Globe, Building2, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";

type Props = {
  products: any[];
  contacts: any[];
};

interface Pricelist {
  id: string;
  name: string;
  countryGroups: string;
  selectable: boolean;
  website: string;
  company: string;
  currency: string;
  discountPercent?: number;
}

const initialPricelists: Pricelist[] = [
  {
    id: "pl-1",
    name: "Benelux",
    countryGroups: "BeNeLux",
    selectable: false,
    website: "My Website",
    company: "Demo Company",
    currency: "EUR",
    discountPercent: 10,
  },
  {
    id: "pl-2",
    name: "EUR",
    countryGroups: "European Union",
    selectable: true,
    website: "My Website",
    company: "Demo Company",
    currency: "EUR",
    discountPercent: 5,
  },
  {
    id: "pl-3",
    name: "Christmas",
    countryGroups: "European Union",
    selectable: false,
    website: "My Website",
    company: "Demo Company",
    currency: "EUR",
    discountPercent: 15,
  },
  {
    id: "pl-4",
    name: "India B2B Wholesale",
    countryGroups: "India & SAARC",
    selectable: true,
    website: "My Website",
    company: "Demo Company",
    currency: "INR",
    discountPercent: 12,
  },
  {
    id: "pl-5",
    name: "USD Global Export",
    countryGroups: "North America & International",
    selectable: true,
    website: "Export Portal",
    company: "Demo Company",
    currency: "USD",
    discountPercent: 8,
  },
];

export function PricelistsClient({ products, contacts }: Props) {
  const [pricelists, setPricelists] = useState<Pricelist[]>(initialPricelists);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const [viewPricelist, setViewPricelist] = useState<Pricelist | null>(null);
  const [editPricelist, setEditPricelist] = useState<Pricelist | null>(null);

  // Edit fields state
  const [editName, setEditName] = useState("");
  const [editCountryGroups, setEditCountryGroups] = useState("");
  const [editSelectable, setEditSelectable] = useState(true);
  const [editWebsite, setEditWebsite] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editCurrency, setEditCurrency] = useState("EUR");
  const [editDiscountPercent, setEditDiscountPercent] = useState(10);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [countryGroups, setCountryGroups] = useState("European Union");
  const [selectable, setSelectable] = useState(true);
  const [website, setWebsite] = useState("My Website");
  const [company, setCompany] = useState("Demo Company");
  const [currency, setCurrency] = useState("EUR");
  const [discountPercent, setDiscountPercent] = useState(10);

  function handleOpenEdit(pl: Pricelist) {
    setEditPricelist(pl);
    setEditName(pl.name);
    setEditCountryGroups(pl.countryGroups);
    setEditSelectable(pl.selectable);
    setEditWebsite(pl.website);
    setEditCompany(pl.company);
    setEditCurrency(pl.currency);
    setEditDiscountPercent(pl.discountPercent || 10);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPricelist) return;

    setPricelists((prev) =>
      prev.map((p) =>
        p.id === editPricelist.id
          ? {
              ...p,
              name: editName,
              countryGroups: editCountryGroups,
              selectable: editSelectable,
              website: editWebsite,
              company: editCompany,
              currency: editCurrency,
              discountPercent: editDiscountPercent,
            }
          : p
      )
    );
    toast.success("Pricelist rules updated successfully!");
    setEditPricelist(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Pricelist name is required");

    const newPricelist: Pricelist = {
      id: `pl-${Date.now()}`,
      name,
      countryGroups,
      selectable,
      website,
      company,
      currency,
      discountPercent,
    };

    setPricelists([newPricelist, ...pricelists]);
    toast.success("Pricelist created successfully!");
    setIsOpen(false);
    setName("");
  }

  function handleDelete(id: string) {
    setPricelists(pricelists.filter((p) => p.id !== id));
    toast.success("Pricelist deleted");
  }

  function toggleSelectAll() {
    if (Object.keys(selectedItems).length === pricelists.length) {
      setSelectedItems({});
    } else {
      const all: Record<string, boolean> = {};
      pricelists.forEach((p) => { all[p.id] = true; });
      setSelectedItems(all);
    }
  }

  function toggleSelectItem(id: string) {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const filteredPricelists = pricelists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.countryGroups.toLowerCase().includes(search.toLowerCase()) ||
    p.website.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-7 w-7 text-purple-600" />
            Pricelists & Discounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure country groups, quantity discounts, promotional pricing, regional rules, multi-currency & validity periods.
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
              title="Kanban View"
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </Button>
          </div>

          <Button onClick={() => setIsOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Plus className="h-4 w-4" /> New Pricelist
          </Button>
        </div>
      </div>

      {/* Filter Bar with Search */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pricelist, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          1-{filteredPricelists.length} / {filteredPricelists.length}
        </div>
      </div>

      {/* LIST VIEW TABLE */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900/90 text-slate-100 hover:bg-slate-900">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={Object.keys(selectedItems).length > 0 && Object.keys(selectedItems).length === pricelists.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="font-bold text-slate-200">Pricelist Name</TableHead>
                  <TableHead className="font-bold text-slate-200">Country Groups</TableHead>
                  <TableHead className="font-bold text-slate-200 text-right">Group Discount</TableHead>
                  <TableHead className="font-bold text-slate-200 text-center">Currency</TableHead>
                  <TableHead className="font-bold text-slate-200 text-center">Selectable</TableHead>
                  <TableHead className="font-bold text-slate-200">Website</TableHead>
                  <TableHead className="font-bold text-slate-200 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPricelists.map((pl) => (
                  <TableRow key={pl.id} className="hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => setViewPricelist(pl)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selectedItems[pl.id]}
                        onChange={() => toggleSelectItem(pl.id)}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-slate-400" onClick={(e) => e.stopPropagation()}>
                      <GripVertical className="h-4 w-4 cursor-grab" />
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-purple-600 shrink-0" />
                      {pl.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 text-[11px]">
                        {pl.countryGroups}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      {pl.discountPercent || 10}% Off
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-xs text-blue-600">
                      {pl.currency}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={pl.selectable}
                        readOnly
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">{pl.website}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewPricelist(pl)}
                          title="View Pricing Rules & Discount Breakdown"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(pl)}
                          title="Edit Pricelist Rules"
                          className="h-8 w-8 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pl.id)}
                          title="Delete Pricelist"
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

      {/* KANBAN CARDS VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredPricelists.map((pl) => (
            <Card key={pl.id} className="p-4 space-y-3 border hover:shadow-md cursor-pointer transition-all" onClick={() => setViewPricelist(pl)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" /> {pl.name}
                  </h3>
                  <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 text-[10px]">
                    {pl.countryGroups}
                  </Badge>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => setViewPricelist(pl)} title="View Pricing Rules" className="h-7 w-7 text-blue-600">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(pl)} title="Edit Pricelist" className="h-7 w-7 text-slate-800 dark:text-slate-200">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(pl.id)} title="Delete Pricelist" className="h-7 w-7 text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex justify-between"><span>Country Discount:</span> <span className="font-mono font-bold text-emerald-600">{pl.discountPercent || 10}% Off</span></div>
                <div className="flex justify-between"><span>Currency:</span> <span className="font-mono font-bold text-blue-600">{pl.currency}</span></div>
                <div className="flex justify-between"><span>Website:</span> <span className="font-semibold text-slate-800">{pl.website}</span></div>
                <div className="flex justify-between"><span>Selectable:</span> <span className="font-semibold text-slate-800">{pl.selectable ? "Yes" : "No"}</span></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW PRICELIST & PRICING RULES MODAL */}
      {viewPricelist && (
        <Dialog open={!!viewPricelist} onOpenChange={(open) => { if (!open) setViewPricelist(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2"><Tag className="h-5 w-5 text-purple-600" /> {viewPricelist.name} Pricelist Details</span>
                <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-200">{viewPricelist.currency}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* 1. CUSTOMER-SPECIFIC PRICING & COUNTRY GROUP DISCOUNTS */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-purple-600" /> 1. Customer-Specific Pricing & Country Group Discounts
                </h4>
                <p className="text-xs text-slate-600">
                  Configured pricing rules and discount percentages for customer country groups:
                </p>

                <div className="border rounded-lg overflow-hidden bg-white">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Country Group</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Base Discount</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">B2B VIP Tier</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Net Discount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="font-bold text-slate-900">{viewPricelist.countryGroups}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-purple-700">{viewPricelist.discountPercent || 10}% Off</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">+5% Extra</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">{(viewPricelist.discountPercent || 10) + 5}% Net Off</TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="font-medium text-slate-700">Rest of World (Standard)</TableCell>
                        <TableCell className="text-right font-mono text-slate-600">5% Off</TableCell>
                        <TableCell className="text-right font-mono text-slate-500">0%</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">5% Net Off</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 2. QUANTITY DISCOUNTS */}
              <div className="border rounded-xl p-3.5 space-y-2 bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>2. Quantity Discounts (Tiered Bulk Pricing)</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Active Tier</Badge>
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded border bg-slate-50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Tier 1 (1–9 Units)</span>
                    <p className="font-bold text-slate-900 mt-0.5">Standard Price ({viewPricelist.discountPercent || 10}% Off)</p>
                  </div>
                  <div className="p-2 rounded border bg-amber-50/50 border-amber-200">
                    <span className="text-[10px] text-amber-700 uppercase font-bold">Tier 2 (10–49 Units)</span>
                    <p className="font-bold text-amber-900 mt-0.5">Extra 5% Off (Total {(viewPricelist.discountPercent || 10) + 5}%)</p>
                  </div>
                  <div className="p-2 rounded border bg-emerald-50/50 border-emerald-200">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold">Tier 3 (50+ Units)</span>
                    <p className="font-bold text-emerald-900 mt-0.5">Bulk Wholesale 15% Extra</p>
                  </div>
                </div>
              </div>

              {/* 3. PROMOTIONAL PRICING */}
              <div className="border rounded-xl p-3.5 space-y-2 bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>3. Promotional Pricing & Coupon Codes</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Active Campaigns</Badge>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center p-2 rounded border bg-emerald-50/40">
                    <div>
                      <span className="font-bold text-emerald-900">Promo Code: PROMO2026</span>
                      <p className="text-[11px] text-emerald-700">Flat 15% discount for first B2B seasonal order</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">15% Off</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded border bg-blue-50/40">
                    <div>
                      <span className="font-bold text-blue-900">Promo Code: SUMMER25</span>
                      <p className="text-[11px] text-blue-700">Seasonal B2B rebate on catalog purchases</p>
                    </div>
                    <span className="font-mono font-bold text-blue-700">10% Rebate</span>
                  </div>
                </div>
              </div>

              {/* 4. REGIONAL PRICING */}
              <div className="border rounded-xl p-3.5 space-y-2 bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>4. Regional Pricing & Tax Position</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Configured</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded border bg-slate-50">
                    <span className="text-muted-foreground">Regional Target:</span>
                    <p className="font-bold text-slate-900">{viewPricelist.countryGroups}</p>
                  </div>
                  <div className="p-2 rounded border bg-slate-50">
                    <span className="text-muted-foreground">Fiscal Tax Position:</span>
                    <p className="font-bold text-slate-900">Auto Tax Detection (GST / VAT)</p>
                  </div>
                </div>
              </div>

              {/* 5. CURRENCY-WISE PRICING */}
              <div className="border rounded-xl p-3.5 space-y-2 bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>5. Currency-Wise Pricing & Multi-Currency FX</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{viewPricelist.currency} Currency</Badge>
                </h4>
                <div className="p-2.5 rounded border bg-blue-50/40 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Currency:</span>
                    <span className="font-mono font-bold text-blue-900">{viewPricelist.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Exchange Rate Conversion:</span>
                    <span className="font-mono font-semibold text-slate-800">1.00x Base FX Rate</span>
                  </div>
                </div>
              </div>

              {/* 6. TIME-BASED PRICING */}
              <div className="border rounded-xl p-3.5 space-y-2 bg-card">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>6. Time-Based Pricing & Validity Period</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Active Period</Badge>
                </h4>
                <div className="p-2.5 rounded border bg-slate-50 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground">Validity Period:</span>
                    <p className="font-bold text-slate-900">01 Jan 2026 – 31 Dec 2026</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 font-mono">Valid & Live</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <Button variant="outline" size="sm" onClick={() => { handleOpenEdit(viewPricelist); setViewPricelist(null); }} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit Rules & Discounts
              </Button>
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Close</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT PRICELIST MODAL */}
      {editPricelist && (
        <Dialog open={!!editPricelist} onOpenChange={(open) => { if (!open) setEditPricelist(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="h-5 w-5 text-purple-600" /> Edit Pricelist Rules & Discounts
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Pricelist Name *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Country Groups</Label>
                <Input value={editCountryGroups} onChange={(e) => setEditCountryGroups(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Group Discount (%)</Label>
                  <Input type="number" step="0.1" value={editDiscountPercent} onChange={(e) => setEditDiscountPercent(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={editCurrency} onValueChange={(v) => v && setEditCurrency(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-selectable-check"
                  checked={editSelectable}
                  onChange={(e) => setEditSelectable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="edit-selectable-check" className="cursor-pointer">Selectable by Customers on Website</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">Save Pricing Rules</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE PRICELIST MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Pricelist</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Pricelist Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Benelux, EUR, Christmas" />
            </div>

            <div className="space-y-2">
              <Label>Country Groups</Label>
              <Input value={countryGroups} onChange={(e) => setCountryGroups(e.target.value)} placeholder="e.g. European Union, BeNeLux" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Country Group Discount (%)</Label>
                <Input type="number" step="0.1" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="My Website" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Demo Company" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="selectable-check"
                checked={selectable}
                onChange={(e) => setSelectable(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="selectable-check" className="cursor-pointer">Selectable by Customers on Website</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</DialogClose>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">Create Pricelist</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
