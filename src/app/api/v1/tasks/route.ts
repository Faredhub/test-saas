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
    const projectId = url.searchParams.get("projectId") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...tenantScope(tenantId),
      assigneeId: employee.id,
      ...(status ? { status: status as string } : {}),
      ...(projectId ? { projectId } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          estimatedHours: true,
          actualHours: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      prisma.task.count({ where }),
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
    console.error("[api/v1/tasks] Error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function PATCH(req: Request) {
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
    const { taskId, status } = body;

    if (!taskId || !status) {
      return apiError("taskId and status are required.", 400);
    }

    const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
    if (!validStatuses.includes(status)) {
      return apiError(`Status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    // Verify task belongs to this tenant and is assigned to the user
    const task = await prisma.task.findFirst({
      where: {
        ...tenantScope(tenantId),
        id: taskId,
        assigneeId: employee.id,
      },
    });

    if (!task) {
      return apiError("Task not found or not assigned to you.", 404);
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tasks] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
