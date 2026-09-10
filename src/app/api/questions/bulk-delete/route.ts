import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function POST(req: Request) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const rawIds = (body.ids || body.questionIds || body.id) as unknown;

  let ids: string[] = [];
  if (Array.isArray(rawIds)) {
    ids = rawIds.map((v) => String(v).trim()).filter(Boolean);
  } else if (typeof rawIds === "string" && rawIds.trim()) {
    ids = [String(rawIds).trim()];
  }

  // Deduplicate
  ids = Array.from(new Set(ids));

  if (ids.length === 0) {
    return NextResponse.json({ error: "No question IDs provided" }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "Too many IDs (max 100 per request)" }, { status: 400 });
  }

  // Scope to institute
  const existing = await prisma.question.findMany({
    where: { id: { in: ids }, instituteId: ctx.instituteId },
    select: { id: true, subject: true },
  });

  const foundIds = existing.map((q) => q.id);
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  if (foundIds.length === 0) {
    return NextResponse.json(
      { error: "No matching questions found for your institute", notFound: notFoundIds },
      { status: 404 }
    );
  }

  // Perform deletion in transaction: first remove test-question mappings (if any), then questions.
  // Prisma schema has onDelete: Cascade for TestQuestion.questionId, but we explicitly delete
  // to ensure correct scoping and to handle any future restrictive constraints.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.testQuestion.deleteMany({
        where: { questionId: { in: foundIds } },
      });
      await tx.question.deleteMany({
        where: { id: { in: foundIds }, instituteId: ctx.instituteId },
      });
    });
  } catch (e: any) {
    console.error("[bulk-delete] transaction failed", e?.message);
    // Fallback: try direct deletes if transaction helper not available
    await prisma.testQuestion.deleteMany({ where: { questionId: { in: foundIds } } });
    await prisma.question.deleteMany({ where: { id: { in: foundIds }, instituteId: ctx.instituteId } });
  }

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "QUESTIONS_BULK_DELETED",
    entityType: "Question",
    metadata: {
      requested: ids.length,
      deleted: foundIds.length,
      skipped: notFoundIds.length,
      notFoundIds,
    },
  });

  const skipped = notFoundIds.length;
  const deleted = foundIds.length;

  // Partial success message
  let message: string | undefined;
  if (skipped > 0) {
    message = `${deleted} of ${ids.length} questions deleted, ${skipped} could not be deleted (not found or not owned by your institute)`;
  }

  return NextResponse.json({
    success: true,
    deleted,
    requested: ids.length,
    skipped,
    notFound: notFoundIds,
    message,
  });
}
