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

  const stateKey = `rl:oauth:state:ig:${state}`;
  const storedState = await redis.get(stateKey);
  if (!storedState) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=Invalid%20OAuth%20state`);
  }
  await redis.del(stateKey);
  const { tenantId, userId } = JSON.parse(storedState);

  const clientId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${baseUrl}/api/social/instagram/callback`;

  try {
    const body = new URLSearchParams({
      client_id: clientId || "",
      client_secret: clientSecret || "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body,
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(errText)}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const accountId = tokenData.user_id?.toString() || "ig-account";

    const profileRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
    const profile = await profileRes.json();
    const accountName = profile.username ? `@${profile.username}` : "Instagram Business";

    const encryptedToken = encryptSecret(accessToken);

    await prisma.socialConnection.upsert({
      where: {
        tenantId_provider_accountId: {
          tenantId,
          provider: "INSTAGRAM",
          accountId,
        },
      },
      create: {
        tenantId,
        provider: "INSTAGRAM",
        accountId,
        accountName,
        encryptedAccessToken: encryptedToken,
        status: "ACTIVE",
      },
      update: {
        accountName,
        encryptedAccessToken: encryptedToken,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    logAudit({
      tenantId,
      userId,
      action: "SOCIAL_ACCOUNT_CONNECTED",
      entity: "SocialConnection",
      metadata: { provider: "INSTAGRAM", accountName },
    });

    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?success=Instagram%20Connected`);
  } catch (err: any) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(err.message || "OAuth failed")}`);
  }
}
