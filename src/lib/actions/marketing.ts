"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import type {
  CampaignType,
  CampaignChannel,
  CampaignStatus,
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
// CAMPAIGNS (MKTG-A)
// ============================================================================

export async function getCampaigns(filters?: {
  status?: CampaignStatus;
  channel?: CampaignChannel;
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
    ...(filters?.channel ? { channel: filters.channel } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { subject: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaign.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function getCampaign(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const campaign = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}

export async function createCampaign(data: {
  name: string;
  type: CampaignType;
  channel: CampaignChannel;
  subject?: string;
  content?: string;
  segmentTags?: string[];
}) {
  await requirePermission({ module: "marketing", action: "create", resource: "campaigns" });
  const { userId, tenantId } = await getSessionOrThrow();
  const campaign = await prisma.campaign.create({
    data: {
      tenantId,
      createdById: userId,
      name: data.name,
      type: data.type,
      channel: data.channel,
      subject: data.subject || null,
      content: data.content || null,
      segmentTags: data.segmentTags ?? [],
      status: "DRAFT",
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.created",
    entity: "Campaign",
    entityId: campaign.id,
    metadata: { name: data.name, channel: data.channel },
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return campaign;
}

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    type?: CampaignType;
    channel?: CampaignChannel;
    subject?: string;
    content?: string;
    segmentTags?: string[];
  }
) {
  await requirePermission({ module: "marketing", action: "update", resource: "campaigns" });
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Campaign not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft campaigns can be edited");
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.channel !== undefined ? { channel: data.channel } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.segmentTags !== undefined ? { segmentTags: data.segmentTags } : {}),
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.updated",
    entity: "Campaign",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return campaign;
}

export async function scheduleCampaign(id: string, scheduledAt: Date) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Campaign not found");
  if (existing.status !== "DRAFT")
    throw new Error("Only draft campaigns can be scheduled");

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledAt },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.scheduled",
    entity: "Campaign",
    entityId: id,
    metadata: { scheduledAt: scheduledAt.toISOString() },
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return campaign;
}

export async function sendCampaign(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Campaign not found");
  if (existing.status !== "DRAFT" && existing.status !== "SCHEDULED")
    throw new Error("Campaign cannot be sent in its current status");

  // Simulated sending: generate random stats
  const totalSent = Math.floor(Math.random() * 5000) + 500;
  const totalOpened = Math.floor(totalSent * (0.15 + Math.random() * 0.35));
  const totalClicked = Math.floor(totalOpened * (0.1 + Math.random() * 0.3));
  const totalBounced = Math.floor(totalSent * (0.01 + Math.random() * 0.05));

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.sent",
    entity: "Campaign",
    entityId: id,
    metadata: { totalSent },
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return campaign;
}

export async function pauseCampaign(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Campaign not found");
  if (existing.status !== "SENDING" && existing.status !== "SCHEDULED")
    throw new Error("Campaign cannot be paused in its current status");

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "PAUSED" },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.paused",
    entity: "Campaign",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return campaign;
}

export async function cancelCampaign(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Campaign not found");
  if (existing.status === "SENT" || existing.status === "CANCELLED")
    throw new Error("Campaign cannot be cancelled in its current status");

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.cancelled",
    entity: "Campaign",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return campaign;
}

export async function deleteCampaign(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.campaign.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Campaign not found");

  await prisma.campaign.delete({
    where: { id },
  });
  await logAudit({
    tenantId,
    userId,
    action: "campaign.deleted",
    entity: "Campaign",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  return { success: true };
}

export async function getCampaignStats() {
  const { tenantId } = await getSessionOrThrow();
  const campaigns = await prisma.campaign.findMany({
    where: tenantScope(tenantId),
    select: {
      status: true,
      totalSent: true,
      totalOpened: true,
      totalClicked: true,
      totalBounced: true,
    },
  });

  const totalCampaigns = campaigns.length;
  const sentCampaigns = campaigns.filter((c) => c.status === "SENT");
  const totalSent = sentCampaigns.reduce((s, c) => s + c.totalSent, 0);
  const totalOpened = sentCampaigns.reduce((s, c) => s + c.totalOpened, 0);
  const totalClicked = sentCampaigns.reduce((s, c) => s + c.totalClicked, 0);
  const totalBounced = sentCampaigns.reduce((s, c) => s + c.totalBounced, 0);

  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

  const draft = campaigns.filter((c) => c.status === "DRAFT").length;
  const scheduled = campaigns.filter((c) => c.status === "SCHEDULED").length;
  const sent = sentCampaigns.length;

  return {
    totalCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    totalBounced,
    openRate: Math.round(openRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    bounceRate: Math.round(bounceRate * 100) / 100,
    draft,
    scheduled,
    sent,
  };
}

// ============================================================================
// CONTACT SEGMENTATION (MKTG-A-007)
// ============================================================================

export async function getContactSegments() {
  const { tenantId } = await getSessionOrThrow();
  const contacts = await prisma.contact.findMany({
    where: tenantScope(tenantId),
    select: { tags: true },
  });
  const tagSet = new Set<string>();
  for (const c of contacts) {
    for (const t of c.tags) {
      tagSet.add(t);
    }
  }
  return Array.from(tagSet).sort();
}

export async function getSegmentedContacts(tags: string[]) {
  const { tenantId } = await getSessionOrThrow();
  if (tags.length === 0) return [];
  const contacts = await prisma.contact.findMany({
    where: {
      ...tenantScope(tenantId),
      tags: { hasSome: tags },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      tags: true,
    },
    orderBy: { firstName: "asc" },
  });
  return contacts;
}

// ============================================================================
// EVENTS (MKTG-C)
// ============================================================================

export async function getEvents(filters?: {
  status?: string;
  type?: string;
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
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { venue: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.marketingEvent.findMany({
      where,
      include: { attendees: true },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketingEvent.count({ where }),
  ]);

  const serializedData = data.map((event) => ({
    ...event,
    ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : null,
  }));

  return { data: serializedData, total, page, pageSize };
}

export async function getEvent(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const event = await prisma.marketingEvent.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { attendees: { orderBy: { createdAt: "desc" } } },
  });
  if (!event) throw new Error("Event not found");
  return {
    ...event,
    ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : null,
  };
}

export async function createEvent(data: {
  title: string;
  description?: string;
  type: string;
  venue?: string;
  isOnline: boolean;
  meetingUrl?: string;
  startDate: Date;
  endDate?: Date;
  capacity?: number;
  ticketPrice?: number;
  currency?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const event = await prisma.marketingEvent.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      venue: data.venue || null,
      isOnline: data.isOnline,
      meetingUrl: data.meetingUrl || null,
      startDate: data.startDate,
      endDate: data.endDate || null,
      capacity: data.capacity || null,
      ticketPrice: data.ticketPrice || null,
      currency: data.currency || "INR",
      status: "DRAFT",
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "event.created",
    entity: "MarketingEvent",
    entityId: event.id,
    metadata: { title: data.title },
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/events");
  return {
    ...event,
    ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : null,
  };
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    description?: string;
    type?: string;
    venue?: string;
    isOnline?: boolean;
    meetingUrl?: string;
    startDate?: Date;
    endDate?: Date;
    capacity?: number;
    ticketPrice?: number;
    currency?: string;
    status?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.marketingEvent.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Event not found");

  const event = await prisma.marketingEvent.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.venue !== undefined ? { venue: data.venue } : {}),
      ...(data.isOnline !== undefined ? { isOnline: data.isOnline } : {}),
      ...(data.meetingUrl !== undefined ? { meetingUrl: data.meetingUrl } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.ticketPrice !== undefined ? { ticketPrice: data.ticketPrice } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "event.updated",
    entity: "MarketingEvent",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/events");
  return {
    ...event,
    ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : null,
  };
}

export async function deleteEvent(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.marketingEvent.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Event not found");

  await prisma.marketingEvent.delete({
    where: { id },
  });
  await logAudit({
    tenantId,
    userId,
    action: "event.deleted",
    entity: "MarketingEvent",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/events");
  return { success: true };
}

export async function getAttendees(eventId: string) {
  const { tenantId } = await getSessionOrThrow();
  // Verify event belongs to tenant
  const event = await prisma.marketingEvent.findFirst({
    where: { id: eventId, ...tenantScope(tenantId) },
  });
  if (!event) throw new Error("Event not found");

  return prisma.eventAttendee.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
}

export async function registerAttendee(
  eventId: string,
  data: { name: string; email: string; phone?: string; paidAmount?: number }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const event = await prisma.marketingEvent.findFirst({
    where: { id: eventId, ...tenantScope(tenantId) },
    include: { attendees: true },
  });
  if (!event) throw new Error("Event not found");
  if (event.capacity && event.attendees.length >= event.capacity) {
    throw new Error("Event is at full capacity");
  }

  const ticketNo = `TKT-${Date.now().toString(36).toUpperCase()}`;
  const attendee = await prisma.eventAttendee.create({
    data: {
      eventId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      status: "REGISTERED",
      ticketNo,
      paidAmount: data.paidAmount || null,
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "attendee.registered",
    entity: "EventAttendee",
    entityId: attendee.id,
    metadata: { eventId, name: data.name },
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/events");
  return attendee;
}

export async function checkInAttendee(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  // Verify via event tenant scope
  const attendee = await prisma.eventAttendee.findFirst({
    where: { id },
    include: { event: { select: { tenantId: true } } },
  });
  if (!attendee || attendee.event.tenantId !== tenantId)
    throw new Error("Attendee not found");
  if (attendee.status === "CANCELLED")
    throw new Error("Cannot check in a cancelled attendee");

  const updated = await prisma.eventAttendee.update({
    where: { id },
    data: { status: "CHECKED_IN" },
  });
  await logAudit({
    tenantId,
    userId,
    action: "attendee.checkedIn",
    entity: "EventAttendee",
    entityId: id,
  });
  revalidatePath("/marketing/events");
  return updated;
}

export async function cancelAttendee(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const attendee = await prisma.eventAttendee.findFirst({
    where: { id },
    include: { event: { select: { tenantId: true } } },
  });
  if (!attendee || attendee.event.tenantId !== tenantId)
    throw new Error("Attendee not found");

  const updated = await prisma.eventAttendee.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await logAudit({
    tenantId,
    userId,
    action: "attendee.cancelled",
    entity: "EventAttendee",
    entityId: id,
  });
  revalidatePath("/marketing/events");
  return updated;
}

// ============================================================================
// SURVEYS (MKTG-D)
// ============================================================================

export async function getSurveys(filters?: {
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
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { description: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.survey.findMany({
      where,
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.survey.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function getSurvey(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const survey = await prisma.survey.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { _count: { select: { responses: true } } },
  });
  if (!survey) throw new Error("Survey not found");
  return survey;
}

export async function createSurvey(data: {
  title: string;
  description?: string;
  questions: Array<{
    id: string;
    type: string;
    text: string;
    options?: string[];
    required?: boolean;
  }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const survey = await prisma.survey.create({
    data: {
      tenantId,
      createdById: userId,
      title: data.title,
      description: data.description || null,
      questions: JSON.parse(JSON.stringify(data.questions)),
      isPublished: false,
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "survey.created",
    entity: "Survey",
    entityId: survey.id,
    metadata: { title: data.title },
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/surveys");
  return survey;
}

export async function updateSurvey(
  id: string,
  data: {
    title?: string;
    description?: string;
    questions?: Array<{
      id: string;
      type: string;
      text: string;
      options?: string[];
      required?: boolean;
    }>;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.survey.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Survey not found");

  const survey = await prisma.survey.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.questions !== undefined
        ? { questions: JSON.parse(JSON.stringify(data.questions)) }
        : {}),
    },
  });
  await logAudit({
    tenantId,
    userId,
    action: "survey.updated",
    entity: "Survey",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/surveys");
  return survey;
}

export async function publishSurvey(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.survey.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Survey not found");

  const shareUrl = existing.shareUrl || `survey-${id.slice(0, 8)}`;
  const survey = await prisma.survey.update({
    where: { id },
    data: { isPublished: true, shareUrl },
  });
  await logAudit({
    tenantId,
    userId,
    action: "survey.published",
    entity: "Survey",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/surveys");
  return survey;
}

export async function unpublishSurvey(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.survey.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Survey not found");

  const survey = await prisma.survey.update({
    where: { id },
    data: { isPublished: false },
  });
  await logAudit({
    tenantId,
    userId,
    action: "survey.unpublished",
    entity: "Survey",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/surveys");
  return survey;
}

export async function deleteSurvey(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const existing = await prisma.survey.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Survey not found");

  await prisma.survey.delete({
    where: { id },
  });
  await logAudit({
    tenantId,
    userId,
    action: "survey.deleted",
    entity: "Survey",
    entityId: id,
  });
  revalidatePath("/marketing");
  revalidatePath("/marketing/surveys");
  return { success: true };
}

export async function getSurveyResponses(surveyId: string) {
  const { tenantId } = await getSessionOrThrow();
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ...tenantScope(tenantId) },
  });
  if (!survey) throw new Error("Survey not found");

  return prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitSurveyResponse(
  surveyId: string,
  data: {
    answers: Record<string, string | number | boolean>;
    respondentEmail?: string;
    respondentName?: string;
  }
) {
  // Note: survey responses can be submitted without auth for public surveys
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, isPublished: true },
  });
  if (!survey) throw new Error("Survey not found or not published");

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId,
      answers: JSON.parse(JSON.stringify(data.answers)),
      respondentEmail: data.respondentEmail || null,
      respondentName: data.respondentName || null,
    },
  });
  revalidatePath("/marketing/surveys");
  return response;
}

// ============================================================================
// SOCIAL MEDIA POSTING (MKTG-B-001)
// ============================================================================

export async function getConfiguredSocialPlatforms() {
  await getSessionOrThrow();
  const { getConfiguredPlatforms } = await import("@/lib/social-media");
  return getConfiguredPlatforms();
}

export async function publishToSocial(data: {
  message: string;
  platforms: string[];
  imageUrl?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const { publishToPlatforms } = await import("@/lib/social-media");

  const results = await publishToPlatforms(
    data.message,
    data.platforms as import("@/lib/social-media").SocialPlatform[],
    data.imageUrl
  );

  await logAudit({
    tenantId,
    userId,
    action: "social.published",
    entity: "SocialPost",
    metadata: {
      platforms: data.platforms,
      results: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, v.success])
      ),
    },
  });

  return results;
}

// ============================================================================
// WHATSAPP MARKETING (MKTG-A-006)
// ============================================================================

export async function getWhatsAppStatus() {
  await getSessionOrThrow();
  const { isWhatsAppConfigured } = await import("@/lib/whatsapp");
  return { configured: isWhatsAppConfigured() };
}

export async function sendWhatsAppCampaign(data: {
  contactIds: string[];
  templateName: string;
  params: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const { isWhatsAppConfigured, sendWhatsAppMessage } = await import("@/lib/whatsapp");

  if (!isWhatsAppConfigured()) {
    throw new Error("WhatsApp is not configured");
  }

  // Look up phone numbers for selected contacts
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: data.contactIds },
      ...tenantScope(tenantId),
      phone: { not: null },
    },
    select: { id: true, firstName: true, phone: true },
  });

  const results: Array<{ contactId: string; phone: string; success: boolean; error?: string }> = [];

  for (const contact of contacts) {
    if (!contact.phone) continue;
    const result = await sendWhatsAppMessage(contact.phone, data.templateName, data.params);
    results.push({
      contactId: contact.id,
      phone: contact.phone,
      success: result.success,
      error: result.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;

  await logAudit({
    tenantId,
    userId,
    action: "whatsapp.campaign.sent",
    entity: "Campaign",
    metadata: {
      templateName: data.templateName,
      totalContacts: data.contactIds.length,
      sent: successCount,
      failed: results.length - successCount,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");

  return { total: results.length, sent: successCount, results };
}

// ============================================================================
// SMS CAMPAIGN MANAGEMENT (MKTG-A-012)
// ============================================================================

const SMS_TEMPLATES = [
  { id: "tpl-1", name: "Flash Sale Alert", body: "Hurry! Flash sale is LIVE. Up to 50% off on selected items. Shop now!" },
  { id: "tpl-2", name: "Payment Reminder", body: "Dear customer, your payment of INR {amount} is due on {date}. Please pay to avoid late fees." },
  { id: "tpl-3", name: "Appointment Reminder", body: "Reminder: Your appointment is scheduled for {date} at {time}. Reply YES to confirm." },
  { id: "tpl-4", name: "Welcome Message", body: "Welcome to {company}! We're excited to have you on board. Visit us at {link}" },
  { id: "tpl-5", name: "OTP Message", body: "{code} is your OTP for login. Valid for {minutes} minutes. Do not share with anyone." },
  { id: "tpl-6", name: "Order Confirmation", body: "Your order #{orderId} has been confirmed. Track your order: {link}" },
  { id: "tpl-7", name: "Delivery Update", body: "Your order #{orderId} is out for delivery and will arrive by {time} today." },
  { id: "tpl-8", name: "Feedback Request", body: "We value your feedback! Rate your recent experience: {link}" },
];

const SMS_RECIPIENT_LISTS = [
  { id: "list-1", name: "All Customers", count: 1240 },
  { id: "list-2", name: "VIP Customers", count: 85 },
  { id: "list-3", name: "New Leads", count: 340 },
  { id: "list-4", name: "Inactive Users (90d)", count: 560 },
  { id: "list-5", name: "Newsletter Subscribers", count: 2100 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _smsCampaigns: any[] = [
  { id: "sms-1", name: "Diwali Flash Sale", body: "Happy Diwali! Enjoy 30% off storewide. Use code DIWALI30.", recipients: 1200, sent: 1180, delivered: 1145, failed: 35, status: "SENT", provider: "MSG91", scheduledAt: null, sentAt: "2026-08-01T10:00:00Z", createdAt: "2026-07-30T09:00:00Z" },
  { id: "sms-2", name: "Payment Reminder - Aug", body: "Dear customer, your payment of INR 5,000 is due on Aug 15.", recipients: 450, sent: 445, delivered: 440, failed: 5, status: "SENT", provider: "Twilio", scheduledAt: null, sentAt: "2026-08-05T08:00:00Z", createdAt: "2026-08-03T14:00:00Z" },
  { id: "sms-3", name: "New Product Launch", body: "Introducing our new product line! Check it out at our store.", recipients: 800, sent: 0, delivered: 0, failed: 0, status: "SCHEDULED", provider: "TextLocal", scheduledAt: "2026-08-15T09:00:00Z", sentAt: null, createdAt: "2026-08-08T11:00:00Z" },
  { id: "sms-4", name: "Welcome Series - Batch 1", body: "Welcome to TixelTech! We're excited to have you on board.", recipients: 200, sent: 200, delivered: 198, failed: 2, status: "SENT", provider: "MSG91", scheduledAt: null, sentAt: "2026-08-10T06:00:00Z", createdAt: "2026-08-09T16:00:00Z" },
  { id: "sms-5", name: "Abandoned Cart Reminder", body: "You left items in your cart! Complete your purchase now: txl.tech/cart", recipients: 150, sent: 0, delivered: 0, failed: 0, status: "DRAFT", provider: "MSG91", scheduledAt: null, sentAt: null, createdAt: "2026-08-11T08:00:00Z" },
];

export async function getSMSCampaigns(filters?: { page?: number; pageSize?: number }) {
  await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);
  const start = (page - 1) * pageSize;
  const data = _smsCampaigns.slice(start, start + pageSize);
  return { data, total: _smsCampaigns.length, page, pageSize };
}

export async function getSMSTemplates() {
  await getSessionOrThrow();
  return SMS_TEMPLATES;
}

export async function getSMSRecipientLists() {
  await getSessionOrThrow();
  return SMS_RECIPIENT_LISTS;
}

export async function createSMSCampaign(data: {
  name: string;
  body: string;
  recipientListId: string;
  provider: string;
  scheduledAt?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const list = SMS_RECIPIENT_LISTS.find((l) => l.id === data.recipientListId);
  const campaign = {
    id: `sms-${Date.now().toString(36)}`,
    name: data.name,
    body: data.body,
    recipients: list?.count ?? 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
    provider: data.provider,
    scheduledAt: data.scheduledAt ?? null,
    sentAt: null,
    createdAt: new Date().toISOString(),
  };
  _smsCampaigns.unshift(campaign);
  await logAudit({ tenantId, userId, action: "sms.campaign.create", entity: "SMSCampaign", entityId: campaign.id, metadata: { name: data.name } });
  revalidatePath("/marketing/sms");
  return campaign;
}

export async function deleteSMSCampaign(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const idx = _smsCampaigns.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("SMS campaign not found");
  _smsCampaigns.splice(idx, 1);
  await logAudit({ tenantId, userId, action: "sms.campaign.delete", entity: "SMSCampaign", entityId: id });
  revalidatePath("/marketing/sms");
  return { success: true };
}

export async function sendSmsCampaign(data: {
  contactIds: string[];
  message: string;
  provider?: "twilio" | "msg91" | "textlocal";
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const { sendSMS } = await import("@/lib/sms");

  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: data.contactIds },
      ...tenantScope(tenantId),
      phone: { not: null },
    },
    select: { id: true, firstName: true, phone: true },
  });

  const results: Array<{ contactId: string; phone: string; success: boolean; messageId?: string; error?: string }> = [];

  for (const contact of contacts) {
    if (!contact.phone) continue;
    const result = await sendSMS({
      to: contact.phone,
      message: data.message,
      provider: data.provider,
    });
    results.push({
      contactId: contact.id,
      phone: contact.phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  }

  const successCount = results.filter((r) => r.success).length;

  await logAudit({
    tenantId,
    userId,
    action: "sms.campaign.sent",
    entity: "Campaign",
    metadata: {
      totalContacts: data.contactIds.length,
      sent: successCount,
      failed: results.length - successCount,
      provider: data.provider || process.env.SMS_PROVIDER || "twilio",
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");

  return { total: results.length, sent: successCount, results };
}

// ============================================================================
// WHATSAPP CAMPAIGN MANAGEMENT (MKTG-A-006 extended)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _whatsAppTemplates: Record<string, any>[] = [
  { id: "wa-tpl-1", name: "order_confirmation", category: "UTILITY", language: "en", headerType: "TEXT" as const, headerText: "Order Confirmed!", body: "Hi {{1}}, your order #{{2}} has been confirmed and will be delivered by {{3}}.", footer: "TixelTech Team", buttons: [{ type: "URL", text: "Track Order", url: "https://txl.tech/track" }], status: "APPROVED", createdAt: "2026-07-15T10:00:00Z" },
  { id: "wa-tpl-2", name: "payment_reminder", category: "UTILITY", language: "en", headerType: "TEXT" as const, headerText: "Payment Due", body: "Dear {{1}}, your payment of INR {{2}} is due on {{3}}. Please make the payment to avoid service interruption.", footer: "Billing Team", buttons: [{ type: "URL", text: "Pay Now", url: "https://txl.tech/pay" }], status: "APPROVED", createdAt: "2026-07-20T14:00:00Z" },
  { id: "wa-tpl-3", name: "welcome_message", category: "MARKETING", language: "en", headerType: "IMAGE" as const, headerText: null, body: "Welcome to {{1}}! We're thrilled to have you. Reply to this message if you need any help getting started.", footer: "Support Team", buttons: [{ type: "QUICK_REPLY", text: "Get Started" }, { type: "QUICK_REPLY", text: "Talk to Support" }], status: "APPROVED", createdAt: "2026-08-01T09:00:00Z" },
  { id: "wa-tpl-4", name: "promo_diwali_sale", category: "MARKETING", language: "hi", headerType: "IMAGE" as const, headerText: null, body: "इस दिवाली {{1}} पर पाएं 30% तक की छूट। ऑफर सीमित समय के लिए है। अभी खरीदें!", footer: "TixelTech Offers", buttons: [{ type: "URL", text: "Shop Now", url: "https://txl.tech/sale" }], status: "PENDING", createdAt: "2026-08-05T11:00:00Z" },
  { id: "wa-tpl-5", name: "appointment_reminder", category: "UTILITY", language: "en", headerType: "TEXT" as const, headerText: "Appointment Reminder", body: "Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Reply YES to confirm or NO to reschedule.", footer: "", buttons: [{ type: "QUICK_REPLY", text: "YES" }, { type: "QUICK_REPLY", text: "NO" }], status: "APPROVED", createdAt: "2026-07-25T08:00:00Z" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _whatsAppCampaigns: any[] = [
  { id: "wa-camp-1", templateName: "order_confirmation", templateId: "wa-tpl-1", recipients: 560, sent: 556, delivered: 550, read: 485, replied: 42, provider: "whatsapp_business_api", status: "SENT", scheduledAt: null, sentAt: "2026-08-08T10:00:00Z", createdAt: "2026-08-07T09:00:00Z" },
  { id: "wa-camp-2", templateName: "welcome_message", templateId: "wa-tpl-3", recipients: 320, sent: 318, delivered: 315, read: 298, replied: 65, provider: "whatsapp_business_api", status: "SENT", scheduledAt: null, sentAt: "2026-08-09T14:00:00Z", createdAt: "2026-08-08T11:00:00Z" },
  { id: "wa-camp-3", templateName: "promo_diwali_sale", templateId: "wa-tpl-4", recipients: 890, sent: 0, delivered: 0, read: 0, replied: 0, provider: "whatsapp_business_api", status: "SCHEDULED", scheduledAt: "2026-08-20T09:00:00Z", sentAt: null, createdAt: "2026-08-10T15:00:00Z" },
  { id: "wa-camp-4", templateName: "payment_reminder", templateId: "wa-tpl-2", recipients: 180, sent: 180, delivered: 175, read: 160, replied: 12, provider: "whatsapp_business_api", status: "SENT", scheduledAt: null, sentAt: "2026-08-11T08:00:00Z", createdAt: "2026-08-10T12:00:00Z" },
  { id: "wa-camp-5", templateName: "appointment_reminder", templateId: "wa-tpl-5", recipients: 75, sent: 0, delivered: 0, read: 0, replied: 0, provider: "whatsapp_business_api", status: "DRAFT", scheduledAt: null, sentAt: null, createdAt: "2026-08-11T16:00:00Z" },
];

export async function getWhatsAppTemplates(filters?: { page?: number; pageSize?: number }) {
  await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);
  const start = (page - 1) * pageSize;
  const data = _whatsAppTemplates.slice(start, start + pageSize);
  return { data, total: _whatsAppTemplates.length, page, pageSize };
}

export async function createWhatsAppTemplate(data: {
  name: string;
  category: string;
  language: string;
  headerType: "TEXT" | "IMAGE";
  headerText?: string;
  body: string;
  footer?: string;
  buttons?: Array<{ type: string; text: string; url?: string }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const tpl = {
    id: `wa-tpl-${Date.now().toString(36)}`,
    name: data.name,
    category: data.category,
    language: data.language,
    headerType: data.headerType,
    headerText: data.headerType === "TEXT" ? data.headerText ?? null : null,
    body: data.body,
    footer: data.footer ?? "",
    buttons: data.buttons ?? [],
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  _whatsAppTemplates.unshift(tpl);
  await logAudit({ tenantId, userId, action: "whatsapp.template.create", entity: "WhatsAppTemplate", entityId: tpl.id, metadata: { name: data.name } });
  revalidatePath("/marketing/whatsapp");
  return tpl;
}

export async function deleteWhatsAppTemplate(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const idx = _whatsAppTemplates.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("WhatsApp template not found");
  _whatsAppTemplates.splice(idx, 1);
  await logAudit({ tenantId, userId, action: "whatsapp.template.delete", entity: "WhatsAppTemplate", entityId: id });
  revalidatePath("/marketing/whatsapp");
  return { success: true };
}

export async function getWhatsAppCampaigns(filters?: { page?: number; pageSize?: number }) {
  await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);
  const start = (page - 1) * pageSize;
  const data = _whatsAppCampaigns.slice(start, start + pageSize);
  return { data, total: _whatsAppCampaigns.length, page, pageSize };
}

export async function createWhatsAppCampaign(data: {
  templateId: string;
  recipientListId?: string;
  scheduledAt?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const tpl = _whatsAppTemplates.find((t) => t.id === data.templateId);
  if (!tpl) throw new Error("Template not found");
  const campaign = {
    id: `wa-camp-${Date.now().toString(36)}`,
    templateName: tpl.name,
    templateId: data.templateId,
    recipients: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    provider: "whatsapp_business_api",
    status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
    scheduledAt: data.scheduledAt ?? null,
    sentAt: null,
    createdAt: new Date().toISOString(),
  };
  _whatsAppCampaigns.unshift(campaign);
  await logAudit({ tenantId, userId, action: "whatsapp.campaign.create", entity: "WhatsAppCampaign", entityId: campaign.id, metadata: { templateName: tpl.name } });
  revalidatePath("/marketing/whatsapp");
  return campaign;
}

// ============================================================================
// SURVEY ANALYTICS (MKTG-D)
// ============================================================================

export async function getSurveyAnalytics(surveyId: string) {
  const { tenantId } = await getSessionOrThrow();
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ...tenantScope(tenantId) },
  });
  if (!survey) throw new Error("Survey not found");

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId },
    select: { answers: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = survey.questions as any[];
  const totalResponses = responses.length;

  const questionAnalytics = questions.map((q) => {
    const answers = responses
      .map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ans = r.answers as Record<string, any>;
        return ans[q.id];
      })
      .filter((a) => a !== undefined && a !== null && a !== "");

    const answered = answers.length;

    if (q.type === "MULTIPLE_CHOICE" || q.type === "YES_NO") {
      const counts: Record<string, number> = {};
      for (const a of answers) {
        const key = String(a);
        counts[key] = (counts[key] || 0) + 1;
      }
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        answered,
        distribution: counts,
      };
    }

    if (q.type === "RATING") {
      const nums = answers.map(Number).filter((n) => !isNaN(n));
      const avg = nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
      const counts: Record<string, number> = {};
      for (const n of nums) {
        const key = String(n);
        counts[key] = (counts[key] || 0) + 1;
      }
      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        answered,
        average: Math.round(avg * 100) / 100,
        distribution: counts,
      };
    }

    // TEXT type
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      answered,
      sampleAnswers: answers.slice(0, 10).map(String),
    };
  });

  return { totalResponses, questionAnalytics };
}
