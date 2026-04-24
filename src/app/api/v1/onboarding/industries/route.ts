import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;

    const templates = await prisma.industryTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    });

    // Group by industry
    const grouped: Record<string, typeof templates> = {};
    templates.forEach((t) => {
      if (!grouped[t.industry]) grouped[t.industry] = [];
      grouped[t.industry].push(t);
    });

    return apiSuccess(grouped);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Internal server error", 500);
  }
}
