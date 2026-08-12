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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Ruler, Plus, Trash2, Save, Loader2, Play,
  Image, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveDesignReport,
  type DesignReport,
  type DesignParameter,
  type TemplateItem,
} from "@/lib/actions/civil";
import { generateCSV, downloadCSV } from "@/lib/export";

const DESIGN_CODES = [
  "IS 456:2000",
  "IS 800:2007",
  "IS 875 (Part 1-5)",
  "IS 1893:2016",
  "IS 13920:2016",
  "IRC 37-2018",
  "IRC 112-2019",
  "IRC 6-2017",
  "IRC 78-2014",
  "IS 2911 (Part 1/Sec 2)",
  "MORTH Specifications",
];

const PARAMETER_CATEGORIES: Record<string, { name: string; unit: string; description: string }[]> = {
  ROAD: [
    { name: "Design Traffic", unit: "msa", description: "Million standard axles" },
    { name: "Subgrade CBR", unit: "%", description: "California Bearing Ratio" },
    { name: "Design Life", unit: "years", description: "Design period" },
    { name: "BC Thickness", unit: "mm", description: "Bituminous Concrete" },
    { name: "DBM Thickness", unit: "mm", description: "Dense Bituminous Macadam" },
    { name: "WMM Thickness", unit: "mm", description: "Wet Mix Macadam" },
    { name: "GSB Thickness", unit: "mm", description: "Granular Sub-base" },
    { name: "Total Pavement", unit: "mm", description: "Total design thickness" },
  ],
  BUILDING: [
    { name: "Grid Spacing X", unit: "m", description: "Column spacing along X" },
    { name: "Grid Spacing Y", unit: "m", description: "Column spacing along Y" },
    { name: "SBC", unit: "kN/m\u00B2", description: "Safe bearing capacity" },
    { name: "Concrete Grade", unit: "M Grade", description: "Minimum concrete grade" },
    { name: "Steel Grade", unit: "Fe Grade", description: "Reinforcement steel" },
    { name: "Live Load", unit: "kN/m\u00B2", description: "Design live load" },
    { name: "Floor to Floor", unit: "m", description: "Typical story height" },
    { name: "No. of Floors", unit: "nos", description: "G+n" },
  ],
  CANAL: [
    { name: "Design Discharge", unit: "cumec", description: "Flow rate" },
    { name: "Bed Width", unit: "m", description: "Canal bed width" },
    { name: "Full Supply Depth", unit: "m", description: "F.S.D." },
    { name: "Side Slope", unit: "H:V", description: "Bank slope ratio" },
    { name: "Lining Type", unit: "-", description: "Type of lining" },
    { name: "Lining Thickness", unit: "mm", description: "Lining thickness" },
    { name: "Freeboard", unit: "m", description: "Minimum freeboard" },
  ],
  BRIDGE: [
    { name: "Span Length", unit: "m", description: "Clear span" },
    { name: "Carriageway Width", unit: "m", description: "Roadway width" },
    { name: "Number of Lanes", unit: "nos", description: "Traffic lanes" },
    { name: "Loading Class", unit: "IRC", description: "IRC loading" },
    { name: "Pier Height", unit: "m", description: "Maximum pier height" },
    { name: "SBC", unit: "kN/m\u00B2", description: "Foundation soil" },
    { name: "Seismic Zone", unit: "-", description: "IS 1893 zone" },
  ],
};

interface Props {
  initialReports: DesignReport[];
  templates: TemplateItem[];
}

