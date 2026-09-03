import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Wallet,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  UserCheck,
  Target,
  Clock,
  AlertCircle,
  Receipt,
  Megaphone,
  Trophy,
} from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { KpiCard, Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import {
  CollectionChart,
  AttendanceChart,
  LeadFunnelChart,
  LeadSourceBarChart,
} from "@/components/dashboard/Charts";
import { SpecialDiscountApprovals } from "@/components/dashboard/SpecialDiscountApprovals";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId, getBranchImpersonationState } from "@/lib/tenant";
import { getDashboardData } from "@/lib/dashboard-data";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

import { FacultyDashboard } from "@/components/dashboard/FacultyDashboard";
import { InstituteSetupWizard } from "@/components/setup/InstituteSetupWizard";
import { parseInstituteSettings } from "@/lib/institute-settings";

export default async function DashboardPage() {
  const session = await auth();
  const instituteId = await getInstituteId();
  if (!instituteId) redirect("/login");

  const userRole = String((session?.user as { role?: string })?.role || "").toUpperCase();
  if (userRole === "STUDENT" || userRole === "PARENT") {
    redirect("/portal");
  }

  // If user is FACULTY, render dedicated academic-only dashboard
  // Faculty MUST NOT see fee collection, expenses, or Lead CRM
  if (userRole === "FACULTY") {
    const userEmail = session?.user?.email ?? "";
    const userName = session?.user?.name ?? "Faculty Member";

    // Lookup linked faculty record by email or userId
    const facultyRecord = await prisma.faculty.findFirst({
      where: {
        instituteId,
        OR: [
          ...(userEmail ? [{ email: userEmail }] : []),
          ...(session?.user?.id ? [{ userId: session.user.id }] : []),
        ],
      },
      include: {
        batches: {
          include: {
            batch: {
              include: {
                course: { select: { name: true } },
                _count: { select: { students: true } },
              },
            },
          },
        },
      },
    });

    const assignedBatchIds = facultyRecord?.batches.map((b) => b.batchId) || [];

    // Map DayOfWeek enum for today
    const daysMap: Record<number, "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"> = {
      0: "SUN",
      1: "MON",
      2: "TUE",
      3: "WED",
      4: "THU",
      5: "FRI",
      6: "SAT",
    };
    const currentDayOfWeek = daysMap[new Date().getDay()];

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const [todaySlots, upcomingTests, recentAssignments, attendanceStats] = await Promise.all([
      prisma.timetableSlot.findMany({
        where: {
          instituteId,
          dayOfWeek: currentDayOfWeek,
          ...(facultyRecord?.id ? { facultyId: facultyRecord.id } : { batchId: { in: assignedBatchIds } }),
        },
        include: {
          batch: { select: { name: true, course: { select: { name: true } } } },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.test.findMany({
        where: {
          instituteId,
          testDate: { gte: todayDate },
          ...(assignedBatchIds.length > 0 ? { batchId: { in: assignedBatchIds } } : {}),
        },
        include: {
          batch: { select: { name: true } },
        },
        orderBy: { testDate: "asc" },
        take: 5,
      }),
      prisma.assignment.findMany({
        where: {
          instituteId,
          ...(assignedBatchIds.length > 0 ? { batchId: { in: assignedBatchIds } } : {}),
        },
        include: {
          batch: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      assignedBatchIds.length > 0
        ? prisma.attendance.groupBy({
            by: ["status"],
            where: {
              instituteId,
              batchId: { in: assignedBatchIds },
              date: todayDate,
            },
            _count: true,
          })
        : Promise.resolve([]),
    ]);

    const batchList =
      facultyRecord?.batches.map((b) => ({
        id: b.batch.id,
        name: b.batch.name,
        timing: b.batch.timing,
        courseName: b.batch.course.name,
        studentCount: b.batch._count.students,
      })) || [];

    const totalStudentsEnrolled = batchList.reduce((acc, b) => acc + b.studentCount, 0);

    let todayAttendancePercent: number | null = null;
    if (attendanceStats.length > 0) {
      let present = 0;
      let total = 0;
      for (const row of attendanceStats) {
        total += row._count;
        if (row.status === "PRESENT") present += row._count;
      }
      if (total > 0) {
        todayAttendancePercent = Math.round((present / total) * 100);
      }
    }

    return (
      <Shell title="Faculty Academic Dashboard" userName={session?.user?.name ?? undefined}>
        <FacultyDashboard
          facultyName={userName}
          facultyEmail={userEmail}
          batches={batchList}
          todayClasses={todaySlots.map((s) => ({
            id: s.id,
            batchName: s.batch.name,
            subjectName: s.batch.course.name,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
          }))}
          upcomingTests={upcomingTests.map((t) => ({
            id: t.id,
            title: t.title,
            batchName: t.batch.name,
            testDate: t.testDate.toISOString(),
            totalMarks: t.totalMarks,
            mode: t.subject || "Offline CBT",
          }))}
          recentAssignments={recentAssignments.map((a) => ({
            id: a.id,
            title: a.title,
            subject: a.subject,
            batchName: a.batch.name,
            dueDate: a.dueDate.toISOString(),
            type: a.type,
          }))}
          totalStudents={totalStudentsEnrolled}
          todayAttendancePercent={todayAttendancePercent}
        />
      </Shell>
    );
  }

  const branchImpersonation = await getBranchImpersonationState();
  const activeBranchId = branchImpersonation.branchId;

  const [data, discountRequests, instituteRecord] = await Promise.all([
    getDashboardData(instituteId, activeBranchId),
    prisma.discountRequest.findMany({
      where: { instituteId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.institute.findUnique({
      where: { id: instituteId },
      select: {
        name: true,
        ownerName: true,
        address: true,
        city: true,
        state: true,
        guidePhone: true,
        academicYearLabel: true,
        settings: true,
      },
    }),
  ]);

  const parsedSettings = parseInstituteSettings(instituteRecord?.settings);
  const showSetupWizard =
    !parsedSettings.setupCompleted &&
    !parsedSettings.setupWizardDismissed &&
    (userRole === "OWNER" || userRole === "ADMIN");

  const serializedDiscountRequests = discountRequests.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.studentName,
    studentMobile: r.studentMobile,
    courseId: r.courseId,
    courseName: r.courseName,
    originalFee: Number(r.originalFee),
    discountPercent: Number(r.discountPercent),
    discountAmount: Number(r.discountAmount),
    finalFee: Number(r.finalFee),
    reason: r.reason,
    requestedByRole: r.requestedByRole,
    requestedByName: r.requestedByName,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    decisionNotes: r.decisionNotes,
    decisionAt: r.decisionAt ? r.decisionAt.toISOString() : null,
    decisionByName: r.decisionByName,
    createdAt: r.createdAt.toISOString(),
  }));

  // MoM collection trend comparison
  const momGrowth =
    data.lastMonthCollection > 0
      ? Math.round(
          ((data.thisMonthCollection - data.lastMonthCollection) / data.lastMonthCollection) * 100
        )
      : null;

  return (
    <Shell title="Executive Owner Dashboard" userName={session?.user?.name ?? undefined}>
      {showSetupWizard && instituteRecord && (
        <InstituteSetupWizard
          instituteName={instituteRecord.name}
          ownerName={instituteRecord.ownerName}
          initialAddress={instituteRecord.address}
          initialCity={instituteRecord.city}
          initialState={instituteRecord.state}
          initialGuidePhone={instituteRecord.guidePhone}
          initialAcademicYearLabel={instituteRecord.academicYearLabel}
          initialTaxNumber={parsedSettings.taxNumber}
        />
      )}
      {/* Header bar with quick shortcuts */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Institute Performance & Growth Hub
          </h2>
          <p className="text-xs text-scholar-500">
            Real-time business health for {formatDate(new Date())} — Financials, Inquiries & Academics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admissions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <Target size={13} className="text-scholar-500" />
            Lead CRM
          </Link>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <Receipt size={13} className="text-scholar-500" />
            Expenses
          </Link>
          <Link
            href="/communication"
            className="inline-flex items-center gap-1.5 rounded-xl border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-scholar-700 shadow-sm hover:bg-scholar-50 transition-colors"
          >
            <Megaphone size={13} className="text-scholar-500" />
            Broadcast
          </Link>
          <Link
            href="/fees"
            className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-scholar-700 transition-colors"
          >
            <IndianRupee size={13} />
            Fee Collection
          </Link>
        </div>
      </div>

      {/* Row 1: Executive KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Active Students"
          value={data.totalStudents.toLocaleString("en-IN")}
          icon={Users}
          accent="scholar"
        />

        <KpiCard
          label="This Month Collection"
          value={formatCurrency(data.thisMonthCollection)}
          icon={IndianRupee}
          accent="scholar"
          trend={
            momGrowth !== null
              ? `${momGrowth >= 0 ? "+" : ""}${momGrowth}% vs last mo`
              : "Active month"
          }
          trendTone={momGrowth !== null && momGrowth >= 0 ? "success" : "neutral"}
        />

        <KpiCard
          label="Month Expenses"
          value={formatCurrency(data.thisMonthExpenses)}
          icon={Receipt}
          accent="marigold"
          trend="Operational outflow"
          trendTone="neutral"
        />

        <KpiCard
          label="Net Cash Flow"
          value={`${data.netOperatingCashFlow >= 0 ? "+" : ""}${formatCurrency(
            data.netOperatingCashFlow
          )}`}
          icon={data.netOperatingCashFlow >= 0 ? TrendingUp : TrendingDown}
          accent={data.netOperatingCashFlow >= 0 ? "scholar" : "marigold"}
          trend="Collections − Expenses"
          trendTone={data.netOperatingCashFlow >= 0 ? "success" : "danger"}
        />

        <KpiCard
          label="Fee Recovery Rate"
          value={`${data.feeRecoveryRate}%`}
          icon={Wallet}
          accent="scholar"
          trend={`ARPU: ${formatCurrency(data.arpu)}`}
          trendTone="neutral"
        />

        <KpiCard
          label="Lead Conversion"
          value={`${data.conversionRate}%`}
          icon={UserCheck}
          accent="marigold"
          trend={`${data.enrolledCount} of ${data.totalLeads} leads`}
          trendTone="success"
        />
      </div>

      {/* Row 2: Financial Health & Collection Trend */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CollectionChart data={data.collectionTrend} />
        </div>

        {/* Collection Aging & Recovery Overview Card */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-ink">
                Collection & Aging Breakdown
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                {data.feeRecoveryRate}% Billed Recovered
              </span>
            </div>
            <p className="mt-1 text-xs text-scholar-400">
              Outstanding receivables and upcoming payment schedules
            </p>

            <div className="mt-5 space-y-3.5">
              <div className="flex items-center justify-between rounded-xl bg-scholar-50/70 p-3">
                <div className="flex items-center gap-2">
                  <Wallet size={15} className="text-scholar-600" />
                  <span className="text-xs font-semibold text-scholar-700">Total Pending Dues</span>
                </div>
                <span className="font-display text-sm font-bold text-ink">
                  {formatCurrency(data.pendingFees)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-50/80 p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-rose-600" />
                  <div>
                    <span className="block text-xs font-semibold text-rose-800">Overdue Balance</span>
                    <span className="text-[10px] text-rose-600">Past renewal/due date</span>
                  </div>
                </div>
                <span className="font-display text-sm font-bold text-rose-700">
                  {formatCurrency(data.overdueAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-amber-50/80 p-3">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-600" />
                  <div>
                    <span className="block text-xs font-semibold text-amber-800">Due in 7 Days</span>
                    <span className="text-[10px] text-amber-600">Upcoming renewals</span>
                  </div>
                </div>
                <span className="font-display text-sm font-bold text-amber-800">
                  {formatCurrency(data.dueSoonAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-scholar-100 pt-3">
            <Link
              href="/fees"
              className="flex items-center justify-between text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              <span>Manage Student Fees & Reminders</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </Card>
      </div>

      {/* Row 3: Phase 2 Lead CRM & Funnel Analytics */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">
            Admission Inquiries & Acquisition Pipeline
          </h3>
          <Link
            href="/admissions"
            className="flex items-center gap-1 text-xs font-semibold text-scholar-600 hover:text-scholar-900"
          >
            <span>Open Pipeline Board</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Lead Funnel Bar Chart */}
          <LeadFunnelChart data={data.leadFunnel} />

          {/* Lead Sources Distribution */}
          <LeadSourceBarChart data={data.leadSources} />

          {/* Top Counsellor Leaderboard Widget */}
          <Card className="flex flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-semibold text-ink flex items-center gap-1.5">
                  <Trophy size={16} className="text-amber-500" /> Top Counsellors
                </h4>
                <Link
                  href="/admissions"
                  className="text-[11px] font-semibold text-scholar-600 hover:underline"
                >
                  View All
                </Link>
              </div>
              <p className="mt-0.5 text-xs text-scholar-400">
                Enrollment conversion & revenue drivers
              </p>

              <div className="mt-4 space-y-3">
                {data.counsellorLeaderboard.length === 0 && (
                  <p className="py-6 text-center text-xs text-scholar-400">
                    No counsellor assignments logged yet.
                  </p>
                )}
                {data.counsellorLeaderboard.map((c, idx) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between rounded-xl border border-scholar-100 bg-scholar-50/50 p-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-scholar-100 text-xs font-bold text-scholar-700">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink">{c.name}</p>
                        <p className="text-[10px] text-scholar-500">
                          {c.enrolled} student{c.enrolled === 1 ? "" : "s"} enrolled
                        </p>
                      </div>
                    </div>
                    <span className="font-display text-xs font-bold text-success-600">
                      +{formatCurrency(c.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-scholar-100/60 px-3 py-2 text-xs">
              <span className="text-scholar-600">Total Active Pipeline:</span>
              <strong className="font-bold text-ink">{data.activePipelineCount} Leads</strong>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 4: Academic Attendance & Live Activity Feeds */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceChart data={data.attendanceTrend} />
        </div>

        <Card className="p-5">
          <p className="mb-1 font-display text-base font-semibold text-ink">Today&apos;s Attendance</p>
          <p className="text-xs text-scholar-400">Marked batches present ratio</p>
          <div className="mt-6 flex items-center justify-center">
            <ProgressRing
              value={data.todaysAttendancePct}
              size={120}
              stroke={10}
              color="#E8A33D"
            />
          </div>
          <p className="mt-4 text-center text-xs text-scholar-500 font-medium">
            {data.todaysAttendancePct > 0
              ? `${data.todaysAttendancePct}% students present today`
              : "No attendance sessions marked yet today"}
          </p>
        </Card>
      </div>

      {/* Special Discount Approvals (>30%) for Institute Owner */}
      <div className="mt-6">
        <SpecialDiscountApprovals initialRequests={serializedDiscountRequests} />
      </div>

      {/* Row 5: Recent Transactions & Registrations */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-base font-semibold text-ink">Recent Fee Collections</p>
            <Link
              href="/fees"
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              All Payments
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentPayments.length === 0 && (
              <p className="py-6 text-center text-xs text-scholar-400">No payments recorded yet.</p>
            )}
            {data.recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-scholar-50 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-scholar-50 text-xs font-semibold text-scholar-600">
                    {initials(p.student.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{p.student.name}</p>
                    <p className="text-xs text-scholar-400">
                      {p.method} • {formatDate(p.paidAt)}
                    </p>
                  </div>
                </div>
                <p className="font-display text-sm font-semibold tabular-nums text-success-600">
                  +{formatCurrency(p.amount.toString())}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-base font-semibold text-ink">Recent Student Admissions</p>
            <Link
              href="/students"
              className="text-xs font-semibold text-scholar-600 hover:text-scholar-900"
            >
              All Students
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentStudents.length === 0 && (
              <p className="py-6 text-center text-xs text-scholar-400">No students registered yet.</p>
            )}
            {data.recentStudents.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b border-scholar-50 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marigold-50 text-xs font-semibold text-marigold-600">
                    {initials(s.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-scholar-400">
                      {s.course.name} {s.batch ? `• ${s.batch.name}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-scholar-400">{formatDate(s.admissionDate)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}