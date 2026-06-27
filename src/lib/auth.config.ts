import type { NextAuthConfig } from "next-auth";
import { normalizeUrlEnv } from "./env";

const normalizedNextAuthUrl = normalizeUrlEnv(process.env.NEXTAUTH_URL || process.env.AUTH_URL);
if (normalizedNextAuthUrl) {
  process.env.NEXTAUTH_URL = normalizedNextAuthUrl;
  process.env.AUTH_URL = normalizedNextAuthUrl;
}

// Ensure AUTH_SECRET is set for Auth.js v5 (especially in Edge/middleware)
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [], // Configured in auth.ts
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
  },
} satisfies NextAuthConfig;
