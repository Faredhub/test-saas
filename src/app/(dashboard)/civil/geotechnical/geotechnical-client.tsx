"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import {
  Mountain, Plus, Trash2, Save, Loader2, Play,
  DraftingCompass, Image, X, Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveGeotechnicalReport,
  type GeotechnicalReport,
  type BoreholeRow,
  type LabResultRow,
  type TemplateItem,
} from "@/lib/actions/civil";
import { generateCSV, downloadCSV } from "@/lib/export";
import { printHTML, htmlTable } from "@/lib/print";
import { EntityPicker } from "@/components/civil/entity-picker";

const SOIL_TYPES = [
  "Silty Sand", "Clayey Silt", "Sandy Clay", "Dense Sand",
  "Weathered Rock", "Sandy Loam", "Clayey Sand", "Gravelly Sand",
  "Soft Clay", "Stiff Clay", "Rock", "Laterite",
];

const LAB_TESTS = [
  { name: "Liquid Limit", unit: "%", standard: "IS 2720" },
  { name: "Plastic Limit", unit: "%", standard: "IS 2720" },
  { name: "Specific Gravity", unit: "-", standard: "IS 2720" },
  { name: "CBR (Soaked)", unit: "%", standard: "IS 2720" },
  { name: "CBR (Unsoaked)", unit: "%", standard: "IS 2720" },
  { name: "MDD", unit: "g/cc", standard: "IS 2720" },
  { name: "OMC", unit: "%", standard: "IS 2720" },
  { name: "Cohesion (c)", unit: "kPa", standard: "IS 2720" },
  { name: "Angle of Friction", unit: "deg", standard: "IS 2720" },
];

interface Props {
  initialReports: GeotechnicalReport[];
  templates: TemplateItem[];
  projects: { id: string; name: string; code: string; clientName: string }[];
  clients: { id: string; name: string; company: string }[];
}

