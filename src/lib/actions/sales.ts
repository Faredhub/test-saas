"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import { generateCSV, parseCSV } from "@/lib/export";
import { generateTallyXML, type TallyInvoice } from "@/lib/tally-export";
import type { PipelineStage, LeadSource, LeadStatus, DealStage, QuotationStatus, InvoiceStatus, PaymentMethod } from "@/generated/prisma/enums";

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

/** Calculate lead score based on data completeness, value, source, and pipeline stage */
function calculateLeadScore(lead: {
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  estimatedValue?: number | string | null | { toNumber?: () => number };
  source?: string | null;
  pipelineStage?: string | null;
}): number {
  let score = 0;

  // Contact info completeness
  if (lead.email) score += 15;
  if (lead.phone) score += 10;
  if (lead.company) score += 10;
  if (lead.jobTitle) score += 5;

  // Estimated value scoring
  const value =
    lead.estimatedValue == null
      ? 0
      : typeof lead.estimatedValue === "object" && lead.estimatedValue !== null && "toNumber" in lead.estimatedValue
        ? (lead.estimatedValue as { toNumber: () => number }).toNumber()
        : Number(lead.estimatedValue);

  if (value > 0) score += 15;
  if (value > 50000) score += 10;
  if (value > 200000) score += 10;

  // Source scoring
  if (lead.source === "WEB_FORM" || lead.source === "REFERRAL") score += 10;
  if (lead.source === "SOCIAL_MEDIA" || lead.source === "EMAIL") score += 5;

  // Pipeline stage scoring
  if (lead.pipelineStage === "QUALIFIED") score += 10;
  if (lead.pipelineStage === "PROPOSAL" || lead.pipelineStage === "NEGOTIATION") score += 15;

  return Math.min(score, 100);
}

// ============================================================================
// LEADS
// ============================================================================

export async function getLeads(filters?: {
  pipelineStage?: PipelineStage;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.pipelineStage ? { pipelineStage: filters.pipelineStage } : {}),
    ...(filters?.search
      ? {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" as const } },
          { lastName: { contains: filters.search, mode: "insensitive" as const } },
          { email: { contains: filters.search, mode: "insensitive" as const } },
          { company: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getLeadById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.lead.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      contact: true,
      deals: true,
    },
  });
}

export async function createLead(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: LeadSource;
  estimatedValue?: number;
  assignedToId?: string;
  notes?: string;
}) {
  await requirePermission({ module: "sales", action: "create", resource: "leads" });
  const { userId, tenantId } = await getSessionOrThrow();

  const source = data.source ?? "MANUAL";
  const score = calculateLeadScore({
    email: data.email,
    phone: data.phone,
    company: data.company,
    jobTitle: data.jobTitle,
    estimatedValue: data.estimatedValue,
    source,
    pipelineStage: "NEW",
  });

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      createdById: userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      jobTitle: data.jobTitle,
      source,
      estimatedValue: data.estimatedValue,
      assignedToId: data.assignedToId ?? userId,
      notes: data.notes,
      score,
    },
  });

  await logAudit({ tenantId, userId, action: "lead.create", entity: "Lead", entityId: lead.id });
  revalidatePath("/sales/leads");
  revalidatePath("/sales/pipeline");
  return lead;
}

export async function updateLead(id: string, data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: LeadSource;
  status?: LeadStatus;
  pipelineStage?: PipelineStage;
  estimatedValue?: number;
  assignedToId?: string;
  notes?: string;
  lostReason?: string;
  score?: number;
}) {
  await requirePermission({ module: "sales", action: "update", resource: "leads" });
  const { userId, tenantId } = await getSessionOrThrow();

  // Fetch current lead to merge with updates for score calculation
  const existing = await prisma.lead.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { email: true, phone: true, company: true, jobTitle: true, estimatedValue: true, source: true, pipelineStage: true },
  });

  const merged = {
    email: data.email ?? existing?.email,
    phone: data.phone ?? existing?.phone,
    company: data.company ?? existing?.company,
    jobTitle: data.jobTitle ?? existing?.jobTitle,
    estimatedValue: data.estimatedValue ?? existing?.estimatedValue,
    source: data.source ?? existing?.source,
    pipelineStage: data.pipelineStage ?? existing?.pipelineStage,
  };

  const score = calculateLeadScore(merged);

  const lead = await prisma.lead.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...data,
      score,
      ...(data.pipelineStage === "WON" ? { wonDate: new Date() } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "lead.update", entity: "Lead", entityId: id });
  revalidatePath("/sales/leads");
  revalidatePath("/sales/pipeline");
  return lead;
}

export async function deleteLead(id: string) {
  await requirePermission({ module: "sales", action: "delete", resource: "leads" });
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.lead.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "lead.delete", entity: "Lead", entityId: id });
  revalidatePath("/sales/leads");
  revalidatePath("/sales/pipeline");
}

