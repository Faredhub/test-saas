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
