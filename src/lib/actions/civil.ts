"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { tenantScope } from "@/lib/db";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as Record<string, unknown>;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// Types
// ============================================================================

export type CivilReportStatus = "DRAFT" | "FINAL" | "APPROVED" | "ARCHIVED";

export interface GeotechnicalReport {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string;
  client: string;
  date: string;
  boreholeData: BoreholeRow[];
  labResults: LabResultRow[];
  photos: string[];
  reportData?: Record<string, unknown>;
  status: CivilReportStatus;
  createdAt: string;
}

export interface BoreholeRow {
  id: string;
  depth: number;
  soilType: string;
  sptNValue: number;
  moistureContent: number;
  density: number;
  description: string;
}

export interface LabResultRow {
  id: string;
  testName: string;
  value: number;
  unit: string;
  standard: string;
}

export interface SurveyReport {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string;
  client: string;
  date: string;
  instrument: string;
  benchmarkElevation: number;
  stationData: SurveyStationRow[];
  photos: string[];
  reportData?: Record<string, unknown>;
  status: CivilReportStatus;
  createdAt: string;
}

export interface SurveyStationRow {
  id: string;
  station: string;
  chainage: number;
  northing: number;
  easting: number;
  elevation: number;
  description: string;
}

export interface DesignReport {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string;
  client: string;
  date: string;
  designCode: string;
  parameters: DesignParameter[];
  photos: string[];
  reportData?: Record<string, unknown>;
  status: CivilReportStatus;
  createdAt: string;
}

export interface DesignParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
}

export interface Estimation {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string;
  client: string;
  date: string;
  contingencyPercent: number;
  boqItems: BOQItem[];
  photos: string[];
  reportData?: Record<string, unknown>;
  status: CivilReportStatus;
  createdAt: string;
}

export interface BOQItem {
  id: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  category: string;
}

export interface AORItem {
  id: string;
  category: string;
  itemDescription: string;
  unit: string;
  materialCost: number;
  labourCost: number;
  machineryCost: number;
  overheadPercent: number;
  profitPercent: number;
}

export interface TemplateItem {
  id: string;
  name: string;
  type: string;
  description: string;
}

// ============================================================================
// Mock Data Stores (in-memory for dev without DB tables)
// ============================================================================

const geotechnicalReports: GeotechnicalReport[] = [
  {
    id: "geo-1",
    templateType: "SPT",
    title: "SPT Investigation - NH-48 Bridge Site",
    projectName: "NH-48 Highway Expansion",
    location: "Jaipur, Rajasthan",
    client: "NHAI",
    date: "2025-08-01",
    boreholeData: [
      { id: "bh1-1", depth: 1.5, soilType: "Silty Sand", sptNValue: 12, moistureContent: 18.5, density: 1.65, description: "Top soil with vegetation" },
      { id: "bh1-2", depth: 3.0, soilType: "Clayey Silt", sptNValue: 8, moistureContent: 25.3, density: 1.72, description: "Soft clayey silt" },
      { id: "bh1-3", depth: 4.5, soilType: "Sandy Clay", sptNValue: 18, moistureContent: 16.8, density: 1.85, description: "Medium stiff clay" },
      { id: "bh1-4", depth: 6.0, soilType: "Dense Sand", sptNValue: 35, moistureContent: 12.1, density: 1.95, description: "Dense sand with gravel" },
      { id: "bh1-5", depth: 8.0, soilType: "Weathered Rock", sptNValue: 52, moistureContent: 5.2, density: 2.15, description: "Weathered granite" },
    ],
    labResults: [
      { id: "lab1-1", testName: "Liquid Limit", value: 42, unit: "%", standard: "IS 2720" },
      { id: "lab1-2", testName: "Plastic Limit", value: 22, unit: "%", standard: "IS 2720" },
      { id: "lab1-3", testName: "Specific Gravity", value: 2.65, unit: "-", standard: "IS 2720" },
      { id: "lab1-4", testName: "CBR (Soaked)", value: 8.5, unit: "%", standard: "IS 2720" },
    ],
    status: "FINAL",
    photos: [],
    createdAt: "2025-08-01T10:30:00Z",
  },
  {
    id: "geo-2",
    templateType: "CBR",
    title: "CBR Testing - Industrial Zone Road",
    projectName: "RIICO Industrial Area Phase 2",
    location: "Neemrana, Rajasthan",
    client: "RIICO",
    date: "2025-07-15",
    boreholeData: [
      { id: "bh2-1", depth: 1.0, soilType: "Sandy Loam", sptNValue: 10, moistureContent: 15.2, density: 1.58, description: "Surface fill" },
      { id: "bh2-2", depth: 2.5, soilType: "Clayey Sand", sptNValue: 22, moistureContent: 19.8, density: 1.78, description: "Brown clayey sand" },
      { id: "bh2-3", depth: 4.0, soilType: "Gravelly Sand", sptNValue: 40, moistureContent: 8.5, density: 2.05, description: "Dense gravelly sand" },
    ],
    labResults: [
      { id: "lab2-1", testName: "CBR (Unsoaked)", value: 12.3, unit: "%", standard: "IS 2720" },
      { id: "lab2-2", testName: "CBR (Soaked)", value: 7.8, unit: "%", standard: "IS 2720" },
      { id: "lab2-3", testName: "MDD", value: 1.92, unit: "g/cc", standard: "IS 2720" },
    ],
    status: "APPROVED",
    photos: [],
    createdAt: "2025-07-15T14:00:00Z",
  },
];

