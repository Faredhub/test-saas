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

    // Show tickets assigned to or reported by the current user
    const where = {
      ...tenantScope(tenantId),
      OR: [
        { assignedToId: employee.id },
        { reportedById: employee.id },
      ],
      ...(status ? { status: status as import("@/generated/prisma/enums").TicketStatus } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          ticketNo: true,
          subject: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          projectId: true,
          reportedById: true,
          assignedToId: true,
          slaDeadline: true,
          resolvedAt: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
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
    console.error("[api/v1/tickets] Error:", error);
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
    const { subject, description, priority, category, projectId } = body;

    if (!subject || typeof subject !== "string") {
      return apiError("subject is required.", 400);
    }

    // Validate priority if provided
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      return apiError(`Priority must be one of: ${validPriorities.join(", ")}`, 400);
    }

    // Validate project exists if projectId is given
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { ...tenantScope(tenantId), id: projectId },
      });
      if (!project) {
        return apiError("Project not found.", 404);
      }
    }

    // Generate ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: tenantScope(tenantId),
      orderBy: { createdAt: "desc" },
      select: { ticketNo: true },
    });

    let nextNumber = 1;
    if (lastTicket?.ticketNo) {
      const match = lastTicket.ticketNo.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const ticketNo = `TKT-${String(nextNumber).padStart(5, "0")}`;

    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        ticketNo,
        subject,
        description: description || null,
        priority: priority || "MEDIUM",
        category: category || null,
        projectId: projectId || null,
        reportedById: employee.id,
        status: "OPEN",
      },
      select: {
        id: true,
        ticketNo: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        projectId: true,
        reportedById: true,
        slaDeadline: true,
        createdAt: true,
      },
    });

    return apiSuccess(ticket, 201);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/tickets] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
