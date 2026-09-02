import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { BranchesView } from "@/components/branches/BranchesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function BranchesPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const rawBranches = await prisma.branch.findMany({
    where: { instituteId },
    include: {
      _count: {
        select: {
          students: true,
          batches: true,
          admissions: true,
          expenses: true,
        },
      },
      students: {
        select: {
          id: true,
          totalFee: true,
          paidFee: true,
          payments: {
            select: { amount: true },
          },
        },
      },
      expenses: {
        select: { amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const initialBranches = rawBranches.map((b) => {
    const totalCollected = b.students.reduce((sum, s) => {
      const studentPayments = s.payments.reduce((pSum, p) => pSum + Number(p.amount), 0);
      return sum + studentPayments;
    }, 0);

    const totalCommittedFee = b.students.reduce((sum, s) => sum + Number(s.totalFee), 0);
    const totalPaidFee = b.students.reduce((sum, s) => sum + Number(s.paidFee), 0);
    const totalPendingFee = Math.max(0, totalCommittedFee - totalPaidFee);

    const totalExpenses = b.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalCollected - totalExpenses;

    return {
      id: b.id,
      name: b.name,
      city: b.city,
      state: b.state,
      address: b.address,
      contact: b.contact,
      guidePhone: b.guidePhone,
      isMainBranch: Boolean(b.isMainBranch || (rawBranches.length > 0 && !rawBranches.some((x) => x.isMainBranch) && (b.name.toLowerCase().includes("main") || rawBranches[0].id === b.id))),
      status: b.status,
      studentCount: b._count.students,
      batchCount: b._count.batches,
      leadCount: b._count.admissions,
      expenseCount: b._count.expenses,
      totalCollected,
      totalPendingFee,
      totalExpenses,
      netProfit,
    };
  });

  return (
    <Shell title="Branches & Campuses" userName={session?.user?.name ?? undefined}>
      <BranchesView initialBranches={initialBranches} />
    </Shell>
  );
}
