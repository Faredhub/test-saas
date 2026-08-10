import { handlers, auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function sanitizeAuthResponse(req: NextRequest, handlerFn: (r: NextRequest, c: unknown) => Promise<Response>, ctx: unknown) {
  const pathname = req.nextUrl.pathname;
  try {
    const res = await handlerFn(req, ctx);

    if (res) {
      const isRedirect = res.status >= 300 && res.status < 400;
      const contentType = res.headers.get("content-type") || "";
      const isHtmlHeader = contentType.includes("text/html");

      let isHtmlBody = false;
      try {
        const text = await res.clone().text();
        if (text.trim().startsWith("<")) {
          isHtmlBody = true;
        }
      } catch {
        // Ignore clone errors
      }

      if (isRedirect || isHtmlHeader || isHtmlBody || (res.url && !res.url.includes("/api/auth"))) {
        if (pathname.includes("/session")) {
          return NextResponse.json(null, { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (pathname.includes("/csrf")) {
          return NextResponse.json({ csrfToken: "" }, { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (pathname.includes("/providers")) {
          return NextResponse.json({}, { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return NextResponse.json(null, { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    return res;
  } catch (error) {
    console.error("[NextAuth handler error]", error);
    if (pathname.includes("/session")) {
      return NextResponse.json(null, { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (pathname.includes("/csrf")) {
      return NextResponse.json({ csrfToken: "" }, { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (pathname.includes("/providers")) {
      return NextResponse.json({}, { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return NextResponse.json(null, { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

export async function GET(req: NextRequest, ctx: unknown) {
  const pathname = req.nextUrl.pathname;
  if (pathname.endsWith("/session") || pathname.includes("/session")) {
    try {
      const session = await auth();
      return NextResponse.json(session || null, { status: 200, headers: { "Content-Type": "application/json" } });
    } catch {
      return NextResponse.json(null, { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sanitizeAuthResponse(req, handlers.GET as any, ctx);
}

export async function POST(req: NextRequest, ctx: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sanitizeAuthResponse(req, handlers.POST as any, ctx);
}
