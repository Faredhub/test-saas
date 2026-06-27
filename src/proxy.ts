import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/forgot-password", "/verify"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow all API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // Redirect to home if already authenticated
    if (req.auth?.user) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|charater.webp|signup_illustration.png|forgot_password_illustration.png|signup_bg.jpg).*)",
  ],
};
