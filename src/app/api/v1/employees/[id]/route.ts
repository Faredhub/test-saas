import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;
    const { id } = await params;

    const employee = await prisma.employee.findFirst({
      where: { ...tenantScope(tenantId), id },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        bloodGroup: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        departmentId: true,
        designation: true,
        reportingToId: true,
        dateOfJoining: true,
        dateOfLeaving: true,
        employmentType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reportingTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!employee) {
      return apiError("Employee not found.", 404);
    }

    return apiSuccess(employee);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/employees/[id]] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
