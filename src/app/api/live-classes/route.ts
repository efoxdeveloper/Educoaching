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

  const where: Prisma.LiveClassWhereInput = { instituteId: ctx.instituteId };

  if (batchId) where.batchId = batchId;
  if (facultyId) where.facultyId = facultyId;
  if (status) where.status = status as any;

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
  if (batchId && !resolvedCourseId) {
    const b = await prisma.batch.findUnique({ where: { id: batchId }, select: { courseId: true } });
    if (b) resolvedCourseId = b.courseId;
  }

  const liveClass = await prisma.liveClass.create({
    data: {
      instituteId: ctx.instituteId,
      batchId: batchId || null,
      courseId: resolvedCourseId,
      facultyId: facultyId || null,
      subject: subject ? subject.trim() : null,
      title: title.trim(),
      description: description ? description.trim() : null,
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
