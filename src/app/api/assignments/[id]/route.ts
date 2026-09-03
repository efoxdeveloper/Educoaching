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
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string },
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

  // Student/Parent targeting check — reuse helper, not just list filtering
  const role = String((ctx as any).role || "").toUpperCase();
  if (role === "STUDENT") {
    const student = await prisma.student.findFirst({ where: { email: (ctx.session?.user as any)?.email, instituteId: ctx.instituteId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 403 });
    const { isStudentTargetedForContent } = await import("@/lib/targeting");
    if (!isStudentTargetedForContent(assignment as any, student as any)) {
      return NextResponse.json({ error: "Not targeted for this assignment" }, { status: 403 });
    }
  } else if (role === "PARENT") {
    const parentId = (ctx.session?.user as any)?.id as string;
    const links = await (prisma as any).parentStudentLink.findMany({ where: { parentUserId: parentId }, include: { student: true } });
    const { isStudentTargetedForContent } = await import("@/lib/targeting");
    const targeted = links.some((l: any) => l.student && isStudentTargetedForContent(assignment as any, l.student));
    if (!targeted) return NextResponse.json({ error: "Not targeted for your children" }, { status: 403 });
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
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string },
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
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string },
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
