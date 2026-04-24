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
    const status = url.searchParams.get("status") || "ACTIVE";
    const expiringDays = url.searchParams.get("expiringDays");

    const where: Record<string, unknown> = {
      ...tenantScope(tenantId),
      ...(status ? { status } : {}),
    };

    // If expiringDays is provided, filter EMDs expiring within that window
    if (expiringDays) {
      const days = parseInt(expiringDays, 10);
      if (!isNaN(days) && days > 0) {
        const now = new Date();
        const cutoff = new Date();
        cutoff.setDate(now.getDate() + days);
        where.expiryDate = { gte: now, lte: cutoff };
      }
    }

    const records = await prisma.eMDRecord.findMany({
      where,
      include: {
        tender: { select: { id: true, title: true, referenceNo: true } },
      },
      orderBy: { expiryDate: "asc" },
    });

    return apiSuccess(records);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/emd] GET error:", error);
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

    if (body.amount === undefined) {
      return apiError("amount is required.", 400);
    }

    const record = await prisma.eMDRecord.create({
      data: {
        tenantId,
        tenderId: body.tenderId || undefined,
        type: body.type ?? "EMD",
        instrumentType: body.instrumentType ?? "BG",
        instrumentNo: body.instrumentNo,
        bankName: body.bankName,
        amount: body.amount,
        issuedDate: body.issuedDate ? new Date(body.issuedDate) : undefined,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        remarks: body.remarks,
      },
    });

    await logAudit({ tenantId, userId: user.id, action: "emd.create", entity: "EMDRecord", entityId: record.id });

    return apiSuccess(record, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/emd] POST error:", error);
    return apiError("Internal server error.", 500);
  }
}
