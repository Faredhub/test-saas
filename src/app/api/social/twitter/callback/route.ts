import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { encryptSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(error || "OAuth cancelled")}`);
  }

  const stateKey = `rl:oauth:state:tw:${state}`;
  const storedState = await redis.get(stateKey);
  if (!storedState) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=Invalid%20OAuth%20state`);
  }
  await redis.del(stateKey);
  const { tenantId, userId } = JSON.parse(storedState);

  const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET;
  const redirectUri = `${baseUrl}/api/social/twitter/callback`;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: "challenge",
    });

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(errText)}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;

    // Retrieve user profile
    const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profileData = await profileRes.json();
    const user = profileData.data;

    const accountId = user?.id || "tw-account";
    const accountName = user?.username ? `@${user.username}` : "X / Twitter User";
    const avatarUrl = user?.profile_image_url || null;

    const encryptedAccessToken = encryptSecret(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptSecret(refreshToken) : null;

    await prisma.socialConnection.upsert({
      where: {
        tenantId_provider_accountId: {
          tenantId,
          provider: "TWITTER",
          accountId,
        },
      },
      create: {
        tenantId,
        provider: "TWITTER",
        accountId,
        accountName,
        avatarUrl,
        encryptedAccessToken,
        encryptedRefreshToken,
        status: "ACTIVE",
      },
      update: {
        accountName,
        avatarUrl,
        encryptedAccessToken,
        encryptedRefreshToken,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    logAudit({
      tenantId,
      userId,
      action: "SOCIAL_ACCOUNT_CONNECTED",
      entity: "SocialConnection",
      metadata: { provider: "TWITTER", accountName },
    });

    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?success=X%20%2F%20Twitter%20Connected`);
  } catch (err: any) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(err.message || "OAuth failed")}`);
  }
}
