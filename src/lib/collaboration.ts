// Server-only utility module (no "use server" directive — contains non-async const values)

import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

const LOCK_TIMEOUT_MS = 30_000; // 30 seconds

export async function checkDocumentVersion(docId: string): Promise<{
  version: number;
  lastEditedBy: string | null;
  lastEditedByName: string | null;
  updatedAt: Date;
}> {
  const { tenantId } = await getSessionOrThrow();

  const doc = await prisma.officeDocument.findFirst({
    where: { id: docId, ...tenantScope(tenantId) },
    select: {
      version: true,
      lastEditedById: true,
      updatedAt: true,
    },
  });

  if (!doc) throw new Error("Document not found");

  let lastEditedByName: string | null = null;
  if (doc.lastEditedById) {
    const user = await prisma.user.findUnique({
      where: { id: doc.lastEditedById },
      select: { name: true, email: true },
    });
    lastEditedByName = user?.name ?? user?.email ?? null;
  }

  return {
    version: doc.version,
    lastEditedBy: doc.lastEditedById,
    lastEditedByName,
    updatedAt: doc.updatedAt,
  };
}

export async function acquireEditLock(
  docId: string
): Promise<{ acquired: boolean; heldByName?: string }> {
  const { userId, tenantId } = await getSessionOrThrow();

  const doc = await prisma.officeDocument.findFirst({
    where: { id: docId, ...tenantScope(tenantId) },
    select: { lastEditedById: true, updatedAt: true },
  });

  if (!doc) throw new Error("Document not found");

  const timeSinceEdit = Date.now() - new Date(doc.updatedAt).getTime();
  const isLocked =
    doc.lastEditedById &&
    doc.lastEditedById !== userId &&
    timeSinceEdit < LOCK_TIMEOUT_MS;

  if (isLocked) {
    const holder = await prisma.user.findUnique({
      where: { id: doc.lastEditedById! },
      select: { name: true, email: true },
    });
    return {
      acquired: false,
      heldByName: holder?.name ?? holder?.email ?? "Someone",
    };
  }

  // Acquire the lock by updating lastEditedById
  await prisma.officeDocument.update({
    where: { id: docId },
    data: { lastEditedById: userId },
  });

  return { acquired: true };
}

export async function releaseEditLock(docId: string): Promise<void> {
  const { userId, tenantId } = await getSessionOrThrow();

  const doc = await prisma.officeDocument.findFirst({
    where: { id: docId, ...tenantScope(tenantId) },
    select: { lastEditedById: true },
  });

  if (!doc) return;

  // Only release if we hold the lock
  if (doc.lastEditedById === userId) {
    await prisma.officeDocument.update({
      where: { id: docId },
      data: { lastEditedById: null },
    });
  }
}
