import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("attendance:write");
  if ("error" in ctx) return ctx.error;
  const role = String((ctx as any).role || "").toUpperCase();
  if (role !== "OWNER" && role !== "ADMIN" && role !== "PLATFORM_ADMIN") {
    // Also allow ADMIN via permission check already done, but restrict to OWNER/ADMIN
    const allowed = role === "OWNER" || role === "ADMIN" || (ctx as any).isImpersonating;
    if (!allowed) return NextResponse.json({ error: "Only OWNER or ADMIN can approve corrections" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };
  if (!action || !["APPROVE", "REJECT"].includes(action)) return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });

  const correction = await prisma.attendanceCorrectionRequest.findFirst({ where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string } });
  if (!correction) return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
  if (correction.status !== "PENDING") return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });

  if (action === "REJECT") {
    const updated = await prisma.attendanceCorrectionRequest.update({ where: { id: correction.id }, data: { status: "REJECTED", reviewedByUserId: (ctx.session.user as any).id, reviewedAt: new Date() } });
    await logAudit({ instituteId: ctx.instituteId, actor: actorFromSession(ctx.session), action: "ATTENDANCE_CORRECTION_REJECTED", entityType: "AttendanceCorrectionRequest", entityId: updated.id, metadata: { studentId: updated.studentId } });
    return NextResponse.json(updated);
  }

  // APPROVE: apply status change to attendance record
  const attendance = await prisma.attendance.findUnique({ where: { id: correction.attendanceId || undefined } });
  // fallback find by studentId+date if attendanceId missing
  let att = attendance;
  if (!att) {
    att = await prisma.attendance.findFirst({ where: { studentId: correction.studentId, date: correction.date, instituteId: ctx.instituteId } });
  }
  if (!att) return NextResponse.json({ error: "Original attendance record not found" }, { status: 404 });

  await prisma.attendance.update({ where: { id: att.id }, data: { status: correction.requestedStatus, locked: true } });
  const updated = await prisma.attendanceCorrectionRequest.update({ where: { id: correction.id }, data: { status: "APPROVED", reviewedByUserId: (ctx.session.user as any).id, reviewedAt: new Date() } });
  await logAudit({ instituteId: ctx.instituteId, actor: actorFromSession(ctx.session), action: "ATTENDANCE_CORRECTION_APPROVED", entityType: "AttendanceCorrectionRequest", entityId: updated.id, metadata: { studentId: updated.studentId, from: correction.currentStatus, to: correction.requestedStatus } });

  // Notify requester via email if possible (best effort)
  try {
    const requester = await prisma.user.findUnique({ where: { id: correction.requestedByUserId }, select: { email: true, name: true } });
    if (requester?.email) {
      const { sendBroadcastEmail } = await import("@/lib/email");
      await sendBroadcastEmail({ to: requester.email, subject: "Attendance correction approved", message: `Your correction request for student ${correction.studentId} on ${correction.date.toISOString().slice(0,10)} has been APPROVED. Status changed from ${correction.currentStatus} to ${correction.requestedStatus}.`, recipientName: requester.name, instituteName: "Vidyalaya" });
    }
  } catch {}

  return NextResponse.json(updated);
}
