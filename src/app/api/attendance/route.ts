import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { sendAbsentNotification, sendLateNotification } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");
  const date = searchParams.get("date");

  if (!batchId || !date) {
    return NextResponse.json({ error: "batchId and date are required" }, { status: 400 });
  }

  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.branchId && batch.branchId !== ctx.branchId) {
    return NextResponse.json({ error: "Forbidden: batch belongs to a different branch" }, { status: 403 });
  }

  const records = await prisma.attendance.findMany({
    where: { batchId, date: new Date(date), instituteId: ctx.instituteId },
  });

  return NextResponse.json(records);
}

// Bulk upsert attendance for a batch/date
export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { batchId, date, records } = body as {
    batchId: string;
    date: string;
    records: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }[];
  };

  if (!batchId || !date || !Array.isArray(records)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.branchId && batch.branchId !== ctx.branchId) {
    return NextResponse.json({ error: "Forbidden: batch belongs to a different branch" }, { status: 403 });
  }

  const day = new Date(date);

  // Check if attendance for this batch + date has already been locked
  const lockedRecord = await prisma.attendance.findFirst({
    where: { batchId, date: day, instituteId: ctx.instituteId, locked: true },
  });
  if (lockedRecord) {
    return NextResponse.json(
      { error: "Attendance for this date has already been saved and cannot be changed" },
      { status: 400 }
    );
  }

  // Snapshot what attendance looked like before this save, so we only notify parents
  // when a student is newly marked Absent/Late - not every time attendance is re-saved.
  const existing = await prisma.attendance.findMany({ where: { batchId, date: day, instituteId: ctx.instituteId } });
  const previousStatus = new Map(existing.map((r) => [r.studentId, r.status]));

  await Promise.all(
    records.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: day } },
        update: { status: r.status, batchId, locked: true },
        create: { studentId: r.studentId, batchId, date: day, status: r.status, instituteId: ctx.instituteId, locked: true },
      })
    )
  );

  // Fire WhatsApp alerts to parents for newly Absent/Late students - never let this block the response.
  const newlyFlagged = records.filter(
    (r) => (r.status === "ABSENT" || r.status === "LATE") && previousStatus.get(r.studentId) !== r.status
  );

  if (newlyFlagged.length > 0) {
    (async () => {
      try {
        const students = await prisma.student.findMany({
          where: { id: { in: newlyFlagged.map((r) => r.studentId) }, instituteId: ctx.instituteId },
          select: { id: true, name: true, parentMobile: true, mobile: true },
        });
        const studentMap = new Map(students.map((s) => [s.id, s]));

        await Promise.all(
          newlyFlagged.map((r) => {
            const student = studentMap.get(r.studentId);
            if (!student) return Promise.resolve();
            const targetPhone = student.parentMobile || student.mobile;
            if (!targetPhone) return Promise.resolve();

            const params = { parentMobile: targetPhone, studentName: student.name, batchName: batch.name, date: day };
            return r.status === "ABSENT" ? sendAbsentNotification(params) : sendLateNotification(params);
          })
        );
      } catch (err) {
        console.error("[attendance] failed to send parent notifications:", err);
      }
    })();
  }

  return NextResponse.json({ ok: true });
}