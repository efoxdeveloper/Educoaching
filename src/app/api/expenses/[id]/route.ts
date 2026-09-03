import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { ExpenseCategory } from "@prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...expense,
    amount: expense.amount.toString(),
    expenseDate: expense.expenseDate.toISOString(),
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("expenses:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.expense.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, amount, category, paymentMethod, expenseDate, paidTo, notes, receiptUrl } = body;

  const validCategory =
    category && Object.values(ExpenseCategory).includes(category) ? category : existing.category;

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: {
      title: title ? title.trim() : existing.title,
      amount: amount !== undefined ? Number(amount) : existing.amount,
      category: validCategory,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
      expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
      paidTo: paidTo !== undefined ? paidTo?.trim() : existing.paidTo,
      notes: notes !== undefined ? notes?.trim() : existing.notes,
      receiptUrl: receiptUrl !== undefined ? receiptUrl : existing.receiptUrl,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "EXPENSE_UPDATED",
    entityType: "Expense",
    entityId: updated.id,
    metadata: {
      title: updated.title,
      amount: Number(updated.amount),
      category: updated.category,
    },
  });

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toString(),
    expenseDate: updated.expenseDate.toISOString(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("expenses:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.expense.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.expense.delete({
    where: { id: params.id },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "EXPENSE_DELETED",
    entityType: "Expense",
    entityId: params.id,
    metadata: {
      title: existing.title,
      amount: Number(existing.amount),
    },
  });

  return NextResponse.json({ ok: true, id: params.id });
}