export async function getLeadsByPipelineStage() {
  const { tenantId } = await getSessionOrThrow();
  const stages: PipelineStage[] = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

  const counts = await Promise.all(
    stages.map(async (stage) => ({
      stage,
      count: await prisma.lead.count({ where: { ...tenantScope(tenantId), pipelineStage: stage } }),
    }))
  );

  return counts;
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function getContacts(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.search
      ? {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" as const } },
          { lastName: { contains: filters.search, mode: "insensitive" as const } },
          { email: { contains: filters.search, mode: "insensitive" as const } },
          { company: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createContact(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  notes?: string;
  tags?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const contact = await prisma.contact.create({
    data: {
      tenantId,
      ownerId: userId,
      ...data,
    },
  });

  await logAudit({ tenantId, userId, action: "contact.create", entity: "Contact", entityId: contact.id });
  revalidatePath("/sales/contacts");
  return contact;
}

export async function updateContact(id: string, data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  tags?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.contact.updateMany({ where: { id, ...tenantScope(tenantId) }, data });
  await logAudit({ tenantId, userId, action: "contact.update", entity: "Contact", entityId: id });
  revalidatePath("/sales/contacts");
}

export async function deleteContact(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.contact.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "contact.delete", entity: "Contact", entityId: id });
  revalidatePath("/sales/contacts");
}

// ============================================================================
// DEALS
// ============================================================================

export async function getDeals(filters?: {
  stage?: DealStage;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.stage ? { stage: filters.stage } : {}),
    ...(filters?.search
      ? { title: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deal.count({ where }),
  ]);

  const serializedData = data.map((d) => ({
    ...d,
    value: d.value ? Number(d.value) : null,
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createDeal(data: {
  title: string;
  value?: number;
  currency?: string;
  probability?: number;
  stage?: DealStage;
  expectedCloseDate?: string;
  contactId?: string;
  leadId?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const deal = await prisma.deal.create({
    data: {
      tenantId,
      ownerId: userId,
      title: data.title,
      value: data.value,
      currency: data.currency ?? "INR",
      probability: data.probability ?? 0,
      stage: data.stage ?? "PROSPECTING",
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      contactId: data.contactId,
      leadId: data.leadId,
      notes: data.notes,
    },
  });

  await logAudit({ tenantId, userId, action: "deal.create", entity: "Deal", entityId: deal.id });
  revalidatePath("/sales/deals");
  return {
    ...deal,
    value: deal.value ? Number(deal.value) : null,
  };
}

export async function updateDeal(id: string, data: {
  title?: string;
  value?: number;
  probability?: number;
  stage?: DealStage;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  lostReason?: string;
  notes?: string;
  contactId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.deal.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...data,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      actualCloseDate: data.actualCloseDate ? new Date(data.actualCloseDate) : undefined,
    },
  });

  await logAudit({ tenantId, userId, action: "deal.update", entity: "Deal", entityId: id });
  revalidatePath("/sales/deals");
}

export async function deleteDeal(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.deal.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "deal.delete", entity: "Deal", entityId: id });
  revalidatePath("/sales/deals");
}

// ============================================================================
// QUOTATIONS
// ============================================================================

function serializeQuotation(q: any) {
  if (!q) return q;
  const raw = JSON.parse(JSON.stringify(q));
  return {
    ...raw,
    subtotal: q.subtotal != null ? Number(q.subtotal) : 0,
    taxAmount: q.taxAmount != null ? Number(q.taxAmount) : 0,
    discount: q.discount != null ? Number(q.discount) : 0,
    total: q.total != null ? Number(q.total) : 0,
    cgst: q.cgst != null ? Number(q.cgst) : 0,
    sgst: q.sgst != null ? Number(q.sgst) : 0,
    igst: q.igst != null ? Number(q.igst) : 0,
    items: q.items ? q.items.map((item: any) => ({
      ...JSON.parse(JSON.stringify(item)),
      quantity: item.quantity != null ? Number(item.quantity) : 0,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : 0,
      taxRate: item.taxRate != null ? Number(item.taxRate) : 0,
      total: item.total != null ? Number(item.total) : 0,
    })) : [],
  };
}

export async function getQuotations(filters?: {
  status?: QuotationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? { quotationNo: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quotation.count({ where }),
  ]);

  const serializedData = data.map(serializeQuotation);

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createQuotation(data: {
  contactId?: string;
  dealId?: string;
  items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  validUntil?: string;
  notes?: string;
  terms?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Generate quotation number
  const count = await prisma.quotation.count({ where: tenantScope(tenantId) });
  const quotationNo = `QTN-${String(count + 1).padStart(5, "0")}`;

  // Calculate totals
  const items = data.items.map((item, i) => {
    const total = item.quantity * item.unitPrice;
    const taxAmount = total * ((item.taxRate ?? 0) / 100);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate ?? 0,
      total: total + taxAmount,
      sortOrder: i,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.total - item.quantity * item.unitPrice), 0);
  const total = subtotal + taxAmount;

  const quotation = await prisma.quotation.create({
    data: {
      tenantId,
      quotationNo,
      createdById: userId,
      contactId: data.contactId,
      dealId: data.dealId,
      subtotal,
      taxAmount,
      total,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      notes: data.notes,
      terms: data.terms,
      items: { create: items },
    },
    include: { items: true },
  });

  await logAudit({ tenantId, userId, action: "quotation.create", entity: "Quotation", entityId: quotation.id });
  revalidatePath("/sales/quotations");
  return serializeQuotation(quotation);
}

// ============================================================================
// INVOICES
// ============================================================================

function serializeInvoice(inv: any) {
  if (!inv) return inv;
  const raw = JSON.parse(JSON.stringify(inv));
  return {
    ...raw,
    subtotal: inv.subtotal != null ? Number(inv.subtotal) : 0,
    taxAmount: inv.taxAmount != null ? Number(inv.taxAmount) : 0,
    discount: inv.discount != null ? Number(inv.discount) : 0,
    total: inv.total != null ? Number(inv.total) : 0,
    amountPaid: inv.amountPaid != null ? Number(inv.amountPaid) : 0,
    cgst: inv.cgst != null ? Number(inv.cgst) : 0,
    sgst: inv.sgst != null ? Number(inv.sgst) : 0,
    igst: inv.igst != null ? Number(inv.igst) : 0,
    items: inv.items ? inv.items.map((item: any) => ({
      ...JSON.parse(JSON.stringify(item)),
      quantity: item.quantity != null ? Number(item.quantity) : 0,
      unitPrice: item.unitPrice != null ? Number(item.unitPrice) : 0,
      taxRate: item.taxRate != null ? Number(item.taxRate) : 0,
      total: item.total != null ? Number(item.total) : 0,
    })) : [],
    payments: inv.payments ? inv.payments.map((p: any) => ({
      ...JSON.parse(JSON.stringify(p)),
      amount: p.amount != null ? Number(p.amount) : 0,
    })) : [],
  };
}

export async function getInvoices(filters?: {
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? { invoiceNo: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true, payments: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  const serializedData = data.map(serializeInvoice);

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createInvoice(data: {
  contactId?: string;
  quotationId?: string;
  items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.invoice.count({ where: tenantScope(tenantId) });
  const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

  const items = data.items.map((item, i) => {
    const lineTotal = item.quantity * item.unitPrice;
    const taxAmount = lineTotal * ((item.taxRate ?? 0) / 100);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate ?? 0,
      total: lineTotal + taxAmount,
      sortOrder: i,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.total - item.quantity * item.unitPrice), 0);
  const total = subtotal + taxAmount;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNo,
      createdById: userId,
      contactId: data.contactId,
      quotationId: data.quotationId,
      subtotal,
      taxAmount,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      paymentTerms: data.paymentTerms,
      notes: data.notes,
      items: { create: items },
    },
    include: { items: true },
  });

  await logAudit({ tenantId, userId, action: "invoice.create", entity: "Invoice", entityId: invoice.id });
  revalidatePath("/sales/invoices");
  return serializeInvoice(invoice);
}

/**
 * POS-specific invoice creation: creates an invoice and immediately marks it as PAID.
 */
export async function createPosInvoice(data: {
  items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  customerName?: string;
  paymentMethod?: string;
  discount?: number;
  notes?: string;
}) {
  const invoice = await createInvoice({
    items: data.items,
    notes: [
      data.customerName ? `Customer: ${data.customerName}` : "",
      data.paymentMethod ? `Payment: ${data.paymentMethod}` : "",
      data.discount ? `Discount: ${data.discount}` : "",
      data.notes ?? "",
    ].filter(Boolean).join(" | "),
  });

  const { userId, tenantId } = await getSessionOrThrow();

  // Mark as PAID immediately for POS sales
  await prisma.invoice.updateMany({
    where: { id: invoice.id, ...tenantScope(tenantId) },
    data: {
      status: "PAID",
      paidDate: new Date(),
      amountPaid: invoice.total,
      discount: data.discount ?? 0,
    },
  });
  const updated = await prisma.invoice.findFirstOrThrow({
    where: { id: invoice.id, ...tenantScope(tenantId) },
    include: { items: true },
  });

  await logAudit({ tenantId, userId, action: "pos.sale", entity: "Invoice", entityId: invoice.id });
  revalidatePath("/sales/pos");
  revalidatePath("/sales/invoices");
  return updated;
}

export async function getInvoiceById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      contact: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      quotation: { select: { id: true, quotationNo: true } },
      tenant: {
        select: {
          id: true,
          name: true,
          logo: true,
          gst: true,
          pan: true,
          address: true,
          city: true,
          state: true,
          country: true,
          pincode: true,
          phone: true,
          email: true,
          website: true,
        },
      },
    },
  });

  return serializeInvoice(invoice);
}

// ============================================================================
// DETAIL FETCHERS
// ============================================================================

export async function getContactById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.contact.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      deals: {
        include: { owner: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      invoices: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      quotations: { orderBy: { createdAt: "desc" }, take: 20 },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      loyaltyPoints: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function getDealById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.deal.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: true,
      lead: { select: { id: true, firstName: true, lastName: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      quotations: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function convertLeadToContact(leadId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...tenantScope(tenantId) },
  });

  if (!lead) throw new Error("Lead not found");

  const contact = await prisma.contact.create({
    data: {
      tenantId,
      ownerId: userId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
    },
  });

  // Link contact to the lead (CRIT-02: tenant-scoped)
  await prisma.lead.updateMany({
    where: { id: leadId, ...tenantScope(tenantId) },
    data: { contactId: contact.id, status: "CONVERTED" },
  });

  await logAudit({ tenantId, userId, action: "lead.convert", entity: "Lead", entityId: leadId });
  revalidatePath("/sales/leads");
  revalidatePath("/sales/pipeline");
  revalidatePath("/sales/contacts");
  revalidatePath(`/sales/leads/${leadId}`);
  return contact;
}

// ============================================================================
// PAYMENT RECORDING (SALES-B005)
// ============================================================================

export async function recordPayment(
  invoiceId: string,
  data: { amount: number; method: string; reference?: string; notes?: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Fetch the invoice to validate
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...tenantScope(tenantId) },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "CANCELLED") throw new Error("Cannot record payment on a cancelled invoice");
  if (invoice.status === "REFUNDED") throw new Error("Cannot record payment on a refunded invoice");

  const balanceDue = Number(invoice.total) - Number(invoice.amountPaid);
  if (data.amount <= 0) throw new Error("Payment amount must be greater than zero");
  if (data.amount > balanceDue + 0.01) throw new Error("Payment amount exceeds balance due");

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: data.amount,
      method: data.method as PaymentMethod,
      reference: data.reference || undefined,
      notes: data.notes || undefined,
    },
  });

  // Update invoice amountPaid and status
  const newAmountPaid = Number(invoice.amountPaid) + data.amount;
  const invoiceTotal = Number(invoice.total);
  const isFullyPaid = newAmountPaid >= invoiceTotal - 0.01;

  await prisma.invoice.updateMany({
    where: { id: invoiceId, ...tenantScope(tenantId) },
    data: {
      amountPaid: newAmountPaid,
      status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
      ...(isFullyPaid ? { paidDate: new Date() } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "payment.record",
    entity: "Payment",
    entityId: payment.id,
    metadata: { invoiceId, amount: data.amount, method: data.method },
  });

  revalidatePath(`/sales/invoices/${invoiceId}`);
  revalidatePath("/sales/invoices");
  return payment;
}

export async function getInvoicePayments(invoiceId: string) {
  const { tenantId } = await getSessionOrThrow();

  // Verify the invoice belongs to this tenant
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...tenantScope(tenantId) },
    select: { id: true },
  });

  if (!invoice) throw new Error("Invoice not found");

  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: "desc" },
  });
}

