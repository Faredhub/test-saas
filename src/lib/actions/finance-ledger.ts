"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// ============================================================================
// Helpers
// ============================================================================

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// FINANCE LEDGER SERVER ACTIONS
// ============================================================================

export async function getLedgerEntries() {
  const { tenantId } = await getSessionOrThrow();
  const entries = await prisma.financeLedger.findMany({
    where: tenantScope(tenantId),
    orderBy: { slNo: "asc" },
  });
  return entries.map(e => ({
    id: e.id,
    slNo: e.slNo,
    costType: e.costType as "Office" | "Site",
    itemName: e.itemName,
    invoiceNumber: e.invoiceNumber,
    amount: Number(e.amount),
    deduction: Number(e.deduction),
    date: e.date,
    status: e.status as "Received" | "Pending",
    paymentMode: e.paymentMode as "Bank" | "Cash",
    email: e.email ?? "",
    contact: e.contact ?? "",
    fileName: e.fileName ?? "",
    fileDataUrl: e.fileDataUrl ?? "",
    remark: e.remark ?? "",
  }));
}

export async function createLedgerEntry(data: {
  costType: "Office" | "Site";
  itemName: string;
  invoiceNumber: string;
  amount: number;
  deduction: number;
  date: string;
  status: "Received" | "Pending";
  paymentMode: "Bank" | "Cash";
  email: string;
  contact: string;
  fileName: string;
  fileDataUrl: string;
  remark: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Find max serial number for tenant
  const maxEntry = await prisma.financeLedger.findFirst({
    where: tenantScope(tenantId),
    orderBy: { slNo: "desc" },
    select: { slNo: true },
  });
  const nextSlNo = (maxEntry?.slNo ?? 0) + 1;

  const record = await prisma.financeLedger.create({
    data: {
      tenantId,
      slNo: nextSlNo,
      costType: data.costType,
      itemName: data.itemName,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      deduction: data.deduction,
      date: data.date,
      status: data.status,
      paymentMode: data.paymentMode,
      email: data.email,
      contact: data.contact,
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      remark: data.remark,
    },
  });

  await logAudit({ tenantId, userId, action: "finance_ledger.create", entity: "FinanceLedger", entityId: record.id });
  revalidatePath("/finance/accounts");
  return record;
}

export async function updateLedgerEntry(
  id: string,
  data: {
    costType?: "Office" | "Site";
    itemName?: string;
    invoiceNumber?: string;
    amount?: number;
    deduction?: number;
    date?: string;
    status?: "Received" | "Pending";
    paymentMode?: "Bank" | "Cash";
    email?: string;
    contact?: string;
    fileName?: string;
    fileDataUrl?: string;
    remark?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.financeLedger.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      costType: data.costType,
      itemName: data.itemName,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      deduction: data.deduction,
      date: data.date,
      status: data.status,
      paymentMode: data.paymentMode,
      email: data.email,
      contact: data.contact,
      fileName: data.fileName,
      fileDataUrl: data.fileDataUrl,
      remark: data.remark,
    },
  });

  await logAudit({ tenantId, userId, action: "finance_ledger.update", entity: "FinanceLedger", entityId: id });
  revalidatePath("/finance/accounts");
  return { success: true };
}

export async function deleteLedgerEntry(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  // 1. Delete the item
  await prisma.financeLedger.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  // 2. Fetch all remaining entries
  const remaining = await prisma.financeLedger.findMany({
    where: tenantScope(tenantId),
    orderBy: { slNo: "asc" },
  });

  // 3. Re-index remaining entries
  for (let idx = 0; idx < remaining.length; idx++) {
    const entry = remaining[idx];
    const newSlNo = idx + 1;
    if (entry.slNo !== newSlNo) {
      await prisma.financeLedger.update({
        where: { id: entry.id },
        data: { slNo: newSlNo },
      });
    }
  }

  await logAudit({ tenantId, userId, action: "finance_ledger.delete", entity: "FinanceLedger", entityId: id });
  revalidatePath("/finance/accounts");
  return { success: true };
}

export async function importLedgerEntries(
  entries: Array<{
    costType: "Office" | "Site";
    itemName: string;
    invoiceNumber: string;
    amount: number;
    deduction: number;
    date: string;
    status: "Received" | "Pending";
    paymentMode: "Bank" | "Cash";
    email: string;
    contact: string;
    fileName: string;
    fileDataUrl?: string;
    remark: string;
  }>
) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Find max serial number for tenant
  const maxEntry = await prisma.financeLedger.findFirst({
    where: tenantScope(tenantId),
    orderBy: { slNo: "desc" },
    select: { slNo: true },
  });
  let nextSlNo = (maxEntry?.slNo ?? 0) + 1;

  const records = [];
  for (const data of entries) {
    const record = await prisma.financeLedger.create({
      data: {
        tenantId,
        slNo: nextSlNo++,
        costType: data.costType,
        itemName: data.itemName,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        deduction: data.deduction,
        date: data.date,
        status: data.status,
        paymentMode: data.paymentMode,
        email: data.email,
        contact: data.contact,
        fileName: data.fileName || "receipt.pdf",
        fileDataUrl: data.fileDataUrl || "",
        remark: data.remark,
      },
    });
    records.push(record);
  }

  await logAudit({ tenantId, userId, action: "finance_ledger.import", entity: "FinanceLedger", metadata: { count: entries.length } });
  revalidatePath("/finance/accounts");
  return { count: records.length };
}
