import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, ctx: unknown) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (handlers.GET as any)(req, ctx);
    
    // Prevent ClientFetchError: If Auth.js returns a 30x redirect or HTML response
    // for API requests (like /session, /csrf, /providers), intercept and return JSON instead of HTML
    if (res) {
      const isRedirect = res.status >= 300 && res.status < 400;
      const contentType = res.headers.get("content-type") || "";
      const isHtml = contentType.includes("text/html");

      if (isRedirect || isHtml) {
        const pathname = req.nextUrl.pathname;
        if (pathname.includes("/session")) {
          return NextResponse.json(null, { status: 200 });
        }
        if (pathname.includes("/csrf")) {
          return NextResponse.json({ csrfToken: "" }, { status: 200 });
        }
        if (pathname.includes("/providers")) {
          return NextResponse.json({}, { status: 200 });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    
    return res;
  } catch (error) {
    console.error("[NextAuth GET error]", error);
    const pathname = req.nextUrl.pathname;
    if (pathname.includes("/session")) {
      return NextResponse.json(null, { status: 200 });
    }
    if (pathname.includes("/csrf")) {
      return NextResponse.json({ csrfToken: "" }, { status: 200 });
    }
    if (pathname.includes("/providers")) {
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json({ error: "Internal Auth Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: unknown) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (handlers.POST as any)(req, ctx);

    if (res) {
      const isRedirect = res.status >= 300 && res.status < 400;
      const contentType = res.headers.get("content-type") || "";
      const isHtml = contentType.includes("text/html");

      if (isRedirect || isHtml) {
        const pathname = req.nextUrl.pathname;
        if (pathname.includes("/session")) {
          return NextResponse.json(null, { status: 200 });
        }
        if (pathname.includes("/csrf")) {
          return NextResponse.json({ csrfToken: "" }, { status: 200 });
        }
        return NextResponse.json({ error: "Auth POST Error" }, { status: 400 });
      }
    }

    return res;
  } catch (error) {
    console.error("[NextAuth POST error]", error);
    return NextResponse.json({ error: "Internal Auth Error" }, { status: 500 });
  }
}

