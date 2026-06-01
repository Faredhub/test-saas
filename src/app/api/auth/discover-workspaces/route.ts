import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestInfo } from "@/lib/audit";

// Multi-tenant login disambiguation. The /login form posts here first to
// figure out which workspace(s) the credentials are valid in:
//   - 0 valid matches  -> 401 (invalid creds; same message used on /login)
//   - 1 valid match    -> 200 { tenant: { slug, name } } so the form can
//                         finalize signIn() with that workspace.
//   - 2+ valid matches -> 200 { workspaces: [{ slug, name }, ...] } so the
//                         form can render a chooser dialog.
//
// Password is verified here before we reveal any tenant memberships, so
// this does not enable enumeration of which tenants an email belongs to.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown })?.email === "string" ? (body as { email: string }).email.trim() : "";
  const password = typeof (body as { password?: unknown })?.password === "string" ? (body as { password: string }).password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const reqInfo = await getRequestInfo();
  const loginIp = reqInfo.ipAddress || "unknown";
  // Share the same rate-limit bucket as authorize() so a multi-step login can't
  // bypass it by hammering discover.
  const { allowed } = await rateLimit(`rl:login:${loginIp}`, 10, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  const candidates = await prisma.user.findMany({
    where: { email },
    select: {
      passwordHash: true,
      lockedUntil: true,
      tenant: { select: { slug: true, name: true } },
    },
  });

  const winners: { slug: string; name: string }[] = [];
  for (const c of candidates) {
    if (!c.passwordHash) continue;
    if (c.lockedUntil && c.lockedUntil > new Date()) continue;
    const ok = await bcrypt.compare(password, c.passwordHash);
    if (ok && c.tenant) winners.push({ slug: c.tenant.slug, name: c.tenant.name });
  }

  if (winners.length === 0) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  if (winners.length === 1) {
    return NextResponse.json({ tenant: winners[0] });
  }
  return NextResponse.json({ workspaces: winners });
}
