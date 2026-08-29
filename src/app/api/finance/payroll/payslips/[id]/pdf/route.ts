import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import https from "node:https";
import http from "node:http";

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fetchImageBuffer(url: string, timeoutMs = 4000): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https:") ? https : http;
      const req = lib.get(url, { timeout: timeoutMs }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchImageBuffer(res.headers.location, timeoutMs).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

function placeText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions = {}
) {
  doc.text(text, x, y, options);
  return doc;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId as string;
  const userId = user.id as string;

  const { id } = await params;
  if (!id) {
    return new Response("Payslip id is required", { status: 400 });
  }

  const roleName = String(user.role || "").toLowerCase();
  const userRoles: string[] = Array.isArray(user.roles)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user.roles as any[]).map((r: any) => String(r).toLowerCase())
    : [];

  const isAdmin =
    roleName.includes("admin") ||
    roleName.includes("owner") ||
    roleName.includes("super") ||
    userRoles.some((r) => r.includes("admin") || r.includes("owner") || r.includes("super"));
  const isHROrManager =
    isAdmin ||
    roleName.includes("manager") ||
    roleName.includes("hr") ||
    userRoles.some((r) => r.includes("manager") || r.includes("hr"));

  const currentEmployee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, designation: true, designationRelation: { select: { name: true } } },
  });
  const designationName = (
    currentEmployee?.designation ||
    currentEmployee?.designationRelation?.name ||
    ""
  ).toLowerCase();
  const isManagerByDesignation =
    !isHROrManager &&
    (designationName.includes("manager") ||
      designationName.includes("hr") ||
      designationName.includes("lead") ||
      designationName.includes("head") ||
      designationName.includes("director"));
  const canViewAllPayslips = isHROrManager || isManagerByDesignation;

  const where = {
    id,
    ...tenantScope(tenantId),
    ...(canViewAllPayslips ? {} : { employeeId: currentEmployee?.id || "none" }),
  };

  const [payslip, tenant] = await Promise.all([
    prisma.payslip.findFirst({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            department: { select: { id: true, name: true } },
            dateOfJoining: true,
          },
        },
        structure: { select: { name: true } },
      },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        logo: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  if (!payslip) {
    return new Response("Payslip not found", { status: 404 });
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = months[(payslip.month - 1) % 12] || String(payslip.month);

  const basic = toNumber(payslip.basicPay);
  const hra = toNumber(payslip.hra);
  const da = toNumber(payslip.da);
  const special = toNumber(payslip.specialAllowance);
  const overtime = toNumber(payslip.overtime);
  const bonus = toNumber(payslip.bonus);
  const gross = toNumber(payslip.grossEarnings);
  const pfE = toNumber(payslip.pfEmployee);
  const pfEr = toNumber(payslip.pfEmployer);
  const esiE = toNumber(payslip.esiEmployee);
  const esiEr = toNumber(payslip.esiEmployer);
  const tds = toNumber(payslip.tds);
  const pt = toNumber(payslip.professionalTax);
  const otherDed = toNumber(payslip.otherDeductions);
  const totalDed = toNumber(payslip.totalDeductions);
  const net = toNumber(payslip.netPay);

  const employeeName = `${payslip.employee.firstName}${
    payslip.employee.lastName ? " " + payslip.employee.lastName : ""
  }`;
  const safeFile = `${employeeName.replace(/[^a-zA-Z0-9_-]+/g, "_")}_${monthName}_${payslip.year}_Payslip`;

  const logoUrl = tenant?.logo && /^https?:\/\//i.test(tenant.logo) ? tenant.logo : null;
  const logoBuffer = logoUrl ? await fetchImageBuffer(logoUrl) : null;

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const left = 40;
    const right = pageWidth - 40;
    const contentWidth = right - left;

    const primary: [number, number, number] = [30, 41, 59];
    const muted: [number, number, number] = [100, 116, 139];
    const accent: [number, number, number] = [22, 163, 74];
    const danger: [number, number, number] = [220, 38, 38];

    doc.rect(0, 0, pageWidth, 80).fill(primary);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, left, 16, { height: 48, fit: [140, 48] });
        placeText(doc, tenant?.name || "Workspace", left + 160, 22, {
          width: right - (left + 160),
        }).font("Helvetica-Bold").fontSize(20).fillColor("#ffffff");
        placeText(doc, "Payslip", left + 160, 50, {
          width: right - (left + 160),
        }).font("Helvetica").fontSize(9).fillColor("#cbd5e1");
      } catch {
        placeText(doc, tenant?.name || "Workspace", left, 22).font("Helvetica-Bold").fontSize(20).fillColor("#ffffff");
        placeText(doc, "Payslip", left, 50).font("Helvetica").fontSize(9).fillColor("#cbd5e1");
      }
    } else {
      placeText(doc, tenant?.name || "Workspace", left, 22).font("Helvetica-Bold").fontSize(20).fillColor("#ffffff");
      placeText(doc, "Payslip", left, 50).font("Helvetica").fontSize(9).fillColor("#cbd5e1");
    }

    placeText(doc, "PAYSLIP", right - 120, 22, { width: 120, align: "right" })
      .font("Helvetica-Bold").fontSize(22).fillColor("#ffffff");
    placeText(doc, `${monthName} ${payslip.year}`, right - 120, 52, { width: 120, align: "right" })
      .font("Helvetica").fontSize(10).fillColor("#cbd5e1");

    let y = 96;
    if (tenant?.address) {
      placeText(doc, tenant.address, left, y, { width: contentWidth, align: "right" })
        .font("Helvetica").fontSize(8).fillColor("#64748b");
      y = doc.y + 2;
    }
    const cityLine = [tenant?.city, tenant?.state, tenant?.pincode].filter(Boolean).join(", ");
    if (cityLine) {
      placeText(doc, cityLine, left, y, { width: contentWidth, align: "right" })
        .font("Helvetica").fontSize(8).fillColor("#64748b");
      y = doc.y + 2;
    }
    const contactLine = [tenant?.phone, tenant?.email].filter(Boolean).join(" | ");
    if (contactLine) {
      placeText(doc, contactLine, left, y, { width: contentWidth, align: "right" })
        .font("Helvetica").fontSize(8).fillColor("#64748b");
      y = doc.y + 2;
    }

    y = Math.max(y, 120) + 8;

    const cardHeight = 70;
    doc.roundedRect(left, y, contentWidth, cardHeight, 6).fillAndStroke("#f8fafc", "#e2e8f0");
    const col1X = left + 12;
    const col2X = left + contentWidth / 2 + 6;
    const halfColW = contentWidth / 2 - 24;

    placeText(doc, "EMPLOYEE NAME", col1X, y + 10, { width: halfColW })
      .font("Helvetica").fontSize(8).fillColor("#64748b");
    placeText(doc, employeeName, col1X, y + 22, { width: halfColW })
      .font("Helvetica-Bold").fontSize(12).fillColor("#1e293b");

    placeText(doc, "EMPLOYEE ID", col1X, y + 42, { width: halfColW })
      .font("Helvetica").fontSize(8).fillColor("#64748b");
    placeText(doc, payslip.employee.employeeId, col1X, y + 52)
      .font("Helvetica").fontSize(10).fillColor("#1e293b");

    placeText(doc, "PAY PERIOD", col2X, y + 10, { width: halfColW })
      .font("Helvetica").fontSize(8).fillColor("#64748b");
    placeText(doc, `${monthName} ${payslip.year}`, col2X, y + 22, { width: halfColW })
      .font("Helvetica-Bold").fontSize(12).fillColor("#1e293b");

    placeText(doc, "DEPARTMENT", col2X, y + 42, { width: halfColW })
      .font("Helvetica").fontSize(8).fillColor("#64748b");
    placeText(doc, payslip.employee.department?.name || "—", col2X, y + 52, { width: halfColW })
      .font("Helvetica").fontSize(10).fillColor("#1e293b");

    y += cardHeight + 14;

    const metaY = y;
    const metaCols: { label: string; value: string }[] = [
      { label: "Designation", value: payslip.employee.designation || "—" },
      { label: "Structure", value: payslip.structure?.name || "—" },
      { label: "Working Days", value: String(payslip.workingDays) },
      { label: "Present Days", value: String(payslip.presentDays) },
      { label: "Leave Days", value: String(payslip.leaveDays) },
    ];
    const colWidth = contentWidth / metaCols.length;
    metaCols.forEach((m, i) => {
      const x = left + i * colWidth;
      placeText(doc, m.label.toUpperCase(), x + 6, metaY, { width: colWidth - 12 })
        .font("Helvetica").fontSize(7).fillColor("#64748b");
      placeText(doc, m.value, x + 6, metaY + 12, { width: colWidth - 12 })
        .font("Helvetica-Bold").fontSize(10).fillColor("#1e293b");
    });
    y = metaY + 32;

    const tableTop = y;
    const halfWidth = contentWidth / 2 - 6;
    const colE = left;
    const colD = left + halfWidth + 12;

    doc.rect(colE, tableTop, halfWidth, 22).fill("#16a34a");
    placeText(doc, "EARNINGS", colE + 10, tableTop + 7)
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
    placeText(doc, "AMOUNT", colE + halfWidth - 80, tableTop + 7, { width: 70, align: "right" })
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");

    doc.rect(colD, tableTop, halfWidth, 22).fill("#dc2626");
    placeText(doc, "DEDUCTIONS", colD + 10, tableTop + 7)
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
    placeText(doc, "AMOUNT", colD + halfWidth - 80, tableTop + 7, { width: 70, align: "right" })
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");

    let ey = tableTop + 26;
    let dy = tableTop + 26;
    const earnings: { name: string; amount: number }[] = [
      { name: "Basic Pay", amount: basic },
      { name: "HRA", amount: hra },
      { name: "DA", amount: da },
      { name: "Special Allowance", amount: special },
    ];
    if (overtime > 0) earnings.push({ name: "Overtime", amount: overtime });
    if (bonus > 0) earnings.push({ name: "Bonus", amount: bonus });

    const deductions: { name: string; amount: number }[] = [
      { name: "PF (Employee)", amount: pfE },
      { name: "ESI (Employee)", amount: esiE },
      { name: "TDS", amount: tds },
      { name: "Professional Tax", amount: pt },
    ];
    if (otherDed > 0) deductions.push({ name: "Other Deductions", amount: otherDed });

    const drawRow = (
      x: number,
      width: number,
      rowY: number,
      name: string,
      amount: number
    ) => {
      const isAlt = Math.floor((rowY - tableTop) / 18) % 2 === 0;
      if (isAlt) {
        doc.rect(x, rowY, width, 18).fill("#f8fafc");
      }
      placeText(doc, name, x + 8, rowY + 5, { width: width - 90 })
        .font("Helvetica").fontSize(9).fillColor("#1e293b");
      placeText(doc, formatCurrencyINR(amount), x + width - 86, rowY + 5, { width: 78, align: "right" })
        .font("Helvetica").fontSize(9).fillColor("#1e293b");
    };

    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
      if (i < earnings.length) {
        drawRow(colE, halfWidth, ey, earnings[i].name, earnings[i].amount);
        ey += 18;
      }
      if (i < deductions.length) {
        drawRow(colD, halfWidth, dy, deductions[i].name, deductions[i].amount);
        dy += 18;
      }
    }

    const totalRowH = 22;
    ey += 4;
    dy += 4;
    doc.rect(colE, ey, halfWidth, totalRowH).fill("#1e293b");
    placeText(doc, "Gross Earnings", colE + 10, ey + 7)
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
    placeText(doc, formatCurrencyINR(gross), colE + halfWidth - 100, ey + 7, { width: 90, align: "right" })
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");

    doc.rect(colD, dy, halfWidth, totalRowH).fill("#1e293b");
    placeText(doc, "Total Deductions", colD + 10, dy + 7)
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
    placeText(doc, formatCurrencyINR(totalDed), colD + halfWidth - 100, dy + 7, { width: 90, align: "right" })
      .font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");

    let nextY = Math.max(ey, dy) + totalRowH + 16;

    doc.roundedRect(left, nextY, contentWidth, 56, 6).fill("#16a34a");
    placeText(doc, "NET SALARY PAYABLE", left + 18, nextY + 12)
      .font("Helvetica").fontSize(10).fillColor("#ffffff");
    placeText(doc, formatCurrencyINR(net), left + 18, nextY + 26, { width: contentWidth - 36, align: "right" })
      .font("Helvetica-Bold").fontSize(22).fillColor("#ffffff");
    nextY += 56 + 14;

    const employerInfo: string[] = [];
    if (pfEr > 0) employerInfo.push(`PF (Employer): ${formatCurrencyINR(pfEr)}`);
    if (esiEr > 0) employerInfo.push(`ESI (Employer): ${formatCurrencyINR(esiEr)}`);
    if (employerInfo.length > 0) {
      placeText(doc, `Employer Contributions — ${employerInfo.join("    •    ")}`, left, nextY, { width: contentWidth })
        .font("Helvetica-Oblique").fontSize(8).fillColor("#64748b");
      nextY += 18;
    }

    const footerY = doc.page.height - 70;
    doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(left, footerY).lineTo(right, footerY).stroke();
    placeText(doc, "This is a system-generated payslip and does not require a signature.", left, footerY + 8, { width: contentWidth, align: "center" })
      .font("Helvetica").fontSize(8).fillColor("#64748b");
    placeText(
      doc,
      `Status: ${payslip.status}${payslip.paidAt ? `   |   Paid On: ${new Date(payslip.paidAt).toLocaleDateString("en-IN")}` : ""}`,
      left,
      footerY + 22,
      { width: contentWidth, align: "center" }
    )
      .font("Helvetica").fontSize(8).fillColor("#64748b");

    doc.end();
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFile}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
