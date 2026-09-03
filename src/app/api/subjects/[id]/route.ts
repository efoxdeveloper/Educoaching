import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("subjects:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.subject.findFirst({
    where: { id: params.id, branchId: ctx.branchId as string, course: { instituteId: ctx.instituteId } },
  });
  if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const body = await req.json();
  const { name } = body;

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }

  const subject = await prisma.subject.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "SUBJECT_UPDATED",
    entityType: "Subject",
    entityId: subject.id,
    metadata: { name: subject.name },
  });

  return NextResponse.json(subject);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("subjects:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.subject.findFirst({
    where: { id: params.id, branchId: ctx.branchId as string, course: { instituteId: ctx.instituteId } },
  });
  if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  await prisma.subject.delete({ where: { id: params.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "SUBJECT_DELETED",
    entityType: "Subject",
    entityId: params.id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}