"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

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
// CV BANK (Civil Industry CV Repository)
// ============================================================================

export async function getCVRecords(filters?: {
  search?: string;
  designation?: string;
  department?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.designation ? { designation: filters.designation } : {}),
    ...(filters?.department ? { department: filters.department } : {}),
    ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
            { designation: { contains: filters.search, mode: "insensitive" as const } },
            { department: { contains: filters.search, mode: "insensitive" as const } },
            { qualifications: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.cVRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cVRecord.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getCVRecord(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.cVRecord.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
}

export async function createCVRecord(data: {
  name: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  qualifications?: string;
  experience?: number;
  skills?: string[];
  certifications?: string[];
  projects?: Array<Record<string, unknown>>;
  cvFileUrl?: string;
  keywords?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const record = await prisma.cVRecord.create({
    data: {
      tenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      employeeId: data.employeeId || undefined,
      designation: data.designation,
      department: data.department,
      qualifications: data.qualifications,
      experience: data.experience,
      skills: data.skills ?? [],
      certifications: data.certifications ?? [],
      projects: data.projects ?? [],
      cvFileUrl: data.cvFileUrl,
      keywords: data.keywords ?? [],
    },
  });

  await logAudit({ tenantId, userId, action: "cv.create", entity: "CVRecord", entityId: record.id });
  revalidatePath("/cv-bank");
  return record;
}

export async function updateCVRecord(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    qualifications?: string;
    experience?: number;
    skills?: string[];
    certifications?: string[];
    projects?: Array<Record<string, unknown>>;
    cvFileUrl?: string;
    keywords?: string[];
    isActive?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.cVRecord.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "cv.update", entity: "CVRecord", entityId: id });
  revalidatePath("/cv-bank");
  return { success: true };
}

export async function deleteCVRecord(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.cVRecord.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "cv.delete", entity: "CVRecord", entityId: id });
  revalidatePath("/cv-bank");
  return { success: true };
}

export async function searchCVsByKeywords(keywords: string[]) {
  const { tenantId } = await getSessionOrThrow();

  if (!keywords.length) return [];

  // Fetch all active CVs for the tenant, then filter in-memory by keywords
  // across skills, certifications, qualifications, and the keywords JSON field.
  const allCVs = await prisma.cVRecord.findMany({
    where: {
      ...tenantScope(tenantId),
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  return allCVs.filter((cv) => {
    const skills = (cv.skills as string[]) ?? [];
    const certs = (cv.certifications as string[]) ?? [];
    const kw = (cv.keywords as string[]) ?? [];
    const qualText = (cv.qualifications ?? "").toLowerCase();

    const allTokens = [
      ...skills.map((s) => s.toLowerCase()),
      ...certs.map((c) => c.toLowerCase()),
      ...kw.map((k) => k.toLowerCase()),
      qualText,
      (cv.designation ?? "").toLowerCase(),
      (cv.department ?? "").toLowerCase(),
    ];

    return lowerKeywords.some((needle) =>
      allTokens.some((token) => token.includes(needle))
    );
  });
}

export async function getCVsForProject(requirements: {
  skills?: string[];
  certifications?: string[];
  minExperience?: number;
}) {
  const { tenantId } = await getSessionOrThrow();

  const allCVs = await prisma.cVRecord.findMany({
    where: {
      ...tenantScope(tenantId),
      isActive: true,
      ...(requirements.minExperience ? { experience: { gte: requirements.minExperience } } : {}),
    },
    orderBy: { experience: "desc" },
  });

  // Score each CV by how many required skills/certifications it matches
  const scored = allCVs.map((cv) => {
    let score = 0;
    const skills = (cv.skills as string[]) ?? [];
    const certs = (cv.certifications as string[]) ?? [];

    const lowerSkills = skills.map((s) => s.toLowerCase());
    const lowerCerts = certs.map((c) => c.toLowerCase());

    (requirements.skills ?? []).forEach((req) => {
      if (lowerSkills.some((s) => s.includes(req.toLowerCase()))) score += 2;
    });

    (requirements.certifications ?? []).forEach((req) => {
      if (lowerCerts.some((c) => c.includes(req.toLowerCase()))) score += 1;
    });

    return { ...cv, matchScore: score };
  });

  // Return only CVs with at least one match, sorted by score descending
  return scored.filter((cv) => cv.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
}
