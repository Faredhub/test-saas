import { NextRequest, NextResponse } from "next/server";
import { createSocialPost } from "@/lib/actions/social";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createSocialPost({ ...body, publishNow: false });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Scheduling failed" }, { status: 400 });
  }
}
