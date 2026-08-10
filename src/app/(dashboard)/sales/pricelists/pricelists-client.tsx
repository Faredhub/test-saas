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
import { Plus, Tag, Search, GripVertical, CheckSquare, List, LayoutGrid, Trash2, Pencil, Globe, Building2, CheckCircle2 } from "lucide-react";
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

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [countryGroups, setCountryGroups] = useState("European Union");
  const [selectable, setSelectable] = useState(true);
  const [website, setWebsite] = useState("My Website");
  const [company, setCompany] = useState("Demo Company");
  const [currency, setCurrency] = useState("EUR");
  const [discountPercent, setDiscountPercent] = useState(10);

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
            Pricelists
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure currency, country groups, website selectability, and customer-specific rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Top Right View Mode Switcher (List vs Kanban - matching screenshot) */}
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

      {/* ==================================================================== */}
      {/* LIST VIEW TABLE (Matches Image 1 exactly) */}
      {/* ==================================================================== */}
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
                  <TableHead className="font-bold text-slate-200 text-center">Selectable</TableHead>
                  <TableHead className="font-bold text-slate-200">Website</TableHead>
                  <TableHead className="font-bold text-slate-200">Company</TableHead>
                  <TableHead className="font-bold text-slate-200 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPricelists.map((pl) => (
                  <TableRow key={pl.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={!!selectedItems[pl.id]}
                        onChange={() => toggleSelectItem(pl.id)}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-slate-400">
                      <GripVertical className="h-4 w-4 cursor-grab" />
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-purple-600" />
                      {pl.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 text-[11px]">
                        {pl.countryGroups}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={pl.selectable}
                        readOnly
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">{pl.website}</TableCell>
                    <TableCell className="text-sm text-slate-600">{pl.company}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pl.id)}
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        title="Delete Pricelist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* KANBAN CARDS VIEW */}
      {/* ==================================================================== */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredPricelists.map((pl) => (
            <Card key={pl.id} className="p-4 space-y-3 border hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" /> {pl.name}
                  </h3>
                  <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 text-[10px]">
                    {pl.countryGroups}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(pl.id)} className="h-7 w-7 text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex justify-between"><span>Website:</span> <span className="font-semibold text-slate-800">{pl.website}</span></div>
                <div className="flex justify-between"><span>Company:</span> <span className="font-semibold text-slate-800">{pl.company}</span></div>
                <div className="flex justify-between"><span>Selectable:</span> <span className="font-semibold text-slate-800">{pl.selectable ? "Yes" : "No"}</span></div>
              </div>
            </Card>
          ))}
        </div>
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
