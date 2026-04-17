import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import PptxGenJS from "pptxgenjs";

type SlideContent = {
  title?: string;
  subtitle?: string;
  body?: string;
  left?: string;
  leftColumn?: string;
  right?: string;
  rightColumn?: string;
};

type SlideData = {
  layout: string;
  content: SlideContent;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId as string;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const presentation = await prisma.presentation.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });

  if (!presentation) {
    return new Response("Presentation not found", { status: 404 });
  }

  const safeTitle =
    presentation.title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "presentation";

  const pptx = new PptxGenJS();
  pptx.title = presentation.title;

  const slides = presentation.slides as SlideData[];

  if (Array.isArray(slides) && slides.length > 0) {
    for (const slideData of slides) {
      const slide = pptx.addSlide();
      const content = slideData.content || {};
      const layout = (slideData.layout || "blank").replace(/-/g, "_");

      switch (layout) {
        case "title": {
          slide.addText(content.title || "", {
            x: "10%",
            y: "30%",
            w: "80%",
            h: "20%",
            fontSize: 36,
            bold: true,
            align: "center",
            valign: "middle",
          });
          if (content.subtitle) {
            slide.addText(content.subtitle, {
              x: "10%",
              y: "55%",
              w: "80%",
              h: "10%",
              fontSize: 20,
              align: "center",
              valign: "middle",
              color: "666666",
            });
          }
          break;
        }
        case "title_content": {
          slide.addText(content.title || "", {
            x: "5%",
            y: "5%",
            w: "90%",
            h: "15%",
            fontSize: 28,
            bold: true,
            valign: "middle",
          });
          slide.addText(content.body || "", {
            x: "5%",
            y: "25%",
            w: "90%",
            h: "65%",
            fontSize: 16,
            valign: "top",
          });
          break;
        }
        case "two_column": {
          slide.addText(content.title || "", {
            x: "5%",
            y: "5%",
            w: "90%",
            h: "15%",
            fontSize: 28,
            bold: true,
            valign: "middle",
          });
          const leftText = content.left || content.leftColumn || "";
          const rightText = content.right || content.rightColumn || "";
          slide.addText(leftText, {
            x: "5%",
            y: "25%",
            w: "42%",
            h: "65%",
            fontSize: 14,
            valign: "top",
          });
          slide.addText(rightText, {
            x: "53%",
            y: "25%",
            w: "42%",
            h: "65%",
            fontSize: 14,
            valign: "top",
          });
          break;
        }
        case "blank":
        default: {
          const text = content.body || content.title || "";
          if (text) {
            slide.addText(text, {
              x: "10%",
              y: "10%",
              w: "80%",
              h: "80%",
              fontSize: 18,
              align: "center",
              valign: "middle",
            });
          }
          break;
        }
      }
    }
  } else {
    const slide = pptx.addSlide();
    slide.addText(presentation.title, {
      x: "10%",
      y: "30%",
      w: "80%",
      h: "20%",
      fontSize: 36,
      bold: true,
      align: "center",
      valign: "middle",
    });
  }

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeTitle}.pptx"`,
    },
  });
}
