"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type {
  AccountType,
  JournalStatus,
  ExpenseStatus,
  PayslipStatus,
  BillStatus,
  PaymentMethod,
} from "@/generated/prisma/enums";

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

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

// ============================================================================
// CHART OF ACCOUNTS (FIN-A-001)
// ============================================================================

export async function getAccounts(filters?: {
  type?: AccountType;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 100, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters?.search
      ? {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { code: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.gLAccount.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, type: true, balance: true, isActive: true } },
      },
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gLAccount.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createAccount(data: {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  description?: string;
  currency?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const account = await prisma.gLAccount.create({
    data: {
      tenantId,
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      description: data.description || null,
      currency: data.currency || "INR",
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "gl_account.create",
    entity: "GLAccount",
    entityId: account.id,
    metadata: { code: data.code, name: data.name, type: data.type },
  });

  revalidatePath("/finance/accounts");
  return account;
}

export async function updateAccount(
  id: string,
  data: {
    code?: string;
    name?: string;
    type?: AccountType;
    parentId?: string | null;
    description?: string;
    currency?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const account = await prisma.gLAccount.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId || null } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "gl_account.update",
    entity: "GLAccount",
    entityId: id,
    metadata: data,
  });

  revalidatePath("/finance/accounts");
  return account;
}

export async function deleteAccount(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.gLAccount.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Account not found");

  await prisma.gLAccount.update({
    where: { id },
    data: { isActive: false },
  });

  logAudit({
    tenantId,
    userId,
    action: "gl_account.deactivate",
    entity: "GLAccount",
    entityId: id,
    metadata: { code: existing.code, name: existing.name },
  });

  revalidatePath("/finance/accounts");
}

// ============================================================================
// JOURNAL ENTRIES (FIN-A-002-003)
// ============================================================================

export async function getJournalEntries(filters?: {
  status?: JournalStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
        OR: [
          { entryNo: { contains: filters.search, mode: "insensitive" as const } },
          { description: { contains: filters.search, mode: "insensitive" as const } },
          { reference: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
    ...(filters?.dateFrom || filters?.dateTo
      ? {
        date: {
          ...(filters?.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters?.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        },
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createJournalEntry(data: {
  date: string;
  description?: string;
  reference?: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  if (!data.lines || data.lines.length < 2) {
    throw new Error("A journal entry must have at least 2 lines");
  }

  const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)})`);
  }

  const count = await prisma.journalEntry.count({ where: tenantScope(tenantId) });
  const entryNo = `JE-${String(count + 1).padStart(5, "0")}`;

  const entry = await prisma.journalEntry.create({
    data: {
      tenantId,
      entryNo,
      date: new Date(data.date),
      description: data.description || null,
      reference: data.reference || null,
      createdById: userId,
      lines: {
        create: data.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || null,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "journal_entry.create",
    entity: "JournalEntry",
    entityId: entry.id,
    metadata: { entryNo, totalDebit, lineCount: data.lines.length },
  });

  revalidatePath("/finance/journal");
  return entry;
}

export async function postJournalEntry(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const entry = await prisma.journalEntry.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { lines: true },
  });

  if (!entry) throw new Error("Journal entry not found");
  if (entry.status !== "DRAFT") throw new Error("Only DRAFT entries can be posted");

  // Update account balances
  for (const line of entry.lines) {
    const debit = toNumber(line.debit);
    const credit = toNumber(line.credit);
    const netChange = debit - credit;

    await prisma.gLAccount.update({
      where: { id: line.accountId },
      data: { balance: { increment: netChange } },
    });
  }

  await prisma.journalEntry.update({
    where: { id },
    data: { status: "POSTED", approvedById: userId },
  });

  logAudit({
    tenantId,
    userId,
    action: "journal_entry.post",
    entity: "JournalEntry",
    entityId: id,
    metadata: { entryNo: entry.entryNo },
  });

  revalidatePath("/finance/journal");
  revalidatePath("/finance/accounts");
}

export async function voidJournalEntry(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const entry = await prisma.journalEntry.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { lines: true },
  });

  if (!entry) throw new Error("Journal entry not found");
  if (entry.status !== "POSTED") throw new Error("Only POSTED entries can be voided");

  // Reverse account balances
  for (const line of entry.lines) {
    const debit = toNumber(line.debit);
    const credit = toNumber(line.credit);
    const netChange = debit - credit;

    await prisma.gLAccount.update({
      where: { id: line.accountId },
      data: { balance: { decrement: netChange } },
    });
  }

  await prisma.journalEntry.update({
    where: { id },
    data: { status: "VOIDED" },
  });

  logAudit({
    tenantId,
    userId,
    action: "journal_entry.void",
    entity: "JournalEntry",
    entityId: id,
    metadata: { entryNo: entry.entryNo },
  });

  revalidatePath("/finance/journal");
  revalidatePath("/finance/accounts");
}

// ============================================================================
// TRIAL BALANCE & FINANCIAL STATEMENTS (FIN-A-004-005)
// ============================================================================

export async function getTrialBalance(dateRange?: { from?: string; to?: string }) {
  const { tenantId } = await getSessionOrThrow();

  const accounts = await prisma.gLAccount.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    orderBy: { code: "asc" },
  });

  // If date range is provided, calculate balances from journal lines
  if (dateRange?.from || dateRange?.to) {
    const lineWhere = {
      journalEntry: {
        ...tenantScope(tenantId),
        status: "POSTED" as JournalStatus,
        ...(dateRange.from || dateRange.to
          ? {
            date: {
              ...(dateRange.from ? { gte: new Date(dateRange.from) } : {}),
              ...(dateRange.to ? { lte: new Date(dateRange.to) } : {}),
            },
          }
          : {}),
      },
    };

    const lines = await prisma.journalLine.findMany({
      where: lineWhere,
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    });

    const balanceMap: Record<string, { debit: number; credit: number }> = {};
    for (const line of lines) {
      if (!balanceMap[line.accountId]) {
        balanceMap[line.accountId] = { debit: 0, credit: 0 };
      }
      balanceMap[line.accountId].debit += toNumber(line.debit);
      balanceMap[line.accountId].credit += toNumber(line.credit);
    }

    const trialBalance = accounts.map((acc) => {
      const entry = balanceMap[acc.id] || { debit: 0, credit: 0 };
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: entry.debit,
        credit: entry.credit,
        balance: entry.debit - entry.credit,
      };
    });

    const totalDebit = trialBalance.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = trialBalance.reduce((sum, a) => sum + a.credit, 0);

    return { accounts: trialBalance, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  // Otherwise use account balances directly
  const trialBalance = accounts.map((acc) => {
    const bal = toNumber(acc.balance);
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: bal >= 0 ? bal : 0,
      credit: bal < 0 ? Math.abs(bal) : 0,
      balance: bal,
    };
  });

  const totalDebit = trialBalance.reduce((sum, a) => sum + a.debit, 0);
  const totalCredit = trialBalance.reduce((sum, a) => sum + a.credit, 0);

  return { accounts: trialBalance, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

export async function getFinancialStatements(
  type: "PNL" | "BALANCE_SHEET" | "CASH_FLOW",
  dateRange?: { from?: string; to?: string }
) {
  const { tenantId } = await getSessionOrThrow();

  const accounts = await prisma.gLAccount.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    orderBy: { code: "asc" },
  });

  // Compute balances from posted journal lines in the date range
  const lineWhere = {
    journalEntry: {
      ...tenantScope(tenantId),
      status: "POSTED" as JournalStatus,
      ...(dateRange?.from || dateRange?.to
        ? {
          date: {
            ...(dateRange?.from ? { gte: new Date(dateRange.from) } : {}),
            ...(dateRange?.to ? { lte: new Date(dateRange.to) } : {}),
          },
        }
        : {}),
    },
  };

  const lines = await prisma.journalLine.findMany({
    where: lineWhere,
    select: { accountId: true, debit: true, credit: true },
  });

  const balanceMap: Record<string, number> = {};
  for (const line of lines) {
    if (!balanceMap[line.accountId]) balanceMap[line.accountId] = 0;
    balanceMap[line.accountId] += toNumber(line.debit) - toNumber(line.credit);
  }

  const accountsWithBal = accounts.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    balance: balanceMap[a.id] || toNumber(a.balance),
  }));

  if (type === "PNL") {
    const revenue = accountsWithBal.filter((a) => a.type === "REVENUE");
    const expenses = accountsWithBal.filter((a) => a.type === "EXPENSE");
    const totalRevenue = revenue.reduce((s, a) => s + Math.abs(a.balance), 0);
    const totalExpenses = expenses.reduce((s, a) => s + Math.abs(a.balance), 0);

    return {
      type: "PNL",
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }

  if (type === "BALANCE_SHEET") {
    const assets = accountsWithBal.filter((a) => a.type === "ASSET");
    const liabilities = accountsWithBal.filter((a) => a.type === "LIABILITY");
    const equity = accountsWithBal.filter((a) => a.type === "EQUITY");
    const totalAssets = assets.reduce((s, a) => s + Math.abs(a.balance), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + Math.abs(a.balance), 0);
    const totalEquity = equity.reduce((s, a) => s + Math.abs(a.balance), 0);

    // Add retained earnings (net profit) to equity
    const revenueAccounts = accountsWithBal.filter((a) => a.type === "REVENUE");
    const expenseAccounts = accountsWithBal.filter((a) => a.type === "EXPENSE");
    const retainedEarnings =
      revenueAccounts.reduce((s, a) => s + Math.abs(a.balance), 0) -
      expenseAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);

    return {
      type: "BALANCE_SHEET",
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity: totalEquity + retainedEarnings,
      retainedEarnings,
    };
  }

  // CASH_FLOW - simplified: operating = revenue - expenses, investing = asset changes, financing = liability + equity changes
  const operating = accountsWithBal
    .filter((a) => a.type === "REVENUE" || a.type === "EXPENSE")
    .map((a) => ({
      ...a,
      balance: a.type === "REVENUE" ? Math.abs(a.balance) : -Math.abs(a.balance),
    }));
  const investing = accountsWithBal.filter((a) => a.type === "ASSET");
  const financing = accountsWithBal.filter((a) => a.type === "LIABILITY" || a.type === "EQUITY");

  const totalOperating = operating.reduce((s, a) => s + a.balance, 0);
  const totalInvesting = investing.reduce((s, a) => s + a.balance, 0);
  const totalFinancing = financing.reduce((s, a) => s + a.balance, 0);

  return {
    type: "CASH_FLOW",
    operating,
    investing,
    financing,
    totalOperating,
    totalInvesting,
    totalFinancing,
    netCashFlow: totalOperating - totalInvesting + totalFinancing,
  };
}

// ============================================================================
// EXPENSE MANAGEMENT (FIN-C-001-004)
// ============================================================================

export async function getExpenseCategories() {
  const { tenantId } = await getSessionOrThrow();

  return prisma.expenseCategory.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    include: { account: { select: { id: true, code: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createExpenseCategory(data: {
  name: string;
  code?: string;
  accountId?: string;
  monthlyLimit?: number;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const category = await prisma.expenseCategory.create({
    data: {
      tenantId,
      name: data.name,
      code: data.code || null,
      accountId: data.accountId || null,
      monthlyLimit: data.monthlyLimit ?? null,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "expense_category.create",
    entity: "ExpenseCategory",
    entityId: category.id,
    metadata: { name: data.name },
  });

  revalidatePath("/finance/expenses");
  return category;
}

export async function getExpenses(filters?: {
  status?: ExpenseStatus;
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters?.search
      ? {
        OR: [
          { expenseNo: { contains: filters.search, mode: "insensitive" as const } },
          { description: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
    ...(filters?.dateFrom || filters?.dateTo
      ? {
        date: {
          ...(filters?.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters?.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        },
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  const serializedData = data.map((exp) => ({
    ...exp,
    amount: Number(exp.amount),
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createExpense(data: {
  categoryId?: string;
  description: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.expense.count({ where: tenantScope(tenantId) });
  const expenseNo = `EXP-${String(count + 1).padStart(5, "0")}`;

  const expense = await prisma.expense.create({
    data: {
      tenantId,
      expenseNo,
      categoryId: data.categoryId || null,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      receiptUrl: data.receiptUrl || null,
      notes: data.notes || null,
      submittedById: userId,
      status: "SUBMITTED",
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "expense.create",
    entity: "Expense",
    entityId: expense.id,
    metadata: { expenseNo, amount: data.amount },
  });

  revalidatePath("/finance/expenses");
  return {
    ...expense,
    amount: Number(expense.amount),
  };
}

export async function approveExpense(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const expense = await prisma.expense.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!expense) throw new Error("Expense not found");
  if (expense.status !== "SUBMITTED" && expense.status !== "PENDING") {
    throw new Error("Only submitted or pending expenses can be approved");
  }

  await prisma.expense.update({
    where: { id },
    data: { status: "APPROVED", approvedById: userId },
  });

  logAudit({
    tenantId,
    userId,
    action: "expense.approve",
    entity: "Expense",
    entityId: id,
    metadata: { expenseNo: expense.expenseNo },
  });

  revalidatePath("/finance/expenses");
}

export async function rejectExpense(id: string, reason?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const expense = await prisma.expense.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!expense) throw new Error("Expense not found");

  await prisma.expense.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvedById: userId,
      notes: reason ? `${expense.notes ? expense.notes + "\n" : ""}Rejected: ${reason}` : expense.notes,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "expense.reject",
    entity: "Expense",
    entityId: id,
    metadata: { expenseNo: expense.expenseNo, reason },
  });

  revalidatePath("/finance/expenses");
}

export async function updateExpense(
  id: string,
  data: {
    categoryId?: string;
    description: string;
    amount: number;
    date: string;
    notes?: string;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const expense = await prisma.expense.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!expense) throw new Error("Expense not found");

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      categoryId: data.categoryId || null,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      notes: data.notes || null,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "expense.update",
    entity: "Expense",
    entityId: id,
    metadata: { expenseNo: expense.expenseNo, amount: data.amount },
  });

  revalidatePath("/finance/expenses");
  return {
    ...updated,
    amount: Number(updated.amount),
  };
}

export async function deleteExpense(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const expense = await prisma.expense.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!expense) throw new Error("Expense not found");

  await prisma.expense.delete({
    where: { id },
  });

  logAudit({
    tenantId,
    userId,
    action: "expense.delete",
    entity: "Expense",
    entityId: id,
    metadata: { expenseNo: expense.expenseNo },
  });

  revalidatePath("/finance/expenses");
}

// ============================================================================
// PAYROLL (FIN-D-001-006)
// ============================================================================

function serializeSalaryStructure(s: any) {
  if (!s) return s;
  return {
    ...s,
    basic: toNumber(s.basic),
    hra: toNumber(s.hra),
    da: toNumber(s.da),
    specialAllowance: toNumber(s.specialAllowance),
    pfEmployee: toNumber(s.pfEmployee),
    pfEmployer: toNumber(s.pfEmployer),
    esiEmployee: toNumber(s.esiEmployee),
    esiEmployer: toNumber(s.esiEmployer),
    tds: toNumber(s.tds),
    professionalTax: toNumber(s.professionalTax),
  };
}

export async function getSalaryStructures() {
  const { tenantId } = await getSessionOrThrow();

  const data = await prisma.salaryStructure.findMany({
    where: { ...tenantScope(tenantId), isActive: true },
    orderBy: { name: "asc" },
  });

  return data.map(serializeSalaryStructure);
}

export async function createSalaryStructure(data: {
  name: string;
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  tds: number;
  professionalTax: number;
}) {
  try {
    const { userId, tenantId } = await getSessionOrThrow();

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Structure name is required" };
    }

    if (isNaN(data.basic) || data.basic <= 0) {
      return { success: false, error: "Basic percentage must be a valid number greater than 0" };
    }

    const structure = await prisma.salaryStructure.create({
      data: {
        tenantId,
        name: data.name.trim(),
        basic: data.basic,
        hra: data.hra,
        da: data.da,
        specialAllowance: data.specialAllowance,
        pfEmployee: data.pfEmployee,
        pfEmployer: data.pfEmployer,
        esiEmployee: data.esiEmployee,
        esiEmployer: data.esiEmployer,
        tds: data.tds,
        professionalTax: data.professionalTax,
      },
    });

    logAudit({
      tenantId,
      userId,
      action: "salary_structure.create",
      entity: "SalaryStructure",
      entityId: structure.id,
      metadata: { name: data.name },
    });

    revalidatePath("/finance/payroll");
    return { success: true, data: serializeSalaryStructure(structure) };
  } catch (err: any) {
    console.error("Error creating salary structure:", err);
    if (err.code === "P2002") {
      return { success: false, error: "A salary structure with this name already exists" };
    }
    return { success: false, error: err.message || "Failed to create salary structure" };
  }
}

export async function updateSalaryStructure(
  id: string,
  data: {
    name: string;
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    pfEmployee: number;
    pfEmployer: number;
    esiEmployee: number;
    esiEmployer: number;
    tds: number;
    professionalTax: number;
  }
) {
  try {
    const { userId, tenantId } = await getSessionOrThrow();

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Structure name is required" };
    }

    if (isNaN(data.basic) || data.basic <= 0) {
      return { success: false, error: "Basic percentage must be a valid number greater than 0" };
    }

    // Check if another structure with the same name already exists in this tenant
    const existing = await prisma.salaryStructure.findFirst({
      where: {
        tenantId,
        name: data.name.trim(),
        id: { not: id },
        isActive: true,
      },
    });
    if (existing) {
      return { success: false, error: "A salary structure with this name already exists" };
    }

    const structure = await prisma.salaryStructure.update({
      where: { id, tenantId },
      data: {
        name: data.name.trim(),
        basic: data.basic,
        hra: data.hra,
        da: data.da,
        specialAllowance: data.specialAllowance,
        pfEmployee: data.pfEmployee,
        pfEmployer: data.pfEmployer,
        esiEmployee: data.esiEmployee,
        esiEmployer: data.esiEmployer,
        tds: data.tds,
        professionalTax: data.professionalTax,
      },
    });

    logAudit({
      tenantId,
      userId,
      action: "salary_structure.update",
      entity: "SalaryStructure",
      entityId: structure.id,
      metadata: { name: data.name },
    });

    revalidatePath("/finance/payroll");
    return { success: true, data: serializeSalaryStructure(structure) };
  } catch (err: any) {
    console.error("Error updating salary structure:", err);
    return { success: false, error: err.message || "Failed to update salary structure" };
  }
}

export async function deleteSalaryStructure(id: string) {
  try {
    const { userId, tenantId } = await getSessionOrThrow();

    const structure = await prisma.salaryStructure.update({
      where: { id, tenantId },
      data: { isActive: false },
    });

    logAudit({
      tenantId,
      userId,
      action: "salary_structure.delete",
      entity: "SalaryStructure",
      entityId: structure.id,
      metadata: { name: structure.name },
    });

    revalidatePath("/finance/payroll");
    return { success: true, data: serializeSalaryStructure(structure) };
  } catch (err: any) {
    console.error("Error deleting salary structure:", err);
    return { success: false, error: err.message || "Failed to delete salary structure" };
  }
}


export async function getPayslips(filters?: {
  month?: number;
  year?: number;
  status?: PayslipStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.month ? { month: filters.month } : {}),
    ...(filters?.year ? { year: filters.year } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
        employee: {
          OR: [
            { firstName: { contains: filters.search, mode: "insensitive" as const } },
            { lastName: { contains: filters.search, mode: "insensitive" as const } },
            { employeeId: { contains: filters.search, mode: "insensitive" as const } },
          ],
        },
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.payslip.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, email: true } },
        structure: { select: { id: true, name: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payslip.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function generatePayslips(month: number, year: number) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Get all active employees with salary structures
  const employees = await prisma.employee.findMany({
    where: {
      ...tenantScope(tenantId),
      status: "ACTIVE",
      salaryStructureId: { not: null },
      ctc: { not: null },
    },
    include: {
      salaryStructure: true,
    },
  });

  if (employees.length === 0) {
    throw new Error("No active employees with salary structures found");
  }

  // Check for existing payslips
  const existing = await prisma.payslip.findMany({
    where: { ...tenantScope(tenantId), month, year },
    select: { employeeId: true },
  });
  const existingIds = new Set(existing.map((p) => p.employeeId));

  const toGenerate = employees.filter((e) => !existingIds.has(e.id));
  if (toGenerate.length === 0) {
    throw new Error("Payslips already generated for all employees this month");
  }

  // Working days in the month (approximate; 26 working days standard in India)
  const workingDays = 26;
  const generated: string[] = [];

  for (const emp of toGenerate) {
    const structure = emp.salaryStructure!;
    const annualCTC = toNumber(emp.ctc);
    const monthlyCTC = annualCTC / 12;

    // Calculate earnings based on structure percentages
    const basicPay = (toNumber(structure.basic) / 100) * monthlyCTC;
    const hra = (toNumber(structure.hra) / 100) * monthlyCTC;
    const da = (toNumber(structure.da) / 100) * monthlyCTC;
    const specialAllowance = (toNumber(structure.specialAllowance) / 100) * monthlyCTC;
    const grossEarnings = basicPay + hra + da + specialAllowance;

    // Calculate deductions (Indian statutory compliance)
    const pfEmployee = (toNumber(structure.pfEmployee) / 100) * basicPay;
    const pfEmployer = (toNumber(structure.pfEmployer) / 100) * basicPay;
    const esiEmployee = grossEarnings <= 21000 ? (toNumber(structure.esiEmployee) / 100) * grossEarnings : 0;
    const esiEmployer = grossEarnings <= 21000 ? (toNumber(structure.esiEmployer) / 100) * grossEarnings : 0;
    const tds = (toNumber(structure.tds) / 100) * grossEarnings;
    const professionalTax = toNumber(structure.professionalTax);

    const totalDeductions = pfEmployee + esiEmployee + tds + professionalTax;
    const netPay = grossEarnings - totalDeductions;

    await prisma.payslip.create({
      data: {
        tenantId,
        employeeId: emp.id,
        structureId: structure.id,
        month,
        year,
        workingDays,
        presentDays: workingDays,
        leaveDays: 0,
        basicPay: Math.round(basicPay * 100) / 100,
        hra: Math.round(hra * 100) / 100,
        da: Math.round(da * 100) / 100,
        specialAllowance: Math.round(specialAllowance * 100) / 100,
        grossEarnings: Math.round(grossEarnings * 100) / 100,
        pfEmployee: Math.round(pfEmployee * 100) / 100,
        pfEmployer: Math.round(pfEmployer * 100) / 100,
        esiEmployee: Math.round(esiEmployee * 100) / 100,
        esiEmployer: Math.round(esiEmployer * 100) / 100,
        tds: Math.round(tds * 100) / 100,
        professionalTax: Math.round(professionalTax * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        status: "GENERATED",
      },
    });

    generated.push(emp.id);
  }

  logAudit({
    tenantId,
    userId,
    action: "payslip.bulk_generate",
    entity: "Payslip",
    entityId: `${year}-${month}`,
    metadata: { month, year, count: generated.length },
  });

  revalidatePath("/finance/payroll");
  return { generated: generated.length, skipped: existingIds.size };
}

export async function approvePayslip(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const payslip = await prisma.payslip.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!payslip) throw new Error("Payslip not found");
  if (payslip.status !== "GENERATED" && payslip.status !== "DRAFT") {
    throw new Error("Only generated or draft payslips can be approved");
  }

  await prisma.payslip.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  logAudit({
    tenantId,
    userId,
    action: "payslip.approve",
    entity: "Payslip",
    entityId: id,
    metadata: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year },
  });

  revalidatePath("/finance/payroll");
}

export async function markPayslipPaid(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const payslip = await prisma.payslip.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!payslip) throw new Error("Payslip not found");
  if (payslip.status !== "APPROVED") {
    throw new Error("Only approved payslips can be marked as paid");
  }

  await prisma.payslip.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });

  logAudit({
    tenantId,
    userId,
    action: "payslip.paid",
    entity: "Payslip",
    entityId: id,
    metadata: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year },
  });

  revalidatePath("/finance/payroll");
}

// ============================================================================
// VENDOR BILLS (FIN-E-001-003)
// ============================================================================

export async function getVendorBills(filters?: {
  status?: BillStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
        OR: [
          { billNo: { contains: filters.search, mode: "insensitive" as const } },
          { vendorName: { contains: filters.search, mode: "insensitive" as const } },
          { description: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.vendorBill.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vendorBill.count({ where }),
  ]);

  const serializedData = data.map((bill) => ({
    ...bill,
    amount: toNumber(bill.amount),
    taxAmount: toNumber(bill.taxAmount),
    total: toNumber(bill.total),
    paidAmount: toNumber(bill.paidAmount),
  }));

  return { data: serializedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createVendorBill(data: {
  vendorName: string;
  vendorGst?: string;
  description?: string;
  amount: number;
  taxAmount?: number;
  dueDate?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.vendorBill.count({ where: tenantScope(tenantId) });
  const billNo = `BILL-${String(count + 1).padStart(5, "0")}`;

  const taxAmount = data.taxAmount ?? 0;
  const total = data.amount + taxAmount;

  const bill = await prisma.vendorBill.create({
    data: {
      tenantId,
      billNo,
      vendorName: data.vendorName,
      vendorGst: data.vendorGst || null,
      description: data.description || null,
      amount: data.amount,
      taxAmount,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "vendor_bill.create",
    entity: "VendorBill",
    entityId: bill.id,
    metadata: { billNo, vendorName: data.vendorName, total },
  });

  revalidatePath("/finance/bills");
  return {
    ...bill,
    amount: toNumber(bill.amount),
    taxAmount: toNumber(bill.taxAmount),
    total: toNumber(bill.total),
    paidAmount: toNumber(bill.paidAmount),
  };
}

export async function approveVendorBill(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const bill = await prisma.vendorBill.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!bill) throw new Error("Bill not found");
  if (bill.status !== "PENDING") throw new Error("Only pending bills can be approved");

  await prisma.vendorBill.update({
    where: { id },
    data: { status: "APPROVED", approvedById: userId },
  });

  logAudit({
    tenantId,
    userId,
    action: "vendor_bill.approve",
    entity: "VendorBill",
    entityId: id,
    metadata: { billNo: bill.billNo },
  });

  revalidatePath("/finance/bills");
}

export async function payVendorBill(id: string, amount: number) {
  const { userId, tenantId } = await getSessionOrThrow();

  const bill = await prisma.vendorBill.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!bill) throw new Error("Bill not found");
  if (bill.status !== "APPROVED" && bill.status !== "PARTIALLY_PAID") {
    throw new Error("Only approved or partially paid bills can receive payments");
  }

  const currentPaid = toNumber(bill.paidAmount);
  const totalAmount = toNumber(bill.total);
  const newPaidAmount = currentPaid + amount;

  let newStatus: BillStatus;
  if (newPaidAmount >= totalAmount) {
    newStatus = "PAID";
  } else {
    newStatus = "PARTIALLY_PAID";
  }

  await prisma.vendorBill.update({
    where: { id },
    data: {
      paidAmount: Math.min(newPaidAmount, totalAmount),
      status: newStatus,
      ...(newStatus === "PAID" ? { paidAt: new Date() } : {}),
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "vendor_bill.pay",
    entity: "VendorBill",
    entityId: id,
    metadata: { billNo: bill.billNo, amount, newPaidAmount, newStatus },
  });

  revalidatePath("/finance/bills");
}

// ============================================================================
// MULTI-CURRENCY EXCHANGE RATES (FIN-A-006)
// ============================================================================

export async function getExchangeRatesList(baseCurrency: string = "INR") {
  await getSessionOrThrow();
  const { getExchangeRates } = await import("@/lib/exchange-rates");
  const rates = await getExchangeRates(baseCurrency);
  return {
    rates,
    baseCurrency,
    lastUpdated: new Date().toISOString(),
  };
}

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  await getSessionOrThrow();
  const { convertCurrency } = await import("@/lib/exchange-rates");
  return convertCurrency(amount, fromCurrency, toCurrency);
}

// ============================================================================
// FINANCIAL DOCUMENTS (FIN-F-001-003)
// ============================================================================

export async function getFinancialDocuments(filters?: {
  type?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.search
      ? {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" as const } },
          { fileName: { contains: filters.search, mode: "insensitive" as const } },
          { reference: { contains: filters.search, mode: "insensitive" as const } },
          { tags: { has: filters.search } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.financialDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financialDocument.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createFinancialDocument(data: {
  title: string;
  type: string;
  category?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  reference?: string;
  tags?: string[];
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const document = await prisma.financialDocument.create({
    data: {
      tenantId,
      title: data.title,
      type: data.type,
      category: data.category || null,
      fileName: data.fileName,
      fileSize: data.fileSize || 0,
      mimeType: data.mimeType || "application/pdf",
      reference: data.reference || null,
      uploadedById: userId,
      tags: data.tags || [],
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "financial_document.create",
    entity: "FinancialDocument",
    entityId: document.id,
    metadata: { title: data.title, type: data.type },
  });

  revalidatePath("/finance/documents");
  return document;
}

export async function deleteFinancialDocument(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const doc = await prisma.financialDocument.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!doc) throw new Error("Document not found");

  await prisma.financialDocument.delete({ where: { id } });

  logAudit({
    tenantId,
    userId,
    action: "financial_document.delete",
    entity: "FinancialDocument",
    entityId: id,
    metadata: { title: doc.title },
  });

  revalidatePath("/finance/documents");
}

export async function updateFinancialDocument(
  id: string,
  data: {
    title: string;
    type: string;
    category?: string;
    reference?: string;
    tags?: string[];
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const doc = await prisma.financialDocument.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!doc) throw new Error("Document not found");

  const updated = await prisma.financialDocument.update({
    where: { id },
    data: {
      title: data.title,
      type: data.type,
      category: data.category || null,
      reference: data.reference || null,
      tags: data.tags || [],
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "financial_document.update",
    entity: "FinancialDocument",
    entityId: id,
    metadata: { title: data.title, type: data.type },
  });

  revalidatePath("/finance/documents");
  return updated;
}

// ============================================================================
// FINANCE OVERVIEW STATS
// ============================================================================

export async function getFinanceStats() {
  const { tenantId } = await getSessionOrThrow();

  const [accounts, expenses, bills, payslips] = await Promise.all([
    prisma.gLAccount.findMany({
      where: { ...tenantScope(tenantId), isActive: true },
      select: { type: true, balance: true },
    }),
    prisma.expense.aggregate({
      where: { ...tenantScope(tenantId), status: "APPROVED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.vendorBill.aggregate({
      where: { ...tenantScope(tenantId), status: { in: ["PENDING", "APPROVED", "PARTIALLY_PAID"] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.payslip.aggregate({
      where: { ...tenantScope(tenantId), status: { in: ["GENERATED", "APPROVED"] } },
      _sum: { netPay: true },
      _count: true,
    }),
  ]);

  const totalRevenue = accounts
    .filter((a) => a.type === "REVENUE")
    .reduce((sum, a) => sum + Math.abs(toNumber(a.balance)), 0);
  const totalExpenses = accounts
    .filter((a) => a.type === "EXPENSE")
    .reduce((sum, a) => sum + Math.abs(toNumber(a.balance)), 0);
  const totalAssets = accounts
    .filter((a) => a.type === "ASSET")
    .reduce((sum, a) => sum + toNumber(a.balance), 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === "LIABILITY")
    .reduce((sum, a) => sum + Math.abs(toNumber(a.balance)), 0);

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    totalAssets,
    totalLiabilities,
    pendingExpenses: toNumber(expenses._sum.amount),
    pendingExpenseCount: expenses._count,
    outstandingBills: toNumber(bills._sum.total),
    outstandingBillCount: bills._count,
    pendingPayroll: toNumber(payslips._sum.netPay),
    pendingPayrollCount: payslips._count,
    accountCount: accounts.length,
  };
}

// ============================================================================
// CREDIT/DEBIT NOTES (FIN-B-005)
// ============================================================================

export async function getCreditNotes(filters?: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.type ? { type: filters.type as any } : {}),
    ...(filters?.status ? { status: filters.status as any } : {}),
    ...(filters?.search
      ? {
        OR: [
          { noteNo: { contains: filters.search, mode: "insensitive" as const } },
          { reason: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.creditNote.findMany({
      where: where as any,
      include: {
        invoice: { select: { id: true, invoiceNo: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.creditNote.count({ where: where as any }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createCreditNote(data: {
  type?: string;
  invoiceId?: string;
  contactId?: string;
  reason: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  taxAmount?: number;
  notes?: string;
  issueDate?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.creditNote.count({ where: tenantScope(tenantId) });
  const prefix = data.type === "DEBIT" ? "DN" : "CN";
  const noteNo = `${prefix}-${String(count + 1).padStart(5, "0")}`;

  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = data.taxAmount ?? 0;
  const total = subtotal + taxAmount;

  const note = await prisma.creditNote.create({
    data: {
      tenantId,
      noteNo,
      type: (data.type as "CREDIT" | "DEBIT") ?? "CREDIT",
      invoiceId: data.invoiceId || null,
      contactId: data.contactId || null,
      reason: data.reason,
      items: data.items,
      subtotal,
      taxAmount,
      total,
      notes: data.notes || null,
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      createdById: userId,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "credit_note.create",
    entity: "CreditNote",
    entityId: note.id,
    metadata: { noteNo, type: data.type ?? "CREDIT", total },
  });

  revalidatePath("/finance/credit-notes");
  return note;
}

export async function updateCreditNote(
  id: string,
  data: { status?: string; notes?: string }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.creditNote.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Credit note not found");

  await prisma.creditNote.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    } as any,
  });

  logAudit({
    tenantId,
    userId,
    action: "credit_note.update",
    entity: "CreditNote",
    entityId: id,
    metadata: { noteNo: existing.noteNo, ...data },
  });

  revalidatePath("/finance/credit-notes");
}

export async function deleteCreditNote(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.creditNote.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Credit note not found");
  if (existing.status !== "DRAFT") throw new Error("Only draft credit notes can be deleted");

  await prisma.creditNote.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  logAudit({
    tenantId,
    userId,
    action: "credit_note.delete",
    entity: "CreditNote",
    entityId: id,
    metadata: { noteNo: existing.noteNo },
  });

  revalidatePath("/finance/credit-notes");
}

// ============================================================================
// BANK TRANSFER FILE GENERATION (FIN-D-006)
// ============================================================================

export async function generateBankTransferFile(filters: {
  month: number;
  year: number;
}) {
  const { tenantId } = await getSessionOrThrow();

  const payslips = await prisma.payslip.findMany({
    where: {
      ...tenantScope(tenantId),
      month: filters.month,
      year: filters.year,
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
    throw new Error("No approved payslips found for the selected period");
  }

  const rows: string[] = [];
  // CSV header
  rows.push("Beneficiary Name,Account No,IFSC Code,Bank Name,Amount,Remarks");

  let totalAmount = 0;
  let recordCount = 0;

  for (const slip of payslips) {
    const emp = slip.employee;
    const beneficiaryName = `${emp.firstName} ${emp.lastName ?? ""}`.trim();
    const accountNo = emp.bankAccountNo ?? "";
    const ifsc = emp.ifscCode ?? "";
    const bankName = emp.bankName ?? "";
    const netPay = toNumber(slip.netPay);
    const remarks = `Salary ${filters.month}/${filters.year} - ${emp.employeeId}`;

    // Escape CSV fields that might contain commas
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

    totalAmount += netPay;
    recordCount++;
  }

  const csv = rows.join("\n");

  return {
    csv,
    summary: {
      totalRecords: recordCount,
      totalAmount: Math.round(totalAmount * 100) / 100,
      month: filters.month,
      year: filters.year,
    },
  };
}

// ============================================================================
// ONLINE PAYMENTS (Razorpay / Stripe)
// ============================================================================

export async function getOnlinePayments(filters?: {
  search?: string;
  method?: "RAZORPAY" | "STRIPE";
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const onlineMethods: PaymentMethod[] = ["RAZORPAY", "STRIPE"];

  const where = {
    invoice: { ...tenantScope(tenantId) },
    method: filters?.method
      ? (filters.method as PaymentMethod)
      : { in: onlineMethods },
    ...(filters?.search
      ? {
        OR: [
          {
            reference: {
              contains: filters.search,
              mode: "insensitive" as const,
            },
          },
          {
            invoice: {
              invoiceNo: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: { id: true, invoiceNo: true, contactId: true, status: true },
        },
      },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: data.map((p) => ({
      id: p.id,
      invoiceId: p.invoice.id,
      invoiceNo: p.invoice.invoiceNo,
      invoiceStatus: p.invoice.status,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      paidAt: p.paidAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================================
// VENDOR BILLS CRUD ACTIONS (ADDITIONS)
// ============================================================================

export async function updateVendorBill(
  id: string,
  data: {
    vendorName?: string;
    vendorGst?: string;
    description?: string;
    amount?: number;
    taxAmount?: number;
    dueDate?: string;
    notes?: string;
    status?: BillStatus;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.vendorBill.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Bill not found");

  const amount = data.amount !== undefined ? data.amount : toNumber(existing.amount);
  const taxAmount = data.taxAmount !== undefined ? data.taxAmount : toNumber(existing.taxAmount);
  const total = amount + taxAmount;

  const bill = await prisma.vendorBill.update({
    where: { id },
    data: {
      ...(data.vendorName !== undefined ? { vendorName: data.vendorName } : {}),
      ...(data.vendorGst !== undefined ? { vendorGst: data.vendorGst } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.taxAmount !== undefined ? { taxAmount: data.taxAmount } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      total,
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "vendor_bill.update",
    entity: "VendorBill",
    entityId: id,
    metadata: { billNo: bill.billNo, vendorName: bill.vendorName, total },
  });

  revalidatePath("/finance/bills");
  return {
    ...bill,
    amount: toNumber(bill.amount),
    taxAmount: toNumber(bill.taxAmount),
    total: toNumber(bill.total),
    paidAmount: toNumber(bill.paidAmount),
  };
}

export async function deleteVendorBill(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.vendorBill.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Bill not found");

  await prisma.vendorBill.delete({
    where: { id },
  });

  logAudit({
    tenantId,
    userId,
    action: "vendor_bill.delete",
    entity: "VendorBill",
    entityId: id,
    metadata: { billNo: existing.billNo },
  });

  revalidatePath("/finance/bills");
}

// ============================================================================
// PAYSLIP CRUD ACTIONS (ADDITIONS)
// ============================================================================

export async function updatePayslip(
  id: string,
  data: {
    basicPay?: number;
    hra?: number;
    da?: number;
    specialAllowance?: number;
    pfEmployee?: number;
    pfEmployer?: number;
    esiEmployee?: number;
    esiEmployer?: number;
    tds?: number;
    professionalTax?: number;
    status?: PayslipStatus;
  }
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.payslip.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Payslip not found");

  const basicPay = data.basicPay !== undefined ? data.basicPay : toNumber(existing.basicPay);
  const hra = data.hra !== undefined ? data.hra : toNumber(existing.hra);
  const da = data.da !== undefined ? data.da : toNumber(existing.da);
  const specialAllowance = data.specialAllowance !== undefined ? data.specialAllowance : toNumber(existing.specialAllowance);
  const grossEarnings = basicPay + hra + da + specialAllowance;

  const pfEmployee = data.pfEmployee !== undefined ? data.pfEmployee : toNumber(existing.pfEmployee);
  const pfEmployer = data.pfEmployer !== undefined ? data.pfEmployer : toNumber(existing.pfEmployer);
  const esiEmployee = data.esiEmployee !== undefined ? data.esiEmployee : toNumber(existing.esiEmployee);
  const esiEmployer = data.esiEmployer !== undefined ? data.esiEmployer : toNumber(existing.esiEmployer);
  const tds = data.tds !== undefined ? data.tds : toNumber(existing.tds);
  const professionalTax = data.professionalTax !== undefined ? data.professionalTax : toNumber(existing.professionalTax);
  const totalDeductions = pfEmployee + esiEmployee + tds + professionalTax;

  const netPay = grossEarnings - totalDeductions;

  const payslip = await prisma.payslip.update({
    where: { id },
    data: {
      ...(data.basicPay !== undefined ? { basicPay: data.basicPay } : {}),
      ...(data.hra !== undefined ? { hra: data.hra } : {}),
      ...(data.da !== undefined ? { da: data.da } : {}),
      ...(data.specialAllowance !== undefined ? { specialAllowance: data.specialAllowance } : {}),
      grossEarnings,
      ...(data.pfEmployee !== undefined ? { pfEmployee: data.pfEmployee } : {}),
      ...(data.pfEmployer !== undefined ? { pfEmployer: data.pfEmployer } : {}),
      ...(data.esiEmployee !== undefined ? { esiEmployee: data.esiEmployee } : {}),
      ...(data.esiEmployer !== undefined ? { esiEmployer: data.esiEmployer } : {}),
      ...(data.tds !== undefined ? { tds: data.tds } : {}),
      ...(data.professionalTax !== undefined ? { professionalTax: data.professionalTax } : {}),
      totalDeductions,
      netPay,
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  logAudit({
    tenantId,
    userId,
    action: "payslip.update",
    entity: "Payslip",
    entityId: id,
    metadata: { employeeId: payslip.employeeId, month: payslip.month, year: payslip.year },
  });

  revalidatePath("/finance/payroll");
  return payslip;
}

export async function deletePayslip(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const existing = await prisma.payslip.findFirst({
    where: { id, ...tenantScope(tenantId) },
  });
  if (!existing) throw new Error("Payslip not found");

  await prisma.payslip.delete({
    where: { id },
  });

  logAudit({
    tenantId,
    userId,
    action: "payslip.delete",
    entity: "Payslip",
    entityId: id,
    metadata: { employeeId: existing.employeeId, month: existing.month, year: existing.year },
  });

  revalidatePath("/finance/payroll");
}

