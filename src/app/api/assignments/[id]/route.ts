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

  const assignment = await prisma.assignment.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: {
      batch: { select: { id: true, name: true } },
      submissions: {
        include: { student: { select: { id: true, name: true, mobile: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json(assignment);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("assignments:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.assignment.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = await req.json();
  const { title, subject, type, description, attachmentUrl, dueDate, totalMarks } = body;

  const updated = await prisma.assignment.update({
    where: { id: params.id },
    data: {
      ...(title ? { title: String(title).trim() } : {}),
      ...(subject ? { subject: String(subject).trim() } : {}),
      ...(type ? { type: String(type).toUpperCase() } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(attachmentUrl !== undefined ? { attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : null } : {}),
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(totalMarks !== undefined ? { totalMarks: Number(totalMarks) } : {}),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "ASSIGNMENT_UPDATED",
    entityType: "Assignment",
    entityId: updated.id,
    metadata: { title: updated.title },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("assignments:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.assignment.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id: params.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "ASSIGNMENT_DELETED",
    entityType: "Assignment",
    entityId: params.id,
    metadata: { title: existing.title },
  });

  return NextResponse.json({ success: true });
}
