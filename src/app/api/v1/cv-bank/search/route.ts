import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const body = await req.json();
    const keywords: string[] = body.keywords ?? [];
    const minExperience: number | undefined = body.minExperience;
    const requiredSkills: string[] = body.skills ?? [];
    const requiredCerts: string[] = body.certifications ?? [];

    if (!keywords.length && !requiredSkills.length && !requiredCerts.length) {
      return apiError("Provide at least one of: keywords, skills, or certifications.", 400);
    }

    const allCVs = await prisma.cVRecord.findMany({
      where: {
        ...tenantScope(tenantId),
        isActive: true,
        ...(minExperience ? { experience: { gte: minExperience } } : {}),
      },
      orderBy: { experience: "desc" },
    });

    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const lowerSkills = requiredSkills.map((s) => s.toLowerCase());
    const lowerCerts = requiredCerts.map((c) => c.toLowerCase());

    // Score each CV by how well it matches the search criteria
    const scored = allCVs.map((cv) => {
      let score = 0;
      const cvSkills = ((cv.skills as string[]) ?? []).map((s) => s.toLowerCase());
      const cvCerts = ((cv.certifications as string[]) ?? []).map((c) => c.toLowerCase());
      const cvKeywords = ((cv.keywords as string[]) ?? []).map((k) => k.toLowerCase());
      const qualText = (cv.qualifications ?? "").toLowerCase();

      // Keyword matching (1 point each)
      lowerKeywords.forEach((kw) => {
        if (cvSkills.some((s) => s.includes(kw))) score += 1;
        if (cvCerts.some((c) => c.includes(kw))) score += 1;
        if (cvKeywords.some((k) => k.includes(kw))) score += 1;
        if (qualText.includes(kw)) score += 1;
      });

      // Skill matching (2 points each)
      lowerSkills.forEach((sk) => {
        if (cvSkills.some((s) => s.includes(sk))) score += 2;
      });

      // Certification matching (2 points each)
      lowerCerts.forEach((ct) => {
        if (cvCerts.some((c) => c.includes(ct))) score += 2;
      });

      return { ...cv, matchScore: score };
    });

    const results = scored
      .filter((cv) => cv.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return apiSuccess(results);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/cv-bank/search] POST error:", error);
    return apiError("Internal server error.", 500);
  }
}
