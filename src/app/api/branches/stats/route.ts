import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  // Aggregate view — Owner/Admin-only (STAFF/ACCOUNTANT etc must not see cross-branch summary)
  const role = String((ctx as any).role || (ctx.session?.user as any)?.role || "").toUpperCase();
  if (!["OWNER", "ADMIN", "PLATFORM_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden: Only Owner/Admin can view branch stats" }, { status: 403 });
  }

  const branches = await prisma.branch.findMany({
    where: { instituteId: ctx.instituteId },
    include: {
      _count: {
        select: {
          students: true,
          batches: true,
          admissions: true,
          expenses: true,
          incomes: true,
        },
      },
      students: {
        select: {
          id: true,
          totalFee: true,
          paidFee: true,
          payments: {
            select: { amount: true, isRefund: true },
          },
        },
      },
      expenses: {
        select: { amount: true },
      },
      incomes: {
        select: { amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const stats = branches.map((b) => {
    const totalCollected = b.students.reduce((sum, s) => {
      const studentPayments = s.payments.reduce((pSum, p) => {
        const amt = Number(p.amount);
        return p.isRefund ? pSum - amt : pSum + amt;
      }, 0);
      return sum + studentPayments;
    }, 0);

    const totalCommittedFee = b.students.reduce((sum, s) => sum + Number(s.totalFee), 0);
    const totalPaidFee = b.students.reduce((sum, s) => sum + Number(s.paidFee), 0);
    const totalPendingFee = Math.max(0, totalCommittedFee - totalPaidFee);

    const totalExtraIncome = b.incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = b.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRevenue = totalCollected + totalExtraIncome;
    const netProfit = totalRevenue - totalExpenses;

    return {
      id: b.id,
      name: b.name,
      city: b.city,
      state: b.state,
      address: b.address,
      contact: b.contact,
      guidePhone: b.guidePhone,
      isMainBranch: Boolean(b.isMainBranch),
      status: b.status,
      studentCount: b._count.students,
      batchCount: b._count.batches,
      leadCount: b._count.admissions,
      expenseCount: b._count.expenses,
      incomeCount: b._count.incomes,
      totalCollected,
      totalExtraIncome,
      totalPendingFee,
      totalExpenses,
      netProfit,
      createdAt: b.createdAt.toISOString(),
    };
  });

  return NextResponse.json(stats);
}
