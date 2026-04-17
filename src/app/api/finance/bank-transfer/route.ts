import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId as string;

  const { searchParams } = request.nextUrl;
  const month = parseInt(searchParams.get("month") ?? "", 10);
  const year = parseInt(searchParams.get("year") ?? "", 10);

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Valid month and year query parameters are required" },
      { status: 400 }
    );
  }

  const payslips = await prisma.payslip.findMany({
    where: {
      ...tenantScope(tenantId),
      month,
      year,
      status: "APPROVED",
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          bankName: true,
          bankAccountNo: true,
          ifscCode: true,
        },
      },
    },
    orderBy: { employee: { firstName: "asc" } },
  });

  if (payslips.length === 0) {
    return NextResponse.json(
      { error: "No approved payslips found for the selected period" },
      { status: 404 }
    );
  }

  const rows: string[] = [];
  rows.push("Beneficiary Name,Account No,IFSC Code,Bank Name,Amount,Remarks");

  for (const slip of payslips) {
    const emp = slip.employee;
    const beneficiaryName = `${emp.firstName} ${emp.lastName ?? ""}`.trim();
    const accountNo = emp.bankAccountNo ?? "";
    const ifsc = emp.ifscCode ?? "";
    const bankName = emp.bankName ?? "";
    const netPay = toNumber(slip.netPay);
    const remarks = `Salary ${month}/${year} - ${emp.employeeId}`;

    const escapeCsv = (val: string) =>
      val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;

    rows.push(
      [
        escapeCsv(beneficiaryName),
        accountNo,
        ifsc,
        escapeCsv(bankName),
        netPay.toFixed(2),
        escapeCsv(remarks),
      ].join(",")
    );
  }

  const csv = rows.join("\n");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const fileName = `bank-transfer-${months[month - 1]}-${year}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
