"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
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

  return { data, total, page, pageSize };
}

export async function getEvent(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const event = await prisma.marketingEvent.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { attendees: { orderBy: { createdAt: "desc" } } },
  });
  if (!event) throw new Error("Event not found");
  return event;
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
  return event;
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
  return event;
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
  const { postToFacebook, postToLinkedIn, postToTwitter } = await import(
    "@/lib/social-media"
  );

  const results: Record<string, { success: boolean; postId?: string; error?: string }> = {};

  for (const platform of data.platforms) {
    switch (platform) {
      case "facebook":
        results.facebook = await postToFacebook(data.message, data.imageUrl);
        break;
      case "linkedin":
        results.linkedin = await postToLinkedIn(data.message, data.imageUrl);
        break;
      case "twitter":
        results.twitter = await postToTwitter(data.message);
        break;
      default:
        results[platform] = { success: false, error: "Unknown platform" };
    }
  }

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
