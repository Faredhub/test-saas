import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validators/auth";
import { getRequestInfo, parseDeviceType } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, remaining } = await rateLimit(`rl:register:${ip}`, 3, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const body = await req.json();

    // Verify reCAPTCHA token if provided (skips if RECAPTCHA_SECRET_KEY not set)
    if (body.recaptchaToken) {
      const isHuman = await verifyRecaptcha(body.recaptchaToken);
      if (!isHuman) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed. Please try again." },
          { status: 403 }
        );
      }
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, companyName, avatar } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Capture request info for audit trail (AUTH-010)
    const reqInfo = await getRequestInfo();

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant (organization)
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: `${slug}-${Date.now().toString(36)}`,
          email,
          plan: "FREE",
          status: "TRIAL",
        },
      });

      // Create default admin role
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Admin",
          description: "Full access administrator",
          isSystem: true,
          isDefault: false,
        },
      });

      // Create default employee role
      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Employee",
          description: "Standard employee access",
          isSystem: true,
          isDefault: true,
        },
      });

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name,
          passwordHash,
          avatar,
          status: "ACTIVE",
          emailVerified: new Date(),
        },
      });

      // Assign admin role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      // Audit log (AUTH-010: includes IP and device info)
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: "tenant.created",
          entity: "Tenant",
          entityId: tenant.id,
          metadata: {
            companyName,
            deviceType: reqInfo.userAgent ? parseDeviceType(reqInfo.userAgent) : undefined,
          },
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
        },
      });

      return { user, tenant };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        data: {
          userId: result.user.id,
          tenantId: result.tenant.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
