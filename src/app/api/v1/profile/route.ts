import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        theme: true,
        locale: true,
        timezone: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!dbUser) {
      return apiError("User not found.", 404);
    }

    const employee = await prisma.employee.findFirst({
      where: { ...tenantScope(tenantId), userId: user.id },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        departmentId: true,
        designation: true,
        dateOfJoining: true,
        employmentType: true,
        status: true,
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

    return apiSuccess({
      user: dbUser,
      employee: employee || null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/profile] Error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const body = await req.json();

    // Only allow updating safe profile fields
    const allowedFields = ["name", "firstName", "lastName", "phone", "avatar", "theme", "locale", "timezone"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No valid fields to update. Allowed: " + allowedFields.join(", "), 400);
    }

    // Validate theme if provided
    if (updateData.theme && !["LIGHT", "DARK", "SYSTEM"].includes(updateData.theme as string)) {
      return apiError("Theme must be LIGHT, DARK, or SYSTEM.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        theme: true,
        locale: true,
        timezone: true,
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/profile] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
