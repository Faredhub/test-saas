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

  const stateKey = `rl:oauth:state:fb:${state}`;
  const storedState = await redis.get(stateKey);
  if (!storedState) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=Invalid%20OAuth%20state`);
  }
  await redis.del(stateKey);
  const { tenantId, userId } = JSON.parse(storedState);

  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${baseUrl}/api/social/facebook/callback`;

  try {
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
      client_id: clientId || "",
      client_secret: clientSecret || "",
      redirect_uri: redirectUri,
      code,
    }).toString()}`;

    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(errText)}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch Facebook page / user profile
    const profileRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`);
    const profile = await profileRes.json();

    const accountId = profile.id || "fb-account";
    const accountName = profile.name || "Facebook Page";
    const avatarUrl = profile.picture?.data?.url || null;

    const encryptedToken = encryptSecret(accessToken);

    await prisma.socialConnection.upsert({
      where: {
        tenantId_provider_accountId: {
          tenantId,
          provider: "FACEBOOK",
          accountId,
        },
      },
      create: {
        tenantId,
        provider: "FACEBOOK",
        accountId,
        accountName,
        avatarUrl,
        encryptedAccessToken: encryptedToken,
        status: "ACTIVE",
      },
      update: {
        accountName,
        avatarUrl,
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
      metadata: { provider: "FACEBOOK", accountName },
    });

    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?success=Facebook%20Connected`);
  } catch (err: any) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(err.message || "OAuth failed")}`);
  }
}
