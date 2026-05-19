"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type {
  TenderStatus,
  TenderSource,
  PreQualStatus,
  BidStatus,
  BidResult,
  EMDType,
  EMDStatus,
} from "@/generated/prisma/enums";

// ============================================================================
// Helpers
// ============================================================================

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// TENDER MANAGEMENT
// ============================================================================

export async function getTenders(filters?: {
  search?: string;
  status?: TenderStatus;
  source?: TenderSource;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.source ? { source: filters.source } : {}),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { referenceNo: { contains: filters.search, mode: "insensitive" as const } },
            { issuingAuth: { contains: filters.search, mode: "insensitive" as const } },
            { description: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.tender.findMany({
      where,
      include: {
        _count: { select: { bids: true, boqItems: true, emdRecords: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tender.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTender(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.tender.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      bids: { orderBy: { createdAt: "desc" } },
      boqItems: { orderBy: { sNo: "asc" } },
      emdRecords: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createTender(data: {
  referenceNo: string;
  title: string;
  description?: string;
  source?: TenderSource;
  sourceUrl?: string;
  issuingAuth?: string;
  category?: string;
  estimatedValue?: number;
  emdAmount?: number;
  emdDeadline?: string;
  submissionDeadline?: string;
  openingDate?: string;
  assignedToId?: string;
  eligibilityCriteria?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const tender = await prisma.tender.create({
    data: {
      tenantId,
      referenceNo: data.referenceNo,
      title: data.title,
      description: data.description,
      source: data.source ?? "MANUAL",
      sourceUrl: data.sourceUrl,
      issuingAuth: data.issuingAuth,
      category: data.category,
      estimatedValue: data.estimatedValue,
      emdAmount: data.emdAmount,
      emdDeadline: data.emdDeadline ? new Date(data.emdDeadline) : undefined,
      submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : undefined,
      openingDate: data.openingDate ? new Date(data.openingDate) : undefined,
      assignedToId: data.assignedToId || undefined,
      eligibilityCriteria: data.eligibilityCriteria as never,
      documents: (data.documents ?? []) as never,
    },
  });

  await logAudit({ tenantId, userId, action: "tender.create", entity: "Tender", entityId: tender.id });
  revalidatePath("/tenders");
  return tender;
}

export async function updateTender(
  id: string,
  data: {
    title?: string;
    description?: string;
    source?: TenderSource;
    sourceUrl?: string;
    issuingAuth?: string;
    category?: string;
    estimatedValue?: number;
    emdAmount?: number;
    emdDeadline?: string;
    submissionDeadline?: string;
    openingDate?: string;
    status?: TenderStatus;
    preQualStatus?: PreQualStatus;
    preQualNotes?: string;
    eligibilityCriteria?: Record<string, unknown>;
    assignedToId?: string;
    documents?: Array<Record<string, unknown>>;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const updateData: Record<string, unknown> = { ...data };
  if (data.emdDeadline) updateData.emdDeadline = new Date(data.emdDeadline);
  if (data.submissionDeadline) updateData.submissionDeadline = new Date(data.submissionDeadline);
  if (data.openingDate) updateData.openingDate = new Date(data.openingDate);

  await prisma.tender.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });

  await logAudit({ tenantId, userId, action: "tender.update", entity: "Tender", entityId: id });
  revalidatePath("/tenders");
  return { success: true };
}

export async function deleteTender(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.tender.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "tender.delete", entity: "Tender", entityId: id });
  revalidatePath("/tenders");
  return { success: true };
}

// ============================================================================
// TENDER SOURCING, QUALIFICATION, AND SCHEDULE ANALYSIS
// ============================================================================

function asNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  const parsed = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLooseDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeImportedTender(row: Record<string, unknown>, index: number) {
  const referenceNo =
    String(row.referenceNo ?? row.reference ?? row.refNo ?? row.tenderNo ?? "").trim() ||
    `AUTO-${Date.now()}-${index + 1}`;
  const title = String(row.title ?? row.name ?? row.description ?? "").trim();

  return {
    referenceNo,
    title,
    description: String(row.description ?? row.scope ?? "").trim() || undefined,
    issuingAuth: String(row.issuingAuth ?? row.authority ?? row.client ?? "").trim() || undefined,
    category: String(row.category ?? row.workType ?? "Civil").trim() || "Civil",
    estimatedValue: asNumber(row.estimatedValue ?? row.value ?? row.amount),
    emdAmount: asNumber(row.emdAmount ?? row.emd),
    submissionDeadline: parseLooseDate(row.submissionDeadline ?? row.deadline ?? row.dueDate),
    openingDate: parseLooseDate(row.openingDate),
  };
}

function parseTenderImportPayload(payload: string) {
  const trimmed = payload.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
      .map(normalizeImportedTender)
      .filter((row) => row.title);
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [referenceNo, title, issuingAuth, estimatedValue, submissionDeadline, emdAmount] =
          line.split("|").map((part) => part.trim());
        return normalizeImportedTender(
          { referenceNo, title, issuingAuth, estimatedValue, submissionDeadline, emdAmount },
          index
        );
      })
      .filter((row) => row.title);
  }
}

export async function importTenderLeadsFromText(data: {
  source?: TenderSource;
  sourceUrl?: string;
  payload: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const rows = parseTenderImportPayload(data.payload);

  const result = {
    created: 0,
    skipped: 0,
    references: [] as string[],
  };

  for (const row of rows) {
    const existing = await prisma.tender.findUnique({
      where: { tenantId_referenceNo: { tenantId, referenceNo: row.referenceNo } },
      select: { id: true },
    });

    if (existing) {
      result.skipped += 1;
      continue;
    }

    await prisma.tender.create({
      data: {
        tenantId,
        ...row,
        source: data.source ?? "MANUAL",
        sourceUrl: data.sourceUrl,
        status: "IDENTIFIED",
      },
    });
    result.created += 1;
    result.references.push(row.referenceNo);
  }

  await logAudit({
    tenantId,
    userId,
    action: "tender.import",
    entity: "Tender",
    metadata: result as never,
  });
  revalidatePath("/tenders");
  revalidatePath("/sales");
  return result;
}

const eligibilityChecks = [
  {
    area: "Technical",
    criterion: "Similar civil works experience",
    tenderKeywords: ["similar work", "experience", "completed", "civil work", "project"],
    credentialKeywords: ["completed", "project", "civil", "work order", "completion"],
    improvement: "Attach three comparable completion certificates and map them against tender scope/value.",
  },
  {
    area: "Technical",
    criterion: "Key manpower availability",
    tenderKeywords: ["engineer", "project manager", "site supervisor", "manpower", "staff"],
    credentialKeywords: ["engineer", "manager", "supervisor", "resume", "cv"],
    improvement: "Shortlist PM, billing engineer, QA/QC, safety officer, and site supervisors from CV Bank.",
  },
  {
    area: "Technical",
    criterion: "Plant, equipment, and inventory readiness",
    tenderKeywords: ["equipment", "machinery", "plant", "vehicle", "inventory"],
    credentialKeywords: ["equipment", "machinery", "owned", "leased", "inventory"],
    improvement: "Prepare ownership/lease documents and a mobilization plan for critical equipment.",
  },
  {
    area: "Financial",
    criterion: "Turnover, solvency, and bid capacity",
    tenderKeywords: ["turnover", "solvency", "net worth", "bid capacity", "financial"],
    credentialKeywords: ["turnover", "solvency", "net worth", "balance sheet", "ca certificate"],
    improvement: "Collect audited financials, solvency certificate, and bid-capacity calculation.",
  },
  {
    area: "Legal",
    criterion: "Statutory registration and declarations",
    tenderKeywords: ["gst", "pan", "registration", "license", "affidavit"],
    credentialKeywords: ["gst", "pan", "license", "registration", "affidavit"],
    improvement: "Update GST/PAN/license documents and prepare required notarized declarations.",
  },
  {
    area: "Legal",
    criterion: "Litigation, blacklist, and compliance risk",
    tenderKeywords: ["blacklist", "litigation", "arbitration", "debarred", "compliance"],
    credentialKeywords: ["not blacklisted", "no litigation", "compliance", "declaration"],
    improvement: "Prepare no-blacklist and litigation disclosure with supporting board authorization.",
  },
];

function containsAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

export async function analyzeTenderQualification(data: {
  tenderId: string;
  companyCredentials: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const tender = await prisma.tender.findFirst({
    where: { id: data.tenderId, ...tenantScope(tenantId) },
    include: { boqItems: true },
  });

  if (!tender) throw new Error("Tender not found");

  const tenderText = [
    tender.title,
    tender.description,
    tender.category,
    tender.issuingAuth,
    JSON.stringify(tender.eligibilityCriteria ?? {}),
    ...tender.boqItems.map((item) => item.description),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const credentialText = data.companyCredentials.toLowerCase();

  const criteria = eligibilityChecks.map((check) => {
    const relevant = containsAny(tenderText, check.tenderKeywords);
    const met = containsAny(credentialText, check.credentialKeywords);
    return {
      area: check.area,
      criterion: check.criterion,
      relevance: relevant ? "Required / likely required" : "Verify in tender document",
      status: met ? "Met" : relevant ? "Gap" : "Needs review",
      notes: met
        ? "Evidence appears present in the supplied company credentials."
        : check.improvement,
    };
  });

  const metCount = criteria.filter((criterion) => criterion.status === "Met").length;
  const score = Math.round((metCount / criteria.length) * 100);
  const preQualStatus: PreQualStatus =
    score >= 75 ? "QUALIFIED" : score >= 45 ? "IMPROVEMENT_NEEDED" : "NOT_QUALIFIED_PQ";
  const actionPlan = criteria
    .filter((criterion) => criterion.status !== "Met")
    .map((criterion, index) => ({
      priority: index + 1,
      owner: criterion.area === "Legal" ? "Legal / Compliance" : criterion.area === "Financial" ? "Finance" : "Tender Team",
      action: criterion.notes,
    }));

  const analysis = {
    generatedAt: new Date().toISOString(),
    score,
    status: preQualStatus,
    criteria,
    actionPlan,
  };

  await prisma.tender.updateMany({
    where: { id: data.tenderId, ...tenantScope(tenantId) },
    data: {
      preQualStatus,
      preQualNotes: `Eligibility score ${score}%. ${actionPlan.length} action(s) pending.`,
      eligibilityCriteria: analysis as never,
      status: preQualStatus === "QUALIFIED" ? "PRE_QUALIFIED" : tender.status,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "tender.qualify",
    entity: "Tender",
    entityId: data.tenderId,
  });
  revalidatePath("/tenders");
  return analysis;
}

export async function generateTenderSchedule(data: {
  tenderId: string;
  targetDays?: number;
  manpowerBase?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const tender = await prisma.tender.findFirst({
    where: { id: data.tenderId, ...tenantScope(tenantId) },
    include: { boqItems: { orderBy: { sNo: "asc" } } },
  });

  if (!tender) throw new Error("Tender not found");

  const estimatedValue = asNumber(tender.estimatedValue) ?? 0;
  const boqTotal = tender.boqItems.reduce(
    (sum, item) => sum + (asNumber(item.amount) ?? ((asNumber(item.quantity) ?? 0) * (asNumber(item.rate) ?? 0))),
    0
  );
  const valueBase = boqTotal || estimatedValue || 5000000;
  const targetDays =
    data.targetDays ??
    (tender.submissionDeadline
      ? Math.max(30, Math.ceil((tender.submissionDeadline.getTime() - Date.now()) / 86_400_000))
      : 120);
  const manpowerBase = data.manpowerBase ?? Math.max(8, Math.ceil(valueBase / 2_500_000));

  const scopeBuckets = tender.boqItems.length
    ? tender.boqItems.slice(0, 8).map((item, index) => ({
        name: item.category || item.description.slice(0, 42),
        sequence: index + 1,
        quantity: asNumber(item.quantity) ?? 0,
        unit: item.unit,
      }))
    : [
        { name: "Mobilization and survey", sequence: 1, quantity: 1, unit: "LS" },
        { name: "Civil execution", sequence: 2, quantity: 1, unit: "LS" },
        { name: "MEP and finishing coordination", sequence: 3, quantity: 1, unit: "LS" },
        { name: "Testing, handover, and documentation", sequence: 4, quantity: 1, unit: "LS" },
      ];

  const scenarios = [
    { name: "Before Time", multiplier: 0.85, manpower: 1.25, inventory: 0.6, finance: 0.72 },
    { name: "On Time", multiplier: 1, manpower: 1, inventory: 0.45, finance: 0.58 },
    { name: "Delayed", multiplier: 1.25, manpower: 0.78, inventory: 0.35, finance: 0.48 },
  ].map((scenario) => {
    const durationDays = Math.ceil(targetDays * scenario.multiplier);
    const manpower = Math.ceil(manpowerBase * scenario.manpower);
    const inventoryNeed = Math.round(valueBase * scenario.inventory);
    const financeNeed = Math.round(valueBase * scenario.finance);

    return {
      name: scenario.name,
      durationDays,
      manpower,
      inventoryNeed,
      financeNeed,
      phases: scopeBuckets.map((bucket) => ({
        ...bucket,
        durationDays: Math.max(3, Math.ceil(durationDays / scopeBuckets.length)),
        manpower: Math.max(2, Math.ceil(manpower / Math.min(scopeBuckets.length, 4))),
      })),
    };
  });

  return {
    tender: {
      id: tender.id,
      referenceNo: tender.referenceNo,
      title: tender.title,
      estimatedValue: valueBase,
    },
    assumptions: {
      targetDays,
      manpowerBase,
      boqItems: tender.boqItems.length,
    },
    scenarios,
    reports: [
      "Use Before Time when cash-flow support and extra manpower are approved.",
      "Use On Time as baseline tender submission schedule.",
      "Use Delayed when approvals, drawings, or long-lead inventory are uncertain.",
    ],
  };
}

// ============================================================================
// BID MANAGEMENT
// ============================================================================

export async function createBid(data: {
  tenderId: string;
  bidNo: string;
  bidAmount: number;
  status?: BidStatus;
  documents?: Array<Record<string, unknown>>;
  keywords?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const bid = await prisma.bid.create({
    data: {
      tenantId,
      tenderId: data.tenderId,
      bidNo: data.bidNo,
      bidAmount: data.bidAmount,
      status: data.status ?? "DRAFT",
      documents: (data.documents ?? []) as never,
      keywords: data.keywords ?? [],
    },
  });

  await logAudit({ tenantId, userId, action: "bid.create", entity: "Bid", entityId: bid.id });
  revalidatePath("/tenders");
  return bid;
}

export async function updateBidResult(
  id: string,
  result: BidResult,
  notes?: string,
  extra?: {
    winningAmount?: number;
    competitorName?: string;
    lossReason?: string;
    lessonsLearned?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.bid.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      result,
      resultNotes: notes,
      winningAmount: extra?.winningAmount,
      competitorName: extra?.competitorName,
      lossReason: extra?.lossReason,
      lessonsLearned: extra?.lessonsLearned,
    },
  });

  await logAudit({ tenantId, userId, action: "bid.result", entity: "Bid", entityId: id });
  revalidatePath("/tenders");
  return { success: true };
}

export async function analyzeLostBids(keywords?: string[]) {
  const { tenantId } = await getSessionOrThrow();

  const lostBids = await prisma.bid.findMany({
    where: {
      ...tenantScope(tenantId),
      result: "LOST",
    },
    include: {
      tender: {
        select: { title: true, category: true, issuingAuth: true, estimatedValue: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // If keywords provided, filter bids whose keywords overlap
  if (keywords && keywords.length > 0) {
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    return lostBids.filter((bid) => {
      const bidKeywords = (bid.keywords as string[]) ?? [];
      return bidKeywords.some((bk) => lowerKeywords.includes(bk.toLowerCase()));
    });
  }

  return lostBids;
}

export async function getSimilarTenders(tenderId: string) {
  const { tenantId } = await getSessionOrThrow();

  // Get the reference tender with its bids' keywords
  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, ...tenantScope(tenantId) },
    include: { bids: { select: { keywords: true } } },
  });

  if (!tender) return [];

  // Collect keywords from category, issuing authority, and bid keywords
  const searchTerms: string[] = [];
  if (tender.category) searchTerms.push(tender.category);
  if (tender.issuingAuth) searchTerms.push(tender.issuingAuth);
  tender.bids.forEach((bid) => {
    const kw = (bid.keywords as string[]) ?? [];
    searchTerms.push(...kw);
  });

  if (searchTerms.length === 0) return [];

  // Find tenders matching any of these terms by category or title
  const similar = await prisma.tender.findMany({
    where: {
      ...tenantScope(tenantId),
      id: { not: tenderId },
      OR: [
        ...(tender.category ? [{ category: tender.category }] : []),
        ...(tender.issuingAuth ? [{ issuingAuth: tender.issuingAuth }] : []),
        ...searchTerms.map((term) => ({
          title: { contains: term, mode: "insensitive" as const },
        })),
      ],
    },
    include: {
      _count: { select: { bids: true } },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return similar;
}

// ============================================================================
// BOQ (Bill of Quantities)
// ============================================================================

export async function getBOQForTender(tenderId: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.bOQItem.findMany({
    where: { ...tenantScope(tenantId), tenderId },
    orderBy: { sNo: "asc" },
  });
}

export async function createBOQItem(data: {
  tenderId?: string;
  projectId?: string;
  sNo: number;
  description: string;
  unit: string;
  quantity: number;
  rate?: number;
  amount?: number;
  category?: string;
  remarks?: string;
  sourceDoc?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const item = await prisma.bOQItem.create({
    data: {
      tenantId,
      tenderId: data.tenderId || undefined,
      projectId: data.projectId || undefined,
      sNo: data.sNo,
      description: data.description,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      amount: data.amount,
      category: data.category,
      remarks: data.remarks,
      sourceDoc: data.sourceDoc,
    },
  });

  await logAudit({ tenantId, userId, action: "boq.create", entity: "BOQItem", entityId: item.id });
  revalidatePath("/tenders");
  return item;
}

export async function updateBOQItem(
  id: string,
  data: {
    sNo?: number;
    description?: string;
    unit?: string;
    quantity?: number;
    rate?: number;
    amount?: number;
    category?: string;
    remarks?: string;
    sourceDoc?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.bOQItem.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "boq.update", entity: "BOQItem", entityId: id });
  revalidatePath("/tenders");
  return { success: true };
}

export async function deleteBOQItem(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.bOQItem.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "boq.delete", entity: "BOQItem", entityId: id });
  revalidatePath("/tenders");
  return { success: true };
}

// ============================================================================
// EMD / Bond Tracking
// ============================================================================

export async function createEMDRecord(data: {
  tenderId?: string;
  type?: EMDType;
  instrumentType?: string;
  instrumentNo?: string;
  bankName?: string;
  amount: number;
  issuedDate?: string;
  expiryDate?: string;
  remarks?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const record = await prisma.eMDRecord.create({
    data: {
      tenantId,
      tenderId: data.tenderId || undefined,
      type: data.type ?? "EMD",
      instrumentType: data.instrumentType ?? "BG",
      instrumentNo: data.instrumentNo,
      bankName: data.bankName,
      amount: data.amount,
      issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      remarks: data.remarks,
    },
  });

  await logAudit({ tenantId, userId, action: "emd.create", entity: "EMDRecord", entityId: record.id });
  revalidatePath("/tenders");
  return record;
}

export async function updateEMDRecord(
  id: string,
  data: {
    type?: EMDType;
    instrumentType?: string;
    instrumentNo?: string;
    bankName?: string;
    amount?: number;
    issuedDate?: string;
    expiryDate?: string;
    status?: EMDStatus;
    returnedDate?: string;
    forfeitedDate?: string;
    remarks?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const updateData: Record<string, unknown> = { ...data };
  if (data.issuedDate) updateData.issuedDate = new Date(data.issuedDate);
  if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);
  if (data.returnedDate) updateData.returnedDate = new Date(data.returnedDate);
  if (data.forfeitedDate) updateData.forfeitedDate = new Date(data.forfeitedDate);

  await prisma.eMDRecord.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: updateData,
  });

  await logAudit({ tenantId, userId, action: "emd.update", entity: "EMDRecord", entityId: id });
  revalidatePath("/tenders");
  return { success: true };
}

export async function getActiveEMDs() {
  const { tenantId } = await getSessionOrThrow();

  return prisma.eMDRecord.findMany({
    where: {
      ...tenantScope(tenantId),
      status: "ACTIVE",
    },
    include: {
      tender: { select: { id: true, title: true, referenceNo: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
}

export async function getExpiringEMDs(days: number = 30) {
  const { tenantId } = await getSessionOrThrow();

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() + days);

  return prisma.eMDRecord.findMany({
    where: {
      ...tenantScope(tenantId),
      status: "ACTIVE",
      expiryDate: { gte: now, lte: cutoff },
    },
    include: {
      tender: { select: { id: true, title: true, referenceNo: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
}
