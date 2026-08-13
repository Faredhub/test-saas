import { NextRequest, NextResponse } from "next/server";
import { createSocialPost, getSocialPosts } from "@/lib/actions/social";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  try {
    const posts = await getSocialPosts(status);
    return NextResponse.json({ success: true, data: posts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createSocialPost(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create post" }, { status: 400 });
  }
}
