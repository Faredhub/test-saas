/**
 * Google Calendar integration.
 * All functions gracefully return null/empty when credentials are not configured.
 */

export function isGoogleCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Build the Google OAuth consent URL for calendar access.
 */
export function getGoogleAuthUrl(redirectUri: string, userId: string): string | null {
  if (!isGoogleCalendarConfigured()) return null;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
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

type SyncResult = { success: boolean; googleEventId?: string; error?: string };

/**
 * Push local CalendarEvent records to the user's Google Calendar.
 */
export async function syncEventsToGoogle(
  accessToken: string,
  events: CalendarEventInput[]
): Promise<SyncResult[]> {
  if (!accessToken) return events.map(() => ({ success: false, error: "No access token" }));

  const results: SyncResult[] = [];

  for (const event of events) {
    try {
      const body = {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: { dateTime: new Date(event.startTime).toISOString() },
        end: { dateTime: new Date(event.endTime).toISOString() },
      };

      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        const data = await res.json();
        results.push({ success: true, googleEventId: data.id });
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

type GoogleEvent = {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
};

/**
 * Fetch events from the user's Google Calendar within a time range.
 */
export async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  if (!accessToken) return [];

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}
