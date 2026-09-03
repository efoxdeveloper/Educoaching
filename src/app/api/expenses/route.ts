import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { ExpenseCategory, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden: insufficient permissions for expenses" }, { status: 403 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const paymentMethod = url.searchParams.get("paymentMethod");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const search = url.searchParams.get("search");

  const where: Prisma.ExpenseWhereInput = { instituteId: ctx.instituteId, branchId: ctx.branchId as string };

  if (category && Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
    where.category = category as ExpenseCategory;
  }
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) where.expenseDate.lte = new Date(endDate);
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { paidTo: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { expenseDate: "desc" },
  });

  // Calculate stats for the current institute
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [allMonthExpenses, allExpensesSum] = await Promise.all([
    prisma.expense.findMany({
      where: {
        instituteId: ctx.instituteId,
        branchId: ctx.branchId as string,
        expenseDate: { gte: firstOfThisMonth, lt: nextMonth },
      },
      select: { amount: true, category: true, paymentMethod: true },
    }),
    prisma.expense.aggregate({
      where: { instituteId: ctx.instituteId, branchId: ctx.branchId as string },
      _sum: { amount: true },
    }),
  ]);

  const thisMonthTotal = allMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const filteredTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category
  const categoryBreakdown: Record<string, { total: number; count: number }> = {};
  for (const e of expenses) {
    if (!categoryBreakdown[e.category]) {
      categoryBreakdown[e.category] = { total: 0, count: 0 };
    }
    categoryBreakdown[e.category].total += Number(e.amount);
    categoryBreakdown[e.category].count += 1;
  }

  // Cash vs Digital
  let cashOutflow = 0;
  let digitalOutflow = 0;
  for (const e of expenses) {
    const amt = Number(e.amount);
    if (e.paymentMethod.toLowerCase() === "cash") {
      cashOutflow += amt;
    } else {
      digitalOutflow += amt;
    }
  }

  return NextResponse.json({
    expenses: expenses.map((e) => ({
      ...e,
      amount: e.amount.toString(),
      expenseDate: e.expenseDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
    summary: {
      filteredTotal,
      thisMonthTotal,
      allTimeTotal: Number(allExpensesSum._sum.amount || 0),
      categoryBreakdown,
      cashOutflow,
      digitalOutflow,
    },
  });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("expenses:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { title, amount, category, paymentMethod = "Cash", expenseDate, paidTo, notes, receiptUrl } = body;

  if (!title || !amount || Number(amount) <= 0 || !expenseDate) {
    return NextResponse.json({ error: "Title, positive amount, and expense date are required." }, { status: 400 });
  }

  const validCategory = Object.values(ExpenseCategory).includes(category) ? category : "OTHER";

  const user = ctx.session.user as { id?: string; name?: string; role?: string };

  const expense = await prisma.expense.create({
    data: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId as string,
      title: title.trim(),
      amount: Number(amount),
      category: validCategory,
      paymentMethod,
      expenseDate: new Date(expenseDate),
      paidTo: paidTo ? paidTo.trim() : null,
      notes: notes ? notes.trim() : null,
      receiptUrl: receiptUrl || null,
      createdByUserId: user.id || null,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "EXPENSE_RECORDED",
    entityType: "Expense",
    entityId: expense.id,
    metadata: {
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category,
      paymentMethod: expense.paymentMethod,
    },
  });

  return NextResponse.json(
    {
      ...expense,
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate.toISOString(),
      createdAt: expense.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