// ============================================================================
// INVOICE STATUS MANAGEMENT
// ============================================================================

const INVOICE_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  PAID: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const { userId, tenantId } = await getSessionOrThrow();

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });

  if (!invoice) throw new Error("Invoice not found");

  const allowedTransitions = INVOICE_STATUS_TRANSITIONS[invoice.status] ?? [];
  if (!allowedTransitions.includes(status)) {
    throw new Error(`Cannot change status from ${invoice.status} to ${status}`);
  }

  await prisma.invoice.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      status,
      ...(status === "PAID" ? { paidDate: new Date(), amountPaid: invoice.total } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "invoice.status_change",
    entity: "Invoice",
    entityId: id,
    metadata: { from: invoice.status, to: status },
  });

  revalidatePath(`/sales/invoices/${id}`);
  revalidatePath("/sales/invoices");
}

export async function updateInvoice(
  id: string,
  data: {
    dueDate?: string;
    paymentTerms?: string;
    notes?: string;
    items?: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!invoice) throw new Error("Invoice not found");

  let updateData: any = {
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    paymentTerms: data.paymentTerms || null,
    notes: data.notes || null,
  };

  if (data.items) {
    const items = data.items.map((item, i) => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = lineTotal * ((item.taxRate ?? 0) / 100);
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? 0,
        total: lineTotal + taxAmount,
        sortOrder: i,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.total - item.quantity * item.unitPrice), 0);
    const total = subtotal + taxAmount;

    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.total = total;

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          ...updateData,
          items: { create: items },
        },
      }),
    ]);
  } else {
    await prisma.invoice.update({
      where: { id },
      data: updateData,
    });
  }

  await logAudit({ tenantId, userId, action: "invoice.update", entity: "Invoice", entityId: id });
  revalidatePath(`/sales/invoices/${id}`);
  revalidatePath("/sales/invoices");
}

export async function deleteInvoice(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { id: true, status: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only DRAFT invoices can be deleted");

  await prisma.invoice.deleteMany({ where: { id, ...tenantScope(tenantId) } });

  await logAudit({
    tenantId,
    userId,
    action: "invoice.delete",
    entity: "Invoice",
    entityId: id,
  });

  revalidatePath("/sales/invoices");
}

// ============================================================================
// QUOTATION STATUS + DELETE
// ============================================================================

const QUOTATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

export async function updateQuotationStatus(id: string, status: QuotationStatus) {
  const { userId, tenantId } = await getSessionOrThrow();

  const quotation = await prisma.quotation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });

  if (!quotation) throw new Error("Quotation not found");

  const allowedTransitions = QUOTATION_STATUS_TRANSITIONS[quotation.status] ?? [];
  if (!allowedTransitions.includes(status)) {
    throw new Error(`Cannot change status from ${quotation.status} to ${status}`);
  }

  await prisma.quotation.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status },
  });

  await logAudit({
    tenantId,
    userId,
    action: "quotation.status_change",
    entity: "Quotation",
    entityId: id,
    metadata: { from: quotation.status, to: status },
  });

  revalidatePath("/sales/quotations");
}

export async function updateQuotationNotes(id: string, notes: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const quotation = await prisma.quotation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });

  if (!quotation) throw new Error("Quotation not found");

  await prisma.quotation.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { notes },
  });

  await logAudit({
    tenantId,
    userId,
    action: "quotation.update_notes",
    entity: "Quotation",
    entityId: id,
  });

  revalidatePath("/sales/quotations");
}

export async function updateQuotation(
  id: string,
  data: {
    validUntil?: string;
    notes?: string;
    terms?: string;
    items?: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const quotation = await prisma.quotation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!quotation) throw new Error("Quotation not found");

  let updateData: any = {
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    notes: data.notes || null,
    terms: data.terms || null,
  };

  if (data.items) {
    const items = data.items.map((item, i) => {
      const total = item.quantity * item.unitPrice;
      const taxAmount = total * ((item.taxRate ?? 0) / 100);
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? 0,
        total: total + taxAmount,
        sortOrder: i,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.total - item.quantity * item.unitPrice), 0);
    const total = subtotal + taxAmount;

    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.total = total;

    await prisma.$transaction([
      prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      prisma.quotation.update({
        where: { id },
        data: {
          ...updateData,
          items: { create: items },
        },
      }),
    ]);
  } else {
    await prisma.quotation.update({
      where: { id },
      data: updateData,
    });
  }

  await logAudit({ tenantId, userId, action: "quotation.update", entity: "Quotation", entityId: id });
  revalidatePath("/sales/quotations");
}

export async function deleteQuotation(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const quotation = await prisma.quotation.findFirst({
    where: { id, ...tenantScope(tenantId) },
    select: { id: true, status: true },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "DRAFT") throw new Error("Only DRAFT quotations can be deleted");

  await prisma.quotation.deleteMany({ where: { id, ...tenantScope(tenantId) } });

  await logAudit({
    tenantId,
    userId,
    action: "quotation.delete",
    entity: "Quotation",
    entityId: id,
  });

  revalidatePath("/sales/quotations");
}

// ============================================================================
// QUOTATION-TO-INVOICE CONVERSION (SALES-B005)
// ============================================================================

export async function convertQuotationToInvoice(quotationId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, ...tenantScope(tenantId) },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "DRAFT" && quotation.status !== "SENT") {
    throw new Error("Only DRAFT or SENT quotations can be converted to invoices");
  }

  // Check if already converted
  const existingInvoice = await prisma.invoice.findFirst({
    where: { quotationId, ...tenantScope(tenantId) },
    select: { id: true, invoiceNo: true },
  });

  if (existingInvoice) {
    throw new Error(`Quotation already converted to invoice ${existingInvoice.invoiceNo}`);
  }

  // Generate invoice number
  const count = await prisma.invoice.count({ where: tenantScope(tenantId) });
  const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

  // Create invoice with copied line items
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNo,
      createdById: userId,
      contactId: quotation.contactId,
      quotationId,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      discount: quotation.discount,
      total: quotation.total,
      cgst: quotation.cgst,
      sgst: quotation.sgst,
      igst: quotation.igst,
      items: {
        create: quotation.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.total,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { items: true },
  });

  // Mark quotation as ACCEPTED (CRIT-02: tenant-scoped)
  await prisma.quotation.updateMany({
    where: { id: quotationId, ...tenantScope(tenantId) },
    data: { status: "ACCEPTED" },
  });

  await logAudit({
    tenantId,
    userId,
    action: "quotation.convert_to_invoice",
    entity: "Quotation",
    entityId: quotationId,
    metadata: { invoiceId: invoice.id, invoiceNo },
  });

  revalidatePath("/sales/quotations");
  revalidatePath("/sales/invoices");
  return invoice;
}

// ============================================================================
// ACTIVITIES (shared across leads, contacts, deals)
// ============================================================================

