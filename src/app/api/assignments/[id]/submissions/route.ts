import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const assignment = await prisma.assignment.findFirst({ where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found for this branch" }, { status: 404 });

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: params.id },
    include: {
      student: { select: { id: true, name: true, mobile: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { studentId, submissionUrl, notes, marksObtained, feedback, isEvaluation = false } = body;

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  if (isEvaluation) {
    // Teacher grading evaluation
    const perm = await requirePermission("assignments:write");
    if ("error" in perm) return perm.error;

    const updated = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: params.id,
          studentId,
        },
      },
      update: {
        marksObtained: marksObtained !== undefined ? Number(marksObtained) : null,
        feedback: feedback ? String(feedback).trim() : null,
        status: "EVALUATED",
        evaluatedAt: new Date(),
      },
      create: {
        assignmentId: params.id,
        studentId,
        marksObtained: marksObtained !== undefined ? Number(marksObtained) : null,
        feedback: feedback ? String(feedback).trim() : null,
        status: "EVALUATED",
        evaluatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  }

  // Student submission — branch + targeting check
  const assignment = await prisma.assignment.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found for this branch" }, { status: 404 });
  }
  // If caller is STUDENT/PARENT, verify targeting
  const role = String((ctx as any).role || "").toUpperCase();
  if (role === "STUDENT" || role === "PARENT") {
    const { isStudentTargetedForContent } = await import("@/lib/targeting");
    let studentIds: string[] = [];
    if (role === "STUDENT") {
      const s = await prisma.student.findFirst({ where: { email: (ctx.session?.user as any)?.email, instituteId: ctx.instituteId } });
      if (s) studentIds = [s.id];
    } else {
      const parentId = (ctx.session?.user as any)?.id as string;
      const links = await (prisma as any).parentStudentLink.findMany({ where: { parentUserId: parentId }, select: { studentId: true } });
      studentIds = links.map((l: any) => l.studentId);
    }
    const studentForCheck = await prisma.student.findFirst({ where: { id: studentId, instituteId: ctx.instituteId } });
    if (!studentForCheck || !isStudentTargetedForContent(assignment as any, studentForCheck as any) || !studentIds.includes(studentId)) {
      return NextResponse.json({ error: "Not targeted for this assignment" }, { status: 403 });
    }
  }

  const now = new Date();
  const isLate = assignment.dueDate ? now > new Date(assignment.dueDate) : false;

  const submission = await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: params.id,
        studentId,
      },
    },
    update: {
      submissionUrl: submissionUrl ? String(submissionUrl).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      submittedAt: now,
      status: isLate ? "LATE" : "SUBMITTED",
    },
    create: {
      assignmentId: params.id,
      studentId,
      submissionUrl: submissionUrl ? String(submissionUrl).trim() : null,
      notes: notes ? String(notes).trim() : null,
      submittedAt: now,
      status: isLate ? "LATE" : "SUBMITTED",
    },
  });

  return NextResponse.json(submission);
}
