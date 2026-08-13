import { NextResponse } from "next/server";
import { getSocialConnections } from "@/lib/actions/social";

export async function GET() {
  try {
    const connections = await getSocialConnections();
    return NextResponse.json({ success: true, data: connections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch connections" }, { status: 401 });
  }
}
