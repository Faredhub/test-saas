/**
 * Social media posting integrations.
 * Each platform gracefully returns an error when credentials are missing.
 */

export type SocialPlatform = "facebook" | "linkedin" | "twitter";

export type PostResult = {
  success: boolean;
  postId?: string;
  error?: string;
};

/**
 * Returns the list of platforms that have their API credentials configured.
 */
export function getConfiguredPlatforms(): SocialPlatform[] {
  const platforms: SocialPlatform[] = [];
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN)
    platforms.push("facebook");
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
    platforms.push("linkedin");
  if (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET)
    platforms.push("twitter");
  return platforms;
}

/**
 * Post a message to a Facebook Page using the Page Access Token.
 */
export async function postToFacebook(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID || "me";
  if (!pageToken) return { success: false, error: "Facebook not configured" };

  try {
    const endpoint = imageUrl
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const body: Record<string, string> = {
      access_token: pageToken,
    };
    if (imageUrl) {
      body.url = imageUrl;
      body.caption = message;
    } else {
      body.message = message;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, postId: data.id || data.post_id };
    }
    const err = await res.text();
    return { success: false, error: `Facebook API error: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Post a message to LinkedIn using the OAuth access token.
 * Requires LINKEDIN_ACCESS_TOKEN (user or organization token) and optionally LINKEDIN_PERSON_URN.
 */
export async function postToLinkedIn(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!accessToken || !personUrn)
    return { success: false, error: "LinkedIn not configured" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: message },
          shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
          ...(imageUrl
            ? {
                media: [
                  {
                    status: "READY",
                    originalUrl: imageUrl,
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, postId: data.id };
    }
    const err = await res.text();
    return { success: false, error: `LinkedIn API error: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Post a tweet using Twitter API v2 with OAuth 1.0a (Bearer token approach).
 * Requires TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET.
 */
export async function postToTwitter(message: string): Promise<PostResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret) return { success: false, error: "Twitter not configured" };
  if (!accessToken || !accessSecret)
    return { success: false, error: "Twitter access tokens not configured" };

  try {
    // Use OAuth 2.0 Bearer Token for v2 endpoint
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      return { success: false, error: "Twitter bearer token not configured" };
    }

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: message }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, postId: data.data?.id };
    }
    const err = await res.text();
    return { success: false, error: `Twitter API error: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
