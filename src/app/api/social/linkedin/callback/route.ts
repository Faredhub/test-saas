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

  const stateKey = `rl:oauth:state:li:${state}`;
  const storedState = await redis.get(stateKey);
  if (!storedState) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=Invalid%20OAuth%20state`);
  }
  await redis.del(stateKey);
  const { tenantId, userId } = JSON.parse(storedState);

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/social/linkedin/callback`;

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId || "",
      client_secret: clientSecret || "",
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(errText)}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;

    // Retrieve profile
    const profileRes = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    const accountId = profile.id || "li-account";
    const accountName = `${profile.localizedFirstName || ""} ${profile.localizedLastName || ""}`.trim() || "LinkedIn User";

    const encryptedAccessToken = encryptSecret(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptSecret(refreshToken) : null;

    await prisma.socialConnection.upsert({
      where: {
        tenantId_provider_accountId: {
          tenantId,
          provider: "LINKEDIN",
          accountId,
        },
      },
      create: {
        tenantId,
        provider: "LINKEDIN",
        accountId,
        accountName,
        encryptedAccessToken,
        encryptedRefreshToken,
        status: "ACTIVE",
      },
      update: {
        accountName,
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
      metadata: { provider: "LINKEDIN", accountName },
    });

    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?success=LinkedIn%20Connected`);
  } catch (err: any) {
    return NextResponse.redirect(`${baseUrl}/marketing/social/accounts?error=${encodeURIComponent(err.message || "OAuth failed")}`);
  }
}
