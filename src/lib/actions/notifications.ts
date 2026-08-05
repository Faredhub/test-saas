"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";

import { generateEventReminders } from "@/lib/actions/organization";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

export async function getNotifications(limit = 20) {
  const { userId, tenantId } = await getSessionOrThrow();

  try {
    await generateEventReminders();
  } catch {}

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { ...tenantScope(tenantId), userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { ...tenantScope(tenantId), userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationRead(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.notification.updateMany({
    where: { id, ...tenantScope(tenantId), userId },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.notification.updateMany({
    where: { ...tenantScope(tenantId), userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/");
}

export async function deleteNotification(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.notification.deleteMany({
    where: { id, ...tenantScope(tenantId), userId },
  });
  revalidatePath("/");
}
