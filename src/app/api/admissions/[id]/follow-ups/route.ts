import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("admissions:read");
  if ("error" in ctx) return ctx.error;

  const followUps = await prisma.leadFollowUp.findMany({
    where: { admissionId: params.id, instituteId: ctx.instituteId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(followUps);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("admissions:write");
  if ("error" in ctx) return ctx.error;

  const admission = await prisma.admission.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: { course: true, batch: true },
  });

  if (!admission) {
    return NextResponse.json({ error: "Lead/Admission inquiry not found" }, { status: 404 });
  }

  const body = await req.json();
  const { counsellor, callStatus, notes, scheduledAt, nextStage } = body;

  if (!callStatus || !notes) {
    return NextResponse.json({ error: "Call status and notes are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const followUp = await tx.leadFollowUp.create({
      data: {
        instituteId: ctx.instituteId,
        admissionId: admission.id,
        counsellor: counsellor || ctx.session?.user?.name || "Staff Counsellor",
        callStatus,
        notes: String(notes).trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    const updateData: {
      stage?: string;
      status?: "ENROLLED" | "REJECTED";
      studentId?: string;
      nextFollowUpDate?: Date | null;
      assignedTo?: string;
    } = {};

    if (scheduledAt !== undefined) {
      updateData.nextFollowUpDate = scheduledAt ? new Date(scheduledAt) : null;
    }

    if (counsellor) {
      updateData.assignedTo = counsellor;
    }

    if (nextStage && nextStage !== admission.stage) {
      updateData.stage = nextStage;

      // Handle Enrollment if stage advanced to ENROLLED
      if (nextStage === "ENROLLED" && !admission.studentId) {
        const student = await tx.student.create({
          data: {
            instituteId: ctx.instituteId,
            branchId: (admission.branchId as string) || (ctx.branchId as string),
            name: admission.applicantName,
            mobile: admission.mobile,
            email: admission.email,
            courseId: admission.courseId,
            batchId: admission.batchId || null,
            totalFee: admission.feePlan,
          },
        });
        updateData.studentId = student.id;
        updateData.status = "ENROLLED";
      } else if (nextStage === "LOST") {
        updateData.status = "REJECTED";
      }
    }

    const updatedAdmission = await tx.admission.update({
      where: { id: admission.id },
      data: updateData,
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        followUps: { orderBy: { createdAt: "desc" } },
      },
    });

    return { followUp, updatedAdmission };
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "LEAD_FOLLOWUP_LOGGED",
    entityType: "Admission",
    entityId: admission.id,
    metadata: {
      applicantName: admission.applicantName,
      callStatus,
      nextStage,
      scheduledAt,
    },
  });

  return NextResponse.json(result, { status: 201 });
}
