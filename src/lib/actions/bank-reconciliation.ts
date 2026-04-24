"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// ============================================================================
// Types
// ============================================================================

export interface ParsedTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: "DEBIT" | "CREDIT";
  amount: number;
}

export interface ReconciliationEntry {
  date: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  matchStatus: "MATCHED" | "SUGGESTED" | "UNMATCHED";
  matchedTo?: string;
  matchedEntityType?: string;
  matchedEntityId?: string;
}

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
// BANK RECONCILIATION (FIN-A-007)
// ============================================================================

/**
 * Parse a CSV bank statement into structured transaction rows.
 * Expected columns: Date, Description, Debit, Credit, Balance
 * Also supports: Date, Description, Amount (positive = credit, negative = debit)
 */
export async function parseBankStatement(csvContent: string): Promise<ParsedTransaction[]> {
  await getSessionOrThrow();

  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  // Parse header to detect format
  const header = lines[0].toLowerCase().replace(/"/g, "").split(",").map((h) => h.trim());

  const hasDebitCredit = header.includes("debit") && header.includes("credit");
  const hasAmount = header.includes("amount");
  const dateIdx = header.findIndex((h) => h === "date" || h === "transaction date" || h === "txn date");
  const descIdx = header.findIndex((h) => h === "description" || h === "narration" || h === "particulars");
  const balanceIdx = header.findIndex((h) => h === "balance" || h === "closing balance");

  if (dateIdx === -1) throw new Error("CSV must have a Date column");
  if (descIdx === -1) throw new Error("CSV must have a Description/Narration column");

  const debitIdx = header.indexOf("debit");
  const creditIdx = header.indexOf("credit");
  const amountIdx = header.indexOf("amount");

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields with commas)
    const cells = parseCSVLine(line);

    const dateStr = cells[dateIdx]?.trim() ?? "";
    const description = cells[descIdx]?.trim() ?? "";

    if (!dateStr || !description) continue;

    let debit = 0;
    let credit = 0;
    let balance = 0;

    if (hasDebitCredit) {
      debit = parseAmount(cells[debitIdx] ?? "0");
      credit = parseAmount(cells[creditIdx] ?? "0");
    } else if (hasAmount) {
      const amt = parseAmount(cells[amountIdx] ?? "0");
      if (amt < 0) {
        debit = Math.abs(amt);
      } else {
        credit = amt;
      }
    }

    if (balanceIdx !== -1) {
      balance = parseAmount(cells[balanceIdx] ?? "0");
    }

    const type: "DEBIT" | "CREDIT" = debit > 0 ? "DEBIT" : "CREDIT";
    const amount = debit > 0 ? debit : credit;

    transactions.push({ date: dateStr, description, debit, credit, balance, type, amount });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[",\s]/g, "").replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Match parsed bank transactions against system records (invoices, expenses, payroll).
 */
export async function reconcileTransactions(
  transactions: ParsedTransaction[]
) {
  const { tenantId } = await getSessionOrThrow();

  const matched: ReconciliationEntry[] = [];
  const suggested: ReconciliationEntry[] = [];
  const unmatched: ReconciliationEntry[] = [];

  // Fetch recent invoices, expenses, and payslips for matching
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [invoices, expenses, payslips] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        ...tenantScope(tenantId),
        createdAt: { gte: threeMonthsAgo },
      },
      select: { id: true, invoiceNo: true, total: true, amountPaid: true, dueDate: true, status: true },
    }),
    prisma.expense.findMany({
      where: {
        ...tenantScope(tenantId),
        date: { gte: threeMonthsAgo },
        status: { in: ["APPROVED", "REIMBURSED"] },
      },
      select: { id: true, expenseNo: true, amount: true, date: true, description: true },
    }),
    prisma.payslip.findMany({
      where: {
        ...tenantScope(tenantId),
        createdAt: { gte: threeMonthsAgo },
      },
      select: { id: true, employeeId: true, netPay: true, month: true, year: true },
    }),
  ]);

  for (const txn of transactions) {
    const entry: ReconciliationEntry = {
      date: txn.date,
      description: txn.description,
      amount: txn.amount,
      type: txn.type,
      matchStatus: "UNMATCHED",
    };

    // Try exact amount match against invoices (credits received = payments)
    if (txn.type === "CREDIT") {
      const invoiceMatch = invoices.find(
        (inv) => Number(inv.total) === txn.amount || Number(inv.amountPaid) === txn.amount
      );
      if (invoiceMatch) {
        entry.matchStatus = "MATCHED";
        entry.matchedTo = `Invoice ${invoiceMatch.invoiceNo}`;
        entry.matchedEntityType = "Invoice";
        entry.matchedEntityId = invoiceMatch.id;
        matched.push(entry);
        continue;
      }
    }

    // Try matching debits against expenses
    if (txn.type === "DEBIT") {
      const expenseMatch = expenses.find(
        (exp) => Number(exp.amount) === txn.amount
      );
      if (expenseMatch) {
        entry.matchStatus = "MATCHED";
        entry.matchedTo = `Expense ${expenseMatch.expenseNo}`;
        entry.matchedEntityType = "Expense";
        entry.matchedEntityId = expenseMatch.id;
        matched.push(entry);
        continue;
      }

      // Try matching against payslip net pay
      const payslipMatch = payslips.find(
        (ps) => Number(ps.netPay) === txn.amount
      );
      if (payslipMatch) {
        entry.matchStatus = "MATCHED";
        entry.matchedTo = `Payslip ${payslipMatch.month}/${payslipMatch.year}`;
        entry.matchedEntityType = "Payslip";
        entry.matchedEntityId = payslipMatch.id;
        matched.push(entry);
        continue;
      }
    }

    // Suggest near-matches (within 5% tolerance)
    const tolerance = txn.amount * 0.05;
    const nearInvoice = invoices.find(
      (inv) =>
        Math.abs(Number(inv.total) - txn.amount) <= tolerance &&
        Math.abs(Number(inv.total) - txn.amount) > 0
    );
    if (nearInvoice) {
      entry.matchStatus = "SUGGESTED";
      entry.matchedTo = `Invoice ${nearInvoice.invoiceNo} (approx.)`;
      entry.matchedEntityType = "Invoice";
      entry.matchedEntityId = nearInvoice.id;
      suggested.push(entry);
      continue;
    }

    const nearExpense = expenses.find(
      (exp) =>
        Math.abs(Number(exp.amount) - txn.amount) <= tolerance &&
        Math.abs(Number(exp.amount) - txn.amount) > 0
    );
    if (nearExpense) {
      entry.matchStatus = "SUGGESTED";
      entry.matchedTo = `Expense ${nearExpense.expenseNo} (approx.)`;
      entry.matchedEntityType = "Expense";
      entry.matchedEntityId = nearExpense.id;
      suggested.push(entry);
      continue;
    }

    unmatched.push(entry);
  }

  return { matched, suggested, unmatched };
}

