import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { isBefore } from "date-fns";
import type { StudentStatus, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const student = await prisma.student.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: {
      course: { select: { id: true, name: true, fee: true, duration: true } },
      batch: { select: { id: true, name: true, timing: true } },
      branch: { select: { id: true, name: true, city: true } },
      payments: {
        orderBy: { paidAt: "desc" },
        select: { id: true, amount: true, method: true, paidAt: true, note: true, installmentNumber: true, installmentTitle: true },
      },
      renewals: {
        orderBy: { renewedAt: "desc" },
        select: { id: true, amount: true, method: true, renewedAt: true, validFrom: true, validUntil: true, note: true, planType: true },
      },
      attendance: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          status: true,
          batch: { select: { id: true, name: true } },
        },
      },
      testResults: {
        orderBy: { test: { testDate: "desc" } },
        select: {
          id: true,
          marksObtained: true,
          isAbsent: true,
          remarks: true,
          test: {
            select: {
              id: true,
              title: true,
              subject: true,
              testDate: true,
              totalMarks: true,
              passingMarks: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Calculate Attendance Stats
  const totalAttendance = student.attendance.length;
  const presentCount = student.attendance.filter((a) => a.status === "PRESENT").length;
  const absentCount = student.attendance.filter((a) => a.status === "ABSENT").length;
  const lateCount = student.attendance.filter((a) => a.status === "LATE").length;
  const effectivePresent = presentCount + lateCount;
  const attendanceRate = totalAttendance > 0 ? Math.round((effectivePresent / totalAttendance) * 100) : 0;

  // Calculate Academic Stats
  const totalTests = student.testResults.length;
  const presentTests = student.testResults.filter((r) => !r.isAbsent && r.marksObtained !== null);
  const testsPassed = presentTests.filter((r) => {
    const passing = r.test.passingMarks ?? r.test.totalMarks * 0.35;
    return (r.marksObtained ?? 0) >= passing;
  }).length;

  let totalPctSum = 0;
  let highestPercentage = 0;
  presentTests.forEach((r) => {
    const pct = Math.round(((r.marksObtained ?? 0) / r.test.totalMarks) * 100);
    totalPctSum += pct;
    if (pct > highestPercentage) highestPercentage = pct;
  });

  const averageTestPercentage =
    presentTests.length > 0 ? Math.round(totalPctSum / presentTests.length) : 0;

  // Calculate Fee Stats
  const totalFee = Number(student.totalFee);
  const paidFee = Number(student.paidFee);
  const pendingFee = Math.max(0, totalFee - paidFee);
  const isOverdue = student.dueDate ? isBefore(student.dueDate, new Date()) && pendingFee > 0 : false;

  return NextResponse.json({
    id: student.id,
    name: student.name,
    mobile: student.mobile,
    email: student.email,
    parentEmail: student.parentEmail,
    photoUrl: student.photoUrl,
    parentMobile: student.parentMobile,
    admissionDate: student.admissionDate.toISOString(),
    status: student.status,
    plan: student.plan,
    subscriptionStatus: student.subscriptionStatus,
    demoStartedAt: student.demoStartedAt ? student.demoStartedAt.toISOString() : null,
    demoExpiresAt: student.demoExpiresAt ? student.demoExpiresAt.toISOString() : null,
    currentPeriodEnd: student.currentPeriodEnd ? student.currentPeriodEnd.toISOString() : null,
    monthlyAmount: student.monthlyAmount ? Number(student.monthlyAmount) : null,
    quarterlyAmount: student.quarterlyAmount ? Number(student.quarterlyAmount) : null,
    courseDuration: student.courseDuration || student.course.duration || "1 Year",
    courseEndDate: student.courseEndDate ? student.courseEndDate.toISOString() : null,
    installmentPlan: student.installmentPlan || null,
    registrationFee: student.registrationFee ? Number(student.registrationFee) : null,
    isSeatBooked: student.isSeatBooked,
    discountPercent: student.discountPercent ? Number(student.discountPercent) : null,
    discountApprovalStatus: student.discountApprovalStatus,
    branch: student.branch
      ? {
          id: student.branch.id,
          name: student.branch.name,
          city: student.branch.city,
        }
      : null,
    course: {
      id: student.course.id,
      name: student.course.name,
      fee: Number(student.course.fee),
      duration: student.course.duration,
    },
    batch: student.batch
      ? {
          id: student.batch.id,
          name: student.batch.name,
          timing: student.batch.timing,
        }
      : null,
    feeStats: {
      totalFee,
      paidFee,
      pendingFee,
      dueDate: student.dueDate ? student.dueDate.toISOString() : null,
      isOverdue,
    },
    attendanceStats: {
      total: totalAttendance,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      rate: attendanceRate,
      isLow: attendanceRate < 75,
    },
    academicStats: {
      totalTests,
      testsAppeared: presentTests.length,
      testsAbsent: totalTests - presentTests.length,
      testsPassed,
      passRate: presentTests.length > 0 ? Math.round((testsPassed / presentTests.length) * 100) : 0,
      averagePercentage: averageTestPercentage,
      highestPercentage,
    },
    payments: student.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      note: p.note,
    })),
    renewals: student.renewals.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      method: r.method,
      renewedAt: r.renewedAt.toISOString(),
      validFrom: r.validFrom.toISOString(),
      validUntil: r.validUntil.toISOString(),
      note: r.note,
    })),
    attendance: student.attendance.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      status: a.status,
      batchName: a.batch.name,
    })),
    testResults: student.testResults.map((r) => {
      const passMarks = r.test.passingMarks ?? r.test.totalMarks * 0.35;
      const marks = r.marksObtained !== null ? Number(r.marksObtained) : null;
      let status: "PASSED" | "FAILED" | "ABSENT" = "PASSED";
      let percentage: number | null = null;

      if (r.isAbsent) {
        status = "ABSENT";
      } else if (marks !== null) {
        percentage = Math.round((marks / r.test.totalMarks) * 100);
        status = marks >= passMarks ? "PASSED" : "FAILED";
      }

      return {
        id: r.id,
        testId: r.test.id,
        title: r.test.title,
        subject: r.test.subject || "General",
        testDate: r.test.testDate.toISOString(),
        totalMarks: r.test.totalMarks,
        passingMarks: passMarks,
        marksObtained: marks,
        percentage,
        status,
        remarks: r.remarks,
      };
    }),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("students:write");
  if ("error" in ctx) return ctx.error;

  const student = await prisma.student.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const body = await req.json();

  const updateData: {
    name?: string;
    mobile?: string;
    email?: string | null;
    parentMobile?: string | null;
    parentEmail?: string | null;
    courseId?: string;
    batchId?: string | null;
    branchId?: string | null;
    status?: StudentStatus;
    totalFee?: number;
    dueDate?: Date | null;
    plan?: SubscriptionPlan;
    subscriptionStatus?: SubscriptionStatus;
    monthlyAmount?: number | null;
    quarterlyAmount?: number | null;
    courseDuration?: string | null;
    courseEndDate?: Date | null;
    installmentPlan?: any;
    registrationFee?: number | null;
    isSeatBooked?: boolean;
    discountPercent?: number | null;
    discountApprovalStatus?: string | null;
    photoUrl?: string | null;
  } = {};

  const {
    name,
    mobile,
    email,
    parentMobile,
    parentEmail,
    photoUrl,
    courseId,
    batchId,
    branchId,
    status,
    totalFee,
    dueDate,
    plan,
    subscriptionStatus,
    monthlyAmount,
    quarterlyAmount,
    courseDuration,
    courseEndDate,
    installmentPlan,
    registrationFee,
    isSeatBooked,
    discountPercent,
    discountApprovalStatus,
  } = body;

  if (name !== undefined) updateData.name = String(name).trim();
  if (mobile !== undefined) updateData.mobile = String(mobile).trim();
  if (email !== undefined) updateData.email = email ? String(email).trim() : null;
  if (parentMobile !== undefined) updateData.parentMobile = parentMobile ? String(parentMobile).trim() : null;
  if (parentEmail !== undefined) updateData.parentEmail = parentEmail ? String(parentEmail).trim().toLowerCase() : null;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl ? String(photoUrl).trim() : null;

  if (courseId !== undefined) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, instituteId: ctx.instituteId },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 400 });
    updateData.courseId = courseId;
  }

  if (batchId !== undefined) {
    if (batchId === null || batchId === "") {
      updateData.batchId = null;
    } else {
      const batch = await prisma.batch.findFirst({
        where: { id: batchId, instituteId: ctx.instituteId },
      });
      if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 400 });
      updateData.batchId = batchId;
    }
  }

  if (status !== undefined) {
    if (!["ACTIVE", "ON_HOLD", "INACTIVE"].includes(status)) {
      return NextResponse.json({ error: "Invalid student status" }, { status: 400 });
    }
    updateData.status = status as StudentStatus;
  }

  if (totalFee !== undefined) {
    const feeNum = Number(totalFee);
    if (isNaN(feeNum) || feeNum < 0) {
      return NextResponse.json({ error: "Total fee must be a valid positive number" }, { status: 400 });
    }
    updateData.totalFee = feeNum;
  }

  if (dueDate !== undefined) {
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  }

  if (plan !== undefined && ["DEMO", "MONTHLY", "QUARTERLY", "INSTALLMENTS", "ONE_TIME"].includes(plan)) {
    updateData.plan = plan as SubscriptionPlan;
  }

  if (subscriptionStatus !== undefined && ["TRIAL", "ACTIVE", "EXPIRED"].includes(subscriptionStatus)) {
    updateData.subscriptionStatus = subscriptionStatus as SubscriptionStatus;
  }

  if (monthlyAmount !== undefined) {
    updateData.monthlyAmount = monthlyAmount !== null && monthlyAmount !== "" ? Number(monthlyAmount) : null;
  }

  if (quarterlyAmount !== undefined) {
    updateData.quarterlyAmount = quarterlyAmount !== null && quarterlyAmount !== "" ? Number(quarterlyAmount) : null;
  }

  if (courseDuration !== undefined) {
    updateData.courseDuration = courseDuration ? String(courseDuration).trim() : null;
    if (courseDuration && courseEndDate === undefined) {
      const start = student.admissionDate || new Date();
      // Import calculateCourseEndDate dynamically or via module
      const { calculateCourseEndDate } = await import("@/lib/course-duration");
      updateData.courseEndDate = calculateCourseEndDate(start, courseDuration);
    }
  }

  if (courseEndDate !== undefined) {
    updateData.courseEndDate = courseEndDate ? new Date(courseEndDate) : null;
  }

  if (installmentPlan !== undefined) {
    updateData.installmentPlan = installmentPlan ? installmentPlan : null;
  }

  if (branchId !== undefined) {
    if (branchId === null || branchId === "") {
      updateData.branchId = null;
    } else {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, instituteId: ctx.instituteId },
      });
      if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
      updateData.branchId = branchId;
    }
  }

  if (registrationFee !== undefined) {
    updateData.registrationFee = registrationFee !== null && registrationFee !== "" ? Number(registrationFee) : null;
  }

  if (isSeatBooked !== undefined) {
    updateData.isSeatBooked = Boolean(isSeatBooked);
  }

  if (discountPercent !== undefined) {
    updateData.discountPercent = discountPercent !== null && discountPercent !== "" ? Number(discountPercent) : null;
  }

  if (discountApprovalStatus !== undefined) {
    updateData.discountApprovalStatus = discountApprovalStatus;
  }

  const updated = await prisma.student.update({
    where: { id: params.id },
    data: updateData,
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "STUDENT_UPDATED",
    entityType: "Student",
    entityId: updated.id,
    metadata: { name: updated.name, status: updated.status },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("students:write");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get("permanent") === "true";

  const student = await prisma.student.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (permanent) {
    // Cascade delete related dependencies
    await prisma.$transaction([
      prisma.testResult.deleteMany({ where: { studentId: params.id } }),
      prisma.attendance.deleteMany({ where: { studentId: params.id } }),
      prisma.payment.deleteMany({ where: { studentId: params.id } }),
      prisma.renewal.deleteMany({ where: { studentId: params.id } }),
      prisma.facultyReview.deleteMany({ where: { studentId: params.id } }),
      prisma.student.delete({ where: { id: params.id } }),
    ]);

    await logAudit({
      instituteId: ctx.instituteId,
      actor: actorFromSession(ctx.session),
      action: "STUDENT_DELETED",
      entityType: "Student",
      entityId: student.id,
      metadata: { name: student.name, permanent: true },
    });

    return NextResponse.json({ success: true, action: "deleted" });
  } else {
    // Soft-archive by marking INACTIVE
    const archived = await prisma.student.update({
      where: { id: params.id },
      data: { status: "INACTIVE" },
    });

    await logAudit({
      instituteId: ctx.instituteId,
      actor: actorFromSession(ctx.session),
      action: "STUDENT_ARCHIVED",
      entityType: "Student",
      entityId: student.id,
      metadata: { name: student.name },
    });

    return NextResponse.json({ success: true, action: "archived", student: archived });
  }
}
