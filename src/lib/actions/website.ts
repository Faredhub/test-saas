"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { PostStatus, ConvoStatus } from "@/generated/prisma/enums";

// ============================================================================
// Helpers
// ============================================================================

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ============================================================================
// WEB PAGES
// ============================================================================

export async function getPages() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.webPage.findMany({
    where: tenantScope(tenantId),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function createPage(data: {
  title: string;
  slug?: string;
  content?: unknown;
  metaTitle?: string;
  metaDesc?: string;
  isPublished?: boolean;
  sortOrder?: number;
  parentId?: string;
  templateId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const slug = data.slug || slugify(data.title);

  const page = await prisma.webPage.create({
    data: {
      tenantId,
      title: data.title,
      slug,
      content: (data.content as never) ?? [],
      metaTitle: data.metaTitle,
      metaDesc: data.metaDesc,
      isPublished: data.isPublished ?? false,
      sortOrder: data.sortOrder ?? 0,
      parentId: data.parentId,
      templateId: data.templateId,
      createdById: userId,
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "WebPage",
    entityId: page.id,
    metadata: { description: `Created page "${data.title}"` },
  });

  revalidatePath("/website/pages");
  return page;
}

export async function updatePage(
  id: string,
  data: {
    title?: string;
    slug?: string;
    content?: unknown;
    metaTitle?: string;
    metaDesc?: string;
    isPublished?: boolean;
    sortOrder?: number;
    parentId?: string | null;
    templateId?: string | null;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const page = await prisma.webPage.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.content !== undefined ? { content: data.content as never } : {}),
      ...(data.metaTitle !== undefined ? { metaTitle: data.metaTitle } : {}),
      ...(data.metaDesc !== undefined ? { metaDesc: data.metaDesc } : {}),
      ...(data.isPublished !== undefined
        ? { isPublished: data.isPublished }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.templateId !== undefined
        ? { templateId: data.templateId }
        : {}),
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "WebPage",
    entityId: id,
    metadata: { description: `Updated page "${page.title}"` },
  });

  revalidatePath("/website/pages");
  return page;
}

export async function deletePage(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const page = await prisma.webPage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!page) throw new Error("Page not found");

  await prisma.webPage.delete({ where: { id } });

  await logAudit({
    userId,
    tenantId,
    action: "DELETE",
    entity: "WebPage",
    entityId: id,
    metadata: { description: `Deleted page "${page.title}"` },
  });

  revalidatePath("/website/pages");
}

export async function togglePublishPage(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const page = await prisma.webPage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!page) throw new Error("Page not found");

  const updated = await prisma.webPage.update({
    where: { id },
    data: { isPublished: !page.isPublished },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "WebPage",
    entityId: id,
    metadata: { description: `${updated.isPublished ? "Published" : "Unpublished"} page "${page.title}"` },
  });

  revalidatePath("/website/pages");
  return updated;
}

export async function getPageById(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.webPage.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
}

// ============================================================================
// PAGE TEMPLATES
// ============================================================================

export async function getPageTemplates() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.pageTemplate.findMany({
    where: tenantScope(tenantId),
    orderBy: { createdAt: "desc" },
  });
}

