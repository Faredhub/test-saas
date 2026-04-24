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
    const status = url.searchParams.get("status") || undefined;
    const category = url.searchParams.get("category") || undefined;

    const where = {
      ...tenantScope(tenantId),
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { referenceNo: { contains: search, mode: "insensitive" as const } },
              { issuingAuth: { contains: search, mode: "insensitive" as const } },
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

    return apiSuccess({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders] GET error:", error);
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

    if (!body.referenceNo || !body.title) {
      return apiError("referenceNo and title are required.", 400);
    }

    const tender = await prisma.tender.create({
      data: {
        tenantId,
        referenceNo: body.referenceNo,
        title: body.title,
        description: body.description,
        source: body.source ?? "MANUAL",
        sourceUrl: body.sourceUrl,
        issuingAuth: body.issuingAuth,
        category: body.category,
        estimatedValue: body.estimatedValue,
        emdAmount: body.emdAmount,
        emdDeadline: body.emdDeadline ? new Date(body.emdDeadline) : undefined,
        submissionDeadline: body.submissionDeadline ? new Date(body.submissionDeadline) : undefined,
        openingDate: body.openingDate ? new Date(body.openingDate) : undefined,
        assignedToId: body.assignedToId || undefined,
        eligibilityCriteria: body.eligibilityCriteria,
        documents: body.documents ?? [],
      },
    });

    await logAudit({ tenantId, userId: user.id, action: "tender.create", entity: "Tender", entityId: tender.id });

    return apiSuccess(tender, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders] POST error:", error);
    return apiError("Internal server error.", 500);
  }
}
