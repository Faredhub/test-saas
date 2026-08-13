import { NextRequest, NextResponse } from "next/server";
import { testJobPortalConnection } from "@/lib/actions/job-syndication";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await testJobPortalConnection(id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Test failed" }, { status: 400 });
  }
}
