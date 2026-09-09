import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/forgot-password", "/verify", "/preview"];

// Custom domain detection without DB — just check the hostname pattern
// Actual domain verification happens in the page component
function isCustomDomainHost(hostname: string): boolean {
  const hostWithoutPort = hostname.split(":")[0];
  // Ignore IP addresses (e.g. 94.136.189.16 or 127.0.0.1 or local IPs)
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostWithoutPort);
  if (isIpAddress) return false;

  return (
    !!hostname &&
    !hostname.includes("localhost") &&
    !hostname.includes(".tpdemo.in") &&
    !hostname.includes("app.knnect360.com")
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

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
