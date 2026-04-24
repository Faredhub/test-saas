import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const employee = await prisma.employee.findFirst({
      where: { ...tenantScope(tenantId), userId: user.id },
    });

    if (!employee) {
      return apiError("No employee record linked to this user account.", 404);
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...tenantScope(tenantId),
      employeeId: employee.id,
      ...(status ? { status: status as string } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          leaveType: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return apiSuccess({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/leaves] Error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const employee = await prisma.employee.findFirst({
      where: { ...tenantScope(tenantId), userId: user.id },
    });

    if (!employee) {
      return apiError("No employee record linked to this user account.", 404);
    }

    const body = await req.json();
    const { leaveTypeId, startDate, endDate, reason } = body;

    if (!leaveTypeId || !startDate || !endDate) {
      return apiError("leaveTypeId, startDate, and endDate are required.", 400);
    }

    // Validate leave type exists for this tenant
    const leaveType = await prisma.leaveType.findFirst({
      where: { ...tenantScope(tenantId), id: leaveTypeId, isActive: true },
    });

    if (!leaveType) {
      return apiError("Invalid or inactive leave type.", 404);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiError("Invalid date format for startDate or endDate.", 400);
    }

    if (end < start) {
      return apiError("endDate cannot be before startDate.", 400);
    }

    // Calculate days (inclusive, counting each calendar day)
    const diffTime = end.getTime() - start.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: employee.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason: reason || null,
        status: "PENDING",
      },
      include: {
        leaveType: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return apiSuccess(leaveRequest, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/leaves] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
