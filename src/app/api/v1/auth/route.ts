import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signApiToken } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limit: 10 attempts per IP per minute
    const { allowed } = await rateLimit(`rl:api-login:${ip}`, 10, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        roleAssignments: { include: { role: true } },
        tenant: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: "Account is locked. Please try again later." },
        { status: 423 }
      );
    }

    // Check account status
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is not active." },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      // Increment failed attempts, lock after 5
      const attempts = user.failedLoginAttempts + 1;
      const lockout =
        attempts >= 5
          ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
          : {};

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, ...lockout },
      });

      logAudit({
        tenantId: user.tenantId,
        userId: user.id,
        action: "user.login.failed",
        entity: "User",
        entityId: user.id,
        metadata: {
          reason: "invalid_password",
          failedAttempts: attempts,
          source: "mobile_api",
        },
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    const roles = user.roleAssignments.map((ra) => ra.role.name);

    const apiUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      roles,
    };

    const token = await signApiToken(apiUser);

    // Find linked employee record if one exists
    const employee = await prisma.employee.findFirst({
      where: { tenantId: user.tenantId, userId: user.id },
      select: { id: true, employeeId: true, firstName: true, lastName: true, designation: true },
    });

    logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: "user.login",
      entity: "User",
      entityId: user.id,
      metadata: { provider: "api_credentials", source: "mobile_api" },
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          roles,
          employee: employee || null,
        },
      },
    });
  } catch (error) {
    console.error("[api/v1/auth] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
