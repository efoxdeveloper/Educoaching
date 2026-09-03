import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");
  const facultyId = searchParams.get("facultyId");
  const status = searchParams.get("status");

  const where: Prisma.LiveClassWhereInput = { instituteId: ctx.instituteId, branchId: ctx.branchId as string };

  if (batchId) {
    const b = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
    if (!b) return NextResponse.json({ error: "Batch not found for this branch" }, { status: 404 });
    where.batchId = batchId;
  }
  if (facultyId) where.facultyId = facultyId;
  if (status) where.status = status as any;

  // Parent role: block meetingLink in list (view-only)
  const role = String((ctx as any).role || "").toUpperCase();
  if (role === "PARENT") {
    // Parents can view scheduled classes for their children but not join — filter to children's batches only
    const parentId = (ctx.session?.user as any)?.id as string;
    const links = await (prisma as any).parentStudentLink.findMany({ where: { parentUserId: parentId }, include: { student: { select: { batchId: true } } } });
    const childBatchIds = links.map((l: any) => l.student?.batchId).filter(Boolean) as string[];
    if (childBatchIds.length === 0) return NextResponse.json([]);
    where.batchId = { in: childBatchIds } as any;
  } else if (role === "STUDENT") {
    const student = await prisma.student.findFirst({ where: { email: (ctx.session?.user as any)?.email, instituteId: ctx.instituteId } });
    if (!student || !student.batchId) return NextResponse.json([]);
    // Student can only see live classes for their own batch and branch
    if (batchId && batchId !== student.batchId) return NextResponse.json({ error: "Not targeted for this batch" }, { status: 403 });
    where.batchId = student.batchId as any;
  }

  const liveClasses = await prisma.liveClass.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } },
          _count: { select: { students: true } },
        },
      },
      faculty: {
        select: {
          id: true,
          name: true,
          subject: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Parents can view scheduled classes but must not get Join link
  if (role === "PARENT") {
    const sanitized = liveClasses.map(({ meetingLink, ...rest }) => rest);
    return NextResponse.json(sanitized);
  }

  return NextResponse.json(liveClasses);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("live-classes:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const {
    title,
    batchId,
    courseId,
    facultyId,
    subject,
    description,
    scheduledAt,
    durationMinutes,
    meetingLink,
  } = body as {
    title?: string;
    batchId?: string;
    courseId?: string;
    facultyId?: string;
    subject?: string;
    description?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    meetingLink?: string;
  };

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Class title is required" }, { status: 400 });
  }

  if (!scheduledAt) {
    return NextResponse.json({ error: "Class schedule date and time is required" }, { status: 400 });
  }

  if (!meetingLink || !meetingLink.trim()) {
    return NextResponse.json({ error: "Zoom, Google Meet, or Microsoft Teams meeting link is required" }, { status: 400 });
  }

  let resolvedCourseId = courseId || null;
  if (batchId) {
    const b = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
    if (!b) return NextResponse.json({ error: "Batch not found for this branch" }, { status: 404 });
    if (!resolvedCourseId) resolvedCourseId = b.courseId;
  }
  if (facultyId) {
    const f = await prisma.faculty.findFirst({ where: { id: facultyId, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
    if (!f) return NextResponse.json({ error: "Faculty not found for this branch" }, { status: 404 });
  }

  const liveClass = await prisma.liveClass.create({
    data: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId as string,
      batchId: batchId || null,
      courseId: resolvedCourseId,
      facultyId: facultyId || null,
      subject: subject ? subject.trim() : null,
      title: title.trim(),
      description: description ? String(description).trim() : null,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
      meetingLink: meetingLink.trim(),
      status: "SCHEDULED",
      reminderSent: false,
    },
    include: {
      batch: { select: { id: true, name: true } },
      faculty: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "LIVE_CLASS_SCHEDULED",
    entityType: "LiveClass",
    entityId: liveClass.id,
    metadata: {
      title: liveClass.title,
      scheduledAt: liveClass.scheduledAt.toISOString(),
      batchId: liveClass.batchId,
      meetingLink: liveClass.meetingLink,
    },
  });

  return NextResponse.json(liveClass, { status: 201 });
}
