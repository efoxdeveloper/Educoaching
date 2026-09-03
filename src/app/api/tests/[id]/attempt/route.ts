import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const test = await prisma.test.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: {
      batch: { select: { id: true, name: true } },
      questions: {
        include: { question: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId: ctx.instituteId },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (student.batchId !== test.batchId) {
    return NextResponse.json(
      { error: "Student is not enrolled in the batch for this exam" },
      { status: 403 }
    );
  }

  const attempt = await prisma.studentTestAttempt.findUnique({
    where: {
      testId_studentId: {
        testId: params.id,
        studentId,
      },
    },
  });

  const isCompleted = attempt && (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT");

  if (role === "PARENT" && !isCompleted) {
    return NextResponse.json(
      { error: "Parents cannot start or take online exams" },
      { status: 403 }
    );
  }

  if (isCompleted) {
    // Return full details including solutions & answers
    return NextResponse.json({
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        negativeMarks: test.negativeMarks,
        marksPerQuestion: test.marksPerQuestion,
        batchName: test.batch.name,
      },
      attempt,
      questions: test.questions.map((tq) => ({
        id: tq.question.id,
        order: tq.order,
        section: tq.section,
        subject: tq.question.subject,
        questionText: tq.question.questionText,
        options: tq.question.options,
        correctAnswer: tq.question.correctAnswer,
        explanation: tq.question.explanation,
        marks: tq.question.marks,
        negativeMarks: tq.question.negativeMarks,
        difficulty: tq.question.difficulty,
        topic: tq.question.topic,
      })),
      isCompleted: true,
    });
  }

  // If in progress or fresh attempt: do NOT leak correct answers or explanations!
  return NextResponse.json({
    test: {
      id: test.id,
      title: test.title,
      subject: test.subject,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      negativeMarks: test.negativeMarks,
      marksPerQuestion: test.marksPerQuestion,
      batchName: test.batch.name,
    },
    attempt: attempt || null,
    questions: test.questions.map((tq) => ({
      id: tq.question.id,
      order: tq.order,
      section: tq.section,
      subject: tq.question.subject,
      questionText: tq.question.questionText,
      options: tq.question.options,
      marks: tq.question.marks,
      negativeMarks: tq.question.negativeMarks,
      difficulty: tq.question.difficulty,
      topic: tq.question.topic,
    })),
    isCompleted: false,
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { studentId, answers = {}, timeSpentSeconds = 0 } = body;

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const test = await prisma.test.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: {
      questions: {
        include: { question: true },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const role = String((ctx.session?.user as { role?: string })?.role || "").toUpperCase();
  if (role === "PARENT") {
    return NextResponse.json(
      { error: "Parents cannot submit exam attempts" },
      { status: 403 }
    );
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId: ctx.instituteId },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (student.batchId !== test.batchId) {
    return NextResponse.json(
      { error: "Student is not enrolled in the batch for this exam" },
      { status: 403 }
    );
  }

  // Calculate scores with negative marking
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnattempted = 0;
  let rawScore = 0;

  const userAnswers = answers as Record<string, string>;

  for (const tq of test.questions) {
    const q = tq.question;
    const studentChoice = userAnswers[q.id];

    if (studentChoice === undefined || studentChoice === null || studentChoice === "") {
      totalUnattempted++;
    } else if (String(studentChoice).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
      totalCorrect++;
      rawScore += q.marks || 4;
    } else {
      totalIncorrect++;
      rawScore -= q.negativeMarks || 1;
    }
  }

  const finalScore = Math.max(0, rawScore);

  // Save attempt
  const attempt = await prisma.studentTestAttempt.upsert({
    where: {
      testId_studentId: {
        testId: params.id,
        studentId,
      },
    },
    update: {
      submittedAt: new Date(),
      status: "SUBMITTED",
      answers,
      score: finalScore,
      totalCorrect,
      totalIncorrect,
      totalUnattempted,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
    },
    create: {
      testId: params.id,
      studentId,
      submittedAt: new Date(),
      status: "SUBMITTED",
      answers,
      score: finalScore,
      totalCorrect,
      totalIncorrect,
      totalUnattempted,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
    },
  });

  // Sync to TestResult table for offline / unified view
  await prisma.testResult.upsert({
    where: {
      testId_studentId: {
        testId: params.id,
        studentId,
      },
    },
    update: {
      marksObtained: finalScore,
      isAbsent: false,
      remarks: `Online exam: ${totalCorrect} correct, ${totalIncorrect} incorrect`,
    },
    create: {
      testId: params.id,
      studentId,
      marksObtained: finalScore,
      isAbsent: false,
      remarks: `Online exam: ${totalCorrect} correct, ${totalIncorrect} incorrect`,
    },
  });

  // Re-calculate ranks & percentiles across all submitted attempts for this test
  const allAttempts = await prisma.studentTestAttempt.findMany({
    where: { testId: params.id, status: "SUBMITTED" },
    orderBy: { score: "desc" },
  });

  const totalSubmitters = allAttempts.length;

  for (let i = 0; i < totalSubmitters; i++) {
    const att = allAttempts[i];
    const rank = i + 1;
    const lowerCount = allAttempts.filter((a) => (a.score || 0) < (att.score || 0)).length;
    const percentile = totalSubmitters > 1
      ? Number(((lowerCount / (totalSubmitters - 1)) * 100).toFixed(1))
      : 100;

    await prisma.studentTestAttempt.update({
      where: { id: att.id },
      data: { rank, percentile },
    });
  }

  // Fetch updated attempt with computed rank & percentile
  const updatedAttempt = await prisma.studentTestAttempt.findUnique({
    where: { id: attempt.id },
  });

  return NextResponse.json({
    success: true,
    attempt: updatedAttempt,
  });
}
