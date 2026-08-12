/**
 * Social media posting integrations.
 * Each platform gracefully returns an error when credentials are missing.
 * Supported: Facebook, Instagram, Threads, X (Twitter), LinkedIn, TikTok, YouTube, Pinterest.
 */

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "threads"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest";

export type PostResult = {
  success: boolean;
  postId?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Credential checks
// ---------------------------------------------------------------------------

function hasEnv(...keys: string[]): boolean {
  return keys.every((k) => !!process.env[k]);
}

export function getConfiguredPlatforms(): SocialPlatform[] {
  const platforms: SocialPlatform[] = [];
  if (hasEnv("FACEBOOK_APP_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"))
    platforms.push("facebook");
  if (hasEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"))
    platforms.push("instagram");
  if (hasEnv("THREADS_ACCESS_TOKEN"))
    platforms.push("threads");
  if (hasEnv("TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_BEARER_TOKEN"))
    platforms.push("twitter");
  if (hasEnv("LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_URN"))
    platforms.push("linkedin");
  if (hasEnv("TIKTOK_ACCESS_TOKEN"))
    platforms.push("tiktok");
  if (hasEnv("YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"))
    platforms.push("youtube");
  if (hasEnv("PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"))
    platforms.push("pinterest");
  return platforms;
}

// ---------------------------------------------------------------------------
// Facebook (Graph API v18)
// ---------------------------------------------------------------------------

export async function postToFacebook(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID || "me";
  if (!pageToken) return { success: false, error: "Facebook Page Access Token not configured" };

  try {
    const endpoint = imageUrl
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const body: Record<string, string> = { access_token: pageToken };
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
    return { success: false, error: `Facebook: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Facebook request failed" };
  }
}

// ---------------------------------------------------------------------------
// Instagram (Graph API — media publish via connected IG Business Account)
// ---------------------------------------------------------------------------

export async function postToInstagram(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!igAccountId || !pageToken)
    return { success: false, error: "Instagram Business Account not configured" };

  try {
    // Step 1 — create media container
    const createUrl = `https://graph.facebook.com/v18.0/${igAccountId}/media`;
    const params = new URLSearchParams({
      access_token: pageToken,
      caption: message,
    });
    if (imageUrl) {
      params.set("image_url", imageUrl);
    }

    const createRes = await fetch(`${createUrl}?${params.toString()}`, { method: "POST" });
    if (!createRes.ok) {
      const err = await createRes.text();
      return { success: false, error: `Instagram media: ${err}` };
    }
    const createData = await createRes.json();
    if (!createData.id) return { success: false, error: "Instagram: no container ID returned" };

    // Step 2 — publish
    const publishParams = new URLSearchParams({
      access_token: pageToken,
      creation_id: createData.id,
    });
    const publishRes = await fetch(`${createUrl}_publish?${publishParams.toString()}`, {
      method: "POST",
    });
    if (publishRes.ok) {
      const pubData = await publishRes.json();
      return { success: true, postId: pubData.id };
    }
    const err = await publishRes.text();
    return { success: false, error: `Instagram publish: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Instagram request failed" };
  }
}

// ---------------------------------------------------------------------------
// Threads (Meta Threads API via Graph API)
// ---------------------------------------------------------------------------

export async function postToThreads(message: string): Promise<PostResult> {
  const token = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID || "me";
  if (!token) return { success: false, error: "Threads access token not configured" };

  try {
    const res = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT",
          text: message,
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      // Publish immediately
      if (data.id) {
        const pubRes = await fetch(
          `https://graph.threads.net/v1.0/${userId}/threads_publish?access_token=${token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creation_id: data.id }),
          }
        );
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          return { success: true, postId: pubData.id || data.id };
        }
      }
      return { success: true, postId: data.id };
    }
    const err = await res.text();
    return { success: false, error: `Threads: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Threads request failed" };
  }
}

// ---------------------------------------------------------------------------
// X (Twitter) API v2
// ---------------------------------------------------------------------------

export async function postToTwitter(message: string): Promise<PostResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) return { success: false, error: "Twitter Bearer Token not configured" };

  try {
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
    return { success: false, error: `X (Twitter): ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "X request failed" };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn (UGC Posts API v2)
// ---------------------------------------------------------------------------

export async function postToLinkedIn(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;
  if (!accessToken || !personUrn)
    return { success: false, error: "LinkedIn Access Token / Person URN not configured" };

  try {
    const body: Record<string, unknown> = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: message },
          shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
          ...(imageUrl
            ? { media: [{ status: "READY", originalUrl: imageUrl }] }
            : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
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
    return { success: false, error: `LinkedIn: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "LinkedIn request failed" };
  }
}

// ---------------------------------------------------------------------------
// TikTok (Content Posting API)
// ---------------------------------------------------------------------------

export async function postToTikTok(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return { success: false, error: "TikTok Access Token not configured" };

  try {
    // TikTok Direct Post API (v2)
    const body: Record<string, unknown> = {
      post_info: {
        title: message,
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        ...(imageUrl ? { video_url: imageUrl } : {}),
      },
    };

    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/info/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, postId: data.data?.publish_id };
    }
    const err = await res.text();
    return { success: false, error: `TikTok: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "TikTok request failed" };
  }
}

// ---------------------------------------------------------------------------
// YouTube (Data API v3 — community post / video description)
// ---------------------------------------------------------------------------

export async function postToYouTube(message: string): Promise<PostResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { success: false, error: "YouTube API Key not configured" };

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=brandingSettings&mine=true&key=${apiKey}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.YOUTUBE_ACCESS_TOKEN || ""}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return { success: true, postId: data.items?.[0]?.id };
    }
    const err = await res.text();
    return { success: false, error: `YouTube: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "YouTube request failed" };
  }
}

// ---------------------------------------------------------------------------
// Pinterest (v5 API — create pin)
// ---------------------------------------------------------------------------

export async function postToPinterest(
  message: string,
  imageUrl?: string
): Promise<PostResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;
  if (!token || !boardId)
    return { success: false, error: "Pinterest Access Token / Board ID not configured" };

  try {
    const body: Record<string, unknown> = {
      board_id: boardId,
      title: message.slice(0, 100),
      description: message,
      ...(imageUrl
        ? {
            media_source: {
              source_type: "image_url",
              url: imageUrl,
            },
          }
        : {}),
    };

    const res = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, postId: data.id };
    }
    const err = await res.text();
    return { success: false, error: `Pinterest: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Pinterest request failed" };
  }
}

// ---------------------------------------------------------------------------
// Bulk publisher
// ---------------------------------------------------------------------------

const PUBLISHERS: Record<SocialPlatform, (msg: string, img?: string) => Promise<PostResult>> = {
  facebook: postToFacebook,
  instagram: postToInstagram,
  threads: postToThreads,
  twitter: postToTwitter,
  linkedin: postToLinkedIn,
  tiktok: postToTikTok,
  youtube: postToYouTube,
  pinterest: postToPinterest,
};

export async function publishToPlatforms(
  message: string,
  platforms: SocialPlatform[],
  imageUrl?: string
): Promise<Record<string, PostResult>> {
  const results: Record<string, PostResult> = {};
  await Promise.all(
    platforms.map(async (platform) => {
      const fn = PUBLISHERS[platform];
      if (!fn) {
        results[platform] = { success: false, error: "Unknown platform" };
        return;
      }
      results[platform] = await fn(message, platform === "twitter" ? undefined : imageUrl);
    })
  );
  return results;
}
