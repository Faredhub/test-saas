import { NextResponse } from "next/server";
import { getJobPortals } from "@/lib/actions/job-syndication";

export async function GET() {
  try {
    const portals = await getJobPortals();
    return NextResponse.json({ success: true, data: portals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status: 401 });
  }
}
