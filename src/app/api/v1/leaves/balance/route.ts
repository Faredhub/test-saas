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

    // Get all active leave types for this tenant
    const leaveTypes = await prisma.leaveType.findMany({
      where: { ...tenantScope(tenantId), isActive: true },
      orderBy: { name: "asc" },
    });

    // Get used days per leave type (only APPROVED and PENDING count)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    const usedLeaves = await prisma.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      where: {
        ...tenantScope(tenantId),
        employeeId: employee.id,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { gte: yearStart, lt: yearEnd },
      },
      _sum: { days: true },
    });

    const usedMap = new Map(
      usedLeaves.map((u) => [u.leaveTypeId, Number(u._sum.days || 0)])
    );

    const balances = leaveTypes.map((lt) => {
      const used = usedMap.get(lt.id) || 0;
      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        allowed: lt.annualQuota,
        used,
        remaining: Math.max(0, lt.annualQuota - used),
        carryForward: lt.carryForward,
      };
    });

    return apiSuccess(balances);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/leaves/balance] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
