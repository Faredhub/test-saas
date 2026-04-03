import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit, getRequestInfo } from "@/lib/audit";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSessionUser(): Promise<{ userId: string; tenantId: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

/**
 * POST /api/auth/mfa
 * Generate a new TOTP secret and return it with an otpauth:// URI.
 * Stores the secret temporarily on the user record (MFA not enabled yet).
 */
export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, tenantId } = sessionUser;

    const user = await prisma.user.findFirst({
      where: { id: userId, ...tenantScope(tenantId) },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: "MFA is already enabled" }, { status: 400 });
    }

    // Generate a new TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: "TixelTech ERP",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const uri = totp.toString();

    // Store the secret temporarily (MFA not yet enabled)
    await prisma.user.updateMany({
      where: { id: userId, ...tenantScope(tenantId) },
      data: { mfaSecret: secret },
    });

    return NextResponse.json({ secret, uri });
  } catch (error) {
    console.error("[mfa/POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/auth/mfa
 * Verify a TOTP code and enable MFA. Returns recovery codes (shown once).
 */
export async function PUT(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, tenantId } = sessionUser;
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, ...tenantScope(tenantId) },
      select: { mfaSecret: true, mfaEnabled: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: "MFA is already enabled" }, { status: 400 });
    }

    if (!user.mfaSecret) {
      return NextResponse.json(
        { error: "No MFA setup in progress. Please start the setup first." },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const totp = new OTPAuth.TOTP({
      issuer: "TixelTech ERP",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Generate 8 recovery codes
    const recoveryCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const plain = crypto.randomBytes(4).toString("hex").toUpperCase();
      const formatted = `${plain.slice(0, 4)}-${plain.slice(4)}`;
      recoveryCodes.push(formatted);
      hashedCodes.push(await bcrypt.hash(formatted, 10));
    }

    // Enable MFA and store hashed recovery codes
    await prisma.user.updateMany({
      where: { id: userId, ...tenantScope(tenantId) },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: hashedCodes,
      },
    });

    const enableReqInfo = await getRequestInfo();
    await logAudit({
      tenantId,
      userId,
      action: "user.mfa.enable",
      entity: "User",
      entityId: userId,
      ipAddress: enableReqInfo.ipAddress,
      userAgent: enableReqInfo.userAgent,
    });

    return NextResponse.json({
      success: true,
      recoveryCodes,
      message: "MFA has been enabled. Save your recovery codes securely.",
    });
  } catch (error) {
    console.error("[mfa/PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/mfa
 * Disable MFA after verifying the user's current password.
 */
export async function DELETE(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, tenantId } = sessionUser;
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, ...tenantScope(tenantId) },
      select: { passwordHash: true, mfaEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.mfaEnabled) {
      return NextResponse.json({ error: "MFA is not enabled" }, { status: 400 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "No password set for this account. Cannot verify identity." },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }

    // Disable MFA and clear secrets
    await prisma.user.updateMany({
      where: { id: userId, ...tenantScope(tenantId) },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    const disableReqInfo = await getRequestInfo();
    await logAudit({
      tenantId,
      userId,
      action: "user.mfa.disable",
      entity: "User",
      entityId: userId,
      ipAddress: disableReqInfo.ipAddress,
      userAgent: disableReqInfo.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "MFA has been disabled.",
    });
  } catch (error) {
    console.error("[mfa/DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
