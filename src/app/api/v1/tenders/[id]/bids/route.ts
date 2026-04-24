import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;
    const { id: tenderId } = await params;

    const url = new URL(req.url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "25", 10), 1), 100);

    const where = {
      ...tenantScope(tenantId),
      tenderId,
    };

    const [data, total] = await Promise.all([
      prisma.bid.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bid.count({ where }),
    ]);

    return apiSuccess({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]/bids] GET error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;
    const { id: tenderId } = await params;

    const body = await req.json();

    if (!body.bidNo || body.bidAmount === undefined) {
      return apiError("bidNo and bidAmount are required.", 400);
    }

    // Verify tender belongs to this tenant
    const tender = await prisma.tender.findFirst({
      where: { id: tenderId, ...tenantScope(tenantId) },
      select: { id: true },
    });

    if (!tender) return apiError("Tender not found.", 404);

    const bid = await prisma.bid.create({
      data: {
        tenantId,
        tenderId,
        bidNo: body.bidNo,
        bidAmount: body.bidAmount,
        status: body.status ?? "DRAFT",
        documents: body.documents ?? [],
        keywords: body.keywords ?? [],
      },
    });

    await logAudit({ tenantId, userId: user.id, action: "bid.create", entity: "Bid", entityId: bid.id });

    return apiSuccess(bid, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]/bids] POST error:", error);
    return apiError("Internal server error.", 500);
  }
}
