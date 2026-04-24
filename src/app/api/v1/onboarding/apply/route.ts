import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { applyIndustryTemplate } from "@/lib/actions/industry";

export async function POST(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const body = await req.json();
    const { templateId } = body;

    if (!templateId || typeof templateId !== "string") {
      return apiError("templateId is required", 400);
    }

    const result = await applyIndustryTemplate(user.tenantId, templateId);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Internal server error", 500);
  }
}
