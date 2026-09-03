import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

export async function getDashboardData(instituteId: string, branchId?: string | null) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const lastMonth = subMonths(today, 1);
  const lastMonthStart = startOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);

  const studentWhere = { instituteId, ...(branchId ? { branchId } : {}) };
  const batchWhere = {
    instituteId,
    status: "Active",
    ...(branchId ? { OR: [{ branchId }, { branches: { some: { id: branchId } } }] } : {}),
  };
  const paymentStudentWhere = branchId ? { student: { branchId } } : {};

  const [
    totalStudents,
    activeBatches,
    students,
    todaysPayments,
    thisMonthPayments,
    lastMonthPayments,
    thisMonthExpensesAgg,
    recentPayments,
    recentStudents,
    admissions,
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.batch.count({ where: batchWhere }),
    prisma.student.findMany({
      where: studentWhere,
      select: { totalFee: true, paidFee: true, currentPeriodEnd: true, status: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { instituteId, ...paymentStudentWhere, paidAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { instituteId, ...paymentStudentWhere, paidAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { instituteId, ...paymentStudentWhere, paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { instituteId, ...(branchId ? { branchId } : {}), expenseDate: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.payment.findMany({
      where: { instituteId, ...paymentStudentWhere },
      take: 6,
      orderBy: { paidAt: "desc" },
      include: { student: true },
    }),
    prisma.student.findMany({
      where: studentWhere,
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { course: true, batch: true },
    }),
    prisma.admission.findMany({
      where: { instituteId, ...(branchId ? { branchId } : {}) },
      select: {
        id: true,
        applicantName: true,
        stage: true,
        source: true,
        priority: true,
        feePlan: true,
        assignedTo: true,
        lostReason: true,
        demoDate: true,
        demoStatus: true,
        createdAt: true,
      },
    }),
  ]);

  // Fee aggregations & aging calculations
  let totalBilledFee = 0;
  let totalCollectedFee = 0;
  let overdueAmount = 0;
  let dueSoonAmount = 0;

  const inSevenDays = new Date();
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  students.forEach((s) => {
    const total = Number(s.totalFee || 0);
    const paid = Number(s.paidFee || 0);
    const balance = Math.max(0, total - paid);

    totalBilledFee += total;
    totalCollectedFee += paid;

    if (balance > 0) {
      if (s.currentPeriodEnd && new Date(s.currentPeriodEnd) < today) {
        overdueAmount += balance;
      } else if (
        s.currentPeriodEnd &&
        new Date(s.currentPeriodEnd) >= today &&
        new Date(s.currentPeriodEnd) <= inSevenDays
      ) {
        dueSoonAmount += balance;
      }
    }
  });

  const pendingFees = Math.max(0, totalBilledFee - totalCollectedFee);
  const feeRecoveryRate =
    totalBilledFee > 0 ? Math.round((totalCollectedFee / totalBilledFee) * 100) : 0;
  const arpu = totalStudents > 0 ? Math.round(totalCollectedFee / totalStudents) : 0;

  const thisMonthCollection = Number(thisMonthPayments._sum.amount || 0);
  const lastMonthCollection = Number(lastMonthPayments._sum.amount || 0);
  const thisMonthExpenses = Number(thisMonthExpensesAgg._sum.amount || 0);
  const netOperatingCashFlow = thisMonthCollection - thisMonthExpenses;

  // Attendance
  const todaysAttendanceRecords = await prisma.attendance.findMany({
    where: { instituteId, ...(branchId ? { branchId } : {}), date: todayStart },
  });
  const todaysPresent = todaysAttendanceRecords.filter((r) => r.status === "PRESENT").length;
  const todaysAttendancePct =
    todaysAttendanceRecords.length > 0
      ? Math.round((todaysPresent / todaysAttendanceRecords.length) * 100)
      : 0;

  // Last 7 days trends
  const days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));

  const collectionTrend = await Promise.all(
    days.map(async (d) => {
      const sum = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { instituteId, ...(branchId ? { student: { branchId } } : {}), paidAt: { gte: startOfDay(d), lte: endOfDay(d) } },
      });
      return { day: format(d, "EEE"), amount: Number(sum._sum.amount || 0) };
    })
  );

  const attendanceTrend = await Promise.all(
    days.map(async (d) => {
      const records = await prisma.attendance.findMany({
        where: { instituteId, ...(branchId ? { branchId } : {}), date: startOfDay(d) },
      });
      const present = records.filter((r) => r.status === "PRESENT").length;
      const percent = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
      return { day: format(d, "EEE"), percent };
    })
  );

  // CRM Pipeline & Funnel
  const totalLeads = admissions.length;
  const stageCounts: Record<string, number> = {
    NEW: 0,
    CONTACTED: 0,
    DEMO_SCHEDULED: 0,
    COUNSELLING: 0,
    ENROLLED: 0,
    LOST: 0,
  };
  const sourceCounts: Record<string, number> = {};
  const lostReasonCounts: Record<string, number> = {};

  admissions.forEach((a) => {
    const st = a.stage in stageCounts ? a.stage : "NEW";
    stageCounts[st] = (stageCounts[st] || 0) + 1;

    const src = a.source || "WALK_IN";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;

    if (a.lostReason) {
      lostReasonCounts[a.lostReason] = (lostReasonCounts[a.lostReason] || 0) + 1;
    }
  });

  const enrolledCount = stageCounts.ENROLLED || 0;
  const conversionRate =
    totalLeads > 0 ? Number(((enrolledCount / totalLeads) * 100).toFixed(1)) : 0;
  const activePipelineCount =
    stageCounts.NEW + stageCounts.CONTACTED + stageCounts.DEMO_SCHEDULED + stageCounts.COUNSELLING;

  const leadFunnel = [
    { stage: "New Inquiries", count: stageCounts.NEW, color: "#1E3A5F" },
    { stage: "Contacted", count: stageCounts.CONTACTED, color: "#2563EB" },
    { stage: "Demo Classes", count: stageCounts.DEMO_SCHEDULED, color: "#E8A33D" },
    { stage: "Counselling", count: stageCounts.COUNSELLING, color: "#9333EA" },
    { stage: "Enrolled", count: stageCounts.ENROLLED, color: "#16A34A" },
    { stage: "Lost / Dropped", count: stageCounts.LOST, color: "#DC2626" },
  ];

  const leadSources = Object.entries(sourceCounts).map(([source, count]) => ({
    source: source.replace(/_/g, " "),
    count,
  }));

  // Top Counsellor performers
  const counsellorMap: Record<string, { enrolled: number; revenue: number }> = {};
  admissions.forEach((a) => {
    const cName = a.assignedTo?.trim() || "Unassigned";
    if (!counsellorMap[cName]) {
      counsellorMap[cName] = { enrolled: 0, revenue: 0 };
    }
    if (a.stage === "ENROLLED") {
      counsellorMap[cName].enrolled++;
      counsellorMap[cName].revenue += Number(a.feePlan || 0);
    }
  });

  const counsellorLeaderboard = Object.entries(counsellorMap)
    .filter(([name]) => name !== "Unassigned")
    .map(([name, stats]) => ({
      name,
      enrolled: stats.enrolled,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.enrolled - a.enrolled || b.revenue - a.revenue)
    .slice(0, 4);

  return {
    totalStudents,
    activeBatches,
    pendingFees,
    todaysCollection: Number(todaysPayments._sum.amount || 0),
    todaysAttendancePct,
    collectionTrend,
    attendanceTrend,
    recentPayments,
    recentStudents,

    // Phase 2 Financial & Business KPIs
    thisMonthCollection,
    lastMonthCollection,
    thisMonthExpenses,
    netOperatingCashFlow,
    feeRecoveryRate,
    arpu,
    overdueAmount,
    dueSoonAmount,

    // Phase 2 Lead CRM & Funnel
    totalLeads,
    activePipelineCount,
    enrolledCount,
    lostCount: stageCounts.LOST,
    conversionRate,
    leadFunnel,
    leadSources,
    counsellorLeaderboard,
  };
}