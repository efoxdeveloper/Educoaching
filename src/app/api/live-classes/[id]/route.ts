import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("live-classes:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.liveClass.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Live class not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    title,
    batchId,
    facultyId,
    subject,
    description,
    scheduledAt,
    durationMinutes,
    meetingLink,
    status,
  } = body;

  const updated = await prisma.liveClass.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(batchId !== undefined ? { batchId: batchId || null } : {}),
      ...(facultyId !== undefined ? { facultyId: facultyId || null } : {}),
      ...(subject !== undefined ? { subject: subject ? String(subject).trim() : null } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
      ...(durationMinutes !== undefined ? { durationMinutes: Number(durationMinutes) } : {}),
      ...(meetingLink !== undefined ? { meetingLink: String(meetingLink).trim() } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: {
      batch: { select: { id: true, name: true } },
      faculty: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "LIVE_CLASS_UPDATED",
    entityType: "LiveClass",
    entityId: updated.id,
    metadata: {
      status: updated.status,
      title: updated.title,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("live-classes:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.liveClass.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Live class not found" }, { status: 404 });
  }

  await prisma.liveClass.delete({
    where: { id: params.id },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "LIVE_CLASS_DELETED",
    entityType: "LiveClass",
    entityId: params.id,
    metadata: { title: existing.title },
  });

  return NextResponse.json({ ok: true });
}
