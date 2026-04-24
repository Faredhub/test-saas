import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...tenantScope(tenantId),
      ...(status ? { status: status as string } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          status: true,
          priority: true,
          startDate: true,
          endDate: true,
          budget: true,
          spent: true,
          progress: true,
          managerId: true,
          clientName: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { tasks: true },
          },
        },
      }),
      prisma.project.count({ where }),
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
    console.error("[api/v1/projects] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
