import type { NextAuthConfig } from "next-auth";
import { normalizeUrlEnv } from "./env";

// NextAuth v5 (Auth.js) dynamically infers the absolute URL from the incoming request
// (protocol, host, port) as long as AUTH_URL / NEXTAUTH_URL are not set to absolute values.
// To prevent URL mismatch errors when running on dynamic ports (like 3001) or behind
// workspace reverse proxies, we delete/unset these variables in local development.
const nextAuthUrl = process.env.NEXTAUTH_URL || "";
const authUrl = process.env.AUTH_URL || "";

const isLocalUrl = (url: string) => {
  return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("0.0.0.0");
};

// If NEXTAUTH_URL is defined and is a production URL, but AUTH_URL is missing or local, set AUTH_URL for NextAuth v5
if (nextAuthUrl && !isLocalUrl(nextAuthUrl) && (!authUrl || isLocalUrl(authUrl))) {
  process.env.AUTH_URL = `${nextAuthUrl.replace(/\/$/, "")}/api/auth`;
}

// In local development, delete NEXTAUTH_URL and AUTH_URL to allow dynamic port detection
if (isLocalUrl(process.env.AUTH_URL || "")) {
  delete process.env.AUTH_URL;
}
if (isLocalUrl(process.env.NEXTAUTH_URL || "")) {
  delete process.env.NEXTAUTH_URL;
}

// Ensure AUTH_SECRET is set for Auth.js v5 (especially in Edge/middleware)
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}

// Trust host to prevent mismatch errors behind proxies or when running dynamic hosts
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "tixeltech-dev-secret-key-super-secure-random-string-for-local-development-2026",
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [], // Configured in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isLoggedIn = !!auth;

      // Allow all API routes to bypass NextAuth's automatic redirect,
      // so route handlers can respond with proper JSON/401 instead of HTML redirects
      if (pathname.startsWith("/api")) {
        return true;
      }

      // Allow public paths to bypass automatic redirect
      const publicPaths = ["/login", "/register", "/forgot-password", "/verify"];
      if (publicPaths.some((p) => pathname.startsWith(p))) {
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
