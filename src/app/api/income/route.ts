import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { IncomeCategory, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden: insufficient permissions for income records" }, { status: 403 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const paymentMethod = url.searchParams.get("paymentMethod");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const search = url.searchParams.get("search");

  const where: Prisma.IncomeWhereInput = { instituteId: ctx.instituteId, branchId: ctx.branchId as string };

  if (category && Object.values(IncomeCategory).includes(category as IncomeCategory)) {
    where.category = category as IncomeCategory;
  }
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }
  if (startDate || endDate) {
    where.incomeDate = {};
    if (startDate) where.incomeDate.gte = new Date(startDate);
    if (endDate) where.incomeDate.lte = new Date(endDate);
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { receivedFrom: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const incomes = await prisma.income.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { incomeDate: "desc" },
  });

  // Stats for the current institute
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [allMonthIncomes, allIncomesSum] = await Promise.all([
    prisma.income.findMany({
      where: {
        instituteId: ctx.instituteId,
        branchId: ctx.branchId as string,
        incomeDate: { gte: firstOfThisMonth, lt: nextMonth },
      },
      select: { amount: true, category: true, paymentMethod: true },
    }),
    prisma.income.aggregate({
      where: { instituteId: ctx.instituteId, branchId: ctx.branchId as string },
      _sum: { amount: true },
    }),
  ]);

  const thisMonthTotal = allMonthIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const filteredTotal = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  // Group by category
  const categoryBreakdown: Record<string, { total: number; count: number }> = {};
  for (const i of incomes) {
    if (!categoryBreakdown[i.category]) {
      categoryBreakdown[i.category] = { total: 0, count: 0 };
    }
    categoryBreakdown[i.category].total += Number(i.amount);
    categoryBreakdown[i.category].count += 1;
  }

  // Cash vs Digital
  let cashInflow = 0;
  let digitalInflow = 0;
  for (const i of incomes) {
    const amt = Number(i.amount);
    if (i.paymentMethod.toLowerCase() === "cash") {
      cashInflow += amt;
    } else {
      digitalInflow += amt;
    }
  }

  return NextResponse.json({
    incomes: incomes.map((i) => ({
      ...i,
      amount: i.amount.toString(),
      incomeDate: i.incomeDate.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
    summary: {
      filteredTotal,
      thisMonthTotal,
      allTimeTotal: Number(allIncomesSum._sum.amount || 0),
      categoryBreakdown,
      cashInflow,
      digitalInflow,
    },
  });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("income:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { title, amount, category, paymentMethod = "Cash", incomeDate, receivedFrom, notes, receiptUrl } = body;

  if (!title || !amount || Number(amount) <= 0 || !incomeDate) {
    return NextResponse.json({ error: "Title, positive amount, and income date are required." }, { status: 400 });
  }

  const validCategory = Object.values(IncomeCategory).includes(category) ? category : "OTHER";
  const user = ctx.session.user as { id?: string; name?: string; role?: string };

  const income = await prisma.income.create({
    data: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId as string,
      title: title.trim(),
      amount: Number(amount),
      category: validCategory,
      paymentMethod,
      incomeDate: new Date(incomeDate),
      receivedFrom: receivedFrom ? receivedFrom.trim() : null,
      notes: notes ? notes.trim() : null,
      receiptUrl: receiptUrl || null,
      createdByUserId: user.id || null,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "INCOME_RECORDED",
    entityType: "Income",
    entityId: income.id,
    metadata: {
      title: income.title,
      amount: Number(income.amount),
      category: income.category,
      paymentMethod: income.paymentMethod,
    },
  });

  return NextResponse.json(
    {
      ...income,
      amount: income.amount.toString(),
      incomeDate: income.incomeDate.toISOString(),
      createdAt: income.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
