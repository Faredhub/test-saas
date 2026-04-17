import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("tenant");

    // Find tenant by slug, or fall back to the first tenant
    let tenant;
    if (tenantSlug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, name: true, slug: true, domain: true },
      });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, slug: true, domain: true },
      });
    }

    if (!tenant) {
      return new NextResponse("No tenant found", { status: 404 });
    }

    // Fetch published blog posts for this tenant
    const posts = await prisma.blogPost.findMany({
      where: {
        tenantId: tenant.id,
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      include: {
        author: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const siteUrl = tenant.domain
      ? `https://${tenant.domain}`
      : `https://${tenant.slug}.example.com`;

    const lastBuildDate =
      posts.length > 0 && posts[0].publishedAt
        ? posts[0].publishedAt.toUTCString()
        : new Date().toUTCString();

    const items = posts
      .map((post) => {
        const authorName =
          post.author?.name ||
          [post.author?.firstName, post.author?.lastName]
            .filter(Boolean)
            .join(" ") ||
          "Unknown";

        const pubDate = post.publishedAt
          ? post.publishedAt.toUTCString()
          : post.createdAt.toUTCString();

        const description = post.excerpt || post.content.slice(0, 300);
        const link = `${siteUrl}/blog/${post.slug}`;

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(authorName)}</author>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(tenant.name)} Blog</title>
    <description>Latest posts from ${escapeXml(tenant.name)}</description>
    <link>${escapeXml(siteUrl)}</link>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/api/rss${tenantSlug ? `?tenant=${escapeXml(tenantSlug)}` : ""}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("RSS feed error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
