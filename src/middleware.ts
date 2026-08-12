import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/forgot-password", "/verify"];

let _prisma: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
    });
    const adapter = new PrismaPg(pool);
    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  const isCustomDomain = !hostname.includes("localhost") && !hostname.includes(".tpdemo.in");
  if (isCustomDomain) {
    try {
      const prisma = getPrisma();
      const customDomain = await prisma.customDomain.findUnique({
        where: { domain: hostname },
        select: { status: true },
      });
      if (
        customDomain &&
        (customDomain.status === "VERIFIED" || customDomain.status === "SSL_ACTIVE")
      ) {
        const url = req.nextUrl.clone();
        if (pathname === "/") {
          url.pathname = "/p";
        } else {
          url.pathname = `/p${pathname}`;
        }
        const response = NextResponse.rewrite(url);
        response.headers.set("x-custom-domain", hostname);
        return response;
      }
    } catch (_e) {
      // fall through to normal auth
    }
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
