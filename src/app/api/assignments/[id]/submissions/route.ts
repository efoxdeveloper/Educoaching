import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

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

  // Student submission
  const assignment = await prisma.assignment.findUnique({
    where: { id: params.id },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
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