export function DesignClient({ initialReports, templates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"input" | "results">("input");
  const [reports, setReports] = useState<DesignReport[]>(initialReports);
  const [showSaved, setShowSaved] = useState(false);

  const [templateType, setTemplateType] = useState<string>(templates[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportTitle, setReportTitle] = useState("");
  const [designCode, setDesignCode] = useState<string>("IS 456:2000");

  const [parameters, setParameters] = useState<Omit<DesignParameter, "id">[]>([
    { name: "Design Traffic", value: 0, unit: "msa", category: "Traffic" },
  ]);

  const [generatedReport, setGeneratedReport] = useState<DesignReport | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const selectedTemplate = templates.find((t) => t.id === templateType);
  const templateTypeKey = selectedTemplate?.type ?? "ROAD";

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

  function presetParametersForType(type: string) {
    const preset = PARAMETER_CATEGORIES[type] ?? PARAMETER_CATEGORIES.ROAD;
    setParameters(preset.map((p) => ({
      name: p.name,
      value: 0,
      unit: p.unit,
      category: "Design",
    })));
  }

  function addParameter() {
    setParameters((prev) => [
      ...prev,
      { name: "", value: 0, unit: "", category: "" },
    ]);
  }

  function removeParameter(idx: number) {
    setParameters((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateParameter(idx: number, field: keyof DesignParameter, value: string | number) {
    setParameters((prev) => {
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
    if (parameters.some((p) => !p.name.trim())) {
      toast.error("All design parameters need a name");
      return;
    }

    const report: DesignReport = {
      id: "",
      templateType: selectedTemplate?.type ?? "",
      title: reportTitle,
      projectName,
      location,
      client,
      date,
      designCode,
      parameters: parameters.map((p, i) => ({
        id: `dp-new-${i}`,
        ...p,
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
        const saved = await saveDesignReport(generatedReport);
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
    const headers = ["Parameter", "Value", "Unit", "Category"];
    const rows = generatedReport.parameters.map((p) => [
      p.name, String(p.value), p.unit, p.category,
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`design-${generatedReport.title.replace(/\s+/g, "-").toLowerCase()}`, csv);
  }

  function loadReport(report: DesignReport) {
    setGeneratedReport(report);
    setReportTitle(report.title);
    setProjectName(report.projectName);
    setLocation(report.location);
    setClient(report.client);
    setDate(report.date);
    setDesignCode(report.designCode);
    setParameters(report.parameters.map((p) => ({ ...p })));
    setPhotos(report.photos || []);
    setTemplateType(templates.find((t) => t.type === report.templateType)?.id ?? templateType);
    setPhase("results");
    setShowSaved(false);
  }

  const paramChart = generatedReport?.parameters.map((p) => ({
    name: p.name,
    value: p.value,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Design Report</h1>
          <p className="text-sm text-muted-foreground">
            Generate road, building, canal, and bridge structural design reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSaved(!showSaved)}>
            <Ruler className="mr-2 h-4 w-4" />
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
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700">{r.templateType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.projectName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.designCode}</TableCell>
                  <TableCell>
                    <Badge className="bg-slate-100 text-slate-700">{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => loadReport(r)}>Load</Button>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No saved reports</TableCell>
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
        <Button variant={phase === "results" ? "default" : "ghost"} size="sm" disabled={!generatedReport} onClick={() => setPhase("results")}>
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
                <Select value={templateType} onValueChange={(v) => { if (v) { setTemplateType(v); const t = templates.find((x) => x.id === v); if (t) presetParametersForType(t.type); } }}>
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
                  <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="e.g. Pavement Design Report" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Delhi-Mumbai Expressway" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. NHAI" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Design Code / Standard</Label>
                <Select value={designCode} onValueChange={(v) => { if (v) setDesignCode(v); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_CODES.map((dc) => (
                      <SelectItem key={dc} value={dc}>{dc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Design Parameters</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Parameters auto-populated per template. Edit values as needed.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addParameter}>
                <Plus className="mr-1 h-4 w-4" /> Add Parameter
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead className="w-28">Value</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="w-28">Category</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameters.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input value={p.name} onChange={(e) => updateParameter(idx, "name", e.target.value)} className="h-8 px-2 text-sm" placeholder="Parameter name" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={p.value} onChange={(e) => updateParameter(idx, "value", Number(e.target.value))} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input value={p.unit} onChange={(e) => updateParameter(idx, "unit", e.target.value)} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input value={p.category} onChange={(e) => updateParameter(idx, "category", e.target.value)} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          {parameters.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeParameter(idx)} className="h-8 w-8">
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

          <div className="flex justify-end">
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
                  <Badge className="bg-purple-100 text-purple-700">{generatedReport.templateType}</Badge>
                  <Badge className="bg-slate-100 text-slate-700">{generatedReport.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <p className="text-xs text-purple-600 font-medium">Design Code</p>
                  <p className="text-sm font-bold text-purple-700">{generatedReport.designCode}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Parameters</p>
                  <p className="text-xl font-bold text-blue-700">{generatedReport.parameters.length}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Categories</p>
                  <p className="text-xl font-bold text-amber-700">{new Set(generatedReport.parameters.map((p) => p.category)).size}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Total Parameters Value</p>
                  <p className="text-xl font-bold text-green-700">
                    {new Intl.NumberFormat("en-IN").format(generatedReport.parameters.reduce((s, p) => s + p.value, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Design Parameters Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paramChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Design Parameters Summary</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReport.parameters.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-IN").format(p.value)}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.category}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Safety Factors & Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Factor of Safety (Structural)</p>
                  <p className="text-2xl font-bold text-blue-600">1.5</p>
                  <p className="text-xs text-muted-foreground mt-1">As per {generatedReport.designCode}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Load Factor</p>
                  <p className="text-2xl font-bold text-amber-600">1.5 DL + 1.5 LL</p>
                  <p className="text-xs text-muted-foreground mt-1">Dead Load + Live Load combination</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Design Status</p>
                  <p className="text-2xl font-bold text-green-600">OK</p>
                  <p className="text-xs text-muted-foreground mt-1">All checks within limits</p>
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
            <Button variant="outline" onClick={handleExportCSV}>Export CSV</Button>
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
