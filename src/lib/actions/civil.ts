"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

function json<T>(v: T): Prisma.InputJsonValue {
  return v as unknown as Prisma.InputJsonValue;
}

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
  reportData?: Record<string, unknown> | null;
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
  reportData?: Record<string, unknown> | null;
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
  reportData?: Record<string, unknown> | null;
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

export interface AbstractRow {
  name: string;
  amount: number;
}

export interface EstimationItemRow {
  id: string;
  slNo: number;
  aorNo: string;
  description: string;
  quantity: number;
  wastage: number;
  unit: string;
  rate: number;
  amount: number;
  remarks: string;
}

export interface Estimation {
  id: string;
  projectType: string;
  subType: string;
  roadType: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string;
  client: string;
  date: string;
  state: string;
  department: string;
  contingencyPercent: number;
  items: EstimationItemRow[];
  abstract: AbstractRow[];
  photos: string[];
  reportData?: Record<string, unknown> | null;
  status: CivilReportStatus;
  createdAt: string;
}

export interface AORItem {
  id: string;
  state: string;
  department: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SORItem {
  id: string;
  state: string;
  department: string;
  aorId: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  type: string;
  description: string;
}

// ============================================================================
// Static templates (report templates per module)
// ============================================================================

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
// Serialization helpers (Decimal -> number, Json -> typed)
// ============================================================================

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "object" && typeof (v as { toNumber?: unknown }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return num(v);
}

// ============================================================================
// Geotechnical Actions
// ============================================================================

function mapGeotechnical(row: {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string | null;
  client: string | null;
  date: string;
  boreholeData: unknown;
  labResults: unknown;
  photos: unknown;
  reportData: unknown;
  status: string;
  createdAt: Date;
}): GeotechnicalReport {
  return {
    id: row.id,
    templateType: row.templateType,
    title: row.title,
    projectName: row.projectName,
    location: row.location ?? "",
    client: row.client ?? "",
    date: row.date,
    boreholeData: (row.boreholeData as BoreholeRow[]) ?? [],
    labResults: (row.labResults as LabResultRow[]) ?? [],
    photos: (row.photos as string[]) ?? [],
    reportData: (row.reportData as Record<string, unknown>) ?? null,
    status: row.status as CivilReportStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getGeotechnicalReports(): Promise<GeotechnicalReport[]> {
  const { tenantId } = await getSessionOrThrow();
  const rows = await prisma.geotechnicalReport.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapGeotechnical);
}

export async function saveGeotechnicalReport(
  data: Omit<GeotechnicalReport, "id" | "createdAt"> & { id?: string },
): Promise<GeotechnicalReport> {
  const { tenantId } = await getSessionOrThrow();
  const payload = {
    templateType: data.templateType,
    title: data.title,
    projectName: data.projectName,
    location: data.location,
    client: data.client,
    date: data.date,
    boreholeData: json(data.boreholeData),
    labResults: json(data.labResults),
    photos: json(data.photos),
    reportData: json(data.reportData),
    status: data.status,
  };
  let row;
  if (data.id) {
    row = await prisma.geotechnicalReport.update({
      where: { id: data.id },
      data: payload,
    });
  } else {
    row = await prisma.geotechnicalReport.create({
      data: { ...payload, tenantId },
    });
  }
  revalidatePath("/civil");
  revalidatePath("/civil/geotechnical");
  return mapGeotechnical(row);
}

export async function deleteGeotechnicalReport(id: string): Promise<void> {
  const { tenantId } = await getSessionOrThrow();
  await prisma.geotechnicalReport.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  revalidatePath("/civil");
  revalidatePath("/civil/geotechnical");
}

export async function getGeotechnicalTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return geotechnicalTemplates;
}

// ============================================================================
// Survey Actions
// ============================================================================

function mapSurvey(row: {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string | null;
  client: string | null;
  date: string;
  instrument: string | null;
  benchmarkElevation: unknown;
  stationData: unknown;
  photos: unknown;
  reportData: unknown;
  status: string;
  createdAt: Date;
}): SurveyReport {
  return {
    id: row.id,
    templateType: row.templateType,
    title: row.title,
    projectName: row.projectName,
    location: row.location ?? "",
    client: row.client ?? "",
    date: row.date,
    instrument: row.instrument ?? "",
    benchmarkElevation: num(row.benchmarkElevation),
    stationData: (row.stationData as SurveyStationRow[]) ?? [],
    photos: (row.photos as string[]) ?? [],
    reportData: (row.reportData as Record<string, unknown>) ?? null,
    status: row.status as CivilReportStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getSurveyReports(): Promise<SurveyReport[]> {
  const { tenantId } = await getSessionOrThrow();
  const rows = await prisma.surveyReport.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapSurvey);
}

export async function saveSurveyReport(
  data: Omit<SurveyReport, "id" | "createdAt"> & { id?: string },
): Promise<SurveyReport> {
  const { tenantId } = await getSessionOrThrow();
  const payload = {
    templateType: data.templateType,
    title: data.title,
    projectName: data.projectName,
    location: data.location,
    client: data.client,
    date: data.date,
    instrument: data.instrument,
    benchmarkElevation: data.benchmarkElevation,
    stationData: json(data.stationData),
    photos: json(data.photos),
    reportData: json(data.reportData),
    status: data.status,
  };
  let row;
  if (data.id) {
    row = await prisma.surveyReport.update({ where: { id: data.id }, data: payload });
  } else {
    row = await prisma.surveyReport.create({ data: { ...payload, tenantId } });
  }
  revalidatePath("/civil");
  revalidatePath("/civil/survey");
  return mapSurvey(row);
}

export async function deleteSurveyReport(id: string): Promise<void> {
  const { tenantId } = await getSessionOrThrow();
  await prisma.surveyReport.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  revalidatePath("/civil");
  revalidatePath("/civil/survey");
}

export async function getSurveyTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return surveyTemplates;
}

// ============================================================================
// Design Actions
// ============================================================================

function mapDesign(row: {
  id: string;
  templateType: string;
  title: string;
  projectName: string;
  location: string | null;
  client: string | null;
  date: string;
  designCode: string | null;
  parameters: unknown;
  photos: unknown;
  reportData: unknown;
  status: string;
  createdAt: Date;
}): DesignReport {
  return {
    id: row.id,
    templateType: row.templateType,
    title: row.title,
    projectName: row.projectName,
    location: row.location ?? "",
    client: row.client ?? "",
    date: row.date,
    designCode: row.designCode ?? "",
    parameters: (row.parameters as DesignParameter[]) ?? [],
    photos: (row.photos as string[]) ?? [],
    reportData: (row.reportData as Record<string, unknown>) ?? null,
    status: row.status as CivilReportStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDesignReports(): Promise<DesignReport[]> {
  const { tenantId } = await getSessionOrThrow();
  const rows = await prisma.designReport.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDesign);
}

export async function saveDesignReport(
  data: Omit<DesignReport, "id" | "createdAt"> & { id?: string },
): Promise<DesignReport> {
  const { tenantId } = await getSessionOrThrow();
  const payload = {
    templateType: data.templateType,
    title: data.title,
    projectName: data.projectName,
    location: data.location,
    client: data.client,
    date: data.date,
    designCode: data.designCode,
    parameters: json(data.parameters),
    photos: json(data.photos),
    reportData: json(data.reportData),
    status: data.status,
  };
  let row;
  if (data.id) {
    row = await prisma.designReport.update({ where: { id: data.id }, data: payload });
  } else {
    row = await prisma.designReport.create({ data: { ...payload, tenantId } });
  }
  revalidatePath("/civil");
  revalidatePath("/civil/design");
  return mapDesign(row);
}

export async function deleteDesignReport(id: string): Promise<void> {
  const { tenantId } = await getSessionOrThrow();
  await prisma.designReport.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  revalidatePath("/civil");
  revalidatePath("/civil/design");
}

export async function getDesignTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return designTemplates;
}

// ============================================================================
// Analysis of Rates (AOR) Actions
// ============================================================================

function mapAOR(row: {
  id: string;
  state: string;
  department: string;
  category: string;
  itemNo: string | null;
  description: string;
  unit: string;
  quantity: unknown;
  materialCost: unknown;
  labourCost: unknown;
  machineryCost: unknown;
  materialRoyalty: unknown;
  overheadPercent: unknown;
  profitPercent: unknown;
  otherCharges: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AORItem {
  return {
    id: row.id,
    state: row.state,
    department: row.department,
    category: row.category,
    itemNo: row.itemNo ?? "",
    description: row.description,
    unit: row.unit,
    quantity: num(row.quantity),
    materialCost: num(row.materialCost),
    labourCost: num(row.labourCost),
    machineryCost: num(row.machineryCost),
    materialRoyalty: num(row.materialRoyalty),
    overheadPercent: num(row.overheadPercent),
    profitPercent: num(row.profitPercent),
    otherCharges: num(row.otherCharges),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAnalysisOfRates(): Promise<AORItem[]> {
  const { tenantId } = await getSessionOrThrow();
  const rows = await prisma.analysisOfRate.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    orderBy: [{ category: "asc" }, { itemNo: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapAOR);
}

export async function saveAnalysisOfRatesItem(
  data: Omit<AORItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<AORItem> {
  const { tenantId } = await getSessionOrThrow();
  const payload = {
    state: data.state,
    department: data.department,
    category: data.category,
    itemNo: data.itemNo,
    description: data.description,
    unit: data.unit,
    quantity: data.quantity,
    materialCost: data.materialCost,
    labourCost: data.labourCost,
    machineryCost: data.machineryCost,
    materialRoyalty: data.materialRoyalty,
    overheadPercent: data.overheadPercent,
    profitPercent: data.profitPercent,
    otherCharges: data.otherCharges,
    isActive: data.isActive,
  };
  let row;
  if (data.id) {
    row = await prisma.analysisOfRate.update({ where: { id: data.id }, data: payload });
  } else {
    row = await prisma.analysisOfRate.create({ data: { ...payload, tenantId } });
  }
  revalidatePath("/civil/estimation");
  return mapAOR(row);
}

export async function deleteAnalysisOfRatesItem(id: string): Promise<void> {
  const { tenantId } = await getSessionOrThrow();
  await prisma.analysisOfRate.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  revalidatePath("/civil/estimation");
}

// ============================================================================
// Schedule of Rates (SOR) Actions
// ============================================================================

function mapSOR(row: {
  id: string;
  state: string;
  department: string;
  aorId: string | null;
  itemNo: string | null;
  description: string;
  unit: string | null;
  materialName: string | null;
  quarryName: string | null;
  leadKm: unknown;
  leadRatePerKm: unknown;
  quarryLat: unknown;
  quarryLng: unknown;
  materialCost: unknown;
  labourCost: unknown;
  machineryCost: unknown;
  materialRoyalty: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SORItem {
  return {
    id: row.id,
    state: row.state,
    department: row.department,
    aorId: row.aorId,
    itemNo: row.itemNo ?? "",
    description: row.description,
    unit: row.unit ?? "",
    materialName: row.materialName ?? "",
    quarryName: row.quarryName ?? "",
    leadKm: num(row.leadKm),
    leadRatePerKm: num(row.leadRatePerKm),
    quarryLat: numOrNull(row.quarryLat),
    quarryLng: numOrNull(row.quarryLng),
    materialCost: num(row.materialCost),
    labourCost: num(row.labourCost),
    machineryCost: num(row.machineryCost),
    materialRoyalty: num(row.materialRoyalty),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getScheduleOfRates(): Promise<SORItem[]> {
  const { tenantId } = await getSessionOrThrow();
  const rows = await prisma.scheduleOfRate.findMany({
    where: tenantScope(tenantId),
    orderBy: [{ itemNo: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapSOR);
}

export async function saveScheduleOfRatesItem(
  data: Omit<SORItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<SORItem> {
  const { tenantId } = await getSessionOrThrow();
  const payload = {
    state: data.state,
    department: data.department,
    aorId: data.aorId,
    itemNo: data.itemNo,
    description: data.description,
    unit: data.unit,
    materialName: data.materialName,
    quarryName: data.quarryName,
    leadKm: data.leadKm,
    leadRatePerKm: data.leadRatePerKm,
    quarryLat: data.quarryLat,
    quarryLng: data.quarryLng,
    materialCost: data.materialCost,
    labourCost: data.labourCost,
    machineryCost: data.machineryCost,
    materialRoyalty: data.materialRoyalty,
  };
  let row;
  if (data.id) {
    row = await prisma.scheduleOfRate.update({ where: { id: data.id }, data: payload });
  } else {
    row = await prisma.scheduleOfRate.create({ data: { ...payload, tenantId } });
  }
  // Dynamic linking: when a SOR item is linked to an AOR item, propagate the
  // material/labour/machinery/royalty rates back to the AOR item.
  if (row.aorId) {
    await prisma.analysisOfRate.updateMany({
      where: { id: row.aorId, ...tenantScope(tenantId) },
      data: {
        materialCost: row.materialCost,
        labourCost: row.labourCost,
        machineryCost: row.machineryCost,
        materialRoyalty: row.materialRoyalty,
      },
    });
  }
  revalidatePath("/civil/estimation");
  return mapSOR(row);
}

export async function deleteScheduleOfRatesItem(id: string): Promise<void> {
  const { tenantId } = await getSessionOrThrow();
  await prisma.scheduleOfRate.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  revalidatePath("/civil/estimation");
}

// ============================================================================
// Estimation Actions
// ============================================================================

function mapEstimation(row: {
  id: string;
  projectType: string;
  subType: string | null;
  roadType: string | null;
  templateType: string | null;
  title: string;
  projectName: string;
  location: string | null;
  client: string | null;
  date: string;
  state: string | null;
  department: string | null;
  contingencyPercent: unknown;
  abstract: unknown;
  photos: unknown;
  reportData: unknown;
  status: string;
  createdAt: Date;
  items: {
    id: string;
    slNo: number;
    aorNo: string | null;
    description: string;
    quantity: unknown;
    wastage: unknown;
    unit: string | null;
    rate: unknown;
    amount: unknown;
    remarks: string | null;
  }[];
}): Estimation {
  return {
    id: row.id,
    projectType: row.projectType,
    subType: row.subType ?? "",
    roadType: row.roadType ?? "",
    templateType: row.templateType ?? "",
    title: row.title,
    projectName: row.projectName,
    location: row.location ?? "",
    client: row.client ?? "",
    date: row.date,
    state: row.state ?? "",
    department: row.department ?? "",
    contingencyPercent: num(row.contingencyPercent),
    items: row.items.map((i) => ({
      id: i.id,
      slNo: i.slNo,
      aorNo: i.aorNo ?? "",
      description: i.description,
      quantity: num(i.quantity),
      wastage: num(i.wastage),
      unit: i.unit ?? "",
      rate: num(i.rate),
      amount: num(i.amount),
      remarks: i.remarks ?? "",
    })),
    abstract: (row.abstract as AbstractRow[]) ?? [],
    photos: (row.photos as string[]) ?? [],
    reportData: (row.reportData as Record<string, unknown>) ?? null,
    status: row.status as CivilReportStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getEstimations(): Promise<Estimation[]> {
  const { tenantId } = await getSessionOrThrow();
  const rows = await prisma.estimation.findMany({
    where: tenantScope(tenantId),
    include: { items: { orderBy: { slNo: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapEstimation);
}

export type EstimationSaveInput = Omit<Estimation, "id" | "createdAt"> & { id?: string };

export async function saveEstimation(data: EstimationSaveInput): Promise<Estimation> {
  const { tenantId } = await getSessionOrThrow();
  const header = {
    projectType: data.projectType,
    subType: data.subType,
    roadType: data.roadType,
    templateType: data.templateType,
    title: data.title,
    projectName: data.projectName,
    location: data.location,
    client: data.client,
    date: data.date,
    state: data.state,
    department: data.department,
    contingencyPercent: data.contingencyPercent,
    abstract: json(data.abstract),
    photos: json(data.photos),
    reportData: json(data.reportData),
    status: data.status,
  };

  let id = data.id;
  if (id) {
    await prisma.estimation.update({ where: { id }, data: header });
  } else {
    const created = await prisma.estimation.create({ data: { ...header, tenantId } });
    id = created.id;
  }

  // Replace items (delete + recreate keeps ordering and ids in sync)
  await prisma.estimationItem.deleteMany({ where: { estimationId: id } });
  if (data.items.length > 0) {
    await prisma.estimationItem.createMany({
      data: data.items.map((i, idx) => ({
        estimationId: id!,
        slNo: idx + 1,
        aorNo: i.aorNo,
        description: i.description,
        quantity: i.quantity,
        wastage: i.wastage,
        unit: i.unit,
        rate: i.rate,
        amount: i.amount,
        remarks: i.remarks,
      })),
    });
  }

  const row = await prisma.estimation.findUniqueOrThrow({
    where: { id },
    include: { items: { orderBy: { slNo: "asc" } } },
  });

  revalidatePath("/civil");
  revalidatePath("/civil/estimation");
  return mapEstimation(row);
}

export async function deleteEstimation(id: string): Promise<void> {
  const { tenantId } = await getSessionOrThrow();
  await prisma.estimation.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  revalidatePath("/civil");
  revalidatePath("/civil/estimation");
}

export async function getEstimationTemplates(): Promise<TemplateItem[]> {
  await getSessionOrThrow();
  return estimationTemplates;
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
  const { tenantId } = await getSessionOrThrow();
  const [geo, svy, des, est] = await Promise.all([
    prisma.geotechnicalReport.findMany({ where: tenantScope(tenantId) }),
    prisma.surveyReport.findMany({ where: tenantScope(tenantId) }),
    prisma.designReport.findMany({ where: tenantScope(tenantId) }),
    prisma.estimation.findMany({ where: tenantScope(tenantId) }),
  ]);

  const allReports = [
    ...geo.map((r) => ({ id: r.id, title: r.title, type: "Geotechnical", projectName: r.projectName, client: r.client ?? "", status: r.status, createdAt: r.createdAt })),
    ...svy.map((r) => ({ id: r.id, title: r.title, type: "Survey", projectName: r.projectName, client: r.client ?? "", status: r.status, createdAt: r.createdAt })),
    ...des.map((r) => ({ id: r.id, title: r.title, type: "Design", projectName: r.projectName, client: r.client ?? "", status: r.status, createdAt: r.createdAt })),
    ...est.map((r) => ({ id: r.id, title: r.title, type: "Estimation", projectName: r.projectName, client: r.client ?? "", status: r.status, createdAt: r.createdAt })),
  ];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        projectName: r.projectName,
        client: r.client,
        status: r.status as CivilReportStatus,
        createdAt: r.createdAt.toISOString(),
      })),
  };
}
