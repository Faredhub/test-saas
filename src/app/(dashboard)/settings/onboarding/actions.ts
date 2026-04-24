"use server";

import { auth } from "@/lib/auth";
import { applyIndustryTemplate } from "@/lib/actions/industry";

/**
 * Thin wrapper so the client component does not need to know its own tenantId.
 * The underlying action validates that the caller owns the tenant.
 */
export async function applyOnboardingTemplate(templateId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId as string;

  return applyIndustryTemplate(tenantId, templateId);
}
