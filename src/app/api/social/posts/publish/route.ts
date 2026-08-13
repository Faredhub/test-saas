import { NextRequest, NextResponse } from "next/server";
import { executePublishPost } from "@/lib/actions/social";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id: string; tenantId: string } | undefined;
  if (!user?.tenantId || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

    const result = await executePublishPost(postId, user.tenantId, user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Publishing failed" }, { status: 400 });
  }
}
