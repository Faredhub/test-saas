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
    const { id } = await params;

    const tender = await prisma.tender.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        bids: { orderBy: { createdAt: "desc" } },
        boqItems: { orderBy: { sNo: "asc" } },
        emdRecords: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!tender) return apiError("Tender not found.", 404);

    return apiSuccess(tender);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]] GET error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;
    const { id } = await params;

    const body = await req.json();

    // Convert date strings to Date objects where needed
    const updateData: Record<string, unknown> = { ...body };
    if (body.emdDeadline) updateData.emdDeadline = new Date(body.emdDeadline);
    if (body.submissionDeadline) updateData.submissionDeadline = new Date(body.submissionDeadline);
    if (body.openingDate) updateData.openingDate = new Date(body.openingDate);

    const result = await prisma.tender.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: updateData,
    });

    if (result.count === 0) return apiError("Tender not found.", 404);

    await logAudit({ tenantId, userId: user.id, action: "tender.update", entity: "Tender", entityId: id });

    return apiSuccess({ updated: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]] PATCH error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;
    const { id } = await params;

    const result = await prisma.tender.deleteMany({
      where: { id, ...tenantScope(tenantId) },
    });

    if (result.count === 0) return apiError("Tender not found.", 404);

    await logAudit({ tenantId, userId: user.id, action: "tender.delete", entity: "Tender", entityId: id });

    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]] DELETE error:", error);
    return apiError("Internal server error.", 500);
  }
}
