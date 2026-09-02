import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const test = await prisma.test.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const testQuestions = await prisma.testQuestion.findMany({
    where: { testId: params.id },
    include: { question: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(testQuestions);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("tests:write");
  if ("error" in ctx) return ctx.error;

  const test = await prisma.test.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const body = await req.json();
  const { questionIds, section } = body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json(
      { error: "questionIds array is required" },
      { status: 400 }
    );
  }

  // Count existing questions to set order
  const existingCount = await prisma.testQuestion.count({
    where: { testId: params.id },
  });

  const created = [];
  for (let i = 0; i < questionIds.length; i++) {
    const qId = questionIds[i];
    const tq = await prisma.testQuestion.upsert({
      where: {
        testId_questionId: {
          testId: params.id,
          questionId: qId,
        },
      },
      update: {
        order: existingCount + i + 1,
        section: section || undefined,
      },
      create: {
        testId: params.id,
        questionId: qId,
        order: existingCount + i + 1,
        section: section || null,
      },
      include: { question: true },
    });
    created.push(tq);
  }

  // Recalculate totalMarks on the test if questions have custom marks
  const allTestQuestions = await prisma.testQuestion.findMany({
    where: { testId: params.id },
    include: { question: true },
  });
  const computedTotalMarks = allTestQuestions.reduce(
    (acc, tq) => acc + (tq.question.marks || 4),
    0
  );

  if (computedTotalMarks > 0) {
    await prisma.test.update({
      where: { id: params.id },
      data: { totalMarks: computedTotalMarks },
    });
  }

  return NextResponse.json({ added: created.length, questions: created });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("tests:write");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");

  if (!questionId) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  await prisma.testQuestion.deleteMany({
    where: {
      testId: params.id,
      questionId,
    },
  });

  return NextResponse.json({ success: true });
}
