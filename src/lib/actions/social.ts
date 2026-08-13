"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { logAudit, getRequestInfo } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  postToFacebook,
  postToInstagram,
  postToLinkedIn,
  postToTwitter,
} from "@/lib/social-media";

type AuthUser = { id: string; tenantId: string };

async function getAuthUser(): Promise<AuthUser> {
  const session = await auth();
  const user = session?.user as AuthUser | undefined;
  if (!user || !user.tenantId || !user.id) {
    throw new Error("Unauthorized");
  }
  return user;
}

export type SocialConnectionDTO = {
  id: string;
  provider: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TWITTER";
  accountId: string;
  accountName: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "EXPIRED" | "DISCONNECTED" | "ERROR";
  createdAt: Date;
};

export async function getSocialConnections(): Promise<SocialConnectionDTO[]> {
  const user = await getAuthUser();

  const connections = await prisma.socialConnection.findMany({
    where: { tenantId: user.tenantId, status: { not: "DISCONNECTED" } },
    select: {
      id: true,
      provider: true,
      accountId: true,
      accountName: true,
      avatarUrl: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return connections;
}

export async function disconnectSocialAccount(connectionId: string) {
  const user = await getAuthUser();

  const conn = await prisma.socialConnection.findFirst({
    where: { id: connectionId, tenantId: user.tenantId },
  });
  if (!conn) throw new Error("Social connection not found");

  await prisma.socialConnection.update({
    where: { id: connectionId },
    data: { status: "DISCONNECTED" },
  });

  const reqInfo = await getRequestInfo();
  logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "SOCIAL_ACCOUNT_DISCONNECTED",
    entity: "SocialConnection",
    entityId: connectionId,
    metadata: { provider: conn.provider, accountName: conn.accountName },
    ipAddress: reqInfo.ipAddress,
    userAgent: reqInfo.userAgent,
  });

  revalidatePath("/marketing/social");
  revalidatePath("/marketing/social/accounts");
  return { success: true };
}

export async function createSocialPost(data: {
  content: string;
  mediaUrls?: string[];
  connectionIds: string[];
  scheduledAt?: string | null;
  publishNow?: boolean;
}) {
  const user = await getAuthUser();

  const reqInfo = await getRequestInfo();
  const rl = await rateLimit(`rl:social:post:${user.id}`, 20, 60);
  if (!rl.allowed) throw new Error("Rate limit exceeded. Please wait a moment.");

  if (!data.content || data.content.trim() === "") {
    throw new Error("Post content cannot be empty.");
  }
  if (!data.connectionIds || data.connectionIds.length === 0) {
    throw new Error("Select at least one social account.");
  }

  // Fetch target connections within tenant scope
  const connections = await prisma.socialConnection.findMany({
    where: {
      id: { in: data.connectionIds },
      tenantId: user.tenantId,
      status: "ACTIVE",
    },
  });

  if (connections.length === 0) {
    throw new Error("No active social connections selected.");
  }

  const isScheduled = !!data.scheduledAt && !data.publishNow;
  const initialStatus = data.publishNow
    ? "PUBLISHING"
    : isScheduled
    ? "SCHEDULED"
    : "DRAFT";

  const post = await prisma.socialPost.create({
    data: {
      tenantId: user.tenantId,
      content: data.content,
      mediaUrls: data.mediaUrls || [],
      status: initialStatus,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      createdById: user.id,
      targets: {
        create: connections.map((c) => ({
          tenantId: user.tenantId,
          connectionId: c.id,
          provider: c.provider,
          status: "PENDING",
        })),
      },
    },
    include: { targets: true },
  });

  logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: isScheduled ? "SOCIAL_POST_SCHEDULED" : "SOCIAL_POST_CREATED",
    entity: "SocialPost",
    entityId: post.id,
    metadata: {
      targetCount: connections.length,
      providers: connections.map((c) => c.provider),
      scheduledAt: data.scheduledAt,
    },
    ipAddress: reqInfo.ipAddress,
    userAgent: reqInfo.userAgent,
  });

  if (data.publishNow) {
    await executePublishPost(post.id, user.tenantId, user.id);
  }

  revalidatePath("/marketing/social");
  revalidatePath("/marketing/social/create");
  revalidatePath("/marketing/social/scheduled");
  revalidatePath("/marketing/social/published");

  return { success: true, postId: post.id };
}