/**
 * Save reconciliation results. Stored as an audit log entry with metadata
 * since there is no dedicated reconciliation model.
 */
export async function saveReconciliation(data: {
  bankName: string;
  accountNo: string;
  statementDate: string;
  transactions: ReconciliationEntry[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const matchedCount = data.transactions.filter((t) => t.matchStatus === "MATCHED").length;
  const unmatchedCount = data.transactions.filter((t) => t.matchStatus === "UNMATCHED").length;
  const suggestedCount = data.transactions.filter((t) => t.matchStatus === "SUGGESTED").length;
  const totalAmount = data.transactions.reduce((sum, t) => sum + t.amount, 0);

  await logAudit({
    tenantId,
    userId,
    action: "bank_reconciliation.save",
    entity: "BankReconciliation",
    metadata: {
      bankName: data.bankName,
      accountNo: data.accountNo,
      statementDate: data.statementDate,
      transactionCount: data.transactions.length,
      matchedCount,
      unmatchedCount,
      suggestedCount,
      totalAmount,
      transactions: data.transactions,
    },
  });

  revalidatePath("/settings/bank-reconciliation");
  return { success: true, matchedCount, unmatchedCount, suggestedCount };
}

/**
 * Retrieve past reconciliation records from the audit log.
 */
export async function getReconciliations(filters?: {
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    action: "bank_reconciliation.save",
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
