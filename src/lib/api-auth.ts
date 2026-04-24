import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "./db";

const JWT_SECRET_KEY = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

function getSecretKey() {
  if (!JWT_SECRET_KEY) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET environment variable is required");
  }
  return new TextEncoder().encode(JWT_SECRET_KEY);
}

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  iat: number;
  exp: number;
}

// Sign a JWT for API usage (mobile app sessions)
export async function signApiToken(user: ApiUser): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    roles: user.roles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());

  return token;
}

// Validate a Bearer token from the Authorization header.
// Returns the authenticated user or a JSON error response.
export async function authenticateRequest(
  req: Request
): Promise<{ user: ApiUser } | { error: NextResponse }> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header. Expected: Bearer <token>" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const claims = payload as unknown as JwtPayload;

    // Verify the user still exists and is active
    const dbUser = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, status: true, passwordChangedAt: true },
    });

    if (!dbUser || dbUser.status !== "ACTIVE") {
      return {
        error: NextResponse.json(
          { error: "Account is inactive or has been deleted." },
          { status: 401 }
        ),
      };
    }

    // If the password changed after the token was issued, reject it
    if (dbUser.passwordChangedAt) {
      const tokenIssuedAt = new Date(claims.iat * 1000);
      if (dbUser.passwordChangedAt > tokenIssuedAt) {
        return {
          error: NextResponse.json(
            { error: "Token invalidated by password change. Please log in again." },
            { status: 401 }
          ),
        };
      }
    }

    return {
      user: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        tenantId: claims.tenantId,
        tenantSlug: claims.tenantSlug,
        roles: claims.roles,
      },
    };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      ),
    };
  }
}

// Convenience: returns user or throws (for use inside try/catch handlers)
export async function requireAuth(req: Request): Promise<ApiUser> {
  const result = await authenticateRequest(req);
  if ("error" in result) {
    throw result.error;
  }
  return result.user;
}

// Standard error response helper
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Standard success response helper
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
