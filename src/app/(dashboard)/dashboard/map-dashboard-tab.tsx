"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Package, Navigation, MapPin, Clock } from "lucide-react";

type MapDashboardTabProps = {
  projectsExt: any;
};

type MovementEntry = {
  name: string;
  role?: string;
  from: string;
  to: string;
  status: string;
  time: string;
};

type AssetMovement = {
  name: string;
  type: string;
  from: string;
  to: string;
  status: string;
  time: string;
};

const HR_MOVEMENTS: MovementEntry[] = [
  { name: "Rahul Sharma", role: "Site Engineer", from: "Office HQ", to: "Bridge Project Alpha", status: "En Route", time: "08:45 AM" },
  { name: "Priya Mehta", role: "Project Manager", from: "Commercial Tower B", to: "Highway Extension", status: "In Transit", time: "09:10 AM" },
  { name: "Arjun Patel", role: "Civil Supervisor", from: "Site Camp", to: "Bridge Project Alpha", status: "On Site", time: "07:30 AM" },
  { name: "Kavita Singh", role: "QA Inspector", from: "Office HQ", to: "Commercial Tower B", status: "En Route", time: "09:45 AM" },
  { name: "Deepak Rao", role: "Equipment Operator", from: "Workshop", to: "Highway Extension", status: "On Site", time: "06:30 AM" },
  { name: "Sneha Verma", role: "Safety Officer", from: "Office HQ", to: "Bridge Project Alpha", status: "Returning", time: "05:00 PM" },
];

const ASSET_MOVEMENTS: AssetMovement[] = [
  { name: "JCB Excavator #01", type: "Heavy Equipment", from: "Depot Yard", to: "Highway Extension", status: "Deployed", time: "06:00 AM" },
  { name: "Concrete Mixer #3", type: "Machinery", from: "Commercial Tower B", to: "Bridge Project Alpha", status: "In Transit", time: "10:30 AM" },
  { name: "Survey Kit #02", type: "Instruments", from: "Office Store", to: "New Site Survey", status: "Deployed", time: "08:15 AM" },
  { name: "Scaffolding Set A", type: "Materials", from: "Depot Yard", to: "Commercial Tower B", status: "Deployed", time: "07:00 AM" },
  { name: "Generator #04", type: "Power Equipment", from: "Highway Extension", to: "Depot Yard", status: "Returning", time: "04:00 PM" },
];

const MOCK_SITES = [
  { id: 1, name: "Bridge Project Alpha", lat: 28.6139, lng: 77.2090, status: "Active", workers: 24 },
  { id: 2, name: "Commercial Tower B", lat: 12.9716, lng: 77.5946, status: "Active", workers: 18 },
  { id: 3, name: "Highway Extension", lat: 19.0760, lng: 72.8777, status: "Active", workers: 31 },
  { id: 4, name: "Industrial Zone C", lat: 22.5726, lng: 88.3639, status: "Idle", workers: 0 },
];

const statusColor: Record<string, string> = {
  "En Route": "bg-blue-100 text-blue-700 border-blue-300",
  "In Transit": "bg-amber-100 text-amber-700 border-amber-300",
  "On Site": "bg-green-100 text-green-700 border-green-300",
  "Returning": "bg-purple-100 text-purple-700 border-purple-300",
  "Deployed": "bg-green-100 text-green-700 border-green-300",
};

