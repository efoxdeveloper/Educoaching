import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import type { DayOfWeek } from "@prisma/client";

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("timetable:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.timetableSlot.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });
  if (!existing) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const body = await req.json();
  const { batchId, facultyId, dayOfWeek, startTime, endTime, room } = body;

  const nextBatchId = batchId ?? existing.batchId;
  const nextFacultyId = facultyId === undefined ? existing.facultyId : facultyId || null;
  const nextDay = dayOfWeek ?? existing.dayOfWeek;
  const nextStart = startTime ?? existing.startTime;
  const nextEnd = endTime ?? existing.endTime;

  if (dayOfWeek !== undefined && !DAYS.includes(dayOfWeek)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  if ((startTime !== undefined && !TIME_RE.test(startTime)) || (endTime !== undefined && !TIME_RE.test(endTime))) {
    return NextResponse.json({ error: "Times must be in HH:MM 24-hour format" }, { status: 400 });
  }
  if (nextStart >= nextEnd) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  if (batchId) {
    const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId, branchId: ctx.branchId } });
    if (!batch) return NextResponse.json({ error: "Invalid batch for this branch" }, { status: 400 });
  }
  if (nextFacultyId) {
    const faculty = await prisma.faculty.findFirst({ where: { id: nextFacultyId, instituteId: ctx.instituteId, branchId: ctx.branchId } });
    if (!faculty) return NextResponse.json({ error: "Invalid faculty for this branch" }, { status: 400 });
  }

  const sameDay = await prisma.timetableSlot.findMany({
    where: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId,
      dayOfWeek: nextDay,
      id: { not: params.id },
      OR: [{ batchId: nextBatchId }, ...(nextFacultyId ? [{ facultyId: nextFacultyId }] : [])],
    },
  });

  const batchConflict = sameDay.find(
    (s) => s.batchId === nextBatchId && timesOverlap(nextStart, nextEnd, s.startTime, s.endTime)
  );
  if (batchConflict) {
    return NextResponse.json(
      { error: `This batch already has a class on this day from ${batchConflict.startTime} to ${batchConflict.endTime}` },
      { status: 409 }
    );
  }
  if (nextFacultyId) {
    const facultyConflict = sameDay.find(
      (s) => s.facultyId === nextFacultyId && timesOverlap(nextStart, nextEnd, s.startTime, s.endTime)
    );
    if (facultyConflict) {
      return NextResponse.json(
        { error: `This faculty member is already scheduled from ${facultyConflict.startTime} to ${facultyConflict.endTime}` },
        { status: 409 }
      );
    }
  }

  const slot = await prisma.timetableSlot.update({
    where: { id: params.id },
    data: {
      batchId: nextBatchId,
      facultyId: nextFacultyId,
      dayOfWeek: nextDay,
      startTime: nextStart,
      endTime: nextEnd,
      ...(room !== undefined ? { room: room ? String(room).trim() : null } : {}),
    },
    include: {
      batch: { select: { id: true, name: true, course: { select: { name: true } } } },
      faculty: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "TIMETABLE_SLOT_UPDATED",
    entityType: "TimetableSlot",
    entityId: slot.id,
    metadata: { batchId: nextBatchId, dayOfWeek: nextDay, startTime: nextStart, endTime: nextEnd },
  });

  return NextResponse.json(slot);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("timetable:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.timetableSlot.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });
  if (!existing) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  await prisma.timetableSlot.delete({ where: { id: params.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "TIMETABLE_SLOT_DELETED",
    entityType: "TimetableSlot",
    entityId: params.id,
    metadata: { batchId: existing.batchId, dayOfWeek: existing.dayOfWeek },
  });

  return NextResponse.json({ ok: true });
}