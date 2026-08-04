import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: unknown) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (handlers.GET as any)(req, ctx);
    
    // Prevent ClientFetchError: If Auth.js returns a 30x redirect (e.g. redirecting to /login error page)
    // for API requests like /session or /csrf, intercept and return JSON instead of HTML
    if (res && (res.status === 302 || res.status === 307 || res.status === 308)) {
      const pathname = req.nextUrl.pathname;
      if (pathname.endsWith("/session")) {
        return NextResponse.json(null, { status: 200 });
      }
      if (pathname.endsWith("/csrf")) {
        return NextResponse.json({ csrfToken: "" }, { status: 200 });
      }
      if (pathname.endsWith("/providers")) {
        return NextResponse.json({}, { status: 200 });
      }
    }
    
    return res;
  } catch (error) {
    console.error("[NextAuth GET error]", error);
    const pathname = req.nextUrl.pathname;
    if (pathname.endsWith("/session")) {
      return NextResponse.json(null, { status: 200 });
    }
    return NextResponse.json({ error: "Internal Auth Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: unknown) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (handlers.POST as any)(req, ctx);
  } catch (error) {
    console.error("[NextAuth POST error]", error);
    return NextResponse.json({ error: "Internal Auth Error" }, { status: 500 });
  }
}
