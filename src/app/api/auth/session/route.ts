import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Explicit /api/auth/session route handler.
 *
 * Auth.js v5's catch-all [...nextauth] route intermittently returns 404 under
 * Next.js 16 + Turbopack, causing `ClientFetchError: Unexpected token '<'`
 * when the browser receives an HTML 404 page instead of JSON.
 *
 * This dedicated route guarantees the session endpoint always returns valid JSON .
 */
export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json(session ?? null, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[/api/auth/session] Error:", error);
    return NextResponse.json(null, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