const surveyReports: SurveyReport[] = [
  {
    id: "svy-1",
    templateType: "Road",
    title: "Topographic Survey - SH-12 Widening",
    projectName: "SH-12 Widening Project",
    location: "Alwar, Rajasthan",
    client: "PWD Rajasthan",
    date: "2025-07-28",
    instrument: "Total Station",
    benchmarkElevation: 268.5,
    stationData: [
      { id: "st1-1", station: "BM-01", chainage: 0, northing: 3024567.25, easting: 765432.10, elevation: 268.50, description: "Benchmark at bridge" },
      { id: "st1-2", station: "CP-01", chainage: 250, northing: 3024698.45, easting: 765612.30, elevation: 271.20, description: "Change point" },
      { id: "st1-3", station: "TP-01", chainage: 500, northing: 3024845.60, easting: 765790.80, elevation: 275.80, description: "Turning point" },
      { id: "st1-4", station: "TP-02", chainage: 750, northing: 3025012.30, easting: 765975.50, elevation: 282.10, description: "Hill slope" },
      { id: "st1-5", station: "TP-03", chainage: 1000, northing: 3025185.75, easting: 766160.20, elevation: 278.60, description: "Valley point" },
      { id: "st1-6", station: "TP-04", chainage: 1250, northing: 3025348.90, easting: 766340.40, elevation: 285.30, description: "End point" },
    ],
    status: "FINAL",
    photos: [],
    createdAt: "2025-07-28T09:15:00Z",
  },
  {
    id: "svy-2",
    templateType: "Site",
    title: "Site Survey - Solar Plant Phase 1",
    projectName: "500 MW Solar Park",
    location: "Bhadla, Rajasthan",
    client: "RERC",
    date: "2025-06-20",
    instrument: "DGPS",
    benchmarkElevation: 215.0,
    stationData: [
      { id: "st2-1", station: "BM-SL", chainage: 0, northing: 2987654.30, easting: 754321.50, elevation: 215.00, description: "Site benchmark" },
      { id: "st2-2", station: "GR-01", chainage: 500, northing: 2988154.30, easting: 754321.50, elevation: 214.20, description: "Grid point" },
      { id: "st2-3", station: "GR-02", chainage: 500, northing: 2988654.30, easting: 754321.50, elevation: 213.80, description: "Grid point" },
      { id: "st2-4", station: "GR-03", chainage: 500, northing: 2989154.30, easting: 754321.50, elevation: 215.60, description: "Grid point" },
      { id: "st2-5", station: "GR-04", chainage: 1000, northing: 2989654.30, easting: 754321.50, elevation: 216.80, description: "Grid point" },
    ],
    status: "FINAL",
    photos: [],
    createdAt: "2025-06-20T11:45:00Z",
  },
];

