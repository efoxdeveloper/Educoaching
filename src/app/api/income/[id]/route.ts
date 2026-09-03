import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { IncomeCategory } from "@prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const income = await prisma.income.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!income) {
    return NextResponse.json({ error: "Income record not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...income,
    amount: income.amount.toString(),
    incomeDate: income.incomeDate.toISOString(),
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("income:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.income.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Income record not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, amount, category, paymentMethod, incomeDate, receivedFrom, notes, receiptUrl } = body;

  const validCategory =
    category && Object.values(IncomeCategory).includes(category) ? category : existing.category;

  const updated = await prisma.income.update({
    where: { id: params.id },
    data: {
      title: title ? title.trim() : existing.title,
      amount: amount !== undefined ? Number(amount) : existing.amount,
      category: validCategory,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
      incomeDate: incomeDate ? new Date(incomeDate) : existing.incomeDate,
      receivedFrom: receivedFrom !== undefined ? receivedFrom?.trim() : existing.receivedFrom,
      notes: notes !== undefined ? notes?.trim() : existing.notes,
      receiptUrl: receiptUrl !== undefined ? receiptUrl : existing.receiptUrl,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "INCOME_UPDATED",
    entityType: "Income",
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
    incomeDate: updated.incomeDate.toISOString(),
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("income:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.income.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Income record not found" }, { status: 404 });
  }

  await prisma.income.delete({
    where: { id: params.id },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "INCOME_DELETED",
    entityType: "Income",
    entityId: params.id,
    metadata: {
      title: existing.title,
      amount: Number(existing.amount),
      category: existing.category,
    },
  });

  return NextResponse.json({ ok: true });
}
