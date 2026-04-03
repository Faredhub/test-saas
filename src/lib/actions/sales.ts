"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { generateCSV, parseCSV } from "@/lib/export";
import type { PipelineStage, LeadSource, LeadStatus, DealStage, QuotationStatus, InvoiceStatus } from "@/generated/prisma/enums";

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
  const pageSize = filters?.pageSize ?? 25;

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
  return lead;
}

export async function deleteLead(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.lead.deleteMany({ where: { id, ...tenantScope(tenantId) } });
  await logAudit({ tenantId, userId, action: "lead.delete", entity: "Lead", entityId: id });
  revalidatePath("/sales/leads");
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
  const pageSize = filters?.pageSize ?? 25;

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
  const pageSize = filters?.pageSize ?? 25;

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

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
  return deal;
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

export async function getQuotations(filters?: {
  status?: QuotationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;

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
        contact: { select: { id: true, firstName: true, lastName: true, company: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quotation.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
  return quotation;
}

// ============================================================================
// INVOICES
// ============================================================================

export async function getInvoices(filters?: {
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;

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
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
  return invoice;
}

export async function getInvoiceById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.invoice.findFirst({
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
