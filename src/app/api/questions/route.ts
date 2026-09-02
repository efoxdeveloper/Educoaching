import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const topic = searchParams.get("topic");
  const difficulty = searchParams.get("difficulty");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const where: Prisma.QuestionWhereInput = { instituteId: ctx.instituteId };

  if (subject) where.subject = subject;
  if (topic) where.topic = topic;
  if (difficulty) where.difficulty = difficulty;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { questionText: { contains: search, mode: "insensitive" } },
      { topic: { contains: search, mode: "insensitive" } },
    ];
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: [{ subject: "asc" }, { createdAt: "desc" }],
  });

  // Calculate question bank statistics
  const totalQuestions = questions.length;
  const subjectsSet = new Set<string>();
  const difficultyBreakdown: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };

  questions.forEach((q) => {
    subjectsSet.add(q.subject);
    if (q.difficulty in difficultyBreakdown) {
      difficultyBreakdown[q.difficulty]++;
    }
  });

  return NextResponse.json({
    questions,
    stats: {
      totalQuestions,
      totalSubjects: subjectsSet.size,
      difficultyBreakdown,
    },
  });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    subject,
    topic,
    difficulty = "MEDIUM",
    type = "MCQ_SINGLE",
    questionText,
    options,
    correctAnswer,
    explanation,
    marks = 4,
    negativeMarks = 1,
  } = body;

  if (!subject || !String(subject).trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!questionText || !String(questionText).trim()) {
    return NextResponse.json({ error: "Question text is required" }, { status: 400 });
  }
  if (correctAnswer === undefined || correctAnswer === null || String(correctAnswer).trim() === "") {
    return NextResponse.json({ error: "Correct answer is required" }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      instituteId: ctx.instituteId,
      subject: String(subject).trim(),
      topic: topic ? String(topic).trim() : null,
      difficulty: String(difficulty).toUpperCase(),
      type: String(type).toUpperCase(),
      questionText: String(questionText).trim(),
      options: options || undefined,
      correctAnswer: String(correctAnswer).trim(),
      explanation: explanation ? String(explanation).trim() : null,
      marks: Number(marks) || 4,
      negativeMarks: Number(negativeMarks) || 0,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "QUESTION_CREATED",
    entityType: "Question",
    entityId: question.id,
    metadata: {
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
    },
  });

  return NextResponse.json(question, { status: 201 });
}