export async function executePublishPost(postId: string, tenantId: string, userId?: string) {
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, tenantId },
    include: {
      targets: {
        include: { connection: true },
      },
    },
  });

  if (!post) throw new Error("Social post not found");

  const reqInfo = await getRequestInfo();
  let successCount = 0;
  let failCount = 0;

  for (const target of post.targets) {
    if (target.status === "PUBLISHED") {
      successCount++;
      continue;
    }

    await prisma.socialPostTarget.update({
      where: { id: target.id },
      data: { status: "PUBLISHING" },
    });

    const conn = target.connection;
    let token = "";
    try {
      token = conn.encryptedAccessToken ? decryptSecret(conn.encryptedAccessToken) : "";
    } catch {
      token = "";
    }

    const imageUrl = post.mediaUrls?.[0] || undefined;
    let result: { success: boolean; postId?: string; error?: string } = { success: false };

    if (target.provider === "FACEBOOK") {
      result = await postToFacebook(post.content, imageUrl);
    } else if (target.provider === "INSTAGRAM") {
      result = await postToInstagram(post.content, imageUrl);
    } else if (target.provider === "LINKEDIN") {
      result = await postToLinkedIn(post.content, imageUrl);
    } else if (target.provider === "TWITTER") {
      result = await postToTwitter(post.content);
    }

    if (result.success) {
      successCount++;
      await prisma.socialPostTarget.update({
        where: { id: target.id },
        data: {
          status: "PUBLISHED",
          externalPostId: result.postId || null,
          errorMessage: null,
          publishedAt: new Date(),
        },
      });
    } else {
      failCount++;
      await prisma.socialPostTarget.update({
        where: { id: target.id },
        data: {
          status: "FAILED",
          errorMessage: result.error || "Publishing failed",
        },
      });
    }
  }

  const finalStatus =
    failCount === 0
      ? "PUBLISHED"
      : successCount > 0
      ? "PARTIALLY_PUBLISHED"
      : "FAILED";

  await prisma.socialPost.update({
    where: { id: post.id },
    data: {
      status: finalStatus,
      publishedAt: successCount > 0 ? new Date() : null,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: finalStatus === "FAILED" ? "SOCIAL_POST_FAILED" : "SOCIAL_POST_PUBLISHED",
    entity: "SocialPost",
    entityId: post.id,
    metadata: { finalStatus, successCount, failCount },
    ipAddress: reqInfo.ipAddress,
    userAgent: reqInfo.userAgent,
  });

  return { success: true, finalStatus, successCount, failCount };
}

export async function retrySocialPostTarget(targetId: string) {
  const user = await getAuthUser();

  const target = await prisma.socialPostTarget.findFirst({
    where: { id: targetId, tenantId: user.tenantId },
    include: { post: true, connection: true },
  });

  if (!target) throw new Error("Target not found");

  return executePublishPost(target.postId, user.tenantId, user.id);
}

export async function getSocialPosts(statusFilter?: string) {
  const user = await getAuthUser();

  const whereClause: Record<string, unknown> = { tenantId: user.tenantId };
  if (statusFilter === "SCHEDULED") whereClause.status = "SCHEDULED";
  if (statusFilter === "PUBLISHED") whereClause.status = { in: ["PUBLISHED", "PARTIALLY_PUBLISHED"] };
  if (statusFilter === "DRAFT") whereClause.status = "DRAFT";

  const posts = await prisma.socialPost.findMany({
    where: whereClause,
    include: {
      targets: {
        include: {
          connection: {
            select: { accountName: true, provider: true, avatarUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts;
}

export async function getSocialAnalytics() {
  const user = await getAuthUser();

  const [totalPosts, publishedPosts, totalConnections, targets] = await Promise.all([
    prisma.socialPost.count({ where: { tenantId: user.tenantId } }),
    prisma.socialPost.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ["PUBLISHED", "PARTIALLY_PUBLISHED"] },
      },
    }),
    prisma.socialConnection.count({
      where: { tenantId: user.tenantId, status: "ACTIVE" },
    }),
    prisma.socialPostTarget.findMany({
      where: { tenantId: user.tenantId },
      select: { provider: true, status: true },
    }),
  ]);

  const providerStats: Record<string, { total: number; success: number; failed: number }> = {};
  targets.forEach((t) => {
    if (!providerStats[t.provider]) {
      providerStats[t.provider] = { total: 0, success: 0, failed: 0 };
    }
    providerStats[t.provider].total++;
    if (t.status === "PUBLISHED") providerStats[t.provider].success++;
    if (t.status === "FAILED") providerStats[t.provider].failed++;
  });

  return {
    totalPosts,
    publishedPosts,
    totalConnections,
    providerStats,
  };
}
