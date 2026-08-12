"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Calculator, Plus, Trash2, Save, Loader2, Play,
  Coins, HardHat, Wrench, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveEstimation,
  saveAnalysisOfRatesItem,
  type Estimation,
  type BOQItem,
  type AORItem,
  type TemplateItem,
} from "@/lib/actions/civil";
import { generateCSV, downloadCSV } from "@/lib/export";

const BOQ_CATEGORIES = [
  "Earthwork",
  "Sub-base",
  "Base",
  "Bituminous",
  "Concrete",
  "RCC",
  "Brick work",
  "Structures",
  "Finishing",
  "Services",
];

const UNITS = ["cum", "sqm", "rm", "kg", "MT", "nos", "ls", "day", "hr"];

const AOR_CATEGORIES = ["Earthwork", "Concrete", "RCC", "Brick work", "Special Items"];

const COST_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

interface Props {
  initialEstimations: Estimation[];
  templates: TemplateItem[];
  initialAOR: AORItem[];
}

export function EstimationClient({ initialEstimations, templates, initialAOR }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"input" | "results">("input");
  const [estimations, setEstimations] = useState<Estimation[]>(initialEstimations);
  const [aorItems, setAORItems] = useState<AORItem[]>(initialAOR);
  const [showSaved, setShowSaved] = useState(false);

  const [templateType, setTemplateType] = useState<string>(templates[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportTitle, setReportTitle] = useState("");
  const [contingencyPercent, setContingencyPercent] = useState(5);

  const [boqItems, setBOQItems] = useState<Omit<BOQItem, "id">[]>([
    { itemNo: "1.1", description: "", unit: "cum", quantity: 0, rate: 0, category: "Earthwork" },
  ]);

  const [aorTab, setAORTab] = useState<string>(AOR_CATEGORIES[0]);

  // New AOR item form
  const [newAORItem, setNewAORItem] = useState({
    category: AOR_CATEGORIES[0],
    itemDescription: "",
    unit: "cum",
    materialCost: 0,
    labourCost: 0,
    machineryCost: 0,
    overheadPercent: 10,
    profitPercent: 10,
  });

  const [editingAORId, setEditingAORId] = useState<string | null>(null);

  const [generatedEstimation, setGeneratedEstimation] = useState<Estimation | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateType);

  function addBOQItem() {
    setBOQItems((prev) => [
      ...prev,
      { itemNo: "", description: "", unit: "cum", quantity: 0, rate: 0, category: "" },
    ]);
  }

  function removeBOQItem(idx: number) {
    setBOQItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBOQItem(idx: number, field: keyof BOQItem, value: string | number) {
    setBOQItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function handleGenerate() {
    if (!projectName.trim() || !reportTitle.trim()) {
      toast.error("Project name and report title are required");
      return;
    }
    if (boqItems.some((b) => !b.description.trim())) {
      toast.error("All BOQ items need a description");
      return;
    }

    const est: Estimation = {
      id: "",
      templateType: selectedTemplate?.type ?? "",
      title: reportTitle,
      projectName,
      location,
      client,
      date,
      contingencyPercent,
      boqItems: boqItems.map((b, i) => ({
        id: `boq-new-${i}`,
        ...b,
      })),
      status: "DRAFT",
      photos: [],
      createdAt: new Date().toISOString(),
    };

    setGeneratedEstimation(est);
    setPhase("results");
    toast.success("Estimation generated");
  }

  function handleSave() {
    if (!generatedEstimation) return;
    startTransition(async () => {
      try {
        const saved = await saveEstimation(generatedEstimation);
        setEstimations((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [saved, ...prev];
        });
        setGeneratedEstimation(saved);
        toast.success("Estimation saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleExportCSV() {
    if (!generatedEstimation) return;
    const headers = ["Item No", "Description", "Unit", "Quantity", "Rate", "Amount", "Category"];
    const rows = generatedEstimation.boqItems.map((b) => [
      b.itemNo,
      b.description,
      b.unit,
      String(b.quantity),
      String(b.rate),
      String(b.quantity * b.rate),
      b.category,
    ]);
    const subtotal = generatedEstimation.boqItems.reduce((s, i) => s + i.quantity * i.rate, 0);
    const contingency = subtotal * (generatedEstimation.contingencyPercent / 100);
    const grandTotal = subtotal + contingency;
    rows.push(
      ["", "", "", "", "Subtotal", String(subtotal), ""],
      ["", "", "", "", `Contingency (${generatedEstimation.contingencyPercent}%)`, String(contingency), ""],
      ["", "", "", "", "Grand Total", String(grandTotal), ""],
    );
    const csv = generateCSV(headers, rows);
    downloadCSV(`estimation-${generatedEstimation.title.replace(/\s+/g, "-").toLowerCase()}`, csv);
  }

  function loadEstimation(est: Estimation) {
    setGeneratedEstimation(est);
    setReportTitle(est.title);
    setProjectName(est.projectName);
    setLocation(est.location);
    setClient(est.client);
    setDate(est.date);
    setContingencyPercent(est.contingencyPercent);
    setBOQItems(est.boqItems.map((b) => ({ ...b })));
    setTemplateType(templates.find((t) => t.type === est.templateType)?.id ?? templateType);
    setPhase("results");
    setShowSaved(false);
  }

  function handleSaveAOR() {
    startTransition(async () => {
      try {
        const saved = await saveAnalysisOfRatesItem(newAORItem);
        setAORItems((prev) => [...prev, saved]);
        setNewAORItem({
          category: AOR_CATEGORIES[0],
          itemDescription: "",
          unit: "cum",
          materialCost: 0,
          labourCost: 0,
          machineryCost: 0,
          overheadPercent: 10,
          profitPercent: 10,
        });
        toast.success("AOR item saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleUpdateAOR() {
    if (!editingAORId) return;
    const item = aorItems.find((a) => a.id === editingAORId);
    if (!item) return;
    startTransition(async () => {
      try {
        const saved = await saveAnalysisOfRatesItem({ ...item, id: editingAORId });
        setAORItems((prev) => prev.map((a) => (a.id === editingAORId ? saved : a)));
        setEditingAORId(null);
        toast.success("AOR item updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function calculateAORRate(item: Omit<AORItem, "id">): number {
    const baseCost = item.materialCost + item.labourCost + item.machineryCost;
    const withOverhead = baseCost * (1 + item.overheadPercent / 100);
    const withProfit = withOverhead * (1 + item.profitPercent / 100);
    return Math.round(withProfit * 100) / 100;
  }

  const subtotal = generatedEstimation?.boqItems.reduce((s, i) => s + i.quantity * i.rate, 0) ?? 0;
  const contingency = subtotal * (generatedEstimation?.contingencyPercent ?? 5) / 100;
  const grandTotal = subtotal + contingency;

  const costBreakdown = generatedEstimation
    ? (() => {
        const cats = new Map<string, number>();
        generatedEstimation.boqItems.forEach((b) => {
          const amt = b.quantity * b.rate;
          cats.set(b.category, (cats.get(b.category) ?? 0) + amt);
        });
        return Array.from(cats.entries()).map(([name, value]) => ({ name, value }));
      })()
    : [];

  const aorSummaryChart = [
    { name: "Materials", value: aorItems.reduce((s, a) => s + a.materialCost, 0) },
    { name: "Labour", value: aorItems.reduce((s, a) => s + a.labourCost, 0) },
    { name: "Machinery", value: aorItems.reduce((s, a) => s + a.machineryCost, 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost Estimation</h1>
          <p className="text-sm text-muted-foreground">
            Quantity take-off, BOQ preparation, and analysis of rates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSaved(!showSaved)}>
            <Calculator className="mr-2 h-4 w-4" />
            Saved Estimates ({estimations.length})
          </Button>
        </div>
      </div>

      {showSaved && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Estimates</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimations.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700">{e.templateType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{e.date}</TableCell>
                  <TableCell>
                    <Badge className="bg-slate-100 text-slate-700">{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => loadEstimation(e)}>Load</Button>
                  </TableCell>
                </TableRow>
              ))}
              {estimations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No saved estimates</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex gap-2 border-b pb-2">
        <Button variant={phase === "input" ? "default" : "ghost"} size="sm" onClick={() => setPhase("input")}>
          Input Data
        </Button>
        <Button variant={phase === "results" ? "default" : "ghost"} size="sm" disabled={!generatedEstimation} onClick={() => setPhase("results")}>
          Results
        </Button>
      </div>

      {phase === "input" && (
        <div className="space-y-6">
          <Tabs defaultValue="boq">
            <TabsList>
              <TabsTrigger value="boq">Bill of Quantities</TabsTrigger>
              <TabsTrigger value="aor">Analysis of Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="boq" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estimation Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Type</Label>
                    <Select value={templateType} onValueChange={(v) => { if (v) setTemplateType(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Report Title *</Label>
                      <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="e.g. SH-12 BOQ" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. SH-12 Widening" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. PWD" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contingency %</Label>
                      <Input type="number" value={contingencyPercent} onChange={(e) => setContingencyPercent(Number(e.target.value))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">BOQ Items</CardTitle>
                  <Button variant="outline" size="sm" onClick={addBOQItem}>
                    <Plus className="mr-1 h-4 w-4" /> Add Item
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Item No</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-20">Unit</TableHead>
                          <TableHead className="w-28">Quantity</TableHead>
                          <TableHead className="w-28">Rate (₹)</TableHead>
                          <TableHead className="w-28">Amount (₹)</TableHead>
                          <TableHead className="w-36">Category</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {boqItems.map((b, idx) => {
                          const amount = b.quantity * b.rate;
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <Input value={b.itemNo} onChange={(e) => updateBOQItem(idx, "itemNo", e.target.value)} className="h-8 px-2 text-sm" />
                              </TableCell>
                              <TableCell>
                                <Input value={b.description} onChange={(e) => updateBOQItem(idx, "description", e.target.value)} className="h-8 px-2 text-sm" placeholder="Item description" />
                              </TableCell>
                              <TableCell>
                                <Select value={b.unit} onValueChange={(v) => { if (v) updateBOQItem(idx, "unit", v); }}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UNITS.map((u) => (
                                      <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input type="number" value={b.quantity} onChange={(e) => updateBOQItem(idx, "quantity", Number(e.target.value))} className="h-8 px-2 text-sm" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" value={b.rate} onChange={(e) => updateBOQItem(idx, "rate", Number(e.target.value))} className="h-8 px-2 text-sm" />
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                ₹{new Intl.NumberFormat("en-IN").format(amount)}
                              </TableCell>
                              <TableCell>
                                <Select value={b.category} onValueChange={(v) => { if (v) updateBOQItem(idx, "category", v); }}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BOQ_CATEGORIES.map((c) => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {boqItems.length > 1 && (
                                  <Button variant="ghost" size="icon" onClick={() => removeBOQItem(idx)} className="h-8 w-8">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-sm">
                      <span className="font-medium">Total Amount: </span>
                      <span className="text-lg font-bold text-primary">
                        ₹{new Intl.NumberFormat("en-IN").format(boqItems.reduce((s, b) => s + b.quantity * b.rate, 0))}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aor" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add New Rate Analysis Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newAORItem.category} onValueChange={(v) => { if (v) setNewAORItem({ ...newAORItem, category: v }); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AOR_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={newAORItem.itemDescription} onChange={(e) => setNewAORItem({ ...newAORItem, itemDescription: e.target.value })} placeholder="e.g. RCC M25" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select value={newAORItem.unit} onValueChange={(v) => { if (v) setNewAORItem({ ...newAORItem, unit: v }); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Material Cost (₹)</Label>
                      <Input type="number" value={newAORItem.materialCost} onChange={(e) => setNewAORItem({ ...newAORItem, materialCost: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Labour Cost (₹)</Label>
                      <Input type="number" value={newAORItem.labourCost} onChange={(e) => setNewAORItem({ ...newAORItem, labourCost: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Machinery Cost (₹)</Label>
                      <Input type="number" value={newAORItem.machineryCost} onChange={(e) => setNewAORItem({ ...newAORItem, machineryCost: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Overhead (%)</Label>
                      <Input type="number" value={newAORItem.overheadPercent} onChange={(e) => setNewAORItem({ ...newAORItem, overheadPercent: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Profit (%)</Label>
                      <Input type="number" value={newAORItem.profitPercent} onChange={(e) => setNewAORItem({ ...newAORItem, profitPercent: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <p className="text-sm">
                      <span className="font-medium">Calculated Rate: </span>
                      <span className="text-lg font-bold text-primary">
                        ₹{new Intl.NumberFormat("en-IN").format(calculateAORRate(newAORItem))}
                      </span>
                    </p>
                  </div>
                  <Button onClick={handleSaveAOR} disabled={isPending || !newAORItem.itemDescription.trim()}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save AOR Item
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analysis of Rates - By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={aorTab} onValueChange={(v) => { if (v) setAORTab(v); }}>
                    <TabsList className="mb-4">
                      {AOR_CATEGORIES.map((c) => (
                        <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
                      ))}
                    </TabsList>
                    {AOR_CATEGORIES.map((cat) => (
                      <TabsContent key={cat} value={cat}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Material (₹)</TableHead>
                              <TableHead className="text-right">Labour (₹)</TableHead>
                              <TableHead className="text-right">Machinery (₹)</TableHead>
                              <TableHead className="text-right">OH%</TableHead>
                              <TableHead className="text-right">Profit%</TableHead>
                              <TableHead className="text-right">Rate (₹)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {aorItems
                              .filter((a) => a.category === cat)
                              .map((a) => (
                                <TableRow
                                  key={a.id}
                                  className={editingAORId === a.id ? "bg-muted/50" : ""}
                                  onDoubleClick={() => setEditingAORId(a.id)}
                                >
                                  <TableCell className="font-medium">{a.itemDescription}</TableCell>
                                  <TableCell>{a.unit}</TableCell>
                                  <TableCell className="text-right">{new Intl.NumberFormat("en-IN").format(a.materialCost)}</TableCell>
                                  <TableCell className="text-right">{new Intl.NumberFormat("en-IN").format(a.labourCost)}</TableCell>
                                  <TableCell className="text-right">{new Intl.NumberFormat("en-IN").format(a.machineryCost)}</TableCell>
                                  <TableCell className="text-right">{a.overheadPercent}%</TableCell>
                                  <TableCell className="text-right">{a.profitPercent}%</TableCell>
                                  <TableCell className="text-right font-bold">
                                    ₹{new Intl.NumberFormat("en-IN").format(calculateAORRate(a))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {aorItems.filter((a) => a.category === cat).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-4">No items</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {editingAORId && (() => {
                const item = aorItems.find((a) => a.id === editingAORId);
                if (!item) return null;
                return (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">Edit: {item.itemDescription}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Material (₹)</Label>
                          <Input type="number" value={item.materialCost} onChange={(e) => setAORItems((prev) => prev.map((a) => a.id === editingAORId ? { ...a, materialCost: Number(e.target.value) } : a))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Labour (₹)</Label>
                          <Input type="number" value={item.labourCost} onChange={(e) => setAORItems((prev) => prev.map((a) => a.id === editingAORId ? { ...a, labourCost: Number(e.target.value) } : a))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Machinery (₹)</Label>
                          <Input type="number" value={item.machineryCost} onChange={(e) => setAORItems((prev) => prev.map((a) => a.id === editingAORId ? { ...a, machineryCost: Number(e.target.value) } : a))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditingAORId(null)}>Cancel</Button>
                        <Button onClick={handleUpdateAOR} disabled={isPending}>Update</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Generate Estimation
            </Button>
          </div>
        </div>
      )}

      {phase === "results" && generatedEstimation && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{generatedEstimation.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {generatedEstimation.projectName} &middot; {generatedEstimation.location} &middot; {generatedEstimation.client}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">{generatedEstimation.templateType}</Badge>
                  <Badge className="bg-slate-100 text-slate-700">{generatedEstimation.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium">BOQ Items</p>
                  <p className="text-xl font-bold text-emerald-700">{generatedEstimation.boqItems.length}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Subtotal</p>
                  <p className="text-xl font-bold text-blue-700">₹{new Intl.NumberFormat("en-IN").format(subtotal)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Contingency ({generatedEstimation.contingencyPercent}%)</p>
                  <p className="text-xl font-bold text-amber-700">₹{new Intl.NumberFormat("en-IN").format(Math.round(contingency))}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Grand Total</p>
                  <p className="text-xl font-bold text-green-700">₹{new Intl.NumberFormat("en-IN").format(Math.round(grandTotal))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ₹${new Intl.NumberFormat("en-IN").format(Math.round(Number(value)))}`}
                        labelLine={false}
                      >
                        {costBreakdown.map((_, i) => (
                          <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => [`₹${new Intl.NumberFormat("en-IN").format(Math.round(Number(val)))}`, ""]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Component Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {costBreakdown.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-sm font-semibold">₹{new Intl.NumberFormat("en-IN").format(Math.round(cat.value))}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-sm font-bold">Subtotal</span>
                    <span className="text-sm font-bold">₹{new Intl.NumberFormat("en-IN").format(Math.round(subtotal))}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-sm">Contingency ({generatedEstimation.contingencyPercent}%)</span>
                    <span className="text-sm">₹{new Intl.NumberFormat("en-IN").format(Math.round(contingency))}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-green-600">Grand Total</span>
                    <span className="text-base font-bold text-green-600">₹{new Intl.NumberFormat("en-IN").format(Math.round(grandTotal))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aorSummaryChart}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ₹${new Intl.NumberFormat("en-IN").format(Math.round(Number(value)))}`}
                      labelLine={false}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`₹${new Intl.NumberFormat("en-IN").format(Math.round(Number(val)))}`, ""]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Aggregate distribution across all AOR items (excluding overhead & profit)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Complete BOQ</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Item No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate (₹)</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedEstimation.boqItems.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.itemNo}</TableCell>
                    <TableCell>{b.description}</TableCell>
                    <TableCell>{b.unit}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat("en-IN").format(b.quantity)}</TableCell>
                    <TableCell className="text-right">{new Intl.NumberFormat("en-IN").format(b.rate)}</TableCell>
                    <TableCell className="text-right font-medium">₹{new Intl.NumberFormat("en-IN").format(b.quantity * b.rate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.category}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={5} className="text-right font-bold">Subtotal</TableCell>
                  <TableCell className="text-right font-bold">₹{new Intl.NumberFormat("en-IN").format(Math.round(subtotal))}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={5} className="text-right text-muted-foreground">
                    Contingency ({generatedEstimation.contingencyPercent}%)
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">₹{new Intl.NumberFormat("en-IN").format(Math.round(contingency))}</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow className="bg-green-50">
                  <TableCell colSpan={5} className="text-right font-bold text-green-700">Grand Total</TableCell>
                  <TableCell className="text-right font-bold text-green-700">₹{new Intl.NumberFormat("en-IN").format(Math.round(grandTotal))}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportCSV}>Export CSV</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Estimate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
