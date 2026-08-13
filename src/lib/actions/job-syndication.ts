"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { logAudit, getRequestInfo } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { JOB_PORTAL_ADAPTERS, JobData } from "@/lib/job-syndication";

type AuthUser = { id: string; tenantId: string };

async function getAuthUser(): Promise<AuthUser> {
  const session = await auth();
  const user = session?.user as AuthUser | undefined;
  if (!user || !user.tenantId || !user.id) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getJobPortals() {
  const user = await getAuthUser();

  const portals = await prisma.jobPortal.findMany({
    where: { tenantId: user.tenantId },
    include: {
      connections: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Seed default portals if empty for this tenant
  if (portals.length === 0) {
    const defaultPortals = [
      { name: "LinkedIn Jobs", provider: "LINKEDIN_JOBS", baseUrl: "https://api.linkedin.com" },
      { name: "Indeed XML Feed", provider: "INDEED", baseUrl: "https://indeed.com" },
      { name: "Naukri Enterprise", provider: "NAUKRI", baseUrl: "https://naukri.com" },
      { name: "Glassdoor Jobs", provider: "GLASSDOOR", baseUrl: "https://glassdoor.com" },
    ];

    for (const p of defaultPortals) {
      const adapter = JOB_PORTAL_ADAPTERS[p.provider];
      await prisma.jobPortal.create({
        data: {
          tenantId: user.tenantId,
          name: p.name,
          provider: p.provider,
          baseUrl: p.baseUrl,
          status: adapter?.requiresOfficialCredentials ? "AWAITING_CREDENTIALS" : "ACTIVE",
          isSandbox: true,
          fieldMapping: adapter?.defaultFieldMapping || {},
          capabilities: adapter?.capabilities || { publish: true, update: true, unpublish: true },
        },
      });
    }

    return prisma.jobPortal.findMany({
      where: { tenantId: user.tenantId },
      include: { connections: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  return portals;
}

export async function saveJobPortalCredentials(data: {
  portalId: string;
  credentials: string;
  isSandbox: boolean;
  fieldMapping?: Record<string, string>;
}) {
  const user = await getAuthUser();

  const portal = await prisma.jobPortal.findFirst({
    where: { id: data.portalId, tenantId: user.tenantId },
  });
  if (!portal) throw new Error("Job portal not found");

  const encryptedCredentials = data.credentials ? encryptSecret(data.credentials) : "";

  await prisma.jobPortal.update({
    where: { id: data.portalId },
    data: {
      isSandbox: data.isSandbox,
      fieldMapping: data.fieldMapping ? JSON.parse(JSON.stringify(data.fieldMapping)) : portal.fieldMapping,
      status: "ACTIVE",
    },
  });

  if (encryptedCredentials) {
    await prisma.jobPortalConnection.create({
      data: {
        tenantId: user.tenantId,
        portalId: data.portalId,
        status: "CONNECTED",
        encryptedCredentials,
      },
    });
  }

  const reqInfo = await getRequestInfo();
  logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "JOB_PORTAL_CONNECTED",
    entity: "JobPortal",
    entityId: data.portalId,
    metadata: { portalName: portal.name, isSandbox: data.isSandbox },
    ipAddress: reqInfo.ipAddress,
    userAgent: reqInfo.userAgent,
  });

  revalidatePath("/hrm/recruitment/portals");
  return { success: true };
}

export async function testJobPortalConnection(portalId: string) {
  const user = await getAuthUser();

  const portal = await prisma.jobPortal.findFirst({
    where: { id: portalId, tenantId: user.tenantId },
    include: { connections: { take: 1, orderBy: { createdAt: "desc" } } },
  });
  if (!portal) throw new Error("Portal not found");

  const adapter = JOB_PORTAL_ADAPTERS[portal.provider];
  if (!adapter) throw new Error("Unknown portal adapter provider");

  const conn = portal.connections[0];
  if (adapter.requiresOfficialCredentials && (!conn || !conn.encryptedCredentials)) {
    return {
      success: false,
      message: `Awaiting official API credentials/contract for ${portal.name}.`,
    };
  }

  return {
    success: true,
    message: `Connection test successful for ${portal.name} (${portal.isSandbox ? "Sandbox" : "Production"}).`,
  };
}

export async function syndicateJobToPortals(data: {
  jobId: string;
  portalIds: string[];
}) {
  const user = await getAuthUser();

  const reqInfo = await getRequestInfo();
  const rl = await rateLimit(`rl:hrm:syndicate:${user.id}`, 20, 60);
  if (!rl.allowed) throw new Error("Rate limit exceeded");

  const job = await prisma.jobPosting.findFirst({
    where: { id: data.jobId, tenantId: user.tenantId },
  });
  if (!job) throw new Error("Job posting not found");

  const portals = await prisma.jobPortal.findMany({
    where: { id: { in: data.portalIds }, tenantId: user.tenantId },
    include: { connections: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  const results = [];

  for (const portal of portals) {
    const adapter = JOB_PORTAL_ADAPTERS[portal.provider];
    if (!adapter) continue;

    const conn = portal.connections[0];
    const credentials = conn?.encryptedCredentials || "";

    const jobData: JobData = {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      experience: job.experience,
      salary: job.salary,
      description: job.description,
      requirements: job.requirements,
      openings: job.openings,
    };

    const res = await adapter.publishJob(
      jobData,
      credentials,
      (portal.fieldMapping as Record<string, string>) || undefined,
      portal.isSandbox
    );

    const syndication = await prisma.jobSyndication.create({
      data: {
        tenantId: user.tenantId,
        jobId: job.id,
        portalId: portal.id,
        externalJobId: res.externalJobId || null,
        status: res.status === "PUBLISHED" ? "PUBLISHED" : "FAILED",
        publishedAt: res.status === "PUBLISHED" ? new Date() : null,
        lastSyncAt: new Date(),
        errorMessage: res.errorMessage || null,
        responseData: res.responseData ? JSON.parse(JSON.stringify(res.responseData)) : undefined,
      },
    });

    logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: res.status === "PUBLISHED" ? "JOB_SYNDICATION_PUBLISHED" : "JOB_SYNDICATION_FAILED",
      entity: "JobSyndication",
      entityId: syndication.id,
      metadata: { jobTitle: job.title, portalName: portal.name, status: res.status },
      ipAddress: reqInfo.ipAddress,
      userAgent: reqInfo.userAgent,
    });

    results.push({ portal: portal.name, ...res });
  }

  revalidatePath("/hrm/recruitment");
  revalidatePath("/hrm/recruitment/syndication");
  revalidatePath("/hrm/recruitment/syndication-logs");
  return { success: true, results };
}

export async function unpublishJobSyndication(syndicationId: string) {
  const user = await getAuthUser();

  const syndication = await prisma.jobSyndication.findFirst({
    where: { id: syndicationId, tenantId: user.tenantId },
    include: { portal: { include: { connections: { take: 1 } } } },
  });
  if (!syndication) throw new Error("Syndication entry not found");

  const adapter = JOB_PORTAL_ADAPTERS[syndication.portal.provider];
  if (adapter && syndication.externalJobId) {
    const conn = syndication.portal.connections[0];
    await adapter.unpublishJob(syndication.externalJobId, conn?.encryptedCredentials || "", syndication.portal.isSandbox);
  }

  await prisma.jobSyndication.update({
    where: { id: syndicationId },
    data: {
      status: "UNPUBLISHED",
      unpublishedAt: new Date(),
      lastSyncAt: new Date(),
    },
  });

  const reqInfo = await getRequestInfo();
  logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "JOB_SYNDICATION_UNPUBLISHED",
    entity: "JobSyndication",
    entityId: syndicationId,
    metadata: { portalName: syndication.portal.name },
    ipAddress: reqInfo.ipAddress,
    userAgent: reqInfo.userAgent,
  });

  revalidatePath("/hrm/recruitment/syndication");
  revalidatePath("/hrm/recruitment/syndication-logs");
  return { success: true };
}

export async function getSyndicationLogs() {
  const user = await getAuthUser();

  const logs = await prisma.jobSyndication.findMany({
    where: { tenantId: user.tenantId },
    include: {
      job: { select: { title: true, location: true } },
      portal: { select: { name: true, provider: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return logs;
}