const designReports: DesignReport[] = [
  {
    id: "des-1",
    templateType: "Road",
    title: "Pavement Design - Expressway Section",
    projectName: "Delhi-Mumbai Expressway",
    location: "Kota, Rajasthan",
    client: "NHAI",
    date: "2025-08-03",
    designCode: "IRC 37-2018",
    parameters: [
      { id: "dp1-1", name: "Design Traffic (msa)", value: 150, unit: "msa", category: "Traffic" },
      { id: "dp1-2", name: "Subgrade CBR", value: 8, unit: "%", category: "Soil" },
      { id: "dp1-3", name: "Design Life", value: 20, unit: "years", category: "General" },
      { id: "dp1-4", name: "BC Thickness", value: 50, unit: "mm", category: "Pavement" },
      { id: "dp1-5", name: "DBM Thickness", value: 120, unit: "mm", category: "Pavement" },
      { id: "dp1-6", name: "GSB Thickness", value: 200, unit: "mm", category: "Pavement" },
      { id: "dp1-7", name: "Total Pavement", value: 590, unit: "mm", category: "Pavement" },
    ],
    status: "APPROVED",
    photos: [],
    createdAt: "2025-08-03T08:30:00Z",
  },
  {
    id: "des-2",
    templateType: "Building",
    title: "Structural Design - G+4 Commercial",
    projectName: "City Centre Mall",
    location: "Jaipur, Rajasthan",
    client: "Urban Infra Ltd",
    date: "2025-07-22",
    designCode: "IS 456:2000",
    parameters: [
      { id: "dp2-1", name: "Grid Spacing X", value: 6, unit: "m", category: "Layout" },
      { id: "dp2-2", name: "Grid Spacing Y", value: 8, unit: "m", category: "Layout" },
      { id: "dp2-3", name: "SBC", value: 200, unit: "kN/m\u00B2", category: "Foundation" },
      { id: "dp2-4", name: "Concrete Grade", value: 30, unit: "M Grade", category: "Materials" },
      { id: "dp2-5", name: "Steel Grade", value: 500, unit: "Fe Grade", category: "Materials" },
      { id: "dp2-6", name: "Live Load", value: 4, unit: "kN/m\u00B2", category: "Loading" },
    ],
    status: "FINAL",
    photos: [],
    createdAt: "2025-07-22T15:20:00Z",
  },
];

