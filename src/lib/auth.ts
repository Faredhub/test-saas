import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { logAudit, getRequestInfo } from "./audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    }),
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
