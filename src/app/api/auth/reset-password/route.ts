import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { normalizeUrlEnv } from "@/lib/env";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators/auth";
import { rateLimit } from "@/lib/rate-limit";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST /api/auth/reset-password
 * Initiates password reset: generates token, stores SHA-256 hash in VerificationToken, logs reset URL.
 * Always returns success to avoid leaking whether an email exists.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, remaining } = await rateLimit(`rl:reset-pwd-post:${ip}`, 5, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Look up the user - but never reveal whether they exist
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (user) {
      // Delete any existing password reset tokens for this email
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
          type: "PASSWORD_RESET",
        },
      });

      // Generate a secure token (CRIT-04: use randomBytes instead of randomUUID)
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the SHA-256 hash of the token (never store plaintext)
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: tokenHash,
          expires,
          type: "PASSWORD_RESET",
        },
      });

      // Build the reset URL
      const baseUrl = normalizeUrlEnv(process.env.NEXTAUTH_URL, "http://localhost:3000");
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      // Only log sensitive info in development (MED-05)
      if (process.env.NODE_ENV === "development") {
        console.log("=======================================================");
        console.log("[AUTH-003] Password Reset Link:");
        console.log(`  Email: ${email}`);
        console.log(`  URL:   ${resetUrl}`);
        console.log(`  Expires: ${expires.toISOString()}`);
        console.log("=======================================================");
      }
    }

    // Always return success - don't reveal if email exists
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[reset-password] POST Error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/reset-password
 * Completes password reset: validates token (hashed), hashes new password, updates user.
 */
export async function PUT(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, remaining } = await rateLimit(`rl:reset-pwd-put:${ip}`, 10, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Hash the submitted token before comparing with DB (CRIT-04)
    const tokenHash = hashToken(token);

    // Find the token by its hash
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: tokenHash,
        type: "PASSWORD_RESET",
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Check expiry
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: verificationToken.identifier,
          token: tokenHash,
        },
      });

      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find the user by the identifier (email)
    const user = await prisma.user.findFirst({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password and update user + delete token in a transaction
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Delete the used token
      await tx.verificationToken.deleteMany({
        where: {
          identifier: verificationToken.identifier,
          token: tokenHash,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[reset-password] PUT Error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
