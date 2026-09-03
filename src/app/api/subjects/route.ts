import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(req: Request) {
  const ctx = await requirePermission("subjects:read");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId") || undefined;

  const subjects = await prisma.subject.findMany({
    where: {
      branchId: ctx.branchId,
      course: { instituteId: ctx.instituteId },
      ...(courseId ? { courseId } : {}),
    },
    include: { course: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subjects);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("subjects:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { courseId, name } = body;

  if (!courseId || !String(courseId).trim()) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, instituteId: ctx.instituteId },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existing = await prisma.subject.findFirst({
    where: { courseId, branchId: ctx.branchId, name: String(name).trim() },
  });
  if (existing) {
    return NextResponse.json({ error: "Subject already exists for this course in this branch" }, { status: 409 });
  }

  const subject = await prisma.subject.create({
    data: {
      courseId,
      branchId: ctx.branchId,
      name: String(name).trim(),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "SUBJECT_CREATED",
    entityType: "Subject",
    entityId: subject.id,
    metadata: { name: subject.name, courseId },
  });

  return NextResponse.json(subject, { status: 201 });
}