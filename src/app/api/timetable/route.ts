import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import type { DayOfWeek } from "@prisma/client";

import { timesOverlap } from "@/lib/timetable";

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:MM", 24hr

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const slots = await prisma.timetableSlot.findMany({
    where: { instituteId: ctx.instituteId, branchId: ctx.branchId as string },
    include: {
      batch: { select: { id: true, name: true, course: { select: { name: true } } } },
      faculty: { select: { id: true, name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("timetable:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { batchId, facultyId, dayOfWeek, daysOfWeek, startTime, endTime, room } = body;

  const targetDays: DayOfWeek[] = Array.isArray(daysOfWeek) && daysOfWeek.length > 0
    ? daysOfWeek
    : dayOfWeek ? [dayOfWeek] : [];

  if (!batchId || targetDays.length === 0 || !startTime || !endTime) {
    return NextResponse.json({ error: "Batch, at least one day, start and end time are required" }, { status: 400 });
  }

  for (const day of targetDays) {
    if (!DAYS.includes(day)) {
      return NextResponse.json({ error: `Invalid day: ${day}` }, { status: 400 });
    }
  }

  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return NextResponse.json({ error: "Times must be in HH:MM 24-hour format" }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
  if (!batch) return NextResponse.json({ error: "Invalid batch for this branch" }, { status: 400 });

  if (facultyId) {
    const faculty = await prisma.faculty.findFirst({ where: { id: facultyId, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
    if (!faculty) return NextResponse.json({ error: "Invalid faculty for this branch" }, { status: 400 });
  }

  // Conflict check across all target days — scoped to current branch only
  const existingSlots = await prisma.timetableSlot.findMany({
    where: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId as string,
      dayOfWeek: { in: targetDays },
      OR: [{ batchId }, ...(facultyId ? [{ facultyId }] : [])],
    },
  });

  for (const day of targetDays) {
    const daySlots = existingSlots.filter((s) => s.dayOfWeek === day);

    const batchConflict = daySlots.find(
      (s) => s.batchId === batchId && timesOverlap(startTime, endTime, s.startTime, s.endTime)
    );
    if (batchConflict) {
      return NextResponse.json(
        { error: `This batch already has a class on ${day} from ${batchConflict.startTime} to ${batchConflict.endTime}` },
        { status: 409 }
      );
    }

    if (facultyId) {
      const facultyConflict = daySlots.find(
        (s) => s.facultyId === facultyId && timesOverlap(startTime, endTime, s.startTime, s.endTime)
      );
      if (facultyConflict) {
        return NextResponse.json(
          { error: `This faculty member is already scheduled on ${day} from ${facultyConflict.startTime} to ${facultyConflict.endTime}` },
          { status: 409 }
        );
      }
    }
  }

  const createdSlots = await prisma.$transaction(
    targetDays.map((day) =>
      prisma.timetableSlot.create({
        data: {
          instituteId: ctx.instituteId,
          branchId: ctx.branchId as string,
          batchId,
          facultyId: facultyId || null,
          dayOfWeek: day,
          startTime,
          endTime,
          room: room ? String(room).trim() : null,
        },
        include: {
          batch: { select: { id: true, name: true, course: { select: { name: true } } } },
          faculty: { select: { id: true, name: true } },
        },
      })
    )
  );

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "TIMETABLE_SLOT_CREATED",
    entityType: "TimetableSlot",
    entityId: createdSlots[0]?.id || batchId,
    metadata: { batchId, days: targetDays, startTime, endTime, count: createdSlots.length },
  });

  return NextResponse.json(createdSlots.length === 1 ? createdSlots[0] : createdSlots, { status: 201 });
}