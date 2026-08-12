import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/forgot-password", "/verify", "/preview"];

// Custom domain detection without DB — just check the hostname pattern
// Actual domain verification happens in the page component
function isCustomDomainHost(hostname: string): boolean {
  return (
    !!hostname &&
    !hostname.includes("localhost") &&
    !hostname.includes(".tpdemo.in") &&
    !hostname.includes("app.knnect360.com") &&
    !hostname.startsWith("192.168.") &&
    !hostname.startsWith("10.") &&
    !hostname.startsWith("172.")
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  if (isCustomDomainHost(hostname)) {
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
