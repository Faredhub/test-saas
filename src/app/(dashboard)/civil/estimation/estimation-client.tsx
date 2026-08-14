"use client";

import { useMemo, useState, useTransition } from "react";
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
  Calculator, Plus, Trash2, Save, Loader2, Pencil, X, MapPin, Search, Printer, ArrowUp, ArrowDown, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveEstimation,
  deleteEstimation,
  saveAnalysisOfRatesItem,
  deleteAnalysisOfRatesItem,
  saveScheduleOfRatesItem,
  deleteScheduleOfRatesItem,
  type Estimation,
  type EstimationItemRow,
  type AbstractRow,
  type AORItem,
  type SORItem,
  type TemplateItem,
} from "@/lib/actions/civil";
import { generateCSV, downloadCSV } from "@/lib/export";
import { printHTML, htmlTable } from "@/lib/print";
import { MapComponent } from "@/app/(dashboard)/sales/map/map-component";
import { EntityPicker } from "@/components/civil/entity-picker";

const AOR_CATEGORIES = [
  "Earthwork",
  "Special Items for Irrigation Work",
  "Concrete",
  "Reinforced Cement Concrete Work",
  "Reinforced Brick Work",
  "Masonry Brick Work",
  "Masonry Stone Work",
  "Flooring",
  "Painting",
  "Plastering",
  "Roofing",
  "Wood Work",
  "Road Work",
  "Site Clearance",
  "Pile Foundation",
  "Dismantling",
  "Iron Work",
  "Well Sinking",
  "Other Building Items",
  "Bridge Works",
];

const UNITS = ["cum", "sqm", "rm", "kg", "MT", "nos", "ls", "day", "hr", "%"];

const PROJECT_TYPES: Record<string, { subtypes: string[]; roadTypes?: string[] }> = {
  Building: { subtypes: ["RCC", "Steel"] },
  Road: { subtypes: ["Village Road", "MDR/ODR", "NH/SH"], roadTypes: ["Asphalt", "Concrete", "Any Other"] },
  Canal: { subtypes: ["Minor", "Major"] },
  Bridge: { subtypes: ["Minor", "Major"] },
  Culvert: { subtypes: ["Hume Pipe", "Slab", "Box cell"] },
};

const CATEGORY_PROJECT_MAP: Record<string, string[]> = {
  Earthwork: ["Building", "Road", "Canal", "Bridge", "Culvert"],
  "Special Items for Irrigation Work": ["Canal"],
  Concrete: ["Building", "Road", "Canal", "Bridge", "Culvert"],
  "Reinforced Cement Concrete Work": ["Building", "Road", "Canal", "Bridge", "Culvert"],
  "Reinforced Brick Work": ["Building"],
  "Masonry Brick Work": ["Building", "Canal"],
  "Masonry Stone Work": ["Building", "Canal", "Bridge"],
  Flooring: ["Building"],
  Painting: ["Building", "Bridge"],
  Plastering: ["Building"],
  Roofing: ["Building"],
  "Wood Work": ["Building"],
  "Road Work": ["Road"],
  "Site Clearance": ["Building", "Road", "Canal", "Bridge", "Culvert"],
  "Pile Foundation": ["Building", "Bridge"],
  Dismantling: ["Building", "Road", "Canal", "Bridge", "Culvert"],
  "Iron Work": ["Building", "Road", "Bridge", "Culvert"],
  "Well Sinking": ["Bridge"],
  "Other Building Items": ["Building"],
  "Bridge Works": ["Road", "Bridge", "Culvert"],
};

const inr = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n * 100) / 100);

function aorRate(a: {
  materialCost: number;
  labourCost: number;
  machineryCost: number;
  materialRoyalty: number;
  overheadPercent: number;
  profitPercent: number;
  otherCharges: number;
}): number {
  const base =
    a.materialCost + a.labourCost + a.machineryCost + a.materialRoyalty;
  const withOverhead = base * (1 + a.overheadPercent / 100);
  const withProfit = withOverhead * (1 + a.profitPercent / 100);
  return Math.round((withProfit + a.otherCharges) * 100) / 100;
}

interface Props {
  initialEstimations: Estimation[];
  templates: TemplateItem[];
  initialAOR: AORItem[];
  initialSOR: SORItem[];
  projects: { id: string; name: string; code: string; clientName: string }[];
  clients: { id: string; name: string; company: string }[];
}

interface AORForm {
  id?: string;
  category: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  materialCost: number;
  labourCost: number;
  machineryCost: number;
  materialRoyalty: number;
  overheadPercent: number;
  profitPercent: number;
  otherCharges: number;
}

interface SORForm {
  id?: string;
  aorId: string;
  itemNo: string;
  description: string;
  unit: string;
  materialName: string;
  quarryName: string;
  leadKm: number;
  leadRatePerKm: number;
  quarryLat: number | null;
  quarryLng: number | null;
  materialCost: number;
  labourCost: number;
  machineryCost: number;
  materialRoyalty: number;
}

const emptyAOR: AORForm = {
  category: AOR_CATEGORIES[0],
  itemNo: "",
  description: "",
  unit: "cum",
  quantity: 1,
  materialCost: 0,
  labourCost: 0,
  machineryCost: 0,
  materialRoyalty: 0,
  overheadPercent: 10,
  profitPercent: 10,
  otherCharges: 0,
};

