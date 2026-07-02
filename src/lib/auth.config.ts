import type { NextAuthConfig } from "next-auth";
import { normalizeUrlEnv } from "./env";

// NextAuth v5 (Auth.js) dynamically infers the absolute URL from the incoming request
// (protocol, host, port) as long as AUTH_URL / NEXTAUTH_URL are not set to absolute values.
// To prevent URL mismatch errors when running on dynamic ports (like 3001) or behind
// workspace reverse proxies, we delete/unset these absolute environment variables.
delete process.env.AUTH_URL;
delete process.env.NEXTAUTH_URL;

// Ensure AUTH_SECRET is set for Auth.js v5 (especially in Edge/middleware)
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}

// Trust host to prevent mismatch errors behind proxies or when running dynamic hosts
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

export const authConfig = {
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
