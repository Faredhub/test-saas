import type { NextAuthConfig } from "next-auth";
import { normalizeUrlEnv } from "./env";

// NextAuth v5 (Auth.js) environment configuration
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET =
    process.env.NEXTAUTH_SECRET ||
    "tixeltech-dev-secret-key-super-secure-random-string-for-local-development-2026";
}

if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

if (process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.AUTH_URL.replace(/\/api\/auth\/?$/, "");
}
if (process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL.replace(/\/api\/auth\/?$/, "");
}
if (!process.env.AUTH_URL && process.env.NEXTAUTH_URL) {
  process.env.AUTH_URL = process.env.NEXTAUTH_URL;
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
      const publicPaths = ["/login", "/register", "/forgot-password", "/verify", "/preview"];
      if (publicPaths.some((p) => pathname.startsWith(p))) {
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