export async function createPageTemplate(data: {
  name: string;
  thumbnail?: string;
  content?: unknown;
  category?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const template = await prisma.pageTemplate.create({
    data: {
      tenantId,
      name: data.name,
      thumbnail: data.thumbnail,
      content: (data.content as never) ?? [],
      category: data.category ?? "general",
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "PageTemplate",
    entityId: template.id,
    metadata: { description: `Created template "${data.name}"` },
  });

  revalidatePath("/website/pages");
  return template;
}

export async function deletePageTemplate(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const tpl = await prisma.pageTemplate.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!tpl) throw new Error("Template not found");

  await prisma.pageTemplate.delete({ where: { id } });

  await logAudit({
    userId,
    tenantId,
    action: "DELETE",
    entity: "PageTemplate",
    entityId: id,
    metadata: { description: `Deleted template "${tpl.name}"` },
  });

  revalidatePath("/website/pages");
}

// ============================================================================
// BLOG POSTS
// ============================================================================

export async function getBlogPosts(filters?: {
  status?: PostStatus;
  categoryId?: string;
  search?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters?.search
      ? {
          OR: [
            {
              title: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              excerpt: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  return prisma.blogPost.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBlogPost(data: {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string[];
  status?: PostStatus;
  seoTitle?: string;
  seoDesc?: string;
  allowComments?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const slug = data.slug || slugify(data.title);

  const post = await prisma.blogPost.create({
    data: {
      tenantId,
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage,
      categoryId: data.categoryId || null,
      tags: (data.tags as never) ?? [],
      status: data.status ?? "DRAFT",
      authorId: userId,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      seoTitle: data.seoTitle,
      seoDesc: data.seoDesc,
      allowComments: data.allowComments ?? true,
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "BlogPost",
    entityId: post.id,
    metadata: { description: `Created blog post "${data.title}"` },
  });

  revalidatePath("/website/blog");
  return post;
}

export async function updateBlogPost(
  id: string,
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    categoryId?: string | null;
    tags?: string[];
    status?: PostStatus;
    seoTitle?: string;
    seoDesc?: string;
    allowComments?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.coverImage !== undefined
        ? { coverImage: data.coverImage }
        : {}),
      ...(data.categoryId !== undefined
        ? { categoryId: data.categoryId }
        : {}),
      ...(data.tags !== undefined ? { tags: data.tags as never } : {}),
      ...(data.status !== undefined
        ? {
            status: data.status,
            ...(data.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
          }
        : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDesc !== undefined ? { seoDesc: data.seoDesc } : {}),
      ...(data.allowComments !== undefined
        ? { allowComments: data.allowComments }
        : {}),
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "BlogPost",
    entityId: id,
    metadata: { description: `Updated blog post "${post.title}"` },
  });

  revalidatePath("/website/blog");
  return post;
}

export async function deleteBlogPost(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const post = await prisma.blogPost.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!post) throw new Error("Blog post not found");

  await prisma.blogPost.delete({ where: { id } });

  await logAudit({
    userId,
    tenantId,
    action: "DELETE",
    entity: "BlogPost",
    entityId: id,
    metadata: { description: `Deleted blog post "${post.title}"` },
  });

  revalidatePath("/website/blog");
}

// ============================================================================
// BLOG CATEGORIES
// ============================================================================

export async function getBlogCategories() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.blogCategory.findMany({
    where: tenantScope(tenantId),
    include: { _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createBlogCategory(data: {
  name: string;
  slug?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const slug = data.slug || slugify(data.name);

  const cat = await prisma.blogCategory.create({
    data: { tenantId, name: data.name, slug },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "BlogCategory",
    entityId: cat.id,
    metadata: { description: `Created blog category "${data.name}"` },
  });

  revalidatePath("/website/blog");
  return cat;
}

// ============================================================================
// FORUM TOPICS
// ============================================================================

export async function getForumTopics(filters?: {
  category?: string;
  search?: string;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.search
      ? {
          title: {
            contains: filters.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  return prisma.forumTopic.findMany({
    where,
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createForumTopic(data: {
  title: string;
  body: string;
  category?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const topic = await prisma.forumTopic.create({
    data: {
      tenantId,
      title: data.title,
      body: data.body,
      category: data.category ?? "general",
      authorId: userId,
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "ForumTopic",
    entityId: topic.id,
    metadata: { description: `Created forum topic "${data.title}"` },
  });

  revalidatePath("/website/forum");
  return topic;
}

export async function addForumReply(
  topicId: string,
  data: { body: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const topic = await prisma.forumTopic.findFirst({
    where: { id: topicId, ...tenantScope(tenantId) },
  });
  if (!topic) throw new Error("Topic not found");
  if (topic.isLocked) throw new Error("Topic is locked");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replies = (topic.replies as any[]) || [];
  replies.push({
    id: crypto.randomUUID(),
    authorId: userId,
    authorName: user?.name ?? "Unknown",
    body: data.body,
    isBestAnswer: false,
    upvotes: 0,
    createdAt: new Date().toISOString(),
  });

  await prisma.forumTopic.update({
    where: { id: topicId },
    data: { replies: replies as never },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ForumTopic",
    entityId: topicId,
    metadata: { description: `Replied to forum topic "${topic.title}"` },
  });

  revalidatePath("/website/forum");
}

export async function togglePinTopic(topicId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const topic = await prisma.forumTopic.findFirst({
    where: { id: topicId, ...tenantScope(tenantId) },
  });
  if (!topic) throw new Error("Topic not found");

  const updated = await prisma.forumTopic.update({
    where: { id: topicId },
    data: { isPinned: !topic.isPinned },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ForumTopic",
    entityId: topicId,
    metadata: { description: `${updated.isPinned ? "Pinned" : "Unpinned"} topic "${topic.title}"` },
  });

  revalidatePath("/website/forum");
  return updated;
}

export async function toggleLockTopic(topicId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const topic = await prisma.forumTopic.findFirst({
    where: { id: topicId, ...tenantScope(tenantId) },
  });
  if (!topic) throw new Error("Topic not found");

  const updated = await prisma.forumTopic.update({
    where: { id: topicId },
    data: { isLocked: !topic.isLocked },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ForumTopic",
    entityId: topicId,
    metadata: { description: `${updated.isLocked ? "Locked" : "Unlocked"} topic "${topic.title}"` },
  });

  revalidatePath("/website/forum");
  return updated;
}

export async function upvoteTopic(topicId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const topic = await prisma.forumTopic.findFirst({
    where: { id: topicId, ...tenantScope(tenantId) },
  });
  if (!topic) throw new Error("Topic not found");

  await prisma.forumTopic.update({
    where: { id: topicId },
    data: { upvotes: { increment: 1 } },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ForumTopic",
    entityId: topicId,
    metadata: { description: `Upvoted topic "${topic.title}"` },
  });

  revalidatePath("/website/forum");
}

export async function markBestAnswer(topicId: string, replyId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const topic = await prisma.forumTopic.findFirst({
    where: { id: topicId, ...tenantScope(tenantId) },
  });
  if (!topic) throw new Error("Topic not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replies = (topic.replies as any[]) || [];
  const updatedReplies = replies.map((r) => ({
    ...r,
    isBestAnswer: r.id === replyId ? !r.isBestAnswer : false,
  }));

  await prisma.forumTopic.update({
    where: { id: topicId },
    data: { replies: updatedReplies as never },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ForumTopic",
    entityId: topicId,
    metadata: { description: `Marked best answer on topic "${topic.title}"` },
  });

  revalidatePath("/website/forum");
}

// ============================================================================
// FAQ ITEMS
// ============================================================================

export async function getFAQItems() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.fAQItem.findMany({
    where: tenantScope(tenantId),
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function createFAQItem(data: {
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  isPublished?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const item = await prisma.fAQItem.create({
    data: {
      tenantId,
      question: data.question,
      answer: data.answer,
      category: data.category ?? "general",
      sortOrder: data.sortOrder ?? 0,
      isPublished: data.isPublished ?? true,
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "FAQItem",
    entityId: item.id,
    metadata: { description: `Created FAQ "${data.question}"` },
  });

  revalidatePath("/website/faq");
  return item;
}

export async function updateFAQItem(
  id: string,
  data: {
    question?: string;
    answer?: string;
    category?: string;
    sortOrder?: number;
    isPublished?: boolean;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const item = await prisma.fAQItem.update({
    where: { id },
    data: {
      ...(data.question !== undefined ? { question: data.question } : {}),
      ...(data.answer !== undefined ? { answer: data.answer } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isPublished !== undefined
        ? { isPublished: data.isPublished }
        : {}),
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "FAQItem",
    entityId: id,
    metadata: { description: `Updated FAQ "${item.question}"` },
  });

  revalidatePath("/website/faq");
  return item;
}

export async function deleteFAQItem(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const item = await prisma.fAQItem.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!item) throw new Error("FAQ item not found");

  await prisma.fAQItem.delete({ where: { id } });

  await logAudit({
    userId,
    tenantId,
    action: "DELETE",
    entity: "FAQItem",
    entityId: id,
    metadata: { description: `Deleted FAQ "${item.question}"` },
  });

  revalidatePath("/website/faq");
}

export async function reorderFAQItems(items: { id: string; sortOrder: number }[]) {
  const { userId, tenantId } = await getSessionOrThrow();

  await Promise.all(
    items.map((item) =>
      prisma.fAQItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "FAQItem",
    entityId: "bulk",
    metadata: { description: `Reordered ${items.length} FAQ items` },
  });

  revalidatePath("/website/faq");
}

// ============================================================================
// CHAT WIDGETS
// ============================================================================

export async function getChatWidgets() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.chatWidget.findMany({
    where: tenantScope(tenantId),
    include: { _count: { select: { conversations: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createChatWidget(data: {
  name?: string;
  greeting?: string;
  color?: string;
  position?: string;
  isActive?: boolean;
  offlineMsg?: string;
  cannedResponses?: { shortcut: string; text: string }[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const widget = await prisma.chatWidget.create({
    data: {
      tenantId,
      name: data.name ?? "Support Chat",
      greeting: data.greeting ?? "Hi! How can we help you?",
      color: data.color ?? "#3b82f6",
      position: data.position ?? "bottom-right",
      isActive: data.isActive ?? true,
      offlineMsg: data.offlineMsg ?? "We're offline. Leave a message!",
      cannedResponses: (data.cannedResponses as never) ?? [],
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "CREATE",
    entity: "ChatWidget",
    entityId: widget.id,
    metadata: { description: `Created chat widget "${widget.name}"` },
  });

  revalidatePath("/website/chat");
  return widget;
}

export async function updateChatWidget(
  id: string,
  data: {
    name?: string;
    greeting?: string;
    color?: string;
    position?: string;
    isActive?: boolean;
    offlineMsg?: string;
    cannedResponses?: { shortcut: string; text: string }[];
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const widget = await prisma.chatWidget.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.greeting !== undefined ? { greeting: data.greeting } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.offlineMsg !== undefined
        ? { offlineMsg: data.offlineMsg }
        : {}),
      ...(data.cannedResponses !== undefined
        ? { cannedResponses: data.cannedResponses as never }
        : {}),
    },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ChatWidget",
    entityId: id,
    metadata: { description: `Updated chat widget "${widget.name}"` },
  });

  revalidatePath("/website/chat");
  return widget;
}

// ============================================================================
// CHAT CONVERSATIONS
// ============================================================================

export async function getChatConversations(filters?: {
  widgetId?: string;
  status?: ConvoStatus;
}) {
  const { tenantId } = await getSessionOrThrow();

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.widgetId ? { widgetId: filters.widgetId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };

  return prisma.chatConversation.findMany({
    where,
    include: {
      widget: { select: { name: true, color: true } },
      assignedTo: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function assignConversation(id: string, assignedToId: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const convo = await prisma.chatConversation.update({
    where: { id },
    data: { assignedToId, status: "ASSIGNED" },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ChatConversation",
    entityId: id,
    metadata: { description: `Assigned conversation to agent` },
  });

  revalidatePath("/website/chat");
  return convo;
}

export async function addChatMessage(
  id: string,
  data: { text: string; sender: string; isAgent: boolean }
) {
  const { userId, tenantId } = await getSessionOrThrow();
  const convo = await prisma.chatConversation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!convo) throw new Error("Conversation not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (convo.messages as any[]) || [];
  messages.push({
    sender: data.sender,
    text: data.text,
    timestamp: new Date().toISOString(),
    isAgent: data.isAgent,
  });

  await prisma.chatConversation.update({
    where: { id },
    data: { messages: messages as never },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ChatConversation",
    entityId: id,
    metadata: { description: `Sent message in conversation` },
  });

  revalidatePath("/website/chat");
}

export async function closeConversation(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.chatConversation.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ChatConversation",
    entityId: id,
    metadata: { description: `Closed conversation` },
  });

  revalidatePath("/website/chat");
}

export async function resolveConversation(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.chatConversation.update({
    where: { id },
    data: { status: "RESOLVED" },
  });

  await logAudit({
    userId,
    tenantId,
    action: "UPDATE",
    entity: "ChatConversation",
    entityId: id,
    metadata: { description: `Resolved conversation` },
  });

  revalidatePath("/website/chat");
}

// ============================================================================
// OVERVIEW STATS
// ============================================================================

export async function getWebsiteStats() {
  const { tenantId } = await getSessionOrThrow();
  const scope = tenantScope(tenantId);

  const [
    totalPages,
    publishedPages,
    totalPosts,
    publishedPosts,
    draftPosts,
    totalTopics,
    totalFAQs,
    publishedFAQs,
    totalWidgets,
    openConversations,
    totalConversations,
  ] = await Promise.all([
    prisma.webPage.count({ where: scope }),
    prisma.webPage.count({ where: { ...scope, isPublished: true } }),
    prisma.blogPost.count({ where: scope }),
    prisma.blogPost.count({ where: { ...scope, status: "PUBLISHED" } }),
    prisma.blogPost.count({ where: { ...scope, status: "DRAFT" } }),
    prisma.forumTopic.count({ where: scope }),
    prisma.fAQItem.count({ where: scope }),
    prisma.fAQItem.count({ where: { ...scope, isPublished: true } }),
    prisma.chatWidget.count({ where: scope }),
    prisma.chatConversation.count({
      where: { ...scope, status: { in: ["OPEN", "ASSIGNED"] } },
    }),
    prisma.chatConversation.count({ where: scope }),
  ]);

  return {
    totalPages,
    publishedPages,
    totalPosts,
    publishedPosts,
    draftPosts,
    totalTopics,
    totalFAQs,
    publishedFAQs,
    totalWidgets,
    openConversations,
    totalConversations,
  };
}
