import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id: string; tenantId: string } | undefined;
  if (!user?.tenantId || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
  if (!clientId) {
    return NextResponse.json(
      { error: "Twitter/X Client ID not configured in environment" },
      { status: 400 }
    );
  }

  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const stateKey = `rl:oauth:state:tw:${state}`;
  await redis.set(stateKey, JSON.stringify({ tenantId: user.tenantId, userId: user.id }), "EX", 600);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/twitter/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: "challenge",
    code_challenge_method: "plain",
  });

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
}
