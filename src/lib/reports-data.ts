import { prisma } from "@/lib/prisma";
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  differenceInDays,
  isBefore,
} from "date-fns";

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  courseId?: string;
  batchId?: string;
}

export async function getReportsData(instituteId: string, branchIdOrFilters?: string | ReportFilterOptions, maybeFilters?: ReportFilterOptions) {
  // Support both signatures: getReportsData(instituteId, branchId, filters) and getReportsData(instituteId, filters)
  let branchId: string | undefined;
  let filters: ReportFilterOptions | undefined;
  if (typeof branchIdOrFilters === "string") {
    branchId = branchIdOrFilters;
    filters = maybeFilters;
  } else {
    filters = branchIdOrFilters;
  }
  // If branchId is provided, always scope by it (strict branch isolation)
  const branchFilter = branchId ? { branchId } : {};

  // Parse optional date range
  const startDate = filters?.startDate ? startOfDay(new Date(filters.startDate)) : undefined;
  const endDate = filters?.endDate ? endOfDay(new Date(filters.endDate)) : undefined;
  const courseId = filters?.courseId && filters.courseId !== "ALL" ? filters.courseId : undefined;
  const batchId = filters?.batchId && filters.batchId !== "ALL" ? filters.batchId : undefined;

  // Validate batchId belongs to active branch if both are provided
  if (batchId && branchId) {
    // This will be handled via where filters below; cross-branch batchIds will naturally yield no results
  }

  // 1. Fetch reference collections for filters and joins
  const [courses, rawBatches, branches] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      select: { id: true, name: true, fee: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { instituteId, ...branchFilter },
      include: {
        course: { select: { id: true, name: true } },
        faculty: { include: { faculty: { select: { name: true } } } },
        students: { select: { id: true, totalFee: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // 2. Fetch Students
  const studentWhere: any = { instituteId, ...branchFilter };

  if (courseId) studentWhere.courseId = courseId;
  if (batchId) studentWhere.batchId = batchId;
  if (startDate || endDate) {
    studentWhere.admissionDate = {};
    if (startDate) studentWhere.admissionDate.gte = startDate;
    if (endDate) studentWhere.admissionDate.lte = endDate;
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch Admissions
  const admissionWhere: any = { instituteId, ...branchFilter };

  if (courseId) admissionWhere.courseId = courseId;
  if (batchId) admissionWhere.batchId = batchId;
  if (startDate || endDate) {
    admissionWhere.createdAt = {};
    if (startDate) admissionWhere.createdAt.gte = startDate;
    if (endDate) admissionWhere.createdAt.lte = endDate;
  }

  const admissions = await prisma.admission.findMany({
    where: admissionWhere,
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Fetch Payments - scoped via student.branchId when branch isolation is active
  const paymentWhere: any = { instituteId, ...(branchId ? { student: { branchId } } : {}) };

  if (startDate || endDate) {
    paymentWhere.paidAt = {};
    if (startDate) paymentWhere.paidAt.gte = startDate;
    if (endDate) paymentWhere.paidAt.lte = endDate;
  }

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          mobile: true,
          courseId: true,
          batchId: true,
          course: { select: { name: true } },
          batch: { select: { name: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  // Filter payments if courseId or batchId filter applied
  const filteredPayments = payments.filter((p) => {
    if (courseId && p.student.courseId !== courseId) return false;
    if (batchId && p.student.batchId !== batchId) return false;
    return true;
  });

  // 5. Fetch Attendance - scoped via batch.branchId
  const attendanceWhere: any = { instituteId, ...(branchId ? { batch: { branchId } } : {}) };

  if (batchId) attendanceWhere.batchId = batchId;
  if (startDate || endDate) {
    attendanceWhere.date = {};
    if (startDate) attendanceWhere.date.gte = startDate;
    if (endDate) attendanceWhere.date.lte = endDate;
  }

  const attendanceRecords = await prisma.attendance.findMany({
    where: attendanceWhere,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          courseId: true,
          course: { select: { name: true } },
          batch: { select: { id: true, name: true } },
        },
      },
      batch: { select: { id: true, name: true, courseId: true } },
    },
    orderBy: { date: "desc" },
  });

  // Filter attendance if courseId filter is set
  const filteredAttendance = attendanceRecords.filter((a) => {
    if (courseId && a.student.courseId !== courseId) return false;
    return true;
  });

  // 6. Fetch Tests and Results - scoped via batch.branchId when branch isolation is active
  const testWhere: any = { instituteId, ...(branchId ? { batch: { branchId } } : {}) };

  if (batchId) testWhere.batchId = batchId;
  if (courseId) testWhere.courseId = courseId;
  if (startDate || endDate) {
    testWhere.testDate = {};
    if (startDate) testWhere.testDate.gte = startDate;
    if (endDate) testWhere.testDate.lte = endDate;
  }

  const tests = await prisma.test.findMany({
    where: testWhere,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } },
        },
      },
      results: {
        include: {
          student: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { testDate: "desc" },
  });

  // 7. Fetch Expenses
  const expenseWhere: any = { instituteId, ...branchFilter };

  if (startDate || endDate) {
    expenseWhere.expenseDate = {};
    if (startDate) expenseWhere.expenseDate.gte = startDate;
    if (endDate) expenseWhere.expenseDate.lte = endDate;
  }

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: {
      createdBy: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { expenseDate: "desc" },
  });

  // 8. Fetch Incomes
  const incomeWhere: any = { instituteId, ...branchFilter };

  if (startDate || endDate) {
    incomeWhere.incomeDate = {};
    if (startDate) incomeWhere.incomeDate.gte = startDate;
    if (endDate) incomeWhere.incomeDate.lte = endDate;
  }

  const incomes = await prisma.income.findMany({
    where: incomeWhere,
    include: {
      createdBy: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { incomeDate: "desc" },
  });

  // ----------------------------------------------------
  // Compute Student Report Metrics
  // ----------------------------------------------------
  let totalBilledFee = 0;
  let totalPaidFee = 0;
  let totalActiveStudents = 0;
  let totalInactiveStudents = 0;
  let totalOnHoldStudents = 0;

  const serializedStudents = students.map((s) => {
    const total = Number(s.totalFee);
    const paid = Number(s.paidFee);
    const pending = Math.max(0, total - paid);

    totalBilledFee += total;
    totalPaidFee += paid;

    if (s.status === "ACTIVE") totalActiveStudents++;
    else if (s.status === "INACTIVE") totalInactiveStudents++;
    else if (s.status === "ON_HOLD") totalOnHoldStudents++;

    return {
      id: s.id,
      name: s.name,
      mobile: s.mobile,
      email: s.email,
      parentMobile: s.parentMobile,
      courseId: s.courseId,
      courseName: s.course.name,
      batchId: s.batchId,
      batchName: s.batch?.name ?? "Unassigned",
      admissionDate: s.admissionDate.toISOString(),
      status: s.status,
      plan: s.plan,
      subscriptionStatus: s.subscriptionStatus,
      totalFee: total,
      paidFee: paid,
      pendingFee: pending,
      dueDate: s.dueDate ? s.dueDate.toISOString() : null,
      isOverdue: s.dueDate ? isBefore(s.dueDate, new Date()) && pending > 0 : false,
    };
  });

  const totalPendingFee = Math.max(0, totalBilledFee - totalPaidFee);

  // Student course distribution
  const courseCountMap = new Map<string, { name: string; count: number; billed: number; paid: number }>();
  courses.forEach((c) => courseCountMap.set(c.id, { name: c.name, count: 0, billed: 0, paid: 0 }));
  serializedStudents.forEach((s) => {
    const entry = courseCountMap.get(s.courseId);
    if (entry) {
      entry.count += 1;
      entry.billed += s.totalFee;
      entry.paid += s.paidFee;
    }
  });

  const studentCourseBreakdown = Array.from(courseCountMap.values()).filter((item) => item.count > 0);

  // ----------------------------------------------------
  // Compute Batch Report Metrics
  // ----------------------------------------------------
  const filteredRawBatches = rawBatches.filter((b) => {
    if (courseId && b.courseId !== courseId) return false;
    if (batchId && b.id !== batchId) return false;
    return true;
  });

  // Precompute attendance rate per batch
  const batchAttendanceMap = new Map<string, { total: number; present: number }>();
  attendanceRecords.forEach((r) => {
    const existing = batchAttendanceMap.get(r.batchId) || { total: 0, present: 0 };
    existing.total++;
    if (r.status === "PRESENT" || r.status === "LATE") existing.present++;
    batchAttendanceMap.set(r.batchId, existing);
  });

  let totalBatchCapacity = 0;
  let totalBatchEnrolled = 0;
  let activeBatchesCount = 0;
  let highOccupancyBatchesCount = 0;

  const batchList = filteredRawBatches.map((b) => {
    const enrolled = b.students.length;
    const capacity = b.capacity || 40;
    const available = Math.max(0, capacity - enrolled);
    const occupancyRate = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
    const isActive = b.status.toLowerCase() === "active";

    if (isActive) activeBatchesCount++;
    totalBatchCapacity += capacity;
    totalBatchEnrolled += enrolled;
    if (occupancyRate >= 90) highOccupancyBatchesCount++;

    const totalBatchFees = b.students.reduce((acc, s) => acc + Number(s.totalFee), 0);

    const att = batchAttendanceMap.get(b.id);
    const attendanceRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

    return {
      id: b.id,
      name: b.name,
      courseId: b.courseId,
      courseName: b.course.name,
      timing: b.timing,
      capacity,
      enrolledCount: enrolled,
      availableSeats: available,
      occupancyRate,
      status: b.status,
      facultyNames: b.faculty.map((f) => f.faculty.name),
      totalFees: totalBatchFees,
      attendanceRate,
    };
  });

  const overallBatchOccupancy =
    totalBatchCapacity > 0 ? Math.round((totalBatchEnrolled / totalBatchCapacity) * 100) : 0;

  // ----------------------------------------------------
  // Compute Admission Report Metrics
  // ----------------------------------------------------
  let enrolledAdmissions = 0;
  let pendingAdmissions = 0;
  let approvedAdmissions = 0;
  let rejectedAdmissions = 0;
  let totalPipelineValue = 0;
  let totalEnrolledAdmissionValue = 0;

  const admissionList = admissions.map((a) => {
    const fee = Number(a.feePlan);
    totalPipelineValue += fee;

    if (a.status === "ENROLLED") {
      enrolledAdmissions++;
      totalEnrolledAdmissionValue += fee;
    } else if (a.status === "PENDING") {
      pendingAdmissions++;
    } else if (a.status === "APPROVED") {
      approvedAdmissions++;
    } else if (a.status === "REJECTED") {
      rejectedAdmissions++;
    }

    return {
      id: a.id,
      applicantName: a.applicantName,
      mobile: a.mobile,
      email: a.email,
      courseName: a.course.name,
      batchName: a.batch?.name ?? "Not assigned",
      branchName: a.branch?.name ?? "Main Branch",
      feePlan: fee,
      status: a.status,
      note: a.note,
      createdAt: a.createdAt.toISOString(),
    };
  });

  const admissionConversionRate =
    admissions.length > 0 ? Math.round((enrolledAdmissions / admissions.length) * 100) : 0;

  // Admission status breakdown
  const admissionStatusBreakdown = [
    { status: "ENROLLED", count: enrolledAdmissions, label: "Enrolled" },
    { status: "APPROVED", count: approvedAdmissions, label: "Approved" },
    { status: "PENDING", count: pendingAdmissions, label: "Pending" },
    { status: "REJECTED", count: rejectedAdmissions, label: "Rejected" },
  ];

  // ----------------------------------------------------
  // Compute Fee & Collection Report Metrics
  // ----------------------------------------------------
  let totalPaymentsCollected = 0;
  const paymentMethodMap = new Map<string, { count: number; total: number }>();

  const paymentList = filteredPayments.map((p) => {
    const amount = Number(p.amount);
    totalPaymentsCollected += amount;

    const methodKey = p.method || "Cash";
    const existing = paymentMethodMap.get(methodKey) || { count: 0, total: 0 };
    existing.count++;
    existing.total += amount;
    paymentMethodMap.set(methodKey, existing);

    return {
      id: p.id,
      studentName: p.student.name,
      studentMobile: p.student.mobile,
      courseName: p.student.course.name,
      batchName: p.student.batch?.name ?? "—",
      amount,
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      note: p.note,
    };
  });

  const paymentMethodsBreakdown = Array.from(paymentMethodMap.entries()).map(([method, val]) => ({
    method,
    count: val.count,
    total: val.total,
    percentage:
      totalPaymentsCollected > 0 ? Math.round((val.total / totalPaymentsCollected) * 100) : 0,
  }));

  // Outstanding dues ledger
  const today = new Date();
  const duesList = serializedStudents
    .filter((s) => s.pendingFee > 0)
    .map((s) => {
      let daysOverdue = 0;
      if (s.dueDate) {
        const due = new Date(s.dueDate);
        if (isBefore(due, today)) {
          daysOverdue = differenceInDays(today, due);
        }
      }
      return {
        studentId: s.id,
        studentName: s.name,
        mobile: s.mobile,
        courseName: s.courseName,
        batchName: s.batchName,
        totalFee: s.totalFee,
        paidFee: s.paidFee,
        pendingFee: s.pendingFee,
        dueDate: s.dueDate,
        isOverdue: s.isOverdue,
        daysOverdue,
      };
    })
    .sort((a, b) => b.pendingFee - a.pendingFee);

  const overdueTotalAmount = duesList
    .filter((d) => d.isOverdue)
    .reduce((sum, d) => sum + d.pendingFee, 0);

  const feeCollectionEfficiency =
    totalBilledFee > 0 ? Math.round((totalPaidFee / totalBilledFee) * 100) : 0;

  // Monthly collection trend (last 6 months)
  const monthlyCollectionTrend = Array.from({ length: 6 }).map((_, idx) => {
    const monthDate = subMonths(today, 5 - idx);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const sum = payments
      .filter((p) => p.paidAt >= start && p.paidAt <= end)
      .reduce((acc, p) => acc + Number(p.amount), 0);

    return {
      month: format(monthDate, "MMM yyyy"),
      amount: sum,
    };
  });

  // ----------------------------------------------------
  // Compute Attendance Report Metrics
  // ----------------------------------------------------
  let totalPresentCount = 0;
  let totalAbsentCount = 0;
  let totalLateCount = 0;

  // Student-wise attendance aggregator
  const studentAttendanceMap = new Map<
    string,
    {
      studentName: string;
      courseName: string;
      batchName: string;
      total: number;
      present: number;
      absent: number;
      late: number;
    }
  >();

  filteredAttendance.forEach((a) => {
    if (a.status === "PRESENT") totalPresentCount++;
    else if (a.status === "ABSENT") totalAbsentCount++;
    else if (a.status === "LATE") totalLateCount++;

    const sEntry = studentAttendanceMap.get(a.studentId) || {
      studentName: a.student.name,
      courseName: a.student.course.name,
      batchName: a.student.batch?.name ?? "Unassigned",
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
    };

    sEntry.total++;
    if (a.status === "PRESENT") sEntry.present++;
    else if (a.status === "ABSENT") sEntry.absent++;
    else if (a.status === "LATE") sEntry.late++;

    studentAttendanceMap.set(a.studentId, sEntry);
  });

  const totalAttendanceRecords = filteredAttendance.length;
  const overallAttendanceRate =
    totalAttendanceRecords > 0
      ? Math.round(((totalPresentCount + totalLateCount) / totalAttendanceRecords) * 100)
      : 0;

  const studentAttendanceSummary = Array.from(studentAttendanceMap.entries())
    .map(([studentId, s]) => {
      const effectivePresent = s.present + s.late;
      const rate = s.total > 0 ? Math.round((effectivePresent / s.total) * 100) : 0;
      return {
        studentId,
        studentName: s.studentName,
        courseName: s.courseName,
        batchName: s.batchName,
        totalMarked: s.total,
        presentCount: s.present,
        absentCount: s.absent,
        lateCount: s.late,
        attendanceRate: rate,
        isLowAttendance: rate < 75,
      };
    })
    .sort((a, b) => a.attendanceRate - b.attendanceRate);

  const lowAttendanceStudentsCount = studentAttendanceSummary.filter(
    (s) => s.isLowAttendance
  ).length;

  // Daily attendance timeline (last 14 days)
  const dailyAttendanceTrend = Array.from({ length: 14 })
    .map((_, i) => subDays(today, 13 - i))
    .map((d) => {
      const dStart = startOfDay(d);
      const dEnd = endOfDay(d);
      const dayRecords = filteredAttendance.filter((r) => r.date >= dStart && r.date <= dEnd);
      const present = dayRecords.filter((r) => r.status === "PRESENT").length;
      const absent = dayRecords.filter((r) => r.status === "ABSENT").length;
      const late = dayRecords.filter((r) => r.status === "LATE").length;
      const total = dayRecords.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        date: format(d, "dd MMM"),
        present,
        absent,
        late,
        total,
        rate,
      };
    });

  // ----------------------------------------------------
  // Compute Test & Result Report Metrics
  // ----------------------------------------------------
  let totalEvaluations = 0;
  let totalMarksSum = 0;
  let totalMarksPossible = 0;
  let totalPassedEvaluations = 0;
  let totalAbsentInTests = 0;
  let highestMarkOverall = 0;

  const testResultsLedger: {
    resultId: string;
    studentName: string;
    testTitle: string;
    subject: string;
    batchName: string;
    courseName: string;
    testDate: string;
    marksObtained: number | null;
    totalMarks: number;
    percentage: number | null;
    status: "PASSED" | "FAILED" | "ABSENT";
    remarks: string | null;
  }[] = [];

  const testList = tests.map((t) => {
    const presentResults = t.results.filter((r) => !r.isAbsent && r.marksObtained !== null);
    const marksArr = presentResults.map((r) => Number(r.marksObtained));
    const highestScore = marksArr.length > 0 ? Math.max(...marksArr) : 0;
    if (highestScore > highestMarkOverall) highestMarkOverall = highestScore;

    const averageScore =
      marksArr.length > 0 ? Math.round((marksArr.reduce((a, b) => a + b, 0) / marksArr.length) * 10) / 10 : 0;

    const passMarks = t.passingMarks ?? t.totalMarks * 0.35;
    const passedCount = marksArr.filter((m) => m >= passMarks).length;
    const failedCount = marksArr.filter((m) => m < passMarks).length;
    const absentCount = t.results.filter((r) => r.isAbsent).length;
    const passRate = presentResults.length > 0 ? Math.round((passedCount / presentResults.length) * 100) : 0;

    totalEvaluations += t.results.length;
    totalAbsentInTests += absentCount;
    totalPassedEvaluations += passedCount;

    presentResults.forEach((r) => {
      const marks = Number(r.marksObtained);
      totalMarksSum += marks;
      totalMarksPossible += t.totalMarks;
    });

    // Populate student test results ledger
    t.results.forEach((r) => {
      let status: "PASSED" | "FAILED" | "ABSENT" = "PASSED";
      let percentage: number | null = null;

      if (r.isAbsent) {
        status = "ABSENT";
      } else if (r.marksObtained !== null) {
        const marks = Number(r.marksObtained);
        percentage = Math.round((marks / t.totalMarks) * 100);
        status = marks >= passMarks ? "PASSED" : "FAILED";
      }

      testResultsLedger.push({
        resultId: r.id,
        studentName: r.student.name,
        testTitle: t.title,
        subject: t.subject || "General",
        batchName: t.batch.name,
        courseName: t.batch.course?.name ?? "—",
        testDate: t.testDate.toISOString(),
        marksObtained: r.marksObtained !== null ? Number(r.marksObtained) : null,
        totalMarks: t.totalMarks,
        percentage,
        status,
        remarks: r.remarks,
      });
    });

    return {
      testId: t.id,
      title: t.title,
      subject: t.subject || "General",
      batchName: t.batch.name,
      courseName: t.batch.course?.name ?? "—",
      testDate: t.testDate.toISOString(),
      totalMarks: t.totalMarks,
      passingMarks: passMarks,
      evaluatedCount: t.results.length,
      presentCount: presentResults.length,
      absentCount,
      passedCount,
      failedCount,
      averageScore,
      highestScore,
      passRate,
    };
  });

  const instituteAverageScore =
    totalMarksPossible > 0 ? Math.round((totalMarksSum / totalMarksPossible) * 100) : 0;

  const overallPassRate =
    totalEvaluations - totalAbsentInTests > 0
      ? Math.round((totalPassedEvaluations / (totalEvaluations - totalAbsentInTests)) * 100)
      : 0;

  // ----------------------------------------------------
  // Compute Profit & Loss (P&L) Report Metrics
  // ----------------------------------------------------
  const totalExtraIncome = incomes.reduce((acc, i) => acc + Number(i.amount), 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const totalGrossRevenue = totalPaymentsCollected + totalExtraIncome;
  const netProfit = totalGrossRevenue - totalExpensesAmount;
  const profitMargin = totalGrossRevenue > 0 ? Math.round((netProfit / totalGrossRevenue) * 100) : 0;

  // Income category breakdown
  const incomeCategoryNames: Record<string, string> = {
    BOOK_SALES: "Books & Study Kits",
    HALL_RENTAL: "Classroom / Hall Rental",
    DONATION: "Trust & Donations",
    FRANCHISE_FEE: "Franchise & Royalty Fees",
    LATE_FEE_PENALTY: "Late Fees & Fine Penalties",
    UNIFORM_BAGS: "Uniforms & Bags / Merch",
    EXAM_FEES: "External Exam Fees",
    CONSULTING: "Career Counselling Fees",
    SPONSORSHIP: "Corporate Sponsorships",
    OTHER: "Other Non-Fee Revenue",
  };

  const incomeCatMap = new Map<string, { total: number; count: number }>();
  incomes.forEach((i) => {
    const cat = i.category;
    const existing = incomeCatMap.get(cat) || { total: 0, count: 0 };
    existing.total += Number(i.amount);
    existing.count++;
    incomeCatMap.set(cat, existing);
  });

  const incomeCategoryBreakdown = Array.from(incomeCatMap.entries())
    .map(([cat, val]) => ({
      category: cat,
      label: incomeCategoryNames[cat] || cat,
      total: val.total,
      count: val.count,
      percentage: totalExtraIncome > 0 ? Math.round((val.total / totalExtraIncome) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Expense category breakdown
  const expenseCategoryNames: Record<string, string> = {
    RENT: "Premises Rent",
    SALARIES: "Faculty & Staff Salaries",
    UTILITIES: "Electricity & Utilities",
    MARKETING: "Marketing & Advertising",
    MAINTENANCE: "Repairs & Maintenance",
    STATIONERY_SUPPLIES: "Stationery & Supplies",
    EQUIPMENT_SOFTWARE: "Software & Hardware",
    EVENT: "Workshops & Events",
    REFUND: "Student Fee Refund",
    OTHER: "Miscellaneous / Other",
  };

  const expenseCatMap = new Map<string, { total: number; count: number }>();
  expenses.forEach((e) => {
    const cat = e.category;
    const existing = expenseCatMap.get(cat) || { total: 0, count: 0 };
    existing.total += Number(e.amount);
    existing.count++;
    expenseCatMap.set(cat, existing);
  });

  const expenseCategoryBreakdown = Array.from(expenseCatMap.entries())
    .map(([cat, val]) => ({
      category: cat,
      label: expenseCategoryNames[cat] || cat,
      total: val.total,
      count: val.count,
      percentage: totalExpensesAmount > 0 ? Math.round((val.total / totalExpensesAmount) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Monthly P&L trend (last 6 months)
  const monthlyProfitLossTrend = Array.from({ length: 6 }).map((_, idx) => {
    const monthDate = subMonths(today, 5 - idx);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const mFeeRevenue = payments
      .filter((p) => p.paidAt >= start && p.paidAt <= end)
      .reduce((acc, p) => p.isRefund ? acc - Number(p.amount) : acc + Number(p.amount), 0);

    const mExtraIncome = incomes
      .filter((i) => i.incomeDate >= start && i.incomeDate <= end)
      .reduce((acc, i) => acc + Number(i.amount), 0);

    const mExpenses = expenses
      .filter((e) => e.expenseDate >= start && e.expenseDate <= end)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const mTotalRev = mFeeRevenue + mExtraIncome;
    const mNet = mTotalRev - mExpenses;

    return {
      month: format(monthDate, "MMM yyyy"),
      feeRevenue: mFeeRevenue,
      extraIncome: mExtraIncome,
      totalRevenue: mTotalRev,
      expenses: mExpenses,
      netProfit: mNet,
    };
  });

  const incomeList = incomes.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    categoryLabel: incomeCategoryNames[i.category] || i.category,
    paymentMethod: i.paymentMethod,
    amount: Number(i.amount),
    incomeDate: i.incomeDate.toISOString(),
    receivedFrom: i.receivedFrom,
    notes: i.notes,
    createdByName: i.createdBy?.name || null,
    branchName: i.branch?.name || null,
  }));

  const expenseList = expenses.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    categoryLabel: expenseCategoryNames[e.category] || e.category,
    paymentMethod: e.paymentMethod,
    amount: Number(e.amount),
    expenseDate: e.expenseDate.toISOString(),
    paidTo: e.paidTo,
    notes: e.notes,
    createdByName: e.createdBy?.name || null,
    branchName: e.branch?.name || null,
  }));

  // ----------------------------------------------------
  // Overview Combined Data
  // ----------------------------------------------------
  return {
    meta: {
      courses: courses.map((c) => ({ id: c.id, name: c.name })),
      batches: rawBatches.map((b) => ({ id: b.id, name: b.name, courseId: b.courseId })),
      branches,
    },
    overview: {
      totalStudents: serializedStudents.length,
      activeStudents: totalActiveStudents,
      activeStudentsPct:
        serializedStudents.length > 0
          ? Math.round((totalActiveStudents / serializedStudents.length) * 100)
          : 0,
      totalBatches: rawBatches.length,
      activeBatches: activeBatchesCount,
      overallBatchOccupancy,
      totalAdmissions: admissions.length,
      enrolledAdmissions,
      admissionConversionRate,
      totalBilledFee,
      totalPaidFee,
      totalPendingFee,
      feeCollectionEfficiency,
      totalExtraIncome,
      totalExpensesAmount,
      totalGrossRevenue,
      netProfit,
      profitMargin,
      overallAttendanceRate,
      lowAttendanceStudentsCount,
      totalTests: tests.length,
      totalEvaluations,
      instituteAverageScore,
      overallPassRate,
      monthlyCollectionTrend,
      monthlyProfitLossTrend,
      dailyAttendanceTrend,
      studentCourseBreakdown,
    },
    studentsReport: {
      kpis: {
        total: serializedStudents.length,
        active: totalActiveStudents,
        inactive: totalInactiveStudents,
        onHold: totalOnHoldStudents,
        totalBilled: totalBilledFee,
        totalPaid: totalPaidFee,
        totalPending: totalPendingFee,
        collectionEfficiency: feeCollectionEfficiency,
      },
      courseBreakdown: studentCourseBreakdown,
      students: serializedStudents,
    },
    batchReport: {
      kpis: {
        totalBatches: filteredRawBatches.length,
        activeBatches: activeBatchesCount,
        totalCapacity: totalBatchCapacity,
        totalEnrolled: totalBatchEnrolled,
        overallOccupancy: overallBatchOccupancy,
        highOccupancyBatches: highOccupancyBatchesCount,
      },
      batches: batchList,
    },
    admissionReport: {
      kpis: {
        totalApplications: admissions.length,
        enrolledCount: enrolledAdmissions,
        pendingCount: pendingAdmissions,
        approvedCount: approvedAdmissions,
        rejectedCount: rejectedAdmissions,
        conversionRate: admissionConversionRate,
        pipelineValue: totalPipelineValue,
        enrolledValue: totalEnrolledAdmissionValue,
      },
      statusBreakdown: admissionStatusBreakdown,
      admissions: admissionList,
    },
    feeReport: {
      kpis: {
        totalBilled: totalBilledFee,
        totalCollected: totalPaymentsCollected,
        totalPending: totalPendingFee,
        collectionEfficiency: feeCollectionEfficiency,
        transactionsCount: paymentList.length,
        overdueAmount: overdueTotalAmount,
        overdueCount: duesList.filter((d) => d.isOverdue).length,
      },
      paymentMethodsBreakdown,
      monthlyTrend: monthlyCollectionTrend,
      payments: paymentList,
      duesAging: duesList,
    },
    profitLossReport: {
      kpis: {
        feeRevenue: totalPaymentsCollected,
        extraIncome: totalExtraIncome,
        totalRevenue: totalGrossRevenue,
        totalExpenses: totalExpensesAmount,
        netProfit,
        profitMargin,
        incomeTransactionsCount: incomeList.length,
        expenseTransactionsCount: expenseList.length,
      },
      monthlyTrend: monthlyProfitLossTrend,
      incomeCategoryBreakdown,
      expenseCategoryBreakdown,
      incomes: incomeList,
      expenses: expenseList,
    },
    attendanceReport: {
      kpis: {
        overallAttendanceRate,
        totalRecords: totalAttendanceRecords,
        presentCount: totalPresentCount,
        absentCount: totalAbsentCount,
        lateCount: totalLateCount,
        lowAttendanceCount: lowAttendanceStudentsCount,
      },
      dailyTrend: dailyAttendanceTrend,
      studentSummary: studentAttendanceSummary,
    },
    resultReport: {
      kpis: {
        totalTests: tests.length,
        totalEvaluations,
        instituteAverageScore,
        overallPassRate,
        totalAbsent: totalAbsentInTests,
        highestMarkOverall,
      },
      tests: testList,
      resultsLedger: testResultsLedger,
    },
  };
}

export type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
