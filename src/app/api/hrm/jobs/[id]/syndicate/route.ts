import { NextRequest, NextResponse } from "next/server";
import { syndicateJobToPortals } from "@/lib/actions/job-syndication";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await syndicateJobToPortals({
      jobId: id,
      portalIds: body.portalIds || [],
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Syndication failed" }, { status: 400 });
  }
}
