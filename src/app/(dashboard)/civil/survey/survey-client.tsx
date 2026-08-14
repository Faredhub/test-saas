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
} from "recharts";
import {
  MapPin, Plus, Trash2, Save, Loader2, Play,
  Image, X, Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveSurveyReport,
  type SurveyReport,
  type SurveyStationRow,
  type TemplateItem,
} from "@/lib/actions/civil";
import { generateCSV, downloadCSV } from "@/lib/export";
import { printHTML, htmlTable } from "@/lib/print";
import { EntityPicker } from "@/components/civil/entity-picker";

const INSTRUMENTS = ["Total Station", "DGPS", "Auto Level", "Theodolite", "GPS RTK"];

interface Props {
  initialReports: SurveyReport[];
  templates: TemplateItem[];
  projects: { id: string; name: string; code: string; clientName: string }[];
  clients: { id: string; name: string; company: string }[];
}

export function SurveyClient({ initialReports, templates, projects, clients }: Props) {
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"input" | "results">("input");
  const [reports, setReports] = useState<SurveyReport[]>(initialReports);
  const [showSaved, setShowSaved] = useState(false);

  const [templateType, setTemplateType] = useState<string>(templates[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportTitle, setReportTitle] = useState("");
  const [instrument, setInstrument] = useState<string>("Total Station");
  const [benchmarkElevation, setBenchmarkElevation] = useState(0);

  const [stations, setStations] = useState<Omit<SurveyStationRow, "id">[]>([
    { station: "BM-01", chainage: 0, northing: 0, easting: 0, elevation: 0, description: "Benchmark" },
  ]);

  const [generatedReport, setGeneratedReport] = useState<SurveyReport | null>(null);
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

  function addStation() {
    const last = stations[stations.length - 1];
    setStations((prev) => [
      ...prev,
      {
        station: `TP-${String(prev.length).padStart(2, "0")}`,
        chainage: (last?.chainage ?? 0) + 250,
        northing: 0,
        easting: 0,
        elevation: 0,
        description: "",
      },
    ]);
  }

  function removeStation(idx: number) {
    setStations((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStation(idx: number, field: keyof SurveyStationRow, value: string | number) {
    setStations((prev) => {
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
    if (stations.some((s) => !s.station.trim())) {
      toast.error("All stations must have a station ID");
      return;
    }

    const report: SurveyReport = {
      id: "",
      templateType: selectedTemplate?.type ?? "",
      title: reportTitle,
      projectName,
      location,
      client,
      projectId,
      clientId,
      date,
      instrument,
      benchmarkElevation,
      stationData: stations.map((s, i) => ({
        id: `st-new-${i}`,
        ...s,
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
        const saved = await saveSurveyReport(generatedReport);
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
    const headers = ["Station", "Chainage (m)", "Northing", "Easting", "Elevation (m)", "Description"];
    const rows = generatedReport.stationData.map((s) => [
      s.station,
      String(s.chainage),
      s.northing.toFixed(3),
      s.easting.toFixed(3),
      s.elevation.toFixed(3),
      s.description,
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(`survey-${generatedReport.title.replace(/\s+/g, "-").toLowerCase()}`, csv);
  }

  function handlePrint() {
    if (!generatedReport) return;
    const body =
      `<h1>${generatedReport.title}</h1>` +
      `<div class="meta">Template: ${generatedReport.templateType} · Project: ${generatedReport.projectName} · Client: ${generatedReport.client || "—"} · Location: ${generatedReport.location || "—"} · Date: ${generatedReport.date}</div>` +
      `<p class="meta">Instrument: ${generatedReport.instrument || "—"} · Benchmark Elevation: ${generatedReport.benchmarkElevation} m</p>` +
      `<h2>Station Data</h2>` +
      htmlTable(
        ["Station", "Chainage (m)", "Northing", "Easting", "Elevation (m)", "Description"],
        generatedReport.stationData.map((s) => [s.station, s.chainage, s.northing.toFixed(3), s.easting.toFixed(3), s.elevation.toFixed(3), s.description]),
        { numericColumns: [1, 2, 3, 4] },
      );
    printHTML(generatedReport.title, body);
  }

  function loadReport(report: SurveyReport) {
    setGeneratedReport(report);
    setReportTitle(report.title);
    setProjectName(report.projectName);
    setProjectId(report.projectId || "");
    setLocation(report.location);
    setClient(report.client);
    setClientId(report.clientId || "");
    setDate(report.date);
    setInstrument(report.instrument);
    setBenchmarkElevation(report.benchmarkElevation);
    setStations(report.stationData.map((s) => ({ ...s })));
    setPhotos(report.photos || []);
    setTemplateType(templates.find((t) => t.type === report.templateType)?.id ?? templateType);
    setPhase("results");
    setShowSaved(false);
  }

  const profileChart = generatedReport?.stationData.map((s) => ({
    chainage: s.chainage,
    elevation: s.elevation,
    station: s.station,
  })) ?? [];

  const minElev = profileChart.length ? Math.min(...profileChart.map((d) => d.elevation)) : 0;
  const maxElev = profileChart.length ? Math.max(...profileChart.map((d) => d.elevation)) : 0;
  const totalLength = profileChart.length ? profileChart[profileChart.length - 1].chainage : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Survey Report</h1>
          <p className="text-sm text-muted-foreground">
            Generate road, site, canal, and boundary survey reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSaved(!showSaved)}>
            <MapPin className="mr-2 h-4 w-4" />
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
                <TableHead>Instrument</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">{r.templateType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.instrument}</TableCell>
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
                  <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="e.g. Topographic Survey Report" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Instrument Used</Label>
                  <Select value={instrument} onValueChange={(v) => { if (v) setInstrument(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUMENTS.map((ins) => (
                        <SelectItem key={ins} value={ins}>{ins}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Benchmark Elevation (m)</Label>
                  <Input type="number" step="0.001" value={benchmarkElevation} onChange={(e) => setBenchmarkElevation(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Survey Station Data</CardTitle>
              <Button variant="outline" size="sm" onClick={addStation}>
                <Plus className="mr-1 h-4 w-4" /> Add Station
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Station ID</TableHead>
                      <TableHead className="w-28">Chainage (m)</TableHead>
                      <TableHead className="w-32">Northing</TableHead>
                      <TableHead className="w-32">Easting</TableHead>
                      <TableHead className="w-28">Elevation (m)</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map((s, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input value={s.station} onChange={(e) => updateStation(idx, "station", e.target.value)} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={s.chainage} onChange={(e) => updateStation(idx, "chainage", Number(e.target.value))} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.001" value={s.northing} onChange={(e) => updateStation(idx, "northing", Number(e.target.value))} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.001" value={s.easting} onChange={(e) => updateStation(idx, "easting", Number(e.target.value))} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.001" value={s.elevation} onChange={(e) => updateStation(idx, "elevation", Number(e.target.value))} className="h-8 px-2 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input value={s.description} onChange={(e) => updateStation(idx, "description", e.target.value)} className="h-8 px-2 text-sm" placeholder="Notes" />
                        </TableCell>
                        <TableCell>
                          {stations.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeStation(idx)} className="h-8 w-8">
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
                  <Badge className="bg-blue-100 text-blue-700">{generatedReport.templateType}</Badge>
                  <Badge className="bg-slate-100 text-slate-700">{generatedReport.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Total Stations</p>
                  <p className="text-xl font-bold text-blue-700">{generatedReport.stationData.length}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Total Length</p>
                  <p className="text-xl font-bold text-amber-700">{new Intl.NumberFormat("en-IN").format(totalLength)} m</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Min Elevation</p>
                  <p className="text-xl font-bold text-green-700">{minElev.toFixed(3)} m</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 text-center">
                  <p className="text-xs text-purple-600 font-medium">Max Elevation</p>
                  <p className="text-xl font-bold text-purple-700">{maxElev.toFixed(3)} m</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Instrument</p>
                  <p className="text-sm font-semibold">{generatedReport.instrument}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Benchmark Elevation</p>
                  <p className="text-sm font-semibold">{generatedReport.benchmarkElevation.toFixed(3)} m</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Elevation Difference</p>
                  <p className="text-sm font-semibold">{(maxElev - minElev).toFixed(3)} m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Longitudinal Section (Elevation vs Chainage)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profileChart} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="chainage" label={{ value: "Chainage (m)", position: "insideBottom", offset: -5 }} tick={{ fontSize: 12 }} />
                    <YAxis label={{ value: "Elevation (m)", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                      formatter={(val: unknown) => [`${Number(val).toFixed(3)} m`, "Elevation"]}
                    />
                    <Line type="monotone" dataKey="elevation" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordinates Summary</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Chainage (m)</TableHead>
                  <TableHead>Northing</TableHead>
                  <TableHead>Easting</TableHead>
                  <TableHead>Elevation (m)</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReport.stationData.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.station}</TableCell>
                    <TableCell>{new Intl.NumberFormat("en-IN").format(s.chainage)}</TableCell>
                    <TableCell>{s.northing.toFixed(3)}</TableCell>
                    <TableCell>{s.easting.toFixed(3)}</TableCell>
                    <TableCell>{s.elevation.toFixed(3)}</TableCell>
                    <TableCell className="text-muted-foreground">{s.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
