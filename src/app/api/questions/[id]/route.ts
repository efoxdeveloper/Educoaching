import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const question = await prisma.question.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.question.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    subject,
    topic,
    difficulty,
    type,
    questionText,
    options,
    correctAnswer,
    explanation,
    marks,
    negativeMarks,
  } = body;

  const updated = await prisma.question.update({
    where: { id: params.id },
    data: {
      ...(subject ? { subject: String(subject).trim() } : {}),
      ...(topic !== undefined ? { topic: topic ? String(topic).trim() : null } : {}),
      ...(difficulty ? { difficulty: String(difficulty).toUpperCase() } : {}),
      ...(type ? { type: String(type).toUpperCase() } : {}),
      ...(questionText ? { questionText: String(questionText).trim() } : {}),
      ...(options !== undefined ? { options: options || undefined } : {}),
      ...(correctAnswer !== undefined ? { correctAnswer: String(correctAnswer).trim() } : {}),
      ...(explanation !== undefined ? { explanation: explanation ? String(explanation).trim() : null } : {}),
      ...(marks !== undefined ? { marks: Number(marks) } : {}),
      ...(negativeMarks !== undefined ? { negativeMarks: Number(negativeMarks) } : {}),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "QUESTION_UPDATED",
    entityType: "Question",
    entityId: updated.id,
    metadata: {
      subject: updated.subject,
      topic: updated.topic,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.question.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.question.delete({
    where: { id: params.id },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "QUESTION_DELETED",
    entityType: "Question",
    entityId: params.id,
    metadata: {
      subject: existing.subject,
      topic: existing.topic,
    },
  });

  return NextResponse.json({ success: true });
}
