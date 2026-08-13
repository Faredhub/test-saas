import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id: string; tenantId: string } | undefined;
  if (!user?.tenantId || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "LinkedIn Client ID not configured in environment" },
      { status: 400 }
    );
  }

  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const stateKey = `rl:oauth:state:li:${state}`;
  await redis.set(stateKey, JSON.stringify({ tenantId: user.tenantId, userId: user.id }), "EX", 600);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "r_liteprofile w_member_social",
  });

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
}
