import { NextRequest, NextResponse } from "next/server";
import { exchangeOutlookCode, isOutlookCalendarConfigured } from "@/lib/outlook-calendar";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!isOutlookCalendarConfigured()) {
    return NextResponse.redirect(new URL("/organization/calendar?error=not_configured", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(
      new URL(`/organization/calendar?error=${error || "missing_params"}`, request.url)
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/integrations/outlook-calendar/callback`;
  const tokens = await exchangeOutlookCode(code, redirectUri);

  if (!tokens) {
    return NextResponse.redirect(
      new URL("/organization/calendar?error=token_exchange_failed", request.url)
    );
  }

  // Store the tokens in the user's settings JSON field
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const currentSettings = (user?.settings as Record<string, unknown>) ?? {};
  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: {
        ...currentSettings,
        outlookCalendar: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
        },
      },
    },
  });

  return NextResponse.redirect(
    new URL("/organization/calendar?success=outlook_connected", request.url)
  );
}
