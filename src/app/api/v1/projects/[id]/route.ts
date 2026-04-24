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

    const project = await prisma.project.findFirst({
      where: { ...tenantScope(tenantId), id },
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
        milestones: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            isCompleted: true,
            completedAt: true,
          },
        },
      },
    });

    if (!project) {
      return apiError("Project not found.", 404);
    }

    // Get task status summary for this project
    const taskCounts = await prisma.task.groupBy({
      by: ["status"],
      where: { ...tenantScope(tenantId), projectId: id },
      _count: { id: true },
    });

    const taskSummary: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
      BLOCKED: 0,
    };

    for (const group of taskCounts) {
      taskSummary[group.status] = group._count.id;
    }

    const totalTasks = Object.values(taskSummary).reduce((a, b) => a + b, 0);

    return apiSuccess({
      ...project,
      taskSummary: {
        ...taskSummary,
        total: totalTasks,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/projects/[id]] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
