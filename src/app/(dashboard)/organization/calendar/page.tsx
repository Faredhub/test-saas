import { getCalendarEvents } from "@/lib/actions/organization";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isGoogleCalendarConfigured, getGoogleAuthUrl } from "@/lib/google-calendar";
import { isOutlookCalendarConfigured, getOutlookAuthUrl } from "@/lib/outlook-calendar";
import { CalendarClient } from "./calendar-client";
import { headers } from "next/headers";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const events = await getCalendarEvents();

  // Build sync configuration for the client
  const googleConfigured = isGoogleCalendarConfigured();
  const outlookConfigured = isOutlookCalendarConfigured();

  let googleConnected = false;
  let outlookConnected = false;
  let googleAuthUrl: string | null = null;
  let outlookAuthUrl: string | null = null;

  if (googleConfigured || outlookConfigured) {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session?.user as any)?.id as string | undefined;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });
      const settings = (user?.settings as Record<string, unknown>) ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      googleConnected = !!(settings.googleCalendar as any)?.refreshToken;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outlookConnected = !!(settings.outlookCalendar as any)?.refreshToken;

      const headersList = await headers();
      const host = headersList.get("host") || "localhost:3000";
      const protocol = headersList.get("x-forwarded-proto") || "http";
      const origin = `${protocol}://${host}`;

      if (googleConfigured && !googleConnected) {
        googleAuthUrl = getGoogleAuthUrl(
          `${origin}/api/integrations/google-calendar/callback`,
          userId
        );
      }
      if (outlookConfigured && !outlookConnected) {
        outlookAuthUrl = getOutlookAuthUrl(
          `${origin}/api/integrations/outlook-calendar/callback`,
          userId
        );
      }
    }
  }

  const syncConfig = {
    googleConfigured,
    outlookConfigured,
    googleConnected,
    outlookConnected,
    googleAuthUrl,
    outlookAuthUrl,
  };

  return <CalendarClient initialData={events} syncConfig={syncConfig} />;
}
