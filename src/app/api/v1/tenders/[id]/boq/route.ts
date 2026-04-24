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

    const items = await prisma.bOQItem.findMany({
      where: { ...tenantScope(tenantId), tenderId },
      orderBy: { sNo: "asc" },
    });

    return apiSuccess(items);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]/boq] GET error:", error);
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

    if (!body.description || !body.unit || body.quantity === undefined || body.sNo === undefined) {
      return apiError("sNo, description, unit, and quantity are required.", 400);
    }

    // Verify tender belongs to this tenant
    const tender = await prisma.tender.findFirst({
      where: { id: tenderId, ...tenantScope(tenantId) },
      select: { id: true },
    });

    if (!tender) return apiError("Tender not found.", 404);

    const item = await prisma.bOQItem.create({
      data: {
        tenantId,
        tenderId,
        sNo: body.sNo,
        description: body.description,
        unit: body.unit,
        quantity: body.quantity,
        rate: body.rate,
        amount: body.amount,
        category: body.category,
        remarks: body.remarks,
        sourceDoc: body.sourceDoc,
      },
    });

    await logAudit({ tenantId, userId: user.id, action: "boq.create", entity: "BOQItem", entityId: item.id });

    return apiSuccess(item, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tenders/[id]/boq] POST error:", error);
    return apiError("Internal server error.", 500);
  }
}
