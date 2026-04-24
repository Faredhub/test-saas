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
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...tenantScope(tenantId),
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          link: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
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
    console.error("[api/v1/notifications] Error:", error);
    return apiError("Internal server error.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const body = await req.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return apiError("notificationIds must be a non-empty array.", 400);
    }

    const now = new Date();

    const result = await prisma.notification.updateMany({
      where: {
        ...tenantScope(tenantId),
        userId: user.id,
        id: { in: notificationIds },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return apiSuccess({ updated: result.count });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/notifications] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
