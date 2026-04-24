import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const url = new URL(req.url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "25", 10), 1), 100);
    const search = url.searchParams.get("search") || undefined;
    const designation = url.searchParams.get("designation") || undefined;
    const department = url.searchParams.get("department") || undefined;

    const where = {
      ...tenantScope(tenantId),
      isActive: true,
      ...(designation ? { designation } : {}),
      ...(department ? { department } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { designation: { contains: search, mode: "insensitive" as const } },
              { qualifications: { contains: search, mode: "insensitive" as const } },
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

    return apiSuccess({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/cv-bank] GET error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const body = await req.json();

    if (!body.name) {
      return apiError("name is required.", 400);
    }

    const record = await prisma.cVRecord.create({
      data: {
        tenantId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        employeeId: body.employeeId || undefined,
        designation: body.designation,
        department: body.department,
        qualifications: body.qualifications,
        experience: body.experience,
        skills: body.skills ?? [],
        certifications: body.certifications ?? [],
        projects: body.projects ?? [],
        cvFileUrl: body.cvFileUrl,
        keywords: body.keywords ?? [],
      },
    });

    await logAudit({ tenantId, userId: user.id, action: "cv.create", entity: "CVRecord", entityId: record.id });

    return apiSuccess(record, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/cv-bank] POST error:", error);
    return apiError("Internal server error.", 500);
  }
}