export async function createActivity(data: {
  type: "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK" | "VISIT";
  subject: string;
  description?: string;
  outcome?: string;
  scheduledAt?: string;
  duration?: number;
  leadId?: string;
  contactId?: string;
  dealId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const activity = await prisma.activity.create({
    data: {
      tenantId,
      userId,
      type: data.type,
      subject: data.subject,
      description: data.description,
      outcome: data.outcome,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      duration: data.duration,
      leadId: data.leadId,
      contactId: data.contactId,
      dealId: data.dealId,
    },
  });

  await logAudit({ tenantId, userId, action: "activity.create", entity: "Activity", entityId: activity.id });
  return activity;
}

// ============================================================================
// SUBSCRIPTIONS (recurring invoices)
// ============================================================================

export async function getSubscriptions() {
  const { tenantId } = await getSessionOrThrow();

  const subscriptions = await prisma.invoice.findMany({
    where: {
      ...tenantScope(tenantId),
      isRecurring: true,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
      createdBy: { select: { id: true, name: true } },
      items: true,
      _count: { select: { items: true, payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return subscriptions;
}

export async function createSubscription(data: {
  contactId?: string;
  items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  recurringInterval: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  startDate: string;
  endDate?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.invoice.count({ where: tenantScope(tenantId) });
  const invoiceNo = `SUB-${String(count + 1).padStart(5, "0")}`;

  const items = data.items.map((item, i) => {
    const lineTotal = item.quantity * item.unitPrice;
    const taxAmount = lineTotal * ((item.taxRate ?? 0) / 100);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate ?? 0,
      total: lineTotal + taxAmount,
      sortOrder: i,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.total - item.quantity * item.unitPrice), 0);
  const total = subtotal + taxAmount;

  // Calculate next recurrence from start date
  const startDate = new Date(data.startDate);
  const nextRecurrence = new Date(startDate);
  switch (data.recurringInterval) {
    case "MONTHLY":
      nextRecurrence.setMonth(nextRecurrence.getMonth() + 1);
      break;
    case "QUARTERLY":
      nextRecurrence.setMonth(nextRecurrence.getMonth() + 3);
      break;
    case "ANNUAL":
      nextRecurrence.setFullYear(nextRecurrence.getFullYear() + 1);
      break;
  }

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNo,
      createdById: userId,
      contactId: data.contactId || undefined,
      subtotal,
      taxAmount,
      total,
      dueDate: startDate,
      notes: data.endDate ? `End date: ${data.endDate}\n${data.notes ?? ""}`.trim() : data.notes,
      isRecurring: true,
      recurrenceRule: data.recurringInterval,
      nextRecurrence,
      status: "SENT",
      items: { create: items },
    },
    include: { items: true },
  });

  await logAudit({ tenantId, userId, action: "subscription.create", entity: "Invoice", entityId: invoice.id });
  revalidatePath("/sales/subscriptions");
  return invoice;
}

export async function cancelSubscription(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.invoice.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { isRecurring: false },
  });

  await logAudit({ tenantId, userId, action: "subscription.cancel", entity: "Invoice", entityId: id });
  revalidatePath("/sales/subscriptions");
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export async function getSalesStats() {
  const { tenantId } = await getSessionOrThrow();

  const [
    totalLeads,
    newLeads,
    openDeals,
    wonDeals,
    pendingInvoices,
    overdueInvoices,
    totalContacts,
  ] = await Promise.all([
    prisma.lead.count({ where: tenantScope(tenantId) }),
    prisma.lead.count({ where: { ...tenantScope(tenantId), pipelineStage: "NEW" } }),
    prisma.deal.count({ where: { ...tenantScope(tenantId), stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } } }),
    prisma.deal.count({ where: { ...tenantScope(tenantId), stage: "CLOSED_WON" } }),
    prisma.invoice.count({ where: { ...tenantScope(tenantId), status: { in: ["SENT", "PARTIALLY_PAID"] } } }),
    prisma.invoice.count({ where: { ...tenantScope(tenantId), status: "OVERDUE" } }),
    prisma.contact.count({ where: tenantScope(tenantId) }),
  ]);

  return { totalLeads, newLeads, openDeals, wonDeals, pendingInvoices, overdueInvoices, totalContacts };
}

// ============================================================================
// SALES FORECAST (SALES-A007)
// ============================================================================

export async function getSalesForecast() {
  const { tenantId } = await getSessionOrThrow();

  // Fetch all open deals (not CLOSED_WON or CLOSED_LOST)
  const openDeals = await prisma.deal.findMany({
    where: {
      ...tenantScope(tenantId),
      stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
    },
    include: {
      owner: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch closed deals for win-rate calculation
  const [wonCount, totalClosedCount] = await Promise.all([
    prisma.deal.count({
      where: { ...tenantScope(tenantId), stage: "CLOSED_WON" },
    }),
    prisma.deal.count({
      where: { ...tenantScope(tenantId), stage: { in: ["CLOSED_WON", "CLOSED_LOST"] } },
    }),
  ]);

  const winRate = totalClosedCount > 0 ? Math.round((wonCount / totalClosedCount) * 100) : 0;

  // Calculate total pipeline value and weighted value
  let totalPipelineValue = 0;
  let weightedPipeline = 0;

  const topDeals: {
    id: string;
    title: string;
    value: number;
    probability: number;
    weightedValue: number;
    stage: string;
    expectedCloseDate: string | null;
    ownerName: string | null;
    contactName: string | null;
  }[] = [];

  for (const deal of openDeals) {
    const value = deal.value ? Number(deal.value) : 0;
    const prob = deal.probability ?? 0;
    const weighted = value * prob / 100;

    totalPipelineValue += value;
    weightedPipeline += weighted;

    topDeals.push({
      id: deal.id,
      title: deal.title,
      value,
      probability: prob,
      weightedValue: weighted,
      stage: deal.stage,
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.toISOString() : null,
      ownerName: deal.owner?.name ?? null,
      contactName: deal.contact
        ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim()
        : null,
    });
  }

  // Sort by weighted value descending and take top 10
  topDeals.sort((a, b) => b.weightedValue - a.weightedValue);
  const top10Deals = topDeals.slice(0, 10);

  // Group expected revenue by month (next 6 months)
  const now = new Date();
  const monthlyForecast: { month: string; revenue: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
    monthlyForecast.push({ month: monthKey, revenue: 0 });
  }

  for (const deal of openDeals) {
    if (!deal.expectedCloseDate || !deal.value) continue;
    const closeDate = new Date(deal.expectedCloseDate);
    const value = Number(deal.value);
    const prob = deal.probability ?? 0;
    const weighted = value * prob / 100;

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      if (closeDate.getFullYear() === d.getFullYear() && closeDate.getMonth() === d.getMonth()) {
        monthlyForecast[i].revenue += weighted;
        break;
      }
    }
  }

  // Round values for cleanliness
  totalPipelineValue = Math.round(totalPipelineValue);
  weightedPipeline = Math.round(weightedPipeline);
  monthlyForecast.forEach((m) => { m.revenue = Math.round(m.revenue); });

  return {
    weightedPipeline,
    monthlyForecast,
    winRate,
    totalPipelineValue,
    dealCount: openDeals.length,
    topDeals: top10Deals,
  };
}

// ============================================================================
// BULK EXPORT (SALES-A008 + CORE-005) — fresh data, no caching
// ============================================================================

export async function exportLeads(): Promise<string> {
  const { tenantId } = await getSessionOrThrow();
  const leads = await prisma.lead.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "id", "firstName", "lastName", "email", "phone",
    "company", "source", "pipelineStage", "score", "createdAt",
  ];
  const rows = leads.map((l) => [
    l.id,
    l.firstName,
    l.lastName ?? "",
    l.email ?? "",
    l.phone ?? "",
    l.company ?? "",
    l.source,
    l.pipelineStage,
    String(l.score),
    l.createdAt.toISOString(),
  ]);

  return generateCSV(headers, rows);
}

export async function exportContacts(): Promise<string> {
  const { tenantId } = await getSessionOrThrow();
  const contacts = await prisma.contact.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "id", "firstName", "lastName", "email", "phone",
    "company", "jobTitle", "city", "state", "country", "createdAt",
  ];
  const rows = contacts.map((c) => [
    c.id,
    c.firstName,
    c.lastName ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.company ?? "",
    c.jobTitle ?? "",
    c.city ?? "",
    c.state ?? "",
    c.country ?? "",
    c.createdAt.toISOString(),
  ]);

  return generateCSV(headers, rows);
}

export async function exportDeals(): Promise<string> {
  const { tenantId } = await getSessionOrThrow();
  const deals = await prisma.deal.findMany({
    where: tenantScope(tenantId),
    include: {
      contact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "id", "title", "value", "currency", "probability",
    "stage", "expectedCloseDate", "contactName", "notes", "createdAt",
  ];
  const rows = deals.map((d) => [
    d.id,
    d.title,
    d.value ? String(d.value) : "",
    d.currency,
    String(d.probability),
    d.stage,
    d.expectedCloseDate ? d.expectedCloseDate.toISOString() : "",
    d.contact ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim() : "",
    d.notes ?? "",
    d.createdAt.toISOString(),
  ]);

  return generateCSV(headers, rows);
}

export async function exportInvoices(): Promise<string> {
  const { tenantId } = await getSessionOrThrow();
  const invoices = await prisma.invoice.findMany({
    where: tenantScope(tenantId),
    include: {
      contact: { select: { firstName: true, lastName: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "id", "invoiceNo", "status", "contactName", "company",
    "subtotal", "taxAmount", "total", "amountPaid", "dueDate", "createdAt",
  ];
  const rows = invoices.map((inv) => [
    inv.id,
    inv.invoiceNo,
    inv.status,
    inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName ?? ""}`.trim() : "",
    inv.contact?.company ?? "",
    String(inv.subtotal),
    String(inv.taxAmount),
    String(inv.total),
    String(inv.amountPaid),
    inv.dueDate ? inv.dueDate.toISOString() : "",
    inv.createdAt.toISOString(),
  ]);

  return generateCSV(headers, rows);
}

// ============================================================================
// TALLY EXPORT (SALES-C006)
// ============================================================================

export async function exportToTally(dateRange?: {
  from: string;
  to: string;
}): Promise<string> {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(dateRange?.from || dateRange?.to
      ? {
        createdAt: {
          ...(dateRange.from ? { gte: new Date(dateRange.from) } : {}),
          ...(dateRange.to
            ? { lte: new Date(dateRange.to + "T23:59:59.999Z") }
            : {}),
        },
      }
      : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      contact: {
        select: { firstName: true, lastName: true, company: true },
      },
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const tallyInvoices = invoices.map((inv) => {
    const partyName = inv.contact
      ? inv.contact.company ||
      `${inv.contact.firstName} ${inv.contact.lastName ?? ""}`.trim()
      : "Cash";

    return {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
      subtotal: inv.subtotal,
      taxAmount: inv.taxAmount,
      total: inv.total,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      partyName,
      items: inv.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: item.total,
      })),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return generateTallyXML(tallyInvoices as any);
}

// ============================================================================
// BULK IMPORT (SALES-A008 + CORE-005)
// ============================================================================

const VALID_LEAD_SOURCES: string[] = ["MANUAL", "WEB_FORM", "EMAIL", "PHONE", "SOCIAL_MEDIA", "REFERRAL"];

export async function importLeads(
  csvData: string
): Promise<{ imported: number; errors: string[] }> {
  const { userId, tenantId } = await getSessionOrThrow();
  const { headers, rows } = parseCSV(csvData);

  if (headers.length === 0) {
    return { imported: 0, errors: ["CSV is empty or could not be parsed."] };
  }

  // Build header index map (case-insensitive)
  const hMap = new Map<string, number>();
  headers.forEach((h, i) => hMap.set(h.toLowerCase().trim(), i));

  const col = (row: string[], name: string): string => {
    const idx = hMap.get(name.toLowerCase());
    return idx !== undefined && idx < row.length ? row[idx].trim() : "";
  };

  const errors: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCreate: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // +2 because row 1 is header, data starts at 2

    const firstName = col(row, "firstName") || col(row, "first name");
    if (!firstName) {
      errors.push(`Row ${lineNum}: firstName is required.`);
      continue;
    }

    const sourceRaw = (col(row, "source") || "MANUAL").toUpperCase();
    const source = VALID_LEAD_SOURCES.includes(sourceRaw as LeadSource)
      ? (sourceRaw as LeadSource)
      : "MANUAL";

    const leadData = {
      firstName,
      lastName: col(row, "lastName") || col(row, "last name") || undefined,
      email: col(row, "email") || undefined,
      phone: col(row, "phone") || undefined,
      company: col(row, "company") || undefined,
      source,
      pipelineStage: "NEW" as PipelineStage,
    };

    const score = calculateLeadScore({
      email: leadData.email,
      phone: leadData.phone,
      company: leadData.company,
      source: leadData.source,
      pipelineStage: "NEW",
    });

    toCreate.push({
      tenantId,
      createdById: userId,
      assignedToId: userId,
      ...leadData,
      score,
    });
  }

  if (toCreate.length === 0) {
    return { imported: 0, errors: errors.length > 0 ? errors : ["No valid rows found."] };
  }

  // Bulk insert
  const result = await prisma.lead.createMany({ data: toCreate });

  await logAudit({
    tenantId,
    userId,
    action: "lead.bulk_import",
    entity: "Lead",
    entityId: `bulk:${result.count}`,
  });

  // Invalidate caches
  revalidatePath("/sales/leads");
  revalidatePath("/sales/pipeline");
  revalidatePath("/sales");

  return { imported: result.count, errors };
}

export async function importContacts(
  csvData: string
): Promise<{ imported: number; errors: string[] }> {
  const { userId, tenantId } = await getSessionOrThrow();
  const { headers, rows } = parseCSV(csvData);

  if (headers.length === 0) {
    return { imported: 0, errors: ["CSV is empty or could not be parsed."] };
  }

  const hMap = new Map<string, number>();
  headers.forEach((h, i) => hMap.set(h.toLowerCase().trim(), i));

  const col = (row: string[], name: string): string => {
    const idx = hMap.get(name.toLowerCase());
    return idx !== undefined && idx < row.length ? row[idx].trim() : "";
  };

  const errors: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCreate: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    const firstName = col(row, "firstName") || col(row, "first name");
    if (!firstName) {
      errors.push(`Row ${lineNum}: firstName is required.`);
      continue;
    }

    toCreate.push({
      tenantId,
      ownerId: userId,
      firstName,
      lastName: col(row, "lastName") || col(row, "last name") || undefined,
      email: col(row, "email") || undefined,
      phone: col(row, "phone") || undefined,
      company: col(row, "company") || undefined,
      jobTitle: col(row, "jobTitle") || col(row, "job title") || undefined,
      city: col(row, "city") || undefined,
      state: col(row, "state") || undefined,
      country: col(row, "country") || undefined,
    });
  }

  if (toCreate.length === 0) {
    return { imported: 0, errors: errors.length > 0 ? errors : ["No valid rows found."] };
  }

  const result = await prisma.contact.createMany({ data: toCreate });

  await logAudit({
    tenantId,
    userId,
    action: "contact.bulk_import",
    entity: "Contact",
    entityId: `bulk:${result.count}`,
  });

  revalidatePath("/sales/contacts");
  revalidatePath("/sales");

  return { imported: result.count, errors };
}

// ============================================================================
// VISITS (SALES-E-003)
// ============================================================================

export async function getVisits(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    ...tenantScope(tenantId),
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.checkInAt = {};
    if (filters.dateFrom) where.checkInAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      where.checkInAt.lte = to;
    }
  }

  const [data, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
      orderBy: { checkInAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.visit.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getVisitStats() {
  const { tenantId } = await getSessionOrThrow();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Start of this week (Monday)
  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - diff);

  const [todayVisits, inProgress, completedThisWeek] = await Promise.all([
    prisma.visit.count({
      where: {
        ...tenantScope(tenantId),
        checkInAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.visit.count({
      where: {
        ...tenantScope(tenantId),
        status: "IN_PROGRESS",
      },
    }),
    prisma.visit.count({
      where: {
        ...tenantScope(tenantId),
        status: "COMPLETED",
        checkOutAt: { gte: weekStart },
      },
    }),
  ]);

  return { todayVisits, inProgress, completedThisWeek };
}

export async function createVisit(data: {
  contactId?: string;
  leadId?: string;
  purpose: string;
  location?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const visit = await prisma.visit.create({
    data: {
      tenantId,
      userId,
      contactId: data.contactId || null,
      leadId: data.leadId || null,
      purpose: data.purpose,
      location: data.location || null,
      notes: data.notes || null,
      status: "IN_PROGRESS",
    },
  });

  await logAudit({ tenantId, userId, action: "visit.create", entity: "Visit", entityId: visit.id });
  revalidatePath("/sales/visits");
  return visit;
}

export async function completeVisit(id: string, outcome: string, notes?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.visit.updateMany({
    where: { id, ...tenantScope(tenantId), status: "IN_PROGRESS" },
    data: {
      status: "COMPLETED",
      outcome,
      notes: notes || undefined,
      checkOutAt: new Date(),
    },
  });

  await logAudit({ tenantId, userId, action: "visit.complete", entity: "Visit", entityId: id });
  revalidatePath("/sales/visits");
}

export async function cancelVisit(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.visit.updateMany({
    where: { id, ...tenantScope(tenantId), status: "IN_PROGRESS" },
    data: {
      status: "CANCELLED",
      checkOutAt: new Date(),
    },
  });

  await logAudit({ tenantId, userId, action: "visit.cancel", entity: "Visit", entityId: id });
  revalidatePath("/sales/visits");
}

export async function getContactsForSelect() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.contact.findMany({
    where: tenantScope(tenantId),
    select: { id: true, firstName: true, lastName: true, company: true },
    orderBy: { firstName: "asc" },
    take: 200,
  });
}

export async function getLeadsForSelect() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.lead.findMany({
    where: { ...tenantScope(tenantId), status: { notIn: ["CONVERTED", "LOST"] } },
    select: { id: true, firstName: true, lastName: true, company: true },
    orderBy: { firstName: "asc" },
    take: 200,
  });
}

// ============================================================================
// TABLE RESERVATIONS (SALES-C004)
// ============================================================================

export async function getReservations(date?: string) {
  const { tenantId } = await getSessionOrThrow();

  const targetDate = date ? new Date(date) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const reservations = await prisma.tableReservation.findMany({
    where: {
      ...tenantScope(tenantId),
      reservedAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { reservedAt: "asc" },
  });

  return reservations.map((r) => ({
    ...r,
    reservedAt: r.reservedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createReservation(data: {
  tableNumber: string;
  customerName: string;
  customerPhone?: string;
  partySize: number;
  reservedAt: string;
  duration: number;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const reservation = await prisma.tableReservation.create({
    data: {
      tenantId,
      tableNumber: data.tableNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      partySize: data.partySize,
      reservedAt: new Date(data.reservedAt),
      duration: data.duration,
      notes: data.notes || null,
      createdById: userId,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "reservation.create",
    entity: "TableReservation",
    entityId: reservation.id,
    metadata: { tableNumber: data.tableNumber, customerName: data.customerName },
  });

  revalidatePath("/sales/reservations");
  return reservation;
}

export async function updateReservationStatus(id: string, status: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const validStatuses = ["RESERVED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  await prisma.tableReservation.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status },
  });

  await logAudit({
    tenantId,
    userId,
    action: `reservation.${status.toLowerCase()}`,
    entity: "TableReservation",
    entityId: id,
  });

  revalidatePath("/sales/reservations");
}

// ============================================================================
// ORDERS — Captain Features (SALES-C003)
// ============================================================================

export async function getOrders(filters?: {
  status?: string;
  tableNumber?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where: Record<string, unknown> = { ...tenantScope(tenantId) };
  if (filters?.status) where.status = filters.status;
  if (filters?.tableNumber) where.tableNumber = filters.tableNumber;

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    ...o,
    subtotal: o.subtotal.toString(),
    taxAmount: o.taxAmount.toString(),
    total: o.total.toString(),
    items: o.items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
    })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));
}

export async function getActiveOrders() {
  const { tenantId } = await getSessionOrThrow();

  const orders = await prisma.order.findMany({
    where: {
      ...tenantScope(tenantId),
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    ...o,
    subtotal: o.subtotal.toString(),
    taxAmount: o.taxAmount.toString(),
    total: o.total.toString(),
    items: o.items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
    })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));
}

export async function createOrder(data: {
  tableNumber?: string;
  customerName?: string;
  notes?: string;
  items: { name: string; quantity: number; unitPrice: number; notes?: string }[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Auto-generate order number ORD-XXXXX
  const count = await prisma.order.count({ where: tenantScope(tenantId) });
  const orderNo = `ORD-${String(count + 1).padStart(5, "0")}`;

  // Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST simplified
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNo,
      tableNumber: data.tableNumber || null,
      customerName: data.customerName || null,
      notes: data.notes || null,
      subtotal,
      taxAmount,
      total,
      createdById: userId,
      items: {
        create: data.items.map((item, idx) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || null,
          sortOrder: idx,
        })),
      },
    },
    include: {
      items: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "order.create",
    entity: "Order",
    entityId: order.id,
    metadata: { orderNo, tableNumber: data.tableNumber, total },
  });

  revalidatePath("/sales/orders");
  return {
    ...order,
    subtotal: order.subtotal.toString(),
    taxAmount: order.taxAmount.toString(),
    total: order.total.toString(),
    items: order.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toString() })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function updateOrderStatus(id: string, status: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const validStatuses = ["PENDING", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  await prisma.order.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status },
  });

  await logAudit({
    tenantId,
    userId,
    action: `order.${status.toLowerCase()}`,
    entity: "Order",
    entityId: id,
  });

  revalidatePath("/sales/orders");
}

export async function addOrderItem(
  orderId: string,
  item: { name: string; quantity: number; unitPrice: number; notes?: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify order belongs to tenant
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...tenantScope(tenantId) },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  const nextSort = order.items.length;

  await prisma.orderItem.create({
    data: {
      orderId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes || null,
      sortOrder: nextSort,
    },
  });

  // Recalculate totals
  const allItems = await prisma.orderItem.findMany({ where: { orderId } });
  const subtotal = allItems.reduce(
    (sum, i) => sum + i.quantity * Number(i.unitPrice),
    0
  );
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  await prisma.order.updateMany({
    where: { id: orderId, ...tenantScope(tenantId) },
    data: { subtotal, taxAmount, total },
  });

  await logAudit({
    tenantId,
    userId,
    action: "order.addItem",
    entity: "Order",
    entityId: orderId,
    metadata: { itemName: item.name },
  });

  revalidatePath("/sales/orders");
}

// ============================================================================
// QR CODE GENERATION (SALES-C007)
// ============================================================================

export async function generateMenuQR(url: string): Promise<string> {
  await getSessionOrThrow(); // ensure authenticated

  if (!url || !url.trim()) {
    throw new Error("URL is required");
  }

  // Dynamic import to keep this server-only
  const QRCode = await import("qrcode");
  const dataUrl = await QRCode.toDataURL(url.trim(), {
    width: 512,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });

  return dataUrl;
}

// ============================================================================
// QUEUE TOKEN MANAGEMENT (SALES-C005)
// ============================================================================

export async function getQueueTokens(date?: string) {
  const { tenantId } = await getSessionOrThrow();

  const targetDate = date ? new Date(date) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const tokens = await prisma.queueToken.findMany({
    where: {
      ...tenantScope(tenantId),
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { tokenNumber: "asc" },
  });

  return tokens.map((t) => ({
    ...t,
    calledAt: t.calledAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function issueToken(data: {
  customerName?: string;
  phone?: string;
  purpose?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Get next token number for today
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const lastToken = await prisma.queueToken.findFirst({
    where: {
      ...tenantScope(tenantId),
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { tokenNumber: "desc" },
  });

  const tokenNumber = (lastToken?.tokenNumber ?? 0) + 1;

  const token = await prisma.queueToken.create({
    data: {
      tenantId,
      tokenNumber,
      customerName: data.customerName || null,
      phone: data.phone || null,
      purpose: data.purpose || null,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "queue.issue",
    entity: "QueueToken",
    entityId: token.id,
    metadata: { tokenNumber },
  });

  revalidatePath("/sales/queue");
  return {
    ...token,
    calledAt: token.calledAt?.toISOString() ?? null,
    completedAt: token.completedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
  };
}

export async function callNextToken() {
  const { userId, tenantId } = await getSessionOrThrow();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  // Find the next waiting token
  const nextToken = await prisma.queueToken.findFirst({
    where: {
      ...tenantScope(tenantId),
      status: "WAITING",
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { tokenNumber: "asc" },
  });

  if (!nextToken) throw new Error("No tokens waiting in queue");

  // Mark any currently serving token as completed
  await prisma.queueToken.updateMany({
    where: {
      ...tenantScope(tenantId),
      status: "SERVING",
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Call the next token (CRIT-02: tenant-scoped)
  await prisma.queueToken.updateMany({
    where: { id: nextToken.id, ...tenantScope(tenantId) },
    data: { status: "SERVING", calledAt: new Date() },
  });
  const updated = await prisma.queueToken.findFirstOrThrow({
    where: { id: nextToken.id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "queue.call",
    entity: "QueueToken",
    entityId: updated.id,
    metadata: { tokenNumber: updated.tokenNumber },
  });

  revalidatePath("/sales/queue");
  return {
    ...updated,
    calledAt: updated.calledAt?.toISOString() ?? null,
    completedAt: updated.completedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function completeToken(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.queueToken.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "queue.complete",
    entity: "QueueToken",
    entityId: id,
  });

  revalidatePath("/sales/queue");
}

export async function skipToken(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.queueToken.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status: "SKIPPED", completedAt: new Date() },
  });

  await logAudit({
    tenantId,
    userId,
    action: "queue.skip",
    entity: "QueueToken",
    entityId: id,
  });

  revalidatePath("/sales/queue");
}

// ============================================================================
// LOYALTY POINTS (SALES-C005)
// ============================================================================

export async function getLoyaltyBalance(contactId: string) {
  const { tenantId } = await getSessionOrThrow();

  const result = await prisma.loyaltyPoint.groupBy({
    by: ["type"],
    where: {
      ...tenantScope(tenantId),
      contactId,
    },
    _sum: { points: true },
  });

  let balance = 0;
  for (const row of result) {
    if (row.type === "EARNED" || row.type === "ADJUSTED") {
      balance += row._sum.points ?? 0;
    } else if (row.type === "REDEEMED" || row.type === "EXPIRED") {
      balance -= row._sum.points ?? 0;
    }
  }

  return { balance, breakdown: result };
}

export async function getLoyaltyHistory(contactId: string) {
  const { tenantId } = await getSessionOrThrow();

  const history = await prisma.loyaltyPoint.findMany({
    where: {
      ...tenantScope(tenantId),
      contactId,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return history.map((h) => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
  }));
}

export async function addLoyaltyPoints(
  contactId: string,
  points: number,
  description: string,
  invoiceId?: string
) {
  const { userId, tenantId } = await getSessionOrThrow();

  if (points <= 0) throw new Error("Points must be positive");

  const entry = await prisma.loyaltyPoint.create({
    data: {
      tenantId,
      contactId,
      points,
      type: "EARNED",
      description,
      invoiceId: invoiceId || null,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "loyalty.add",
    entity: "LoyaltyPoint",
    entityId: entry.id,
    metadata: { contactId, points, description },
  });

  revalidatePath("/sales/contacts");
  return entry;
}

export async function redeemPoints(
  contactId: string,
  points: number,
  description: string
) {
  const { userId, tenantId } = await getSessionOrThrow();

  if (points <= 0) throw new Error("Points must be positive");

  // Verify sufficient balance
  const { balance } = await getLoyaltyBalance(contactId);
  if (balance < points) throw new Error("Insufficient loyalty points");

  const entry = await prisma.loyaltyPoint.create({
    data: {
      tenantId,
      contactId,
      points,
      type: "REDEEMED",
      description,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "loyalty.redeem",
    entity: "LoyaltyPoint",
    entityId: entry.id,
    metadata: { contactId, points, description },
  });

  revalidatePath("/sales/contacts");
  return entry;
}

// ============================================================================
// ROUTE PLANNING & CUSTOMER LOCATION MAP (SALES-E001-002)
// ============================================================================

/** Return contacts that have lat/lng set */
export async function getContactLocations(filters?: {
  city?: string;
  state?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    latitude: { not: null },
    longitude: { not: null },
    ...(filters?.city
      ? { city: { contains: filters.city, mode: "insensitive" as const } }
      : {}),
    ...(filters?.state
      ? { state: { contains: filters.state, mode: "insensitive" as const } }
      : {}),
  };

  return prisma.contact.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      address: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { firstName: "asc" },
    take: 500,
  });
}

/** Return ALL contacts for the map page (with and without coordinates) */
export async function getAllContactsForMap(filters?: {
  city?: string;
  state?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.city
      ? { city: { contains: filters.city, mode: "insensitive" as const } }
      : {}),
    ...(filters?.state
      ? { state: { contains: filters.state, mode: "insensitive" as const } }
      : {}),
  };

  return prisma.contact.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      address: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { firstName: "asc" },
    take: 500,
  });
}

/** Set location for a contact */
export async function updateContactLocation(
  id: string,
  latitude: number,
  longitude: number
) {
  const { tenantId, userId } = await getSessionOrThrow();

  const contact = await prisma.contact.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!contact) throw new Error("Contact not found");

  await prisma.contact.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { latitude, longitude },
  });
  const updated = await prisma.contact.findFirstOrThrow({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({
    tenantId,
    userId,
    action: "contact.updateLocation",
    entity: "Contact",
    entityId: id,
    metadata: { latitude, longitude },
  });

  revalidatePath("/sales/map");
  revalidatePath("/sales/routes");
  return updated;
}

/** Get distinct cities and states for filter dropdowns */
export async function getContactCitiesAndStates() {
  const { tenantId } = await getSessionOrThrow();

  const contacts = await prisma.contact.findMany({
    where: tenantScope(tenantId),
    select: { city: true, state: true },
    distinct: ["city", "state"],
  });

  const cities = [...new Set(contacts.map((c) => c.city).filter(Boolean))] as string[];
  const states = [...new Set(contacts.map((c) => c.state).filter(Boolean))] as string[];

  return { cities: cities.sort(), states: states.sort() };
}

/**
 * Haversine distance between two lat/lng points in km
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Return ordered contacts for a route using nearest-neighbor heuristic.
 * Starts from the first contact in the list and greedily picks the nearest unvisited.
 */
export async function getRoutePlan(contactIds: string[]) {
  const { tenantId } = await getSessionOrThrow();

  if (contactIds.length === 0) return [];

  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: contactIds },
      ...tenantScope(tenantId),
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
    },
  });

  if (contacts.length === 0) return [];

  // Nearest-neighbor ordering
  const ordered: typeof contacts = [];
  const remaining = [...contacts];

  // Start with the first contact
  ordered.push(remaining.shift()!);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        last.latitude!,
        last.longitude!,
        remaining[i].latitude!,
        remaining[i].longitude!
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  // Calculate distances between consecutive points
  const result = ordered.map((contact, index) => {
    let distanceFromPrev = 0;
    if (index > 0) {
      const prev = ordered[index - 1];
      distanceFromPrev = Math.round(
        haversineDistance(
          prev.latitude!,
          prev.longitude!,
          contact.latitude!,
          contact.longitude!
        ) * 10
      ) / 10;
    }
    return {
      ...contact,
      sequence: index + 1,
      distanceFromPrev,
    };
  });

  return result;
}

export async function getSalesOverviewMetrics() {
  const { tenantId } = await getSessionOrThrow();
  const scope = tenantScope(tenantId);

  const [
    leadsCount,
    customersCount,
    invoicesCount,
    invoicesSum,
    openDeals,
    allDeals,
  ] = await Promise.all([
    prisma.lead.count({ where: scope }),
    prisma.contact.count({ where: scope }),
    prisma.invoice.count({ where: scope }),
    prisma.invoice.aggregate({
      where: scope,
      _sum: { total: true },
    }),
    prisma.deal.findMany({
      where: {
        ...scope,
        stage: { in: ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"] },
      },
      select: {
        id: true,
        title: true,
        value: true,
        createdAt: true,
        expectedCloseDate: true,
        stage: true,
      },
    }),
    prisma.deal.findMany({
      where: scope,
      select: {
        id: true,
        title: true,
        value: true,
        createdAt: true,
        stage: true,
        actualCloseDate: true,
        expectedCloseDate: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
    }),
  ]);

  const invoicesTotalAmount = Number(invoicesSum._sum.total || 0);

  // Open deals metrics
  const openDealsCount = openDeals.length;
  const pipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  // Win rate and Close rate
  const wonDealsCount = allDeals.filter((d) => d.stage === "CLOSED_WON").length;
  const lostDealsCount = allDeals.filter((d) => d.stage === "CLOSED_LOST").length;
  const resolvedDealsCount = wonDealsCount + lostDealsCount;
  const totalDealsCount = allDeals.length;

  const winRate = resolvedDealsCount > 0 ? (wonDealsCount / resolvedDealsCount) * 100 : 0;
  const closeRate = totalDealsCount > 0 ? (resolvedDealsCount / totalDealsCount) * 100 : 0;

  // Average days to close (for won deals)
  const wonDealsWithCloseDate = allDeals.filter(
    (d) => d.stage === "CLOSED_WON" && (d.actualCloseDate || d.createdAt)
  );
  let totalDaysToClose = 0;
  wonDealsWithCloseDate.forEach((d) => {
    const end = d.actualCloseDate ? new Date(d.actualCloseDate) : new Date();
    const start = new Date(d.createdAt);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    totalDaysToClose += diffDays;
  });
  const avgDayToClose = wonDealsWithCloseDate.length > 0 ? totalDaysToClose / wonDealsWithCloseDate.length : 0;

  // Average open deal age
  let totalOpenAgeDays = 0;
  const now = new Date();
  openDeals.forEach((d) => {
    const start = new Date(d.createdAt);
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    totalOpenAgeDays += diffDays;
  });
  const avgOpenDealAge = openDealsCount > 0 ? totalOpenAgeDays / openDealsCount : 0;

  // Top Deals Value (Top 5 deals)
  const topDeals = [...allDeals]
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      title: d.title,
      value: Number(d.value || 0),
      stage: d.stage,
      contactName: d.contact ? `${d.contact.firstName} ${d.contact.lastName || ""}`.trim() : null,
      company: d.contact?.company || null,
      createdAt: d.createdAt,
    }));

  // Deal tracking by stage
  const dealStages = [
    "PROSPECTING",
    "QUALIFICATION",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ] as const;
  const dealTracking = dealStages.map((stage) => ({
    stage,
    count: allDeals.filter((d) => d.stage === stage).length,
    value: allDeals.filter((d) => d.stage === stage).reduce((sum, d) => sum + Number(d.value || 0), 0),
  }));

  // Sales forecasting (open deals expected close date grouped by month)
  const forecastMap: Record<string, number> = {};
  openDeals.forEach((d) => {
    if (d.expectedCloseDate) {
      const date = new Date(d.expectedCloseDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      forecastMap[key] = (forecastMap[key] || 0) + Number(d.value || 0);
    } else {
      forecastMap["Unscheduled"] = (forecastMap["Unscheduled"] || 0) + Number(d.value || 0);
    }
  });

  // Convert forecast map to sorted array
  const salesForecasting = Object.keys(forecastMap)
    .map((key) => ({
      month: key,
      value: forecastMap[key],
    }))
    .sort((a, b) => {
      if (a.month === "Unscheduled") return 1;
      if (b.month === "Unscheduled") return -1;
      return a.month.localeCompare(b.month);
    });

  return {
    leadsCount,
    customersCount,
    invoicesCount,
    invoicesTotalAmount,
    openDealsCount,
    pipelineValue,
    winRate,
    closeRate,
    avgDayToClose,
    avgOpenDealAge,
    topDeals,
    dealTracking,
    salesForecasting,
  };
}

// ============================================================================
// QUOTATION ENHANCEMENTS (CONVERT TO SO, DIGITAL SIGNATURE, LETTERHEAD)
// ============================================================================

export async function convertQuotationToSalesOrder(quotationId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const quote = await prisma.quotation.findFirst({
    where: { id: quotationId, ...tenantScope(tenantId) },
    include: { contact: true, items: true },
  });
  if (!quote) throw new Error("Quotation not found");

  const count = await prisma.order.count({ where: tenantScope(tenantId) });
  const orderNo = `SO-${String(count + 1).padStart(5, "0")}`;

  const customerName = quote.contact
    ? `${quote.contact.firstName} ${quote.contact.lastName || ""}`.trim()
    : "Standard Customer";

  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNo,
      customerName,
      status: "CONFIRMED",
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      notes: `Converted from Quotation ${quote.quotationNo}. ${quote.notes || ""}`,
      createdById: userId,
      items: {
        create: quote.items.map((item, idx) => ({
          name: item.description,
          quantity: Math.round(Number(item.quantity)),
          unitPrice: item.unitPrice,
          sortOrder: idx + 1,
        })),
      },
    },
  });

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: "ACCEPTED" },
  });

  await logAudit({ tenantId, userId, action: "quotation.convert_to_so", entity: "Order", entityId: order.id });
  revalidatePath("/sales/quotations");
  revalidatePath("/sales/orders");

  return order;
}

export async function saveQuotationSignature(quotationId: string, digitalSignature: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.quotation.updateMany({
    where: { id: quotationId, ...tenantScope(tenantId) },
    data: { digitalSignature },
  });

  await logAudit({ tenantId, userId, action: "quotation.sign", entity: "Quotation", entityId: quotationId });
  revalidatePath("/sales/quotations");
}

export async function saveQuotationLetterhead(quotationId: string, customLetterhead: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.quotation.updateMany({
    where: { id: quotationId, ...tenantScope(tenantId) },
    data: { customLetterhead },
  });

  await logAudit({ tenantId, userId, action: "quotation.letterhead", entity: "Quotation", entityId: quotationId });
  revalidatePath("/sales/quotations");
}

// ============================================================================
// B2B SALES ORDERS & INVOICE STATUS & CHATTER
// ============================================================================

export async function getB2BSalesOrders(filters?: {
  status?: string;
  invoiceStatus?: string;
  search?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { orderNo: { contains: filters.search, mode: "insensitive" as const } },
            { customerName: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const list = await prisma.order.findMany({
    where,
    include: {
      items: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return list.map((order) => {
    // Determine invoice status heuristically if not explicitly stored
    let invoiceStatus = "UNINVOICED";
    if (order.status === "COMPLETED") {
      invoiceStatus = "INVOICED";
    } else if (order.status === "CONFIRMED" || order.status === "READY") {
      invoiceStatus = "UNINVOICED";
    }

    return {
      ...order,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      invoiceStatus,
      deliveryStatus: order.status === "SERVED" || order.status === "COMPLETED" ? "DELIVERED" : order.status === "PREPARING" ? "IN_TRANSIT" : "PENDING",
      items: order.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    };
  });
}

export async function updateB2BSalesOrder(id: string, data: { customerName?: string; status?: string; notes?: string }) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.order.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "sales_order.update", entity: "Order", entityId: id });
  revalidatePath("/sales/orders");
}

export async function deleteB2BSalesOrder(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.order.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "sales_order.delete", entity: "Order", entityId: id });
  revalidatePath("/sales/orders");
}

export async function createB2BSalesOrder(data: {
  customerName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.order.count({ where: tenantScope(tenantId) });
  const orderNo = `SO-${String(count + 1).padStart(5, "0")}`;

  const subtotal = data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * 0.18; // 18% GST estimate
  const total = subtotal + taxAmount;

  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNo,
      customerName: data.customerName,
      status: "CONFIRMED",
      subtotal,
      taxAmount,
      total,
      notes: data.notes || null,
      createdById: userId,
      items: {
        create: data.items.map((item, idx) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: idx + 1,
        })),
      },
    },
    include: { items: true },
  });

  await logAudit({ tenantId, userId, action: "sales_order.create", entity: "Order", entityId: order.id });
  revalidatePath("/sales/orders");
  return order;
}

export async function convertSalesOrderToInvoice(orderId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const order = await prisma.order.findFirst({
    where: { id: orderId, ...tenantScope(tenantId) },
    include: { items: true },
  });
  if (!order) throw new Error("Sales Order not found");

  const count = await prisma.invoice.count({ where: tenantScope(tenantId) });
  const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNo,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      total: order.total,
      status: "SENT",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById: userId,
      items: {
        create: order.items.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Number(item.quantity) * Number(item.unitPrice),
        })),
      },
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "COMPLETED" },
  });

  await logAudit({ tenantId, userId, action: "sales_order.convert_to_invoice", entity: "Invoice", entityId: invoice.id });
  revalidatePath("/sales/orders");
  revalidatePath("/sales/invoices");

  return invoice;
}

// ============================================================================
// SALES TEAMS & REGIONS & PERFORMANCE
// ============================================================================

export async function getSalesTeams() {
  const { tenantId } = await getSessionOrThrow();

  const teams = await prisma.salesTeam.findMany({
    where: tenantScope(tenantId),
    include: {
      leader: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return teams.map((team) => ({
    ...team,
    targetQuota: Number(team.targetQuota),
  }));
}

export async function createSalesTeam(data: {
  name: string;
  leaderId?: string;
  region?: string;
  productLine?: string;
  targetQuota: number;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.salesTeam.count({ where: tenantScope(tenantId) });
  const code = `TEAM-${String(count + 1).padStart(3, "0")}`;

  const team = await prisma.salesTeam.create({
    data: {
      tenantId,
      code,
      name: data.name,
      leaderId: data.leaderId || null,
      region: data.region || "GENERAL",
      productLine: data.productLine || "ALL",
      targetQuota: data.targetQuota || 0,
      notes: data.notes || null,
    },
    include: { leader: true },
  });

  await logAudit({ tenantId, userId, action: "sales_team.create", entity: "SalesTeam", entityId: team.id });
  revalidatePath("/sales/teams");
  return { ...team, targetQuota: Number(team.targetQuota) };
}

export async function updateSalesTeam(id: string, data: {
  name?: string;
  region?: string;
  productLine?: string;
  targetQuota?: number;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.salesTeam.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "sales_team.update", entity: "SalesTeam", entityId: id });
  revalidatePath("/sales/teams");
}

export async function deleteSalesTeam(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.salesTeam.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "sales_team.delete", entity: "SalesTeam", entityId: id });
  revalidatePath("/sales/teams");
}

// ============================================================================
// CUSTOMER 360 & PRICING RULES
// ============================================================================

export async function getCustomer360Detail(contactId: string) {
  const { tenantId } = await getSessionOrThrow();

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, ...tenantScope(tenantId) },
    include: {
      quotations: { orderBy: { createdAt: "desc" }, take: 10 },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      customerPricingRules: { include: { product: true } },
      deals: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!contact) throw new Error("Customer contact not found");

  const totalSpent = contact.invoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);
  const outstandingQuotes = contact.quotations.filter((q) => q.status === "DRAFT" || q.status === "SENT").length;

  return {
    ...contact,
    totalSpent,
    outstandingQuotes,
    quotations: contact.quotations.map((q) => ({ ...q, total: Number(q.total) })),
    invoices: contact.invoices.map((inv) => ({ ...inv, total: Number(inv.total) })),
    customerPricingRules: contact.customerPricingRules.map((r) => ({
      ...r,
      customPrice: r.customPrice ? Number(r.customPrice) : null,
      discountPercent: r.discountPercent ? Number(r.discountPercent) : null,
    })),
  };
}

export async function upsertCustomerPricingRule(data: {
  contactId: string;
  productId?: string;
  customPrice?: number;
  discountPercent?: number;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const rule = await prisma.customerPricingRule.create({
    data: {
      tenantId,
      contactId: data.contactId,
      productId: data.productId || null,
      customPrice: data.customPrice || null,
      discountPercent: data.discountPercent || null,
      notes: data.notes || null,
    },
  });

  await logAudit({ tenantId, userId, action: "customer_pricing_rule.create", entity: "CustomerPricingRule", entityId: rule.id });
  revalidatePath("/sales/contacts");
  return rule;
}