const emptySOR: SORForm = {
  aorId: "",
  itemNo: "",
  description: "",
  unit: "",
  materialName: "",
  quarryName: "",
  leadKm: 0,
  leadRatePerKm: 0,
  quarryLat: null,
  quarryLng: null,
  materialCost: 0,
  labourCost: 0,
  machineryCost: 0,
  materialRoyalty: 0,
};

const emptyEstItem = (): Omit<EstimationItemRow, "id"> => ({
  slNo: 1,
  aorNo: "",
  description: "",
  quantity: 0,
  wastage: 0,
  unit: "",
  rate: 0,
  amount: 0,
  remarks: "",
});

export function EstimationClient({ initialEstimations, templates, initialAOR, initialSOR, projects, clients }: Props) {
  const [isPending, startTransition] = useTransition();
  const [aorItems, setAORItems] = useState<AORItem[]>(initialAOR);
  const [sorItems, setSORItems] = useState<SORItem[]>(initialSOR);
  const [estimations, setEstimations] = useState<Estimation[]>(initialEstimations);

  // Top-level module tabs
  const [moduleTab, setModuleTab] = useState<"aor" | "sor" | "estimation">("aor");

  // Shared state/department filters (AOR & SOR)
  const states = useMemo(() => {
    const s = new Set<string>();
    aorItems.forEach((a) => a.state && s.add(a.state));
    sorItems.forEach((r) => r.state && s.add(r.state));
    return Array.from(s).sort();
  }, [aorItems, sorItems]);

  const departments = useMemo(() => {
    const s = new Set<string>();
    aorItems.forEach((a) => a.department && s.add(a.department));
    sorItems.forEach((r) => r.department && s.add(r.department));
    return Array.from(s).sort();
  }, [aorItems, sorItems]);

  const [aorState, setAORState] = useState<string>("__ALL__");
  const [aorDept, setAORDept] = useState<string>("__ALL__");
  const [aorCat, setAORCat] = useState<string>("__ALL__");

  const [sorState, setSORState] = useState<string>("__ALL__");
  const [sorDept, setSORDept] = useState<string>("__ALL__");

  // AOR form
  const [aorForm, setAORForm] = useState<AORForm>(emptyAOR);

  // SOR form
  const [sorForm, setSORForm] = useState<SORForm>(emptySOR);

  // Estimation form
  const [projectType, setProjectType] = useState<string>("Building");
  const [subType, setSubType] = useState<string>("RCC");
  const [roadType, setRoadType] = useState<string>("Asphalt");
  const [estTitle, setEstTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [estState, setEstState] = useState("");
  const [estDept, setEstDept] = useState("");
  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [estItems, setEstItems] = useState<Omit<EstimationItemRow, "id">[]>([emptyEstItem()]);
  const [abstract, setAbstract] = useState<AbstractRow[]>([{ name: "Civil Works", amount: 0 }]);
  const [editingEstId, setEditingEstId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // ==========================================================================
  // AOR handlers
  // ==========================================================================

  const filteredAOR = useMemo(
    () =>
      aorItems.filter(
        (a) =>
          (aorState === "__ALL__" || a.state === aorState) &&
          (aorDept === "__ALL__" || a.department === aorDept) &&
          (aorCat === "__ALL__" || a.category === aorCat),
      ),
    [aorItems, aorState, aorDept, aorCat],
  );

  function handleSaveAOR() {
    if (!aorForm.description.trim()) {
      toast.error("Item description is required");
      return;
    }
    startTransition(async () => {
      try {
        const saved = await saveAnalysisOfRatesItem({
          id: aorForm.id,
          state: aorState === "__ALL__" ? "" : aorState,
          department: aorDept === "__ALL__" ? "" : aorDept,
          category: aorForm.category,
          itemNo: aorForm.itemNo,
          description: aorForm.description,
          unit: aorForm.unit,
          quantity: aorForm.quantity,
          materialCost: aorForm.materialCost,
          labourCost: aorForm.labourCost,
          machineryCost: aorForm.machineryCost,
          materialRoyalty: aorForm.materialRoyalty,
          overheadPercent: aorForm.overheadPercent,
          profitPercent: aorForm.profitPercent,
          otherCharges: aorForm.otherCharges,
          isActive: true,
        });
        setAORItems((prev) => {
          const idx = prev.findIndex((a) => a.id === saved.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [...prev, saved];
        });
        setAORForm(emptyAOR);
        toast.success("AOR item saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleEditAOR(a: AORItem) {
    setAORForm({
      id: a.id,
      category: a.category,
      itemNo: a.itemNo,
      description: a.description,
      unit: a.unit,
      quantity: a.quantity,
      materialCost: a.materialCost,
      labourCost: a.labourCost,
      machineryCost: a.machineryCost,
      materialRoyalty: a.materialRoyalty,
      overheadPercent: a.overheadPercent,
      profitPercent: a.profitPercent,
      otherCharges: a.otherCharges,
    });
  }

  function handleDeleteAOR(id: string) {
    startTransition(async () => {
      try {
        await deleteAnalysisOfRatesItem(id);
        setAORItems((prev) => prev.filter((a) => a.id !== id));
        toast.success("AOR item deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  // ==========================================================================
  // SOR handlers
  // ==========================================================================

  const filteredSOR = useMemo(
    () =>
      sorItems.filter(
        (r) =>
          (sorState === "__ALL__" || r.state === sorState) &&
          (sorDept === "__ALL__" || r.department === sorDept),
      ),
    [sorItems, sorState, sorDept],
  );

  function applyAORToSOR(aorId: string) {
    if (aorId === "__NONE__") {
      setSORForm((f) => ({ ...f, aorId: "" }));
      return;
    }
    const a = aorItems.find((x) => x.id === aorId);
    if (!a) return;
    setSORForm((f) => ({
      ...f,
      aorId: a.id,
      itemNo: a.itemNo,
      description: a.description,
      unit: a.unit,
      materialCost: a.materialCost,
      labourCost: a.labourCost,
      machineryCost: a.machineryCost,
      materialRoyalty: a.materialRoyalty,
    }));
  }

  function handleSaveSOR() {
    if (!sorForm.description.trim()) {
      toast.error("Item description is required");
      return;
    }
    startTransition(async () => {
      try {
        const saved = await saveScheduleOfRatesItem({
          id: sorForm.id,
          state: sorState === "__ALL__" ? "" : sorState,
          department: sorDept === "__ALL__" ? "" : sorDept,
          aorId: sorForm.aorId || null,
          itemNo: sorForm.itemNo,
          description: sorForm.description,
          unit: sorForm.unit,
          materialName: sorForm.materialName,
          quarryName: sorForm.quarryName,
          leadKm: sorForm.leadKm,
          leadRatePerKm: sorForm.leadRatePerKm,
          quarryLat: sorForm.quarryLat,
          quarryLng: sorForm.quarryLng,
          materialCost: sorForm.materialCost,
          labourCost: sorForm.labourCost,
          machineryCost: sorForm.machineryCost,
          materialRoyalty: sorForm.materialRoyalty,
        });
        setSORItems((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [...prev, saved];
        });
        // Reflect linked AOR updates
        if (saved.aorId) {
          setAORItems((prev) =>
            prev.map((a) =>
              a.id === saved.aorId
                ? {
                    ...a,
                    materialCost: saved.materialCost,
                    labourCost: saved.labourCost,
                    machineryCost: saved.machineryCost,
                    materialRoyalty: saved.materialRoyalty,
                  }
                : a,
            ),
          );
        }
        setSORForm(emptySOR);
        toast.success("SOR item saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleEditSOR(r: SORItem) {
    setSORForm({
      id: r.id,
      aorId: r.aorId ?? "",
      itemNo: r.itemNo,
      description: r.description,
      unit: r.unit,
      materialName: r.materialName,
      quarryName: r.quarryName,
      leadKm: r.leadKm,
      leadRatePerKm: r.leadRatePerKm,
      quarryLat: r.quarryLat,
      quarryLng: r.quarryLng,
      materialCost: r.materialCost,
      labourCost: r.labourCost,
      machineryCost: r.machineryCost,
      materialRoyalty: r.materialRoyalty,
    });
  }

  function handleDeleteSOR(id: string) {
    startTransition(async () => {
      try {
        await deleteScheduleOfRatesItem(id);
        setSORItems((prev) => prev.filter((r) => r.id !== id));
        toast.success("SOR item deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  // ==========================================================================
  // Estimation handlers
  // ==========================================================================

  const relevantAOR = useMemo(() => {
    const cats = new Set<string>();
    Object.entries(CATEGORY_PROJECT_MAP).forEach(([cat, projects]) => {
      if (projects.includes(projectType)) cats.add(cat);
    });
    return aorItems.filter(
      (a) =>
        cats.has(a.category) &&
        (!estState || a.state === estState || !a.state) &&
        (!estDept || a.department === estDept || !a.department),
    );
  }, [aorItems, projectType, estState, estDept]);

  function updateEstItem(idx: number, patch: Partial<Omit<EstimationItemRow, "id">>) {
    setEstItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], ...patch };
      const effectiveQty = item.quantity * (1 + item.wastage / 100);
      item.amount = Math.round(effectiveQty * item.rate * 100) / 100;
      copy[idx] = item;
      return copy;
    });
  }

  function addEstItem() {
    setEstItems((prev) => [...prev, emptyEstItem()]);
  }

  function removeEstItem(idx: number) {
    setEstItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveEstItem(from: number, to: number) {
    setEstItems((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function pickAORForItem(idx: number, a: AORItem) {
    updateEstItem(idx, {
      aorNo: a.itemNo,
      description: a.description,
      unit: a.unit,
      rate: aorRate(a),
    });
  }

  const estSubtotal = estItems.reduce((s, i) => s + i.amount, 0);
  const estContingency = (estSubtotal * contingencyPercent) / 100;
  const estGrandTotal = estSubtotal + estContingency;

  function syncAbstract() {
    setAbstract([
      { name: "Civil Works", amount: Math.round(estSubtotal * 100) / 100 },
      { name: `Contingency (${contingencyPercent}%)`, amount: Math.round(estContingency * 100) / 100 },
    ]);
  }

  function handleSaveEstimation() {
    if (!estTitle.trim() || !projectName.trim()) {
      toast.error("Report title and project name are required");
      return;
    }
    if (estItems.some((i) => !i.description.trim())) {
      toast.error("All estimate items need a description");
      return;
    }
    startTransition(async () => {
      try {
        const saved = await saveEstimation({
          id: editingEstId ?? undefined,
          projectType,
          subType,
          roadType: projectType === "Road" ? roadType : "",
          templateType: projectType,
          title: estTitle,
          projectName,
          location,
          client,
          projectId,
          clientId,
          date,
          state: estState,
          department: estDept,
          contingencyPercent,
          items: estItems.map((i, idx) => ({ ...i, id: `new-${idx}`, slNo: idx + 1 })),
          abstract,
          photos: [],
          status: "DRAFT",
        });
        setEstimations((prev) => {
          const idx = prev.findIndex((e) => e.id === saved.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [saved, ...prev];
        });
        setEditingEstId(saved.id);
        toast.success("Estimation saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleDeleteEstimation(id: string) {
    startTransition(async () => {
      try {
        await deleteEstimation(id);
        setEstimations((prev) => prev.filter((e) => e.id !== id));
        if (editingEstId === id) resetEstimationForm();
        toast.success("Estimation deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function resetEstimationForm() {
    setEditingEstId(null);
    setProjectType("Building");
    setSubType("RCC");
    setRoadType("Asphalt");
    setEstTitle("");
    setProjectName("");
    setProjectId("");
    setLocation("");
    setClient("");
    setClientId("");
    setDate(new Date().toISOString().slice(0, 10));
    setEstState("");
    setEstDept("");
    setContingencyPercent(5);
    setEstItems([emptyEstItem()]);
    setAbstract([{ name: "Civil Works", amount: 0 }]);
  }

  function loadEstimation(e: Estimation) {
    setEditingEstId(e.id);
    setProjectType(e.projectType || "Building");
    setSubType(e.subType || PROJECT_TYPES[e.projectType || "Building"]?.subtypes[0] || "");
    setRoadType(e.roadType || "Asphalt");
    setEstTitle(e.title);
    setProjectName(e.projectName);
    setProjectId(e.projectId || "");
    setLocation(e.location);
    setClient(e.client);
    setClientId(e.clientId || "");
    setDate(e.date);
    setEstState(e.state);
    setEstDept(e.department);
    setContingencyPercent(e.contingencyPercent);
    setEstItems(e.items.map((i) => ({ ...i })));
    setAbstract(e.abstract.length ? e.abstract : [{ name: "Civil Works", amount: 0 }]);
    setShowSaved(false);
  }

  function handleExportCSV() {
    const headers = ["Sl. No.", "AOR No.", "Item Description", "Quantity", "Wastage %", "Unit", "Rate", "Amount", "Remarks"];
    const rows = estItems.map((i, idx) => [
      String(idx + 1),
      i.aorNo,
      i.description,
      String(i.quantity),
      String(i.wastage),
      i.unit,
      String(i.rate),
      String(i.amount),
      i.remarks,
    ]);
    rows.push(["", "", "Subtotal", "", "", "", "", String(estSubtotal), ""]);
    rows.push(["", "", `Contingency (${contingencyPercent}%)`, "", "", "", "", String(estContingency), ""]);
    rows.push(["", "", "Grand Total", "", "", "", "", String(estGrandTotal), ""]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`estimate-${estTitle.replace(/\s+/g, "-").toLowerCase() || "draft"}`, csv);
  }

  // ==========================================================================
  // Print handlers
  // ==========================================================================

  function handlePrintAOR() {
    const rows = filteredAOR.map((a) => [
      a.itemNo || "—",
      a.description,
      a.category,
      a.unit,
      a.quantity,
      a.materialCost,
      a.labourCost,
      a.machineryCost,
      a.materialRoyalty,
      `${a.overheadPercent}%`,
      `${a.profitPercent}%`,
      aorRate(a),
    ]);
    const scope =
      (aorState === "__ALL__" ? "All States" : aorState) +
      " / " +
      (aorDept === "__ALL__" ? "All Departments" : aorDept) +
      " / " +
      (aorCat === "__ALL__" ? "All Categories" : aorCat);
    const body =
      `<h1>Analysis of Rates</h1><div class="meta">Scope: ${scope}</div>` +
      htmlTable(
        ["AOR No.", "Description", "Category", "Unit", "Qty", "Material", "Labour", "Machinery", "Royalty", "OH%", "Profit%", "Rate (₹)"],
        rows.map((r) => r.map(String)),
        { numericColumns: [3, 4, 5, 6, 7, 8, 11] },
      );
    printHTML("Analysis of Rates", body);
  }

  function handlePrintSOR() {
    const scope =
      (sorState === "__ALL__" ? "All States" : sorState) +
      " / " +
      (sorDept === "__ALL__" ? "All Departments" : sorDept);
    const body =
      `<h1>Schedule of Rates</h1><div class="meta">Scope: ${scope}</div>` +
      htmlTable(
        ["Item No.", "Description", "Material", "Quarry", "Lead (km)", "Lead Rate (₹/km)", "Material ₹", "Labour ₹", "Machinery ₹", "Royalty ₹", "Total ₹"],
        filteredSOR.map((r) => [
          r.itemNo || "—",
          r.description,
          r.materialName || "—",
          r.quarryName || "—",
          r.leadKm,
          r.leadRatePerKm,
          r.materialCost,
          r.labourCost,
          r.machineryCost,
          r.materialRoyalty,
          r.materialCost + r.labourCost + r.machineryCost + r.materialRoyalty,
        ]),
        { numericColumns: [4, 5, 6, 7, 8, 9, 10] },
      );
    printHTML("Schedule of Rates", body);
  }

  function handlePrintEstimate() {
    const headers = ["Sl. No.", "AOR No.", "Item Description", "Quantity", "Wastage %", "Unit", "Rate (₹)", "Amount (₹)", "Remarks"];
    const rows = estItems.map((i, idx) => [
      idx + 1,
      i.aorNo,
      i.description,
      i.quantity,
      i.wastage,
      i.unit,
      i.rate,
      i.amount,
      i.remarks,
    ]);
    const meta = [
      `${projectType}${subType ? ` · ${subType}` : ""}${projectType === "Road" && roadType ? ` · ${roadType}` : ""}`,
      estState,
      estDept,
    ]
      .filter(Boolean)
      .join(" · ");

    const boqRows = estItems.map((i, idx) => [
      idx + 1,
      i.aorNo,
      i.description,
      i.quantity.toFixed(4),
      i.wastage,
      i.quantity * (1 + i.wastage / 100),
      i.amount,
      i.remarks,
    ]);

    const abstractHtml = abstract.length
      ? `<h2>General Abstract</h2>` +
        htmlTable(
          ["Particular", "Amount (₹)"],
          [
            ...abstract.map((r) => [r.name, r.amount]),
            ["Grand Total", abstract.reduce((s, r) => s + r.amount, 0)],
          ],
          { numericColumns: [1], extraClass: "grand" },
        )
      : "";

    const body =
      `<h1>${estTitle || "Detailed Estimate"}</h1>` +
      `<div class="meta">Project: ${projectName} · Type: ${meta} · Client: ${client || "—"} · Location: ${location || "—"} · Date: ${date}</div>` +
      `<h2>Detailed Estimate / Take-off</h2>` +
      htmlTable(headers, rows.map((r) => r.map(String)), { numericColumns: [0, 3, 4, 6, 7] }) +
      `<table><tbody>` +
      `<tr class="total-row"><td class="right" colspan="7">Subtotal</td><td class="num">${estSubtotal}</td><td></td></tr>` +
      `<tr class="total-row"><td class="right" colspan="7">Contingency (${contingencyPercent}%)</td><td class="num">${estContingency}</td><td></td></tr>` +
      `<tr class="grand"><td class="right" colspan="7">Grand Total</td><td class="num">${estGrandTotal}</td><td></td></tr>` +
      `</tbody></table>` +
      `<h2>Bill of Quantities (BOQ)</h2>` +
      htmlTable(
        ["Sl. No.", "AOR No.", "Item Description", "Quantity", "Wastage %", "Total Qty", "Amount (₹)", "Remarks"],
        boqRows.map((r) => r.map(String)),
        { numericColumns: [0, 3, 4, 5, 6] },
      ) +
      abstractHtml;

    printHTML(estTitle || "Detailed Estimate", body);
  }

  // Quarry chart data (from SOR items that carry coordinates)
  const quarryPoints = useMemo(
    () =>
      sorItems
        .filter((r) => r.quarryLat != null && r.quarryLng != null)
        .map((r) => ({
          id: r.id,
          firstName: r.quarryName || r.materialName || "Quarry",
          lastName: "",
          company: r.description,
          phone: r.leadKm ? `Lead distance: ${r.leadKm} km` : "",
          latitude: r.quarryLat,
          longitude: r.quarryLng,
        })),
    [sorItems],
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  const selectCls = "w-full";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estimation / Quantity Take-off</h1>
          <p className="text-sm text-muted-foreground">
            Analysis of Rates, Schedule of Rates, BOQ and detailed estimates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowSaved(!showSaved); setModuleTab("estimation"); }}>
            <Calculator className="mr-2 h-4 w-4" />
            Saved Estimates ({estimations.length})
          </Button>
        </div>
      </div>

      <Tabs value={moduleTab} onValueChange={(v) => setModuleTab(v as "aor" | "sor" | "estimation")}>
        <TabsList>
          <TabsTrigger value="aor">Analysis of Rates (AOR)</TabsTrigger>
          <TabsTrigger value="sor">Schedule of Rates (SOR)</TabsTrigger>
          <TabsTrigger value="estimation">Estimation</TabsTrigger>
        </TabsList>

        {/* ============================== AOR ============================== */}
        <TabsContent value="aor" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters — State &amp; Department</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={aorState} onValueChange={(v) => { if (v) setAORState(v); }}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All States</SelectItem>
                    {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={aorDept} onValueChange={(v) => { if (v) setAORDept(v); }}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SOR Category (Segregation)</Label>
                <Select value={aorCat} onValueChange={(v) => { if (v) setAORCat(v); }}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Categories</SelectItem>
                    {AOR_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{aorForm.id ? "Edit Rate Analysis Item" : "Add Rate Analysis Item"}</CardTitle>
              {aorForm.id && (
                <Button variant="ghost" size="sm" onClick={() => setAORForm(emptyAOR)}>
                  <X className="mr-1 h-4 w-4" /> Cancel edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={aorForm.category} onValueChange={(v) => { if (v) setAORForm({ ...aorForm, category: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AOR_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>AOR No.</Label>
                  <Input value={aorForm.itemNo} onChange={(e) => setAORForm({ ...aorForm, itemNo: e.target.value })} placeholder="e.g. 2.1" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Input value={aorForm.description} onChange={(e) => setAORForm({ ...aorForm, description: e.target.value })} placeholder="e.g. Earthwork in excavation" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={aorForm.unit} onValueChange={(v) => { if (v) setAORForm({ ...aorForm, unit: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={aorForm.quantity} onChange={(e) => setAORForm({ ...aorForm, quantity: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Material Cost (₹)</Label>
                  <Input type="number" value={aorForm.materialCost} onChange={(e) => setAORForm({ ...aorForm, materialCost: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Labour Cost (₹)</Label>
                  <Input type="number" value={aorForm.labourCost} onChange={(e) => setAORForm({ ...aorForm, labourCost: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Machinery Cost (₹)</Label>
                  <Input type="number" value={aorForm.machineryCost} onChange={(e) => setAORForm({ ...aorForm, machineryCost: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Material Royalty (₹)</Label>
                  <Input type="number" value={aorForm.materialRoyalty} onChange={(e) => setAORForm({ ...aorForm, materialRoyalty: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Overhead Charges (%)</Label>
                  <Input type="number" value={aorForm.overheadPercent} onChange={(e) => setAORForm({ ...aorForm, overheadPercent: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Profit / Other % (%)</Label>
                  <Input type="number" value={aorForm.profitPercent} onChange={(e) => setAORForm({ ...aorForm, profitPercent: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Other Charges (₹)</Label>
                  <Input type="number" value={aorForm.otherCharges} onChange={(e) => setAORForm({ ...aorForm, otherCharges: Number(e.target.value) })} />
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-sm">
                  <span className="font-medium">Calculated Rate: </span>
                  <span className="text-lg font-bold text-primary">₹{inr(aorRate(aorForm))}</span>
                </p>
              </div>
              <Button onClick={handleSaveAOR} disabled={isPending || !aorForm.description.trim()}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {aorForm.id ? "Update AOR Item" : "Save AOR Item"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Analysis of Rates — Items ({filteredAOR.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={handlePrintAOR}>
                <Printer className="mr-2 h-4 w-4" /> Print AOR
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AOR No.</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Material</TableHead>
                      <TableHead className="text-right">Labour</TableHead>
                      <TableHead className="text-right">Machinery</TableHead>
                      <TableHead className="text-right">Royalty</TableHead>
                      <TableHead className="text-right">OH%</TableHead>
                      <TableHead className="text-right">Profit%</TableHead>
                      <TableHead className="text-right">Rate (₹)</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAOR.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.itemNo || "—"}</TableCell>
                        <TableCell>{a.description}</TableCell>
                        <TableCell><Badge variant="outline">{a.category}</Badge></TableCell>
                        <TableCell>{a.unit}</TableCell>
                        <TableCell className="text-right">{inr(a.materialCost)}</TableCell>
                        <TableCell className="text-right">{inr(a.labourCost)}</TableCell>
                        <TableCell className="text-right">{inr(a.machineryCost)}</TableCell>
                        <TableCell className="text-right">{inr(a.materialRoyalty)}</TableCell>
                        <TableCell className="text-right">{a.overheadPercent}%</TableCell>
                        <TableCell className="text-right">{a.profitPercent}%</TableCell>
                        <TableCell className="text-right font-bold">₹{inr(aorRate(a))}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditAOR(a)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteAOR(a.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAOR.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">No AOR items</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== SOR ============================== */}
        <TabsContent value="sor" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters — State &amp; Department</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={sorState} onValueChange={(v) => { if (v) setSORState(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All States</SelectItem>
                    {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={sorDept} onValueChange={(v) => { if (v) setSORDept(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{sorForm.id ? "Edit Schedule of Rates Item" : "Add Schedule of Rates Item"}</CardTitle>
              {sorForm.id && (
                <Button variant="ghost" size="sm" onClick={() => setSORForm(emptySOR)}>
                  <X className="mr-1 h-4 w-4" /> Cancel edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label>Link to AOR Item</Label>
                  <Select value={sorForm.aorId} onValueChange={(v) => { if (v) applyAORToSOR(v); }}>
                    <SelectTrigger><SelectValue placeholder="Select AOR item" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">None</SelectItem>
                      {aorItems.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.itemNo ? `${a.itemNo} — ` : ""}{a.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item No.</Label>
                  <Input value={sorForm.itemNo} onChange={(e) => setSORForm({ ...sorForm, itemNo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={sorForm.unit} onChange={(e) => setSORForm({ ...sorForm, unit: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-3">
                  <Label>Description</Label>
                  <Input value={sorForm.description} onChange={(e) => setSORForm({ ...sorForm, description: e.target.value })} />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Lead Statement &amp; Quarry Chart</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <Input value={sorForm.materialName} onChange={(e) => setSORForm({ ...sorForm, materialName: e.target.value })} placeholder="e.g. Coarse Sand" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quarry Name</Label>
                    <Input value={sorForm.quarryName} onChange={(e) => setSORForm({ ...sorForm, quarryName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead Distance (km)</Label>
                    <Input type="number" value={sorForm.leadKm} onChange={(e) => setSORForm({ ...sorForm, leadKm: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lead Rate (₹/km)</Label>
                    <Input type="number" value={sorForm.leadRatePerKm} onChange={(e) => setSORForm({ ...sorForm, leadRatePerKm: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quarry Latitude</Label>
                    <Input type="number" value={sorForm.quarryLat ?? ""} onChange={(e) => setSORForm({ ...sorForm, quarryLat: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quarry Longitude</Label>
                    <Input type="number" value={sorForm.quarryLng ?? ""} onChange={(e) => setSORForm({ ...sorForm, quarryLng: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Material Cost (₹)</Label>
                  <Input type="number" value={sorForm.materialCost} onChange={(e) => setSORForm({ ...sorForm, materialCost: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Labour Cost (₹)</Label>
                  <Input type="number" value={sorForm.labourCost} onChange={(e) => setSORForm({ ...sorForm, labourCost: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Machinery Cost (₹)</Label>
                  <Input type="number" value={sorForm.machineryCost} onChange={(e) => setSORForm({ ...sorForm, machineryCost: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Material Royalty (₹)</Label>
                  <Input type="number" value={sorForm.materialRoyalty} onChange={(e) => setSORForm({ ...sorForm, materialRoyalty: Number(e.target.value) })} />
                </div>
              </div>

              <Button onClick={handleSaveSOR} disabled={isPending || !sorForm.description.trim()}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {sorForm.id ? "Update SOR Item" : "Save SOR Item"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Schedule of Rates — Items ({filteredSOR.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={handlePrintSOR}>
                <Printer className="mr-2 h-4 w-4" /> Print SOR
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item No.</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Quarry</TableHead>
                      <TableHead className="text-right">Lead (km)</TableHead>
                      <TableHead className="text-right">Material ₹</TableHead>
                      <TableHead className="text-right">Labour ₹</TableHead>
                      <TableHead className="text-right">Machinery ₹</TableHead>
                      <TableHead className="text-right">Royalty ₹</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSOR.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.itemNo || "—"}</TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>{r.materialName || "—"}</TableCell>
                        <TableCell>{r.quarryName || "—"}</TableCell>
                        <TableCell className="text-right">{r.leadKm}</TableCell>
                        <TableCell className="text-right">{inr(r.materialCost)}</TableCell>
                        <TableCell className="text-right">{inr(r.labourCost)}</TableCell>
                        <TableCell className="text-right">{inr(r.machineryCost)}</TableCell>
                        <TableCell className="text-right">{inr(r.materialRoyalty)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSOR(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteSOR(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSOR.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No SOR items</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Quarry Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quarryPoints.length > 0 ? (
                <MapComponent contacts={quarryPoints} className="h-[380px] w-full rounded-lg overflow-hidden" />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Add quarry latitude &amp; longitude in an SOR item to plot it on the map.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================== Estimation ============================== */}
        <TabsContent value="estimation" className="space-y-6 mt-4">
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
                    <TableHead>State</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimations.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-emerald-100 text-emerald-700">{e.projectType}{e.subType ? ` · ${e.subType}` : ""}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{e.projectName}</TableCell>
                      <TableCell className="text-muted-foreground">{e.state || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{e.date}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadEstimation(e)}>Load</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteEstimation(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {estimations.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No saved estimates</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimation Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Project Type</Label>
                  <Select value={projectType} onValueChange={(v) => {
                    if (!v) return;
                    setProjectType(v);
                    setSubType(PROJECT_TYPES[v].subtypes[0]);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(PROJECT_TYPES).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sub Type</Label>
                  <Select value={subType} onValueChange={(v) => { if (v) setSubType(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES[projectType].subtypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {projectType === "Road" && (
                  <div className="space-y-2">
                    <Label>Road Type</Label>
                    <Select value={roadType} onValueChange={(v) => { if (v) setRoadType(v); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(PROJECT_TYPES.Road.roadTypes ?? []).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Contingency %</Label>
                  <Input type="number" value={contingencyPercent} onChange={(e) => setContingencyPercent(Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Report Title *</Label>
                  <Input value={estTitle} onChange={(e) => setEstTitle(e.target.value)} placeholder="e.g. SH-12 BOQ" />
                </div>
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <EntityPicker
                    value={projectName}
                    placeholder="Search or type project…"
                    options={projects.map((p) => ({ id: p.id, label: p.name, sublabel: p.code || p.clientName }))}
                    onChange={(v) => { setProjectName(v); setProjectId(""); }}
                    onSelect={(o) => {
                      setProjectName(o.label);
                      setProjectId(o.id);
                      const proj = projects.find((p) => p.id === o.id);
                      if (proj?.clientName && !client) setClient(proj.clientName);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <EntityPicker
                    value={client}
                    placeholder="Search or type client…"
                    options={clients.map((c) => ({ id: c.id, label: c.name, sublabel: c.company }))}
                    onChange={(v) => { setClient(v); setClientId(""); }}
                    onSelect={(o) => { setClient(o.label); setClientId(o.id); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={estState} onChange={(e) => setEstState(e.target.value)} list="est-states" />
                  <datalist id="est-states">
                    {states.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={estDept} onChange={(e) => setEstDept(e.target.value)} list="est-depts" />
                  <datalist id="est-depts">
                    {departments.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Estimate / Take-off */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Detailed Estimate / Take-off</CardTitle>
              <Button variant="outline" size="sm" onClick={addEstItem}>
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-14">Sl. No.</TableHead>
                      <TableHead className="w-20">AOR No.</TableHead>
                      <TableHead>Item Description (search AOR)</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-20">Wastage %</TableHead>
                      <TableHead className="w-20">Unit</TableHead>
                      <TableHead className="w-28">Rate (₹)</TableHead>
                      <TableHead className="w-28">Amount (₹)</TableHead>
                      <TableHead className="w-32">Remarks</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estItems.map((item, idx) => (
                      <TableRow
                        key={idx}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex !== null && dragIndex !== idx) moveEstItem(dragIndex, idx);
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className={dragIndex === idx ? "opacity-50" : ""}
                      >
                        <TableCell className="cursor-grab text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell><Input value={item.aorNo} onChange={(e) => updateEstItem(idx, { aorNo: e.target.value })} className="h-8 px-2 text-sm" /></TableCell>
                        <TableCell>
                          <AorPicker
                            value={item.description}
                            options={relevantAOR}
                            onPick={(a) => pickAORForItem(idx, a)}
                            onChange={(v) => updateEstItem(idx, { description: v })}
                          />
                        </TableCell>
                        <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateEstItem(idx, { quantity: Number(e.target.value) })} className="h-8 px-2 text-sm" /></TableCell>
                        <TableCell><Input type="number" value={item.wastage} onChange={(e) => updateEstItem(idx, { wastage: Number(e.target.value) })} className="h-8 px-2 text-sm" /></TableCell>
                        <TableCell><Input value={item.unit} onChange={(e) => updateEstItem(idx, { unit: e.target.value })} className="h-8 px-2 text-sm" /></TableCell>
                        <TableCell><Input type="number" value={item.rate} onChange={(e) => updateEstItem(idx, { rate: Number(e.target.value) })} className="h-8 px-2 text-sm" /></TableCell>
                        <TableCell className="font-medium text-sm">₹{inr(item.amount)}</TableCell>
                        <TableCell><Input value={item.remarks} onChange={(e) => updateEstItem(idx, { remarks: e.target.value })} className="h-8 px-2 text-sm" /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveEstItem(idx, idx - 1)} disabled={idx === 0}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveEstItem(idx, idx + 1)} disabled={idx === estItems.length - 1}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            {estItems.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeEstItem(idx)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-end gap-6 text-sm">
                <p>Subtotal: <span className="font-bold">₹{inr(estSubtotal)}</span></p>
                <p>Contingency ({contingencyPercent}%): <span className="font-bold">₹{inr(estContingency)}</span></p>
                <p>Grand Total: <span className="text-lg font-bold text-green-600">₹{inr(estGrandTotal)}</span></p>
              </div>
            </CardContent>
          </Card>

          {/* General Abstract */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">General Abstract</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={syncAbstract}>Sync from estimate</Button>
                <Button variant="outline" size="sm" onClick={() => setAbstract((p) => [...p, { name: "", amount: 0 }])}>
                  <Plus className="mr-1 h-4 w-4" /> Add row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particular</TableHead>
                    <TableHead className="w-40 text-right">Amount (₹)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abstract.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input value={row.name} onChange={(e) => setAbstract((p) => p.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={row.amount} onChange={(e) => setAbstract((p) => p.map((r, i) => (i === idx ? { ...r, amount: Number(e.target.value) } : r)))} className="h-8 text-right" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAbstract((p) => p.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">₹{inr(abstract.reduce((s, r) => s + r.amount, 0))}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* BOQ preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill of Quantities (BOQ) — Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sl. No.</TableHead>
                      <TableHead>AOR No.</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Wastage %</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estItems.map((i, idx) => {
                      const totalQty = i.quantity * (1 + i.wastage / 100);
                      return (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{i.aorNo}</TableCell>
                          <TableCell>{i.description}</TableCell>
                          <TableCell className="text-right">{i.quantity.toFixed(4)}</TableCell>
                          <TableCell className="text-right">{i.wastage}</TableCell>
                          <TableCell className="text-right">{totalQty.toFixed(4)}</TableCell>
                          <TableCell className="text-right">₹{inr(i.amount)}</TableCell>
                          <TableCell>{i.remarks}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-green-50">
                      <TableCell colSpan={6} className="text-right font-bold text-green-700">Grand Total</TableCell>
                      <TableCell className="text-right font-bold text-green-700">₹{inr(estGrandTotal)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handlePrintEstimate}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>Export CSV</Button>
            <Button variant="ghost" onClick={resetEstimationForm}>New</Button>
            <Button onClick={handleSaveEstimation} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingEstId ? "Update Estimate" : "Save Estimate"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Lightweight AOR search combobox used inside the estimate item rows
function AorPicker({
  value,
  options,
  onPick,
  onChange,
}: {
  value: string;
  options: AORItem[];
  onPick: (a: AORItem) => void;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const matches = options
    .filter(
      (a) =>
        !q ||
        a.description.toLowerCase().includes(q.toLowerCase()) ||
        a.itemNo.toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 8);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={open ? q : value}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={(e) => {
            if (open) {
              setQ(e.target.value);
            } else {
              onChange(e.target.value);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-8 pl-7 pr-2 text-sm"
          placeholder="Search AOR item…"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-56 overflow-auto">
            {matches.map((a) => (
              <button
                key={a.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(a);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-mono text-xs text-muted-foreground">{a.itemNo || "—"}</span>
                <span className="flex-1">{a.description}</span>
                <span className="text-xs text-muted-foreground">{a.unit}</span>
              </button>
            ))}
            {matches.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matching AOR items</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