export function MapDashboardTab({ projectsExt }: MapDashboardTabProps) {
  const [period, setPeriod] = useState<"today" | "month" | "year">("today");

  const ongoingProjects = projectsExt?.projects?.filter((p: any) => p.status === "IN_PROGRESS") || [];
  const sites: typeof MOCK_SITES = ongoingProjects.length > 0
    ? ongoingProjects.slice(0, 4).map((p: any, i: number) => ({
        ...MOCK_SITES[i % MOCK_SITES.length],
        name: p.name,
        id: p.id,
      }))
    : MOCK_SITES;

  const activeSites = sites.filter(s => s.status === "Active").length;
  const totalWorkers = sites.reduce((sum, s) => sum + s.workers, 0);
  const hrMovingCount = HR_MOVEMENTS.filter(h => h.status === "En Route" || h.status === "In Transit").length;
  const assetsMovingCount = ASSET_MOVEMENTS.filter(a => a.status === "In Transit").length;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeSites}</div>
            <p className="text-xs text-muted-foreground">of {sites.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workers On-Site</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalWorkers}</div>
            <p className="text-xs text-muted-foreground">Currently deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">HR Moving</CardTitle>
            <Navigation className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{hrMovingCount}</div>
            <p className="text-xs text-muted-foreground">En route / in transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assets Moving</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{assetsMovingCount}</div>
            <p className="text-xs text-muted-foreground">In transit now</p>
          </CardContent>
        </Card>
      </div>

      {/* Period toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        {(["today", "month", "year"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-all capitalize ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {p === "today" ? "Today" : p === "month" ? "This Month" : "This Year"}
          </button>
        ))}
      </div>

      <Tabs defaultValue="hr" className="w-full">
        <TabsList>
          <TabsTrigger value="hr" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> HR Movement
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Asset Movement
          </TabsTrigger>
        </TabsList>

        {/* HR Movement */}
        <TabsContent value="hr">
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* OSM Map placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" /> Site Map — HR Locations
                </CardTitle>
                <CardDescription>Current & older HR positions ({period === "today" ? "Today" : period === "month" ? "This Month" : "This Year"})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[280px] rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border">
                  {/* SVG India map placeholder */}
                  <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
                    <rect width="400" height="300" fill="url(#mapGrad)" />
                    <defs>
                      <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#e0f2fe" />
                        <stop offset="100%" stopColor="#bfdbfe" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <line key={`h${i}`} x1="0" y1={i * 75} x2="400" y2={i * 75} stroke="#93c5fd" strokeWidth="0.5" />
                    ))}
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <line key={`v${i}`} x1={i * 80} y1="0" x2={i * 80} y2="300" stroke="#93c5fd" strokeWidth="0.5" />
                    ))}
                    {/* Site pins */}
                    {sites.map((site, i) => {
                      const px = 60 + (i * 80);
                      const py = 60 + (i % 2 === 0 ? 40 : 120);
                      return (
                        <g key={site.id}>
                          <circle cx={px} cy={py} r="14" fill={site.status === "Active" ? "#10b981" : "#9ca3af"} opacity="0.25" />
                          <circle cx={px} cy={py} r="7" fill={site.status === "Active" ? "#10b981" : "#9ca3af"} />
                          <text x={px} y={py + 22} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="bold">
                            {site.name.slice(0, 10)}
                          </text>
                          {/* HR movement lines */}
                          {i < sites.length - 1 && (
                            <line x1={px} y1={py} x2={60 + ((i + 1) * 80)} y2={60 + ((i + 1) % 2 === 0 ? 40 : 120)}
                              stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                          )}
                        </g>
                      );
                    })}
                    {/* Moving HR dots */}
                    {HR_MOVEMENTS.filter(h => h.status === "En Route").map((h, i) => {
                      const px = 80 + (i * 70);
                      const py = 100 + (i * 30);
                      return (
                        <g key={i}>
                          <circle cx={px} cy={py} r="5" fill="#f59e0b" opacity="0.9">
                            <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Active Site</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /> HR Moving</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-xs px-2 py-1 rounded-md border text-muted-foreground">
                    OSM integration pending
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HR Movement Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-blue-500" /> HR Movement Log
                </CardTitle>
                <CardDescription>Personnel movement tracking — {period === "today" ? "Today" : period === "month" ? "This Month" : "This Year"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {HR_MOVEMENTS.map((hr, i) => (
                    <div key={i} className="flex items-start justify-between border-b pb-2.5 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium">{hr.name}</p>
                        <p className="text-xs text-muted-foreground">{hr.role}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <span className="text-slate-500 truncate max-w-[80px]">{hr.from}</span>
                          <span>→</span>
                          <span className="text-blue-600 truncate max-w-[80px]">{hr.to}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[hr.status] || "bg-muted text-muted-foreground"}`}>
                          {hr.status}
                        </span>
                        <div className="flex items-center gap-1 justify-end mt-1 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" /> {hr.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Asset Movement */}
        <TabsContent value="assets">
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" /> Asset Map — Deployment
                </CardTitle>
                <CardDescription>Current & older asset positions ({period === "today" ? "Today" : period === "month" ? "This Month" : "This Year"})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[280px] rounded-lg overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 border">
                  <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
                    <rect width="400" height="300" fill="url(#assetMapGrad)" />
                    <defs>
                      <linearGradient id="assetMapGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="100%" stopColor="#fed7aa" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3, 4].map(i => (
                      <line key={`ah${i}`} x1="0" y1={i * 75} x2="400" y2={i * 75} stroke="#fbbf24" strokeWidth="0.5" />
                    ))}
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <line key={`av${i}`} x1={i * 80} y1="0" x2={i * 80} y2="300" stroke="#fbbf24" strokeWidth="0.5" />
                    ))}
                    {ASSET_MOVEMENTS.map((asset, i) => {
                      const px = 50 + (i * 75);
                      const py = 80 + (i % 2 === 0 ? 30 : 110);
                      return (
                        <g key={i}>
                          <rect x={px - 10} y={py - 7} width="20" height="14" rx="3"
                            fill={asset.status === "Deployed" ? "#f59e0b" : asset.status === "In Transit" ? "#3b82f6" : "#8b5cf6"}
                            opacity="0.85" />
                          <text x={px} y={py + 3} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">
                            {asset.type.slice(0, 3).toUpperCase()}
                          </text>
                          <text x={px} y={py + 24} textAnchor="middle" fontSize="8" fill="#374151">
                            {asset.name.slice(0, 12)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-400" /> Deployed</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-500" /> In Transit</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-purple-500" /> Returning</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-xs px-2 py-1 rounded-md border text-muted-foreground">
                    OSM integration pending
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Movement Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" /> Asset Movement Log
                </CardTitle>
                <CardDescription>Equipment tracking — {period === "today" ? "Today" : period === "month" ? "This Month" : "This Year"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ASSET_MOVEMENTS.map((asset, i) => (
                    <div key={i} className="flex items-start justify-between border-b pb-2.5 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.type}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <span className="text-slate-500 truncate max-w-[80px]">{asset.from}</span>
                          <span>→</span>
                          <span className="text-amber-600 truncate max-w-[80px]">{asset.to}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[asset.status] || "bg-muted text-muted-foreground"}`}>
                          {asset.status}
                        </span>
                        <div className="flex items-center gap-1 justify-end mt-1 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" /> {asset.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
