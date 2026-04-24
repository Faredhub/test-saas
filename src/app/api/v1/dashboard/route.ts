import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      employeeCount,
      activeProjectCount,
      totalRevenue,
      pendingInvoiceCount,
      todayAttendanceCount,
      pendingLeaveCount,
      openTaskCount,
      recentNotifications,
    ] = await Promise.all([
      // Total active employees
      prisma.employee.count({
        where: { ...tenantScope(tenantId), status: "ACTIVE" },
      }),

      // Active projects
      prisma.project.count({
        where: {
          ...tenantScope(tenantId),
          status: { in: ["PLANNING", "IN_PROGRESS"] },
        },
      }),

      // Total revenue (paid invoices this month)
      prisma.invoice.aggregate({
        where: {
          ...tenantScope(tenantId),
          status: "PAID",
          paidDate: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // Pending invoices count
      prisma.invoice.count({
        where: {
          ...tenantScope(tenantId),
          status: { in: ["SENT", "OVERDUE"] },
        },
      }),

      // Today's attendance count
      prisma.attendance.count({
        where: { ...tenantScope(tenantId), date: today },
      }),

      // Pending leave requests
      prisma.leaveRequest.count({
        where: { ...tenantScope(tenantId), status: "PENDING" },
      }),

      // Open tasks (assigned to current user if employee)
      prisma.task.count({
        where: {
          ...tenantScope(tenantId),
          status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] },
        },
      }),

      // Recent unread notifications for the user
      prisma.notification.findMany({
        where: { ...tenantScope(tenantId), userId: user.id, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    return apiSuccess({
      employees: employeeCount,
      activeProjects: activeProjectCount,
      monthlyRevenue: Number(totalRevenue._sum.total ?? 0),
      pendingInvoices: pendingInvoiceCount,
      todayAttendance: todayAttendanceCount,
      pendingLeaves: pendingLeaveCount,
      openTasks: openTaskCount,
      recentNotifications,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/dashboard] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
