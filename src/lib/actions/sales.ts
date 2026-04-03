"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
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
      source: data.source ?? "MANUAL",
      estimatedValue: data.estimatedValue,
      assignedToId: data.assignedToId ?? userId,
      notes: data.notes,
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

  const lead = await prisma.lead.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...data,
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
