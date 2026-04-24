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
    const now = new Date();
    const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()), 10);

    if (month < 1 || month > 12 || isNaN(month)) {
      return apiError("Month must be between 1 and 12.", 400);
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return apiError("Year must be a valid four-digit year.", 400);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const records = await prisma.attendance.findMany({
      where: {
        ...tenantScope(tenantId),
        employeeId: employee.id,
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        clockIn: true,
        clockOut: true,
        status: true,
        totalHours: true,
        overtime: true,
        location: true,
        notes: true,
      },
    });

    return apiSuccess(records);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/attendance] Error:", error);
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
    const { action, latitude, longitude, notes } = body;

    if (!action || !["clock_in", "clock_out"].includes(action)) {
      return apiError("Action must be 'clock_in' or 'clock_out'.", 400);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const locationStr =
      latitude != null && longitude != null
        ? `${latitude},${longitude}`
        : null;

    if (action === "clock_in") {
      // Check if already clocked in today
      const existing = await prisma.attendance.findUnique({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: employee.id,
            date: todayStart,
          },
        },
      });

      if (existing?.clockIn) {
        return apiError("Already clocked in today.", 409);
      }

      const record = await prisma.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: employee.id,
            date: todayStart,
          },
        },
        update: {
          clockIn: now,
          status: "PRESENT",
          location: locationStr,
          notes: notes || undefined,
        },
        create: {
          tenantId,
          employeeId: employee.id,
          date: todayStart,
          clockIn: now,
          status: "PRESENT",
          location: locationStr,
          notes: notes || undefined,
        },
      });

      return apiSuccess(record, 201);
    }

    // clock_out
    const existing = await prisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: employee.id,
          date: todayStart,
        },
      },
    });

    if (!existing || !existing.clockIn) {
      return apiError("No clock-in record found for today. Please clock in first.", 400);
    }

    if (existing.clockOut) {
      return apiError("Already clocked out today.", 409);
    }

    const clockInTime = new Date(existing.clockIn);
    const diffMs = now.getTime() - clockInTime.getTime();
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const overtime = totalHours > 8 ? parseFloat((totalHours - 8).toFixed(2)) : 0;

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOut: now,
        totalHours,
        overtime,
        location: locationStr || existing.location,
        notes: notes || existing.notes,
      },
    });

    return apiSuccess(record);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/attendance] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
