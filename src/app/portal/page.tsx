import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { StudentPortalView } from "@/components/portal/StudentPortalView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstituteId } from "@/lib/tenant";

export default async function StudentPortalPage({
  searchParams,
}: {
  searchParams: { studentId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let instituteId = await getInstituteId();
  const userRole = String((session.user as { role?: string })?.role || "").toUpperCase();
  const userEmail = session.user.email;
  const userId = (session.user as { id?: string })?.id;

  if (!instituteId) {
    if (userRole === "PARENT" && userId) {
      const link = await (prisma as any).parentStudentLink.findFirst({
        where: { parentUserId: userId },
        include: { student: true },
      });
      if (link?.student?.instituteId) {
        instituteId = link.student.instituteId;
      }
    } else if (userRole === "STUDENT" && userEmail) {
      const st = await prisma.student.findFirst({
        where: { email: { equals: userEmail, mode: "insensitive" } },
      });
      if (st?.instituteId) {
        instituteId = st.instituteId;
      }
    }
  }

  if (!instituteId) {
    redirect("/login");
  }

  // Build secure student filter based on session role
  let studentFilter: { id?: string; email?: string } = {};

  if (userRole === "STUDENT") {
    // A logged-in student must only access their own student record
    if (!userEmail) {
      redirect("/login");
    }
    studentFilter = { email: userEmail };
  } else if (userRole === "PARENT") {
    const userId = (session.user as { id?: string })?.id;
    const links = await (prisma as any).parentStudentLink.findMany({
      where: { parentUserId: userId },
      select: { studentId: true },
    });
    const linkedIds: string[] = Array.isArray(links) ? links.map((l: { studentId: string }) => l.studentId) : [];
    if (linkedIds.length === 0 && userEmail) {
      const matchingStudents = await prisma.student.findMany({
        where: { instituteId, parentEmail: userEmail },
        select: { id: true },
      });
      linkedIds.push(...matchingStudents.map((s) => s.id));
    }
    studentFilter = { id: { in: linkedIds } as any };
  } else if (userRole === "OWNER" || userRole === "ADMIN" || userRole === "STAFF" || userRole === "PLATFORM_ADMIN") {
    // Admins and staff can preview a specific student's portal within their institute
    if (searchParams?.studentId) {
      studentFilter = { id: searchParams.studentId };
    }
  } else {
    // Any other unauthorized role
    redirect("/dashboard");
  }

  const rawStudents = await prisma.student.findMany({
    where: { instituteId, ...studentFilter },
    include: {
      course: { select: { name: true, duration: true } },
      branch: { select: { id: true, name: true, city: true } },
      batch: {
        select: {
          id: true,
          name: true,
          timing: true,
          status: true,
          isAllBranches: true,
          branch: { select: { name: true } },
          branches: { select: { name: true } },
          faculty: {
            select: {
              faculty: { select: { name: true, subject: true } },
            },
          },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        take: 20,
      },
      issuedCertificates: {
        include: {
          template: { select: { name: true, title: true } },
        },
        orderBy: { issuedAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const studentBatchIds = rawStudents
    .map((s) => s.batchId)
    .filter((b): b is string => Boolean(b));
  const studentBranchIds = Array.from(new Set(rawStudents.map((s) => s.branchId).filter(Boolean) as string[]));

  const [rawExams, rawMaterials, rawAssignments, rawLiveClasses] = await Promise.all([
    studentBatchIds.length > 0
      ? prisma.test.findMany({
          where: {
            instituteId,
            branchId: studentBranchIds.length > 0 ? { in: studentBranchIds } : undefined,
            isOnline: true,
            batchId: { in: studentBatchIds },
          },
          include: {
            attempts: true,
          },
          orderBy: { testDate: "desc" },
        })
      : [],
    prisma.studyMaterial.findMany({
      where: {
        instituteId,
        ...(studentBranchIds.length > 0 ? { branchId: { in: studentBranchIds } } : {}),
        // Also scope by batch/course targeting: will be filtered via isStudentTargeted on client, but pre-filter by branch
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.assignment.findMany({
      where: {
        instituteId,
        ...(studentBranchIds.length > 0 ? { branchId: { in: studentBranchIds } } : {}),
      },
      include: {
        submissions: true,
      },
      orderBy: { dueDate: "desc" },
    }),
    prisma.liveClass.findMany({
      where: {
        instituteId,
        ...(studentBranchIds.length > 0 ? { branchId: { in: studentBranchIds } } : {}),
        status: { in: ["SCHEDULED", "LIVE"] },
        ...(studentBatchIds.length > 0 ? { batchId: { in: studentBatchIds } } : {}),
      },
      include: {
        faculty: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const students = rawStudents.map((s) => {
    const totalFee = Number(s.totalFee);
    const paidFee = Number(s.paidFee);
    return {
      id: s.id,
      name: s.name,
      mobile: s.mobile,
      email: s.email,
      photoUrl: s.photoUrl,
      courseId: s.courseId,
      courseName: s.course.name,
      courseDuration: s.course.duration,
      batchId: s.batchId,
      batchName: s.batch?.name || "General Batch",
      branchName: s.branch?.name || "Main Branch",
      totalFee,
      paidFee,
      pendingFee: Math.max(0, totalFee - paidFee),
      plan: s.plan,
      installmentPlan: s.installmentPlan,
      quarterlyAmount: s.quarterlyAmount ? Number(s.quarterlyAmount) : null,
      monthlyAmount: s.monthlyAmount ? Number(s.monthlyAmount) : null,
      dueDate: s.dueDate ? s.dueDate.toISOString() : null,
      registrationFee: s.registrationFee ? Number(s.registrationFee) : null,
      isSeatBooked: s.isSeatBooked,
      batch: s.batch
        ? {
            id: s.batch.id,
            name: s.batch.name,
            timing: s.batch.timing,
            status: s.batch.status,
            branchName: s.batch.isAllBranches
              ? "All Branches (Central Program)"
              : s.batch.branches && s.batch.branches.length > 0
              ? s.batch.branches.map((b) => b.name).join(", ")
              : s.batch.branch?.name || "Main Branch",
            facultyMembers: s.batch.faculty.map((f) => `${f.faculty.name} (${f.faculty.subject || "Faculty"})`),
          }
        : null,
      payments: s.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        baseAmount: p.baseAmount ? Number(p.baseAmount) : null,
        gstAmount: p.gstAmount ? Number(p.gstAmount) : null,
        gstPercent: p.gstPercent ? Number(p.gstPercent) : null,
        isRefund: p.isRefund,
        refundReason: p.refundReason,
        receiptFileId: p.receiptFileId,
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        installmentNumber: p.installmentNumber,
        installmentTitle: p.installmentTitle,
      })),
      certificates: (s.issuedCertificates || []).map((c) => ({
        id: c.id,
        templateName: c.template.name,
        title: c.template.title,
        issuedAt: c.issuedAt.toISOString(),
        pdfFileAssetId: c.pdfFileAssetId,
      })),
    };
  });

  const exams = rawExams.map((ex) => {
    const firstAttempt = ex.attempts[0] || null;
    return {
      id: ex.id,
      title: ex.title,
      subject: ex.subject,
      durationMinutes: ex.durationMinutes,
      startTime: ex.startTime ? ex.startTime.toISOString() : null,
      endTime: ex.endTime ? ex.endTime.toISOString() : null,
      totalMarks: ex.totalMarks,
      negativeMarks: ex.negativeMarks,
      seriesName: ex.seriesName,
      testDate: ex.testDate.toISOString(),
      batchId: ex.batchId,
      attempt: firstAttempt
        ? {
            score: firstAttempt.score || 0,
            rank: firstAttempt.rank,
            percentile: firstAttempt.percentile,
            status: firstAttempt.status,
            submittedAt: firstAttempt.submittedAt?.toISOString() || "",
          }
        : null,
    };
  });

  const materials = rawMaterials.map((m) => ({
    id: m.id,
    title: m.title,
    subject: m.subject,
    topic: m.topic,
    fileType: m.fileType,
    fileUrl: m.fileUrl,
    description: m.description,
    createdAt: m.createdAt.toISOString(),
  }));

  const assignments = rawAssignments.map((a) => {
    const firstSub = a.submissions[0] || null;
    return {
      id: a.id,
      title: a.title,
      subject: a.subject,
      type: a.type,
      dueDate: a.dueDate.toISOString(),
      totalMarks: a.totalMarks || 100,
      attachmentUrl: a.attachmentUrl,
      submission: firstSub
        ? {
            status: firstSub.status,
            marksObtained: firstSub.marksObtained,
            feedback: firstSub.feedback,
            submittedAt: firstSub.submittedAt ? firstSub.submittedAt.toISOString() : "",
          }
        : null,
    };
  });

  const liveClasses = (rawLiveClasses || []).map((lc) => ({
    id: lc.id,
    title: lc.title,
    subject: lc.subject,
    description: lc.description,
    scheduledAt: lc.scheduledAt.toISOString(),
    durationMinutes: lc.durationMinutes,
    meetingLink: lc.meetingLink,
    status: lc.status,
    batchId: lc.batchId,
    facultyName: lc.faculty?.name,
  }));

  return (
    <Shell title="Student & Parent Portal" userName={session?.user?.name ?? undefined}>
      <StudentPortalView
        students={students}
        exams={exams}
        materials={materials}
        assignments={assignments}
        liveClasses={liveClasses}
        viewerRole={userRole === "PARENT" ? "PARENT" : "STUDENT"}
      />
    </Shell>
  );
}
