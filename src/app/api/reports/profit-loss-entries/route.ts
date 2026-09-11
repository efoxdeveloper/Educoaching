import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as "income" | "expense" | null;
  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
  }

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category") || "";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const branchId = ctx.branchId as string;
  const instituteId = ctx.instituteId;

  const branchFilter = branchId ? { branchId } : {};

  try {
    if (type === "income") {
      const where: any = { instituteId, ...branchFilter };
      if (category && category !== "ALL") where.category = category;
      if (startDate || endDate) {
        where.incomeDate = {};
        if (startDate) where.incomeDate.gte = startOfDay(new Date(startDate));
        if (endDate) where.incomeDate.lte = endOfDay(new Date(endDate));
      }
      if (q) {
        // Search across title, receivedFrom, notes, category
        where.OR = [
          { title: { contains: q, mode: "insensitive" as const } },
          { receivedFrom: { contains: q, mode: "insensitive" as const } },
          { notes: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.income.findMany({
          where,
          include: { createdBy: { select: { name: true } }, branch: { select: { name: true } } },
          orderBy: { incomeDate: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.income.count({ where }),
      ]);

      const incomes = rows.map((i: any) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        categoryLabel: i.category, // will be mapped in frontend via incomeCategoryNames, keep raw for now
        paymentMethod: i.paymentMethod,
        amount: Number(i.amount),
        incomeDate: i.incomeDate.toISOString(),
        receivedFrom: i.receivedFrom,
        notes: i.notes,
        createdByName: i.createdBy?.name || null,
        branchName: i.branch?.name || null,
      }));

      return NextResponse.json({
        entries: incomes,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } else {
      const where: any = { instituteId, ...branchFilter };
      if (category && category !== "ALL") where.category = category;
      if (startDate || endDate) {
        where.expenseDate = {};
        if (startDate) where.expenseDate.gte = startOfDay(new Date(startDate));
        if (endDate) where.expenseDate.lte = endOfDay(new Date(endDate));
      }
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" as const } },
          { paidTo: { contains: q, mode: "insensitive" as const } },
          { notes: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          include: { createdBy: { select: { name: true } }, branch: { select: { name: true } } },
          orderBy: { expenseDate: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.expense.count({ where }),
      ]);

      const expenses = rows.map((e: any) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        categoryLabel: e.category,
        paymentMethod: e.paymentMethod,
        amount: Number(e.amount),
        expenseDate: e.expenseDate.toISOString(),
        paidTo: e.paidTo,
        notes: e.notes,
        createdByName: e.createdBy?.name || null,
        branchName: e.branch?.name || null,
      }));

      return NextResponse.json({
        entries: expenses,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }
  } catch (error) {
    console.error(`Error fetching paginated ${type}:`, error);
    return NextResponse.json({ error: `Failed to fetch ${type}` }, { status: 500 });
  }
}