export function GeotechnicalClient({ initialReports, templates, projects, clients }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"input" | "results">("input");
  const [reports, setReports] = useState<GeotechnicalReport[]>(initialReports);
  const [showSaved, setShowSaved] = useState(false);

  const [templateType, setTemplateType] = useState<string>(templates[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportTitle, setReportTitle] = useState("");

  const [boreholes, setBoreholes] = useState<Omit<BoreholeRow, "id">[]>([
    { depth: 1.5, soilType: "Silty Sand", sptNValue: 12, moistureContent: 18.5, density: 1.65, description: "" },
  ]);

  const [labResults, setLabResults] = useState<Omit<LabResultRow, "id">[]>([
    { testName: "Liquid Limit", value: 0, unit: "%", standard: "IS 2720" },
  ]);

  const [generatedReport, setGeneratedReport] = useState<GeotechnicalReport | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const selectedTemplate = templates.find((t) => t.id === templateType);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        })
      );
    }
    Promise.all(readers).then((urls) => {
      setPhotos((prev) => [...prev, ...urls]);
    });
    e.target.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function addBorehole() {
    setBoreholes((prev) => [
      ...prev,
      { depth: (prev[prev.length - 1]?.depth ?? 0) + 1.5, soilType: "", sptNValue: 0, moistureContent: 0, density: 0, description: "" },
    ]);
  }

  function removeBorehole(idx: number) {
    setBoreholes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBorehole(idx: number, field: keyof BoreholeRow, value: string | number) {
    setBoreholes((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function addLabTest() {
    setLabResults((prev) => [
      ...prev,
      { testName: "", value: 0, unit: "", standard: "" },
    ]);
  }

  function removeLabTest(idx: number) {
    setLabResults((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLabTest(idx: number, field: keyof LabResultRow, value: string | number) {
    setLabResults((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function pickLabTest(idx: number, test: { name: string; unit: string; standard: string }) {
    setLabResults((prev) => {
      const updated = [...prev];
      updated[idx] = {
        testName: test.name,
        value: 0,
        unit: test.unit,
        standard: test.standard,
      };
      return updated;
    });
  }

  function handleGenerate() {
    if (!projectName.trim() || !reportTitle.trim()) {
      toast.error("Project name and report title are required");
      return;
    }

    const report: GeotechnicalReport = {
      id: "",
      templateType: selectedTemplate?.type ?? "",
      title: reportTitle,
      projectName,
      location,
      client,
      projectId,
      clientId,
      date,
      boreholeData: boreholes.map((bh, i) => ({
        id: `bh-new-${i}`,
        ...bh,
      })),
      labResults: labResults
        .filter((lr) => lr.testName.trim())
        .map((lr, i) => ({
          id: `lab-new-${i}`,
          ...lr,
        })),
      status: "DRAFT",
      photos,
      createdAt: new Date().toISOString(),
    };

    setGeneratedReport(report);
    setPhase("results");
    toast.success("Report generated");
  }

  function handleSave() {
    if (!generatedReport) return;
    startTransition(async () => {
      try {
        const saved = await saveGeotechnicalReport(generatedReport);
        setReports((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [saved, ...prev];
        });
        setGeneratedReport(saved);
        toast.success("Report saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleExportCSV() {
    if (!generatedReport) return;
    const headers = ["Depth (m)", "Soil Type", "SPT N-Value", "Moisture %", "Density (g/cc)", "Description"];
    const rows = generatedReport.boreholeData.map((bh) => [
      String(bh.depth),
      bh.soilType,
      String(bh.sptNValue),
      String(bh.moistureContent),
      String(bh.density),
      bh.description,
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`geotechnical-${generatedReport.title.replace(/\s+/g, "-").toLowerCase()}`, csv);
  }

  function handlePrint() {
    if (!generatedReport) return;
    const body =
      `<h1>${generatedReport.title}</h1>` +
      `<div class="meta">Template: ${generatedReport.templateType} · Project: ${generatedReport.projectName} · Client: ${generatedReport.client || "—"} · Location: ${generatedReport.location || "—"} · Date: ${generatedReport.date}</div>` +
      `<h2>Borehole Data</h2>` +
      htmlTable(
        ["Depth (m)", "Soil Type", "SPT N-Value", "Moisture %", "Density (g/cc)", "Description"],
        generatedReport.boreholeData.map((bh) => [bh.depth, bh.soilType, bh.sptNValue, bh.moistureContent, bh.density, bh.description]),
        { numericColumns: [0, 2, 3, 4] },
      ) +
      `<h2>Laboratory Test Results</h2>` +
      htmlTable(
        ["Test", "Value", "Unit", "Standard"],
        generatedReport.labResults.map((lr) => [lr.testName, lr.value, lr.unit, lr.standard]),
        { numericColumns: [1] },
      ) +
      `<h2>Derived Parameters</h2>` +
      `<p class="meta">Average SPT: ${avgSPT.toFixed(1)} · Estimated CBR: ${cbrEstimated}% · Estimated Bearing Capacity: ${bearingCapacity} kN/m²</p>`;
    printHTML(generatedReport.title, body);
  }

  function loadReport(report: GeotechnicalReport) {
    setGeneratedReport(report);
    setReportTitle(report.title);
    setProjectName(report.projectName);
    setProjectId(report.projectId || "");
    setLocation(report.location);
    setClient(report.client);
    setClientId(report.clientId || "");
    setDate(report.date);
    setBoreholes(report.boreholeData.map((bh) => ({ ...bh })));
    setLabResults(report.labResults.map((lr) => ({ ...lr })));
    setPhotos(report.photos || []);
    setTemplateType(templates.find((t) => t.type === report.templateType)?.id ?? templateType);
    setPhase("results");
    setShowSaved(false);
  }

  const sptChart = generatedReport?.boreholeData.map((bh) => ({
    depth: bh.depth,
    nValue: bh.sptNValue,
    soil: bh.soilType,
  })) ?? [];

  const avgSPT = generatedReport?.boreholeData.length
    ? generatedReport.boreholeData.reduce((s, bh) => s + bh.sptNValue, 0) / generatedReport.boreholeData.length
    : 0;

  const cbrEstimated = avgSPT > 0 ? (avgSPT * 0.22).toFixed(1) : "0";
  const bearingCapacity = avgSPT > 0 ? (avgSPT * 5.5).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Geotechnical Investigation Report</h1>
          <p className="text-sm text-muted-foreground">
            Generate SPT, CBR, Plate Load, and soil classification reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSaved(!showSaved)}>
            <DraftingCompass className="mr-2 h-4 w-4" />
            Saved Reports ({reports.length})
          </Button>
        </div>
      </div>

      {showSaved && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Reports</CardTitle>
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
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700">{r.templateType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                  <TableCell>
                    <Badge className="bg-slate-100 text-slate-700">{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => loadReport(r)}>
                      Load
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No saved reports
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={phase === "input" ? "default" : "ghost"}
          size="sm"
          onClick={() => setPhase("input")}
        >
          Input Data
        </Button>
        <Button
          variant={phase === "results" ? "default" : "ghost"}
          size="sm"
          disabled={!generatedReport}
          onClick={() => setPhase("results")}
        >
          Results
        </Button>
      </div>

      {phase === "input" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Configuration</CardTitle>
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
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Title *</Label>
                  <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="e.g. SPT Investigation Report" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Borehole Data</CardTitle>
              <Button variant="outline" size="sm" onClick={addBorehole}>
                <Plus className="mr-1 h-4 w-4" /> Add Row
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Depth (m)</TableHead>
                      <TableHead>Soil Type</TableHead>
                      <TableHead className="w-24">SPT N</TableHead>
                      <TableHead className="w-28">Moisture %</TableHead>
                      <TableHead className="w-28">Density (g/cc)</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boreholes.map((bh, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={bh.depth}
                            onChange={(e) => updateBorehole(idx, "depth", Number(e.target.value))}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={bh.soilType}
                            onValueChange={(v) => { if (v) updateBorehole(idx, "soilType", v); }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SOIL_TYPES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={bh.sptNValue}
                            onChange={(e) => updateBorehole(idx, "sptNValue", Number(e.target.value))}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={bh.moistureContent}
                            onChange={(e) => updateBorehole(idx, "moistureContent", Number(e.target.value))}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={bh.density}
                            onChange={(e) => updateBorehole(idx, "density", Number(e.target.value))}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={bh.description}
                            onChange={(e) => updateBorehole(idx, "description", e.target.value)}
                            className="h-8 px-2 text-sm"
                            placeholder="Notes"
                          />
                        </TableCell>
                        <TableCell>
                          {boreholes.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeBorehole(idx)} className="h-8 w-8">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Laboratory Test Results</CardTitle>
              <Button variant="outline" size="sm" onClick={addLabTest}>
                <Plus className="mr-1 h-4 w-4" /> Add Test
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead className="w-24">Value</TableHead>
                      <TableHead className="w-20">Unit</TableHead>
                      <TableHead className="w-28">Standard</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labResults.map((lr, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={lr.testName}
                            onValueChange={(v) => {
                              const test = LAB_TESTS.find((t) => t.name === v);
                              if (test) pickLabTest(idx, test);
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select test" />
                            </SelectTrigger>
                            <SelectContent>
                              {LAB_TESTS.map((t) => (
                                <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={lr.value}
                            onChange={(e) => updateLabTest(idx, "value", Number(e.target.value))}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={lr.unit}
                            onChange={(e) => updateLabTest(idx, "unit", e.target.value)}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={lr.standard}
                            onChange={(e) => updateLabTest(idx, "standard", e.target.value)}
                            className="h-8 px-2 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          {labResults.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeLabTest(idx)} className="h-8 w-8">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Label>Site Photos</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent transition-colors text-sm">
                    <Image className="h-4 w-4" />
                    Add Photos
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <span className="text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""} selected</span>
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border aspect-square">
                        <img src={url} alt={`Site photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Upload site photographs for the report annexure</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button onClick={handleGenerate} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>
      )}

      {phase === "results" && generatedReport && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{generatedReport.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {generatedReport.projectName} &middot; {generatedReport.location} &middot; {generatedReport.client}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-amber-100 text-amber-700">{generatedReport.templateType}</Badge>
                  <Badge className="bg-slate-100 text-slate-700">{generatedReport.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Total Boreholes</p>
                  <p className="text-xl font-bold text-amber-700">{generatedReport.boreholeData.length}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Avg SPT N-Value</p>
                  <p className="text-xl font-bold text-blue-700">{avgSPT.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">CBR (Estimated)</p>
                  <p className="text-xl font-bold text-green-700">{cbrEstimated}%</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <p className="text-xs text-purple-600 font-medium">Bearing Capacity</p>
                  <p className="text-xl font-bold text-purple-700">{bearingCapacity} kN/m\u00B2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SPT N-Value vs Depth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sptChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="depth" label={{ value: "Depth (m)", position: "insideBottom", offset: -5 }} tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: "SPT N", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="nValue" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Soil Profile (SPT per depth)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sptChart} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="depth" type="category" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}m - ${sptChart.find((d) => d.depth === v)?.soil ?? ""}`} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="nValue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Borehole Summary</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depth (m)</TableHead>
                  <TableHead>Soil Type</TableHead>
                  <TableHead>SPT N</TableHead>
                  <TableHead>Moisture %</TableHead>
                  <TableHead>Density (g/cc)</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReport.boreholeData.map((bh) => (
                  <TableRow key={bh.id}>
                    <TableCell className="font-medium">{bh.depth}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bh.soilType}</Badge>
                    </TableCell>
                    <TableCell>{bh.sptNValue}</TableCell>
                    <TableCell>{bh.moistureContent}</TableCell>
                    <TableCell>{bh.density}</TableCell>
                    <TableCell className="text-muted-foreground">{bh.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {generatedReport.labResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Laboratory Test Results</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Standard</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedReport.labResults.map((lr) => (
                    <TableRow key={lr.id}>
                      <TableCell className="font-medium">{lr.testName}</TableCell>
                      <TableCell>{lr.value}</TableCell>
                      <TableCell>{lr.unit}</TableCell>
                      <TableCell className="text-muted-foreground">{lr.standard}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Calculations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Estimated CBR Value</p>
                  <p className="text-2xl font-bold text-amber-600">{cbrEstimated}%</p>
                  <p className="text-xs text-muted-foreground mt-1">From SPT correlation: CBR = 0.22 &times; N</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Allowable Bearing Capacity</p>
                  <p className="text-2xl font-bold text-blue-600">{bearingCapacity} kN/m\u00B2</p>
                  <p className="text-xs text-muted-foreground mt-1">From SPT correlation: q<sub>a</sub> = 5.5 &times; N</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Soil Classification</p>
                  <p className="text-lg font-bold text-purple-600">
                    {avgSPT <= 4 ? "Very Soft" : avgSPT <= 8 ? "Soft" : avgSPT <= 15 ? "Medium" : avgSPT <= 30 ? "Stiff" : avgSPT <= 50 ? "Very Stiff" : "Hard / Rock"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Based on average SPT N-value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {generatedReport.photos && generatedReport.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Site Photographs ({generatedReport.photos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {generatedReport.photos.map((url, i) => (
                    <div key={i} className="rounded-lg border overflow-hidden">
                      <img src={url} alt={`Site photo ${i + 1}`} className="w-full h-48 object-cover hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open(url, "_blank")} />
                      <p className="text-xs text-center py-1 text-muted-foreground">Photo {i + 1}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
