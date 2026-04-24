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
    const search = url.searchParams.get("search") || undefined;
    const departmentId = url.searchParams.get("departmentId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: Record<string, unknown> = {
      ...tenantScope(tenantId),
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { firstName: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          departmentId: true,
          designation: true,
          status: true,
          dateOfJoining: true,
          employmentType: true,
        },
      }),
      prisma.employee.count({ where }),
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
    console.error("[api/v1/employees] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
