import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import * as XLSX from "xlsx";

type SheetData = {
  name: string;
  data: string[][];
  columns: string[];
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

  const spreadsheet = await prisma.spreadsheet.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });

  if (!spreadsheet) {
    return new Response("Spreadsheet not found", { status: 404 });
  }

  const safeTitle =
    spreadsheet.title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "spreadsheet";

  const sheets = spreadsheet.sheets as SheetData[];
  const workbook = XLSX.utils.book_new();

  if (Array.isArray(sheets) && sheets.length > 0) {
    for (const sheet of sheets) {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data || []);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || "Sheet");
    }
  } else {
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeTitle}.xlsx"`,
    },
  });
}
