/**
 * Microsoft Outlook / Graph API calendar integration.
 * All functions gracefully return null/empty when credentials are not configured.
 */

export function isOutlookCalendarConfigured(): boolean {
  return !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);
}

/**
 * Build the Azure AD OAuth consent URL for calendar access.
 */
export function getOutlookAuthUrl(redirectUri: string, userId: string): string | null {
  if (!isOutlookCalendarConfigured()) return null;

  const params = new URLSearchParams({
    client_id: process.env.AZURE_AD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid offline_access Calendars.ReadWrite",
    response_mode: "query",
    state: userId,
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeOutlookCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  if (!isOutlookCalendarConfigured()) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: "openid offline_access Calendars.ReadWrite",
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshOutlookToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  if (!isOutlookCalendarConfigured()) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      scope: "openid offline_access Calendars.ReadWrite",
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

type CalendarEventInput = {
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
};

type SyncResult = { success: boolean; outlookEventId?: string; error?: string };

/**
 * Push local CalendarEvent records to the user's Outlook Calendar.
 */
export async function syncEventsToOutlook(
  accessToken: string,
  events: CalendarEventInput[]
): Promise<SyncResult[]> {
  if (!accessToken) return events.map(() => ({ success: false, error: "No access token" }));

  const results: SyncResult[] = [];

  for (const event of events) {
    try {
      const body = {
        subject: event.title,
        body: event.description
          ? { contentType: "Text", content: event.description }
          : undefined,
        location: event.location ? { displayName: event.location } : undefined,
        start: {
          dateTime: new Date(event.startTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(event.endTime).toISOString(),
          timeZone: "UTC",
        },
      };

      const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        results.push({ success: true, outlookEventId: data.id });
      } else {
        const err = await res.text();
        results.push({ success: false, error: err });
      }
    } catch (e) {
      results.push({ success: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  return results;
}

type OutlookEvent = {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
};

/**
 * Fetch events from the user's Outlook Calendar within a time range.
 */
export async function fetchOutlookEvents(
  accessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<OutlookEvent[]> {
  if (!accessToken) return [];

  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    $orderby: "start/dateTime",
    $top: "100",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarview?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.value ?? [];
}
