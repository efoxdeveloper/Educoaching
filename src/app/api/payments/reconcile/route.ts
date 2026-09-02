import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { reconcilePendingTransactions } from "@/lib/reconciliation";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const [transactions, totalCount, pendingCount, successCount, failedCount] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: { instituteId: ctx.instituteId },
      include: {
        student: {
          select: { id: true, name: true, mobile: true, course: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentTransaction.count({ where: { instituteId: ctx.instituteId } }),
    prisma.paymentTransaction.count({ where: { instituteId: ctx.instituteId, status: "PENDING" } }),
    prisma.paymentTransaction.count({ where: { instituteId: ctx.instituteId, status: "SUCCESS" } }),
    prisma.paymentTransaction.count({ where: { instituteId: ctx.instituteId, status: "FAILED" } }),
  ]);

  return NextResponse.json({
    transactions,
    stats: {
      total: totalCount,
      pending: pendingCount,
      success: successCount,
      failed: failedCount,
      reconciliationRate: totalCount > 0 ? Math.round(((successCount + failedCount) / totalCount) * 100) : 100,
    },
  });
}

export async function POST() {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;

  const result = await reconcilePendingTransactions(ctx.instituteId);
  return NextResponse.json(result);
}