const estimations: Estimation[] = [
  {
    id: "est-1",
    templateType: "Road",
    title: "BOQ - SH-12 Widening (0-5 km)",
    projectName: "SH-12 Widening Project",
    location: "Alwar, Rajasthan",
    client: "PWD Rajasthan",
    date: "2025-08-05",
    contingencyPercent: 5,
    boqItems: [
      { id: "boq1-1", itemNo: "1.1", description: "Site clearance", unit: "sqm", quantity: 50000, rate: 12, category: "Earthwork" },
      { id: "boq1-2", itemNo: "1.2", description: "Earthwork in excavation", unit: "cum", quantity: 25000, rate: 185, category: "Earthwork" },
      { id: "boq1-3", itemNo: "1.3", description: "Embankment construction", unit: "cum", quantity: 35000, rate: 320, category: "Earthwork" },
      { id: "boq1-4", itemNo: "2.1", description: "GSB layer", unit: "cum", quantity: 5000, rate: 1250, category: "Sub-base" },
      { id: "boq1-5", itemNo: "2.2", description: "WMM layer", unit: "cum", quantity: 3750, rate: 2100, category: "Base" },
      { id: "boq1-6", itemNo: "2.3", description: "DBM layer", unit: "cum", quantity: 2500, rate: 5800, category: "Bituminous" },
      { id: "boq1-7", itemNo: "2.4", description: "BC wearing course", unit: "cum", quantity: 1200, rate: 7200, category: "Bituminous" },
      { id: "boq1-8", itemNo: "3.1", description: "RCC Box Culvert", unit: "cum", quantity: 450, rate: 12500, category: "Structures" },
    ],
    status: "FINAL",
    photos: [],
    createdAt: "2025-08-05T12:00:00Z",
  },
  {
    id: "est-2",
    templateType: "Building",
    title: "Cost Estimate - School Building Block A",
    projectName: "Govt Sr Sec School Construction",
    location: "Bharatpur, Rajasthan",
    client: "PWD Rajasthan",
    date: "2025-07-18",
    contingencyPercent: 3,
    boqItems: [
      { id: "boq2-1", itemNo: "1.1", description: "Excavation for foundation", unit: "cum", quantity: 850, rate: 220, category: "Earthwork" },
      { id: "boq2-2", itemNo: "2.1", description: "PCC 1:4:8 in foundation", unit: "cum", quantity: 125, rate: 4500, category: "Concrete" },
      { id: "boq2-3", itemNo: "2.2", description: "RCC M25 in columns", unit: "cum", quantity: 180, rate: 12500, category: "RCC" },
      { id: "boq2-4", itemNo: "2.3", description: "RCC M25 in slab/beam", unit: "cum", quantity: 320, rate: 11800, category: "RCC" },
      { id: "boq2-5", itemNo: "3.1", description: "Brick work 230mm", unit: "cum", quantity: 520, rate: 5800, category: "Brick work" },
      { id: "boq2-6", itemNo: "3.2", description: "Internal plastering", unit: "sqm", quantity: 3800, rate: 285, category: "Finishing" },
      { id: "boq2-7", itemNo: "3.3", description: "Flooring with tiles", unit: "sqm", quantity: 2400, rate: 850, category: "Finishing" },
    ],
    status: "APPROVED",
    photos: [],
    createdAt: "2025-07-18T10:00:00Z",
  },
];

const aorItems: AORItem[] = [
  { id: "aor-1", category: "Earthwork", itemDescription: "Excavation in ordinary soil", unit: "cum", materialCost: 0, labourCost: 120, machineryCost: 60, overheadPercent: 15, profitPercent: 10 },
  { id: "aor-2", category: "Earthwork", itemDescription: "Embankment with borrowed soil", unit: "cum", materialCost: 150, labourCost: 45, machineryCost: 85, overheadPercent: 12, profitPercent: 10 },
  { id: "aor-3", category: "Concrete", itemDescription: "PCC 1:4:8", unit: "cum", materialCost: 3200, labourCost: 450, machineryCost: 200, overheadPercent: 10, profitPercent: 10 },
  { id: "aor-4", category: "RCC", itemDescription: "RCC M25 for structures", unit: "cum", materialCost: 6800, labourCost: 1800, machineryCost: 1200, overheadPercent: 10, profitPercent: 10 },
  { id: "aor-5", category: "RCC", itemDescription: "TMT Fe500 steel reinforcement", unit: "kg", materialCost: 68, labourCost: 8, machineryCost: 2, overheadPercent: 10, profitPercent: 10 },
  { id: "aor-6", category: "Brick work", itemDescription: "Brick masonry in CM 1:6", unit: "cum", materialCost: 3500, labourCost: 800, machineryCost: 100, overheadPercent: 10, profitPercent: 10 },
  { id: "aor-7", category: "Special Items", itemDescription: "Waterproofing treatment", unit: "sqm", materialCost: 280, labourCost: 65, machineryCost: 20, overheadPercent: 12, profitPercent: 12 },
  { id: "aor-8", category: "Special Items", itemDescription: "Expansion joint filler", unit: "rm", materialCost: 180, labourCost: 35, machineryCost: 10, overheadPercent: 10, profitPercent: 10 },
];

