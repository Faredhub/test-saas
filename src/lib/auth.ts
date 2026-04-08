import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { logAudit, getRequestInfo } from "./audit";
import { rateLimit } from "./rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [MicrosoftEntraID({
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Capture request info for audit trail (AUTH-010)
        const reqInfo = await getRequestInfo();

        // Rate limit login attempts: 10 per IP per minute (CRIT-01)
        const loginIp = reqInfo.ipAddress || "unknown";
        const { allowed } = await rateLimit(`rl:login:${loginIp}`, 10, 60);
        if (!allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findFirst({
          where: { email },
          include: {
            roleAssignments: {
              include: { role: true },
            },
            tenant: true,
          },
        });

        if (!user || !user.passwordHash) {
          // Log failed login attempt for user without password
          if (user) {
            logAudit({
              tenantId: user.tenantId,
              userId: user.id,
              action: "user.login.failed",
              entity: "User",
              entityId: user.id,
              metadata: { reason: "no_password", email },
              ipAddress: reqInfo.ipAddress,
              userAgent: reqInfo.userAgent,
            });
          }
          return null;
        }

        // Check account lockout (AUTH-009)
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          logAudit({
            tenantId: user.tenantId,
            userId: user.id,
            action: "user.login.locked",
            entity: "User",
            entityId: user.id,
            metadata: { lockedUntil: user.lockedUntil.toISOString() },
            ipAddress: reqInfo.ipAddress,
            userAgent: reqInfo.userAgent,
          });
          throw new Error("Account is locked. Please try again later.");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          // Increment failed login attempts
          const attempts = user.failedLoginAttempts + 1;
          const lockout = attempts >= 5 ? { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) } : {};

          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: attempts, ...lockout },
          });

          // Log failed login attempt (AUTH-010)
          logAudit({
            tenantId: user.tenantId,
            userId: user.id,
            action: "user.login.failed",
            entity: "User",
            entityId: user.id,
            metadata: {
              reason: "invalid_password",
              failedAttempts: attempts,
              deviceType: reqInfo.deviceType,
            },
            ipAddress: reqInfo.ipAddress,
            userAgent: reqInfo.userAgent,
          });

          return null;
        }

        // Reset failed attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: reqInfo.ipAddress ?? null,
          },
        });

        // Log successful login (AUTH-010)
        logAudit({
          tenantId: user.tenantId,
          userId: user.id,
          action: "user.login",
          entity: "User",
          entityId: user.id,
          metadata: {
            provider: "credentials",
            deviceType: reqInfo.deviceType,
          },
          ipAddress: reqInfo.ipAddress,
          userAgent: reqInfo.userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
          roles: user.roleAssignments.map((ra) => ra.role.name),
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      // Log OAuth sign-ins (Google, Microsoft, etc.) — credentials logins are logged in authorize()
      if (account?.provider && account.provider !== "credentials" && user?.id) {
        const reqInfo = await getRequestInfo();
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true },
        });

        if (dbUser) {
          // Update last login IP
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastLoginIp: reqInfo.ipAddress ?? null,
            },
          });

          logAudit({
            tenantId: dbUser.tenantId,
            userId: user.id,
            action: "user.login",
            entity: "User",
            entityId: user.id,
            metadata: {
              provider: account.provider,
              deviceType: reqInfo.deviceType,
            },
            ipAddress: reqInfo.ipAddress,
            userAgent: reqInfo.userAgent,
          });
        }
      }
    },
    async signOut(message) {
      // Handle both JWT and session-based signOut
      const userId = "token" in message
        ? (message.token?.id as string | undefined)
        : message.session?.userId;

      if (userId) {
        const reqInfo = await getRequestInfo();
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true },
        });

        if (dbUser) {
          logAudit({
            tenantId: dbUser.tenantId,
            userId,
            action: "user.logout",
            entity: "User",
            entityId: userId,
            metadata: { deviceType: reqInfo.deviceType },
            ipAddress: reqInfo.ipAddress,
            userAgent: reqInfo.userAgent,
          });
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as Record<string, unknown>).tenantId as string;
        token.tenantSlug = (user as Record<string, unknown>).tenantSlug as string;
        token.roles = (user as Record<string, unknown>).roles as string[];
        token.lastChecked = Date.now();
      }

      // HIGH-07: Periodically verify user status and password changes (every 5 minutes)
      if (token.id) {
        const now = Date.now();
        const lastChecked = (token.lastChecked as number) ?? 0;
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (now - lastChecked >= FIVE_MINUTES) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { passwordChangedAt: true, status: true },
          });
          if (dbUser?.status !== "ACTIVE") return null;
          if (dbUser?.passwordChangedAt) {
            const tokenIssuedAt = new Date((token.iat as number) * 1000);
            if (dbUser.passwordChangedAt > tokenIssuedAt) return null;
          }
          token.lastChecked = now;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = session.user as any;
        user.tenantId = token.tenantId;
        user.tenantSlug = token.tenantSlug;
        user.roles = token.roles;
      }
      return session;
    },
  },
});
