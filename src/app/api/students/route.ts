import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { DEMO_PERIOD_DAYS, RENEWAL_PERIOD_DAYS, QUARTERLY_RENEWAL_PERIOD_DAYS } from "@/lib/subscription";
import { calculateCourseEndDate } from "@/lib/course-duration";
import { applyPaymentToInstallments, type FeeInstallment } from "@/lib/installments";
import { sendEnrollmentEmail, sendParentWelcomeEmail } from "@/lib/email";
import type { SubscriptionPlan } from "@prisma/client";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const students = await prisma.student.findMany({
    where: { instituteId: ctx.instituteId, branchId: ctx.branchId as string },
    include: { course: true, batch: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    name,
    mobile,
    email,
    parentMobile,
    parentEmail,
    courseId,
    batchId,
    branchId,
    totalFee,
    paidFee = 0,
    dueDate,
    isDemo,
    monthlyAmount,
    quarterlyAmount,
    plan,
    courseDuration,
    installmentPlan,
    registrationFee,
    isSeatBooked,
    discountPercent,
    discountReason,
    paymentMethod,
    paymentType,
    paymentReference,
    photoUrl,
  } = body;

  if (!name || !mobile || !email || !courseId || totalFee === undefined || totalFee === null) {
    return NextResponse.json({ error: "Missing required fields (Name, Mobile, Email, and Course are required)" }, { status: 400 });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  // Prevent account takeover: verify if a user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: { id: true, role: true },
  });

  if (existingUser && existingUser.role !== "STUDENT") {
    return NextResponse.json(
      { error: "A user with this email already exists with a different role. Duplicate email cannot be used for student enrollment." },
      { status: 409 }
    );
  }

  // Branch isolation: all creates are scoped to the caller's active branch.
  // If a branchId is explicitly passed, it must match ctx.branchId; otherwise reject.
  if (branchId && branchId !== ctx.branchId) {
    return NextResponse.json({ error: "Branch mismatch: cannot create student for a different branch. Impersonate that branch first." }, { status: 403 });
  }
  const effectiveBranchId = ctx.branchId as string;

  // Make sure the chosen course/batch belong to this institute and branch.
  const course = await prisma.course.findFirst({ where: { id: courseId, instituteId: ctx.instituteId } });
  if (!course) return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  if (batchId) {
    const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId } });
    if (!batch) return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
    if (batch.branchId && batch.branchId !== ctx.branchId) {
      return NextResponse.json({ error: "Batch belongs to a different branch" }, { status: 403 });
    }
  }

  const now = new Date();
  const demoExpiresAt = new Date(now);
  demoExpiresAt.setDate(demoExpiresAt.getDate() + DEMO_PERIOD_DAYS);

  // Determine subscription plan
  let finalPlan: SubscriptionPlan = "MONTHLY";
  if (isDemo) {
    finalPlan = "DEMO";
  } else if (plan && ["ONE_TIME", "INSTALLMENTS", "MONTHLY", "QUARTERLY"].includes(plan)) {
    finalPlan = plan as SubscriptionPlan;
  } else if (course.feeType === "QUARTERLY") {
    finalPlan = "QUARTERLY";
  } else if (course.feeType === "ONE_TIME") {
    finalPlan = installmentPlan && Array.isArray(installmentPlan) && installmentPlan.length > 1 ? "INSTALLMENTS" : "ONE_TIME";
  }

  // Renewal / Period End
  let currentPeriodEnd: Date | null = null;
  if (!isDemo) {
    if (finalPlan === "QUARTERLY") {
      const qEnd = new Date(now);
      qEnd.setDate(qEnd.getDate() + QUARTERLY_RENEWAL_PERIOD_DAYS);
      currentPeriodEnd = qEnd;
    } else if (finalPlan === "MONTHLY") {
      const mEnd = new Date(now);
      mEnd.setDate(mEnd.getDate() + RENEWAL_PERIOD_DAYS);
      currentPeriodEnd = mEnd;
    }
  }

  // Course duration and end date
  const effectiveDuration = courseDuration ? String(courseDuration).trim() : course.duration || "1 Year";
  const calculatedEndDate = calculateCourseEndDate(now, effectiveDuration);

  // Installment plan processing
  let processedInstallments: FeeInstallment[] | null = null;
  let computedDueDate = dueDate ? new Date(dueDate) : null;
  const initialPaid = Number(paidFee) || 0;

  if (installmentPlan && Array.isArray(installmentPlan) && installmentPlan.length > 0) {
    if (initialPaid > 0) {
      const applied = applyPaymentToInstallments(installmentPlan as FeeInstallment[], initialPaid, 1, now);
      processedInstallments = applied.updatedInstallments;
      if (applied.nextDueDate) {
        computedDueDate = new Date(applied.nextDueDate);
      }
    } else {
      processedInstallments = installmentPlan as FeeInstallment[];
      const firstDue = processedInstallments.find((i) => i.status !== "PAID");
      if (firstDue) computedDueDate = new Date(firstDue.dueDate);
    }
  }

  const numRegFee = registrationFee ? Number(registrationFee) : null;
  const seatBookedFlag = Boolean(isSeatBooked || (numRegFee !== null && numRegFee > 0));

  const numDiscount = discountPercent !== undefined && discountPercent !== null ? Number(discountPercent) : null;
  let approvalStatus: string | null = null;
  if (numDiscount !== null && numDiscount > 0) {
    approvalStatus = numDiscount > 30 ? "PENDING_OWNER_APPROVAL" : "AUTO_APPROVED";
  }

  const cleanParentEmail = parentEmail ? String(parentEmail).trim().toLowerCase() : null;

  const student = await prisma.student.create({
    data: {
      instituteId: ctx.instituteId,
      name: String(name).trim(),
      mobile: String(mobile).trim(),
      email: cleanEmail,
      parentMobile: parentMobile ? String(parentMobile).trim() : null,
      parentEmail: cleanParentEmail,
      courseId,
      batchId: batchId || null,
      branchId: effectiveBranchId,
      totalFee: Number(totalFee),
      paidFee: initialPaid,
      dueDate: computedDueDate,
      plan: finalPlan,
      subscriptionStatus: isDemo ? "TRIAL" : "ACTIVE",
      demoStartedAt: isDemo ? now : null,
      demoExpiresAt: isDemo ? demoExpiresAt : null,
      currentPeriodEnd,
      monthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
      quarterlyAmount: quarterlyAmount ? Number(quarterlyAmount) : null,
      courseDuration: effectiveDuration,
      courseEndDate: calculatedEndDate,
      installmentPlan: processedInstallments ? (processedInstallments as any) : undefined,
      registrationFee: numRegFee,
      isSeatBooked: seatBookedFlag,
      discountPercent: numDiscount,
      discountApprovalStatus: approvalStatus,
      photoUrl: photoUrl ? String(photoUrl).trim() : null,
    },
    include: { course: true, batch: true, branch: true },
  });

  // If discount > 30%, create a DiscountRequest and send notification to owner
  if (approvalStatus === "PENDING_OWNER_APPROVAL") {
    await prisma.discountRequest.create({
      data: {
        instituteId: ctx.instituteId,
        studentId: student.id,
        studentName: student.name,
        studentMobile: student.mobile,
        courseId: student.courseId,
        courseName: course.name,
        originalFee: Number(course.fee),
        discountPercent: numDiscount!,
        discountAmount: Math.round(Number(course.fee) * (numDiscount! / 100)),
        finalFee: Number(totalFee),
        reason: discountReason ? String(discountReason).trim() : "Special discount requested by parents exceeding 30% faculty cap",
        requestedByRole: (ctx.session?.user as { role?: string })?.role || "FACULTY",
        requestedByName: ctx.session?.user?.name || "Faculty",
        status: "PENDING",
      },
    });

    await prisma.platformNotification.create({
      data: {
        instituteId: ctx.instituteId,
        type: "DISCOUNT_APPROVAL_REQUEST",
        message: `🔔 Special Discount Request: ${numDiscount}% discount requested for ${student.name} in ${course.name}. Awaiting Owner approval.`,
      },
    });
  }

  // Record initial payment in ledger if provided
  if (initialPaid > 0) {
    const firstInstTitle = processedInstallments && processedInstallments[0] ? processedInstallments[0].title : null;
    let paymentNote = seatBookedFlag && numRegFee
      ? `Seat Booking / Registration Deposit (₹${numRegFee})${firstInstTitle ? ` — ${firstInstTitle}` : ""}`
      : firstInstTitle
      ? `Initial enrollment deposit (${firstInstTitle})`
      : paymentType === "FULL_FEE"
      ? "Full Course Fee Paid on Enrollment"
      : "Initial enrollment payment";

    if (paymentReference) {
      paymentNote += ` [Ref/UTR: ${paymentReference}]`;
    }

    await prisma.payment.create({
      data: {
        instituteId: ctx.instituteId,
        studentId: student.id,
        amount: initialPaid,
        method: paymentMethod || "Cash",
        note: paymentNote,
        installmentNumber: processedInstallments ? 1 : null,
        installmentTitle: firstInstTitle || (paymentType === "FULL_FEE" ? "Full Fee" : "Enrollment Payment"),
      },
    });
  }

  // Create or link a User account for the student with initial password 'student123'
  const initialPassword = "student123";
  try {
    if (!existingUser) {
      const hashedInitialPassword = await bcrypt.hash(initialPassword, 10);
      await prisma.user.create({
        data: {
          name: student.name,
          email: cleanEmail,
          password: hashedInitialPassword,
          role: "STUDENT",
          instituteId: ctx.instituteId,
          branchId: effectiveBranchId,
        },
      });
    }
  } catch (err) {
    console.error("[students] Failed to create student User credentials:", err);
  }

  // Create or link a User account for the parent & ParentStudentLink
  let isNewParentUser = false;
  let priorParentLinkCount = 0;

  if (cleanParentEmail && cleanParentEmail.includes("@")) {
    try {
      let parentUser = await prisma.user.findUnique({
        where: { email: cleanParentEmail },
        select: { id: true, role: true },
      });

      const parentInitialPassword = "password123";
      if (!parentUser) {
        const hashedParentPassword = await bcrypt.hash(parentInitialPassword, 10);
        parentUser = await prisma.user.create({
          data: {
            name: parentMobile ? `Parent of ${student.name}` : `Parent`,
            email: cleanParentEmail,
            password: hashedParentPassword,
            role: "PARENT",
            instituteId: ctx.instituteId,
            branchId: effectiveBranchId,
          },
        });
        isNewParentUser = true;
      } else {
        priorParentLinkCount = await (prisma as any).parentStudentLink.count({
          where: { parentUserId: parentUser.id },
        });
      }

      // Link parent to student
      const existingLink = await (prisma as any).parentStudentLink.findFirst({
        where: { parentUserId: parentUser.id, studentId: student.id },
      });

      if (!existingLink) {
        await (prisma as any).parentStudentLink.create({
          data: {
            parentUserId: parentUser.id,
            studentId: student.id,
          },
        });
      }
    } catch (err) {
      console.error("[students] Failed to create or link parent User credentials:", err);
    }
  }

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/login`;

  if (student.email) {
    sendEnrollmentEmail({
      to: student.email,
      studentName: student.name,
      courseName: student.course.name,
      batchName: student.batch?.name ?? null,
      batchTiming: student.batch?.timing ?? null,
      totalFee: Number(student.totalFee),
      paidFee: Number(student.paidFee),
      isDemo: student.plan === "DEMO",
      demoExpiresAt: student.demoExpiresAt,
      initialPassword: existingUser ? undefined : initialPassword,
      portalUrl,
    }).catch((err) => console.error("[students] enrollment email failed:", err));
  }

  if (cleanParentEmail) {
    sendParentWelcomeEmail({
      to: cleanParentEmail,
      studentName: student.name,
      courseName: student.course.name,
      initialPassword: isNewParentUser ? "password123" : undefined,
      isExistingAccount: !isNewParentUser || priorParentLinkCount > 0,
      linkedChildrenCount: priorParentLinkCount + 1,
      portalUrl,
      instituteName: ctx.session?.user?.name || "Vidyalaya Institute",
    }).catch((err) => console.error("[students] parent welcome email failed:", err));
  }

  return NextResponse.json(student, { status: 201 });
}