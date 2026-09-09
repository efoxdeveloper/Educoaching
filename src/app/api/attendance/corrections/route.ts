import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: any = { instituteId: ctx.instituteId, branchId: ctx.branchId as string };
  if (status) where.status = status;
  const list = await prisma.attendanceCorrectionRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  // Enrich with student names
  const studentIds = Array.from(new Set(list.map((r) => r.studentId)));
  const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, mobile: true } });
  const map = new Map(students.map((s) => [s.id, s]));
  const enriched = list.map((r) => ({ ...r, student: map.get(r.studentId) || null }));
  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("attendance:write");
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const { attendanceId, studentId, batchId, date, currentStatus, requestedStatus, reason } = body;
  if (!studentId || !batchId || !date || !currentStatus || !requestedStatus || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Verify batch belongs to institute/branch
  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.branchId && batch.branchId !== ctx.branchId) return NextResponse.json({ error: "Forbidden branch" }, { status: 403 });
  // Faculty check if needed (reuse logic minimally)
  const role = String((ctx as any).role || "").toUpperCase();
  if (role === "FACULTY") {
    const sessionUser = (ctx as any).session?.user as { id?: string; email?: string | null } | undefined;
    const faculty = await prisma.faculty.findFirst({
      where: {
        instituteId: ctx.instituteId,
        OR: [...(sessionUser?.id ? [{ userId: sessionUser.id }] : []), ...(sessionUser?.email ? [{ email: { equals: sessionUser.email, mode: "insensitive" as const } }] : [])],
      },
      select: { id: true },
    });
    if (!faculty) return NextResponse.json({ error: "Faculty not found" }, { status: 403 });
    const bf = await prisma.batchFaculty.findFirst({ where: { batchId, facultyId: faculty.id } });
    if (!bf) return NextResponse.json({ error: "Forbidden: not assigned to batch" }, { status: 403 });
  }

  const attendance = attendanceId ? await prisma.attendance.findFirst({ where: { id: attendanceId, instituteId: ctx.instituteId } }) : await prisma.attendance.findFirst({ where: { studentId, date: new Date(date), instituteId: ctx.instituteId } });
  if (!attendance) return NextResponse.json({ error: "Attendance record not found for this student/date" }, { status: 404 });
  if (!attendance.locked) return NextResponse.json({ error: "Attendance is not yet locked; you can edit directly without correction request" }, { status: 400 });

  const existingPending = await prisma.attendanceCorrectionRequest.findFirst({ where: { studentId, batchId, date: new Date(date), status: "PENDING" } });
  if (existingPending) return NextResponse.json({ error: "A pending correction request already exists for this record" }, { status: 409 });

  const reqRecord = await prisma.attendanceCorrectionRequest.create({
    data: {
      instituteId: ctx.instituteId,
      branchId: ctx.branchId as string,
      attendanceId: attendance.id,
      studentId,
      batchId,
      date: new Date(date),
      requestedByUserId: (ctx.session.user as any).id,
      currentStatus,
      requestedStatus,
      reason: String(reason).trim(),
      status: "PENDING",
    },
  });
  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "ATTENDANCE_CORRECTION_REQUESTED",
    entityType: "AttendanceCorrectionRequest",
    entityId: reqRecord.id,
    metadata: { studentId, batchId, date, currentStatus, requestedStatus },
  });
  return NextResponse.json(reqRecord, { status: 201 });
}