const geotechnicalTemplates: TemplateItem[] = [
  { id: "tpl-geo-cbr", name: "CBR (California Bearing Ratio)", type: "CBR", description: "Pavement subgrade strength evaluation" },
  { id: "tpl-geo-spt", name: "SPT (Standard Penetration Test)", type: "SPT", description: "In-situ soil penetration resistance" },
  { id: "tpl-geo-plate", name: "Plate Load Test", type: "PLATE_LOAD", description: "Bearing capacity and settlement" },
  { id: "tpl-geo-soil", name: "Soil Classification Report", type: "SOIL_CLASS", description: "Comprehensive soil classification" },
  { id: "tpl-geo-shear", name: "Direct Shear Test", type: "DIRECT_SHEAR", description: "Shear strength parameters" },
];

const surveyTemplates: TemplateItem[] = [
  { id: "tpl-svy-road", name: "Road Survey", type: "ROAD", description: "Highway and road alignment survey" },
  { id: "tpl-svy-site", name: "Site / Topographic Survey", type: "SITE", description: "Contour and topographic mapping" },
  { id: "tpl-svy-canal", name: "Canal Survey", type: "CANAL", description: "Irrigation canal alignment & L-section" },
  { id: "tpl-svy-boundary", name: "Boundary Survey", type: "BOUNDARY", description: "Property boundary demarcation" },
];

const designTemplates: TemplateItem[] = [
  { id: "tpl-des-road", name: "Road Pavement Design", type: "ROAD", description: "IRC 37 flexible pavement design" },
  { id: "tpl-des-building", name: "Building Structural Design", type: "BUILDING", description: "RCC framed structure per IS codes" },
  { id: "tpl-des-canal", name: "Canal Design", type: "CANAL", description: "Lined/unlined canal cross-section design" },
  { id: "tpl-des-bridge", name: "Bridge Design", type: "BRIDGE", description: "Bridge superstructure & substructure" },
];

const estimationTemplates: TemplateItem[] = [
  { id: "tpl-est-road", name: "Road Works", type: "ROAD", description: "Earthwork, GSB, WMM, DBM, BC BOQ" },
  { id: "tpl-est-building", name: "Building Works", type: "BUILDING", description: "Structural, finishing, services BOQ" },
  { id: "tpl-est-canal", name: "Canal Works", type: "CANAL", description: "Earthwork, lining, structures BOQ" },
  { id: "tpl-est-bridge", name: "Bridge Works", type: "BRIDGE", description: "Foundation, substructure, superstructure BOQ" },
];

// ============================================================================
// Geotechnical Actions
// ============================================================================

export async function getGeotechnicalReports(): Promise<GeotechnicalReport[]> {
  await getSessionOrThrow();
  return geotechnicalReports;
}

export async function saveGeotechnicalReport(data: Omit<GeotechnicalReport, "id" | "createdAt"> & { id?: string }): Promise<GeotechnicalReport> {
  await getSessionOrThrow();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = geotechnicalReports.findIndex((r) => r.id === data.id);
    if (idx === -1) throw new Error("Report not found");
    geotechnicalReports[idx] = { ...geotechnicalReports[idx], ...data };
    revalidatePath("/civil/geotechnical");
    return geotechnicalReports[idx];
  }
  const report: GeotechnicalReport = {
    ...data,
    id: `geo-${Date.now()}`,
    createdAt: now,
  };
  geotechnicalReports.push(report);
  revalidatePath("/civil/geotechnical");
  return report;
}

export async function getGeotechnicalTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return geotechnicalTemplates;
}

// ============================================================================
// Survey Actions
// ============================================================================

export async function getSurveyReports(): Promise<SurveyReport[]> {
  await getSessionOrThrow();
  return surveyReports;
}

export async function saveSurveyReport(data: Omit<SurveyReport, "id" | "createdAt"> & { id?: string }): Promise<SurveyReport> {
  await getSessionOrThrow();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = surveyReports.findIndex((r) => r.id === data.id);
    if (idx === -1) throw new Error("Report not found");
    surveyReports[idx] = { ...surveyReports[idx], ...data };
    revalidatePath("/civil/survey");
    return surveyReports[idx];
  }
  const report: SurveyReport = {
    ...data,
    id: `svy-${Date.now()}`,
    createdAt: now,
  };
  surveyReports.push(report);
  revalidatePath("/civil/survey");
  return report;
}

export async function getSurveyTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return surveyTemplates;
}

// ============================================================================
// Design Actions
// ============================================================================

export async function getDesignReports(): Promise<DesignReport[]> {
  await getSessionOrThrow();
  return designReports;
}

export async function saveDesignReport(data: Omit<DesignReport, "id" | "createdAt"> & { id?: string }): Promise<DesignReport> {
  await getSessionOrThrow();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = designReports.findIndex((r) => r.id === data.id);
    if (idx === -1) throw new Error("Report not found");
    designReports[idx] = { ...designReports[idx], ...data };
    revalidatePath("/civil/design");
    return designReports[idx];
  }
  const report: DesignReport = {
    ...data,
    id: `des-${Date.now()}`,
    createdAt: now,
  };
  designReports.push(report);
  revalidatePath("/civil/design");
  return report;
}

export async function getDesignTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return designTemplates;
}

// ============================================================================
// Estimation Actions
// ============================================================================

export async function getEstimations(): Promise<Estimation[]> {
  await getSessionOrThrow();
  return estimations;
}

export async function saveEstimation(data: Omit<Estimation, "id" | "createdAt"> & { id?: string }): Promise<Estimation> {
  await getSessionOrThrow();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = estimations.findIndex((r) => r.id === data.id);
    if (idx === -1) throw new Error("Estimation not found");
    estimations[idx] = { ...estimations[idx], ...data };
    revalidatePath("/civil/estimation");
    return estimations[idx];
  }
  const est: Estimation = {
    ...data,
    id: `est-${Date.now()}`,
    createdAt: now,
  };
  estimations.push(est);
  revalidatePath("/civil/estimation");
  return est;
}

export async function getEstimationTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return estimationTemplates;
}

export async function getAnalysisOfRates(): Promise<AORItem[]> {
  await getSessionOrThrow();
  return aorItems;
}

export async function saveAnalysisOfRatesItem(data: Omit<AORItem, "id"> & { id?: string }): Promise<AORItem> {
  await getSessionOrThrow();
  if (data.id) {
    const idx = aorItems.findIndex((r) => r.id === data.id);
    if (idx === -1) throw new Error("AOR item not found");
    aorItems[idx] = { ...aorItems[idx], ...data };
    revalidatePath("/civil/estimation");
    return aorItems[idx];
  }
  const item: AORItem = {
    ...data,
    id: `aor-${Date.now()}`,
  };
  aorItems.push(item);
  revalidatePath("/civil/estimation");
  return item;
}

// ============================================================================
// Overview stats
// ============================================================================

export async function getCivilOverviewStats(): Promise<{
  totalReports: number;
  thisMonth: number;
  templates: number;
  recentReports: {
    id: string;
    title: string;
    type: string;
    projectName: string;
    client: string;
    status: CivilReportStatus;
    createdAt: string;
  }[];
}> {
  await getSessionOrThrow();
  const allReports = [
    ...geotechnicalReports.map((r) => ({ ...r, type: "Geotechnical" })),
    ...surveyReports.map((r) => ({ ...r, type: "Survey" })),
    ...designReports.map((r) => ({ ...r, type: "Design" })),
    ...estimations.map((r) => ({ ...r, type: "Estimation" })),
  ];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = allReports.filter((r) => r.createdAt >= startOfMonth).length;

  const totalTemplates =
    geotechnicalTemplates.length +
    surveyTemplates.length +
    designTemplates.length +
    estimationTemplates.length;

  return {
    totalReports: allReports.length,
    thisMonth,
    templates: totalTemplates,
    recentReports: allReports
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        projectName: r.projectName,
        client: r.client,
        status: r.status,
        createdAt: r.createdAt,
      })),
  };
}
