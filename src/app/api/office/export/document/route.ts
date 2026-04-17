import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import PDFDocument from "pdfkit";

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
  const format = searchParams.get("format");

  if (!id || !format || !["docx", "pdf"].includes(format)) {
    return new Response("Missing or invalid parameters. Required: id, format (docx|pdf)", {
      status: 400,
    });
  }

  const doc = await prisma.officeDocument.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });

  if (!doc) {
    return new Response("Document not found", { status: 404 });
  }

  const safeTitle = doc.title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document";

  if (format === "docx") {
    const paragraphs = (doc.content || "").split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun(line)],
        })
    );

    const docxDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: doc.title,
              heading: HeadingLevel.HEADING_1,
            }),
            ...paragraphs,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(docxDoc);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
      },
    });
  }

  // PDF
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const pdfDoc = new PDFDocument();
    const chunks: Buffer[] = [];

    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);

    pdfDoc.fontSize(24).font("Helvetica-Bold").text(doc.title, { align: "left" });
    pdfDoc.moveDown();
    pdfDoc.fontSize(12).font("Helvetica").text(doc.content || "", { align: "left" });

    pdfDoc.end();
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
    },
  });
}
