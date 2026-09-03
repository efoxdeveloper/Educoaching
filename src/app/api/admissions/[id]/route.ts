import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "ENROLLED"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("admissions:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.admission.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });
  if (!existing) return NextResponse.json({ error: "Admission not found" }, { status: 404 });

  const body = await req.json();
  const {
    branchId,
    applicantName,
    mobile,
    email,
    courseId,
    batchId,
    feePlan,
    status: reqStatus,
    stage: reqStage,
    source,
    priority,
    nextFollowUpDate,
    assignedTo,
    assignedToId,
    note,
    demoDate,
    demoStatus,
    demoFeedback,
    lostReason,
    lostNotes,
    initialPaidAmount,
    paymentMethod,
  } = body;

  let status = reqStatus;
  let stage = reqStage;

  // Keep stage & status synchronized
  if (stage === "ENROLLED" && !status) {
    status = "ENROLLED";
  } else if (status === "ENROLLED" && !stage) {
    stage = "ENROLLED";
  } else if (stage === "LOST" && !status) {
    status = "REJECTED";
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (applicantName !== undefined && !String(applicantName).trim()) {
    return NextResponse.json({ error: "Applicant name can't be empty" }, { status: 400 });
  }

  if (courseId) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, instituteId: ctx.instituteId },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (branchId && branchId !== ctx.branchId) {
    return NextResponse.json({ error: "Branch mismatch" }, { status: 403 });
  }
  if (batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId: ctx.instituteId, branchId: ctx.branchId },
    });
    if (!batch) {
      const anyBatch = await prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId } });
      if (!anyBatch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      if (anyBatch.branchId && anyBatch.branchId !== ctx.branchId) return NextResponse.json({ error: "Batch belongs to a different branch" }, { status: 403 });
    }
  }

  // Moving to ENROLLED for the first time creates the actual Student record.
  const isNewEnrollment = status === "ENROLLED" && existing.status !== "ENROLLED" && !existing.studentId;

  const admission = await prisma.$transaction(async (tx) => {
    let studentId = existing.studentId;

    if (isNewEnrollment) {
      const finalCourseId = courseId || existing.courseId;
      const finalBatchId = batchId !== undefined ? batchId : existing.batchId;
      const finalFeePlan = feePlan !== undefined ? Number(feePlan) : Number(existing.feePlan);

      const student = await tx.student.create({
        data: {
          instituteId: ctx.instituteId,
          name: applicantName !== undefined ? String(applicantName).trim() : existing.applicantName,
          mobile: mobile !== undefined ? String(mobile).trim() : existing.mobile,
          email: email !== undefined ? email : existing.email,
          courseId: finalCourseId,
          batchId: finalBatchId || null,
          branchId: ctx.branchId,
          photoUrl: existing.photoUrl || null,
          totalFee: finalFeePlan,
          paidFee: initialPaidAmount && Number(initialPaidAmount) > 0 ? Number(initialPaidAmount) : 0,
        },
      });
      studentId = student.id;

      if (initialPaidAmount && Number(initialPaidAmount) > 0) {
        await tx.payment.create({
          data: {
            instituteId: ctx.instituteId,
            studentId: student.id,
            amount: Number(initialPaidAmount),
            method: paymentMethod || "Cash",
            note: `Admission fee collected upon enrollment (${student.name})`,
          },
        });
      }
    }

    return tx.admission.update({
      where: { id: params.id },
      data: {
        ...(branchId !== undefined ? { branchId: ctx.branchId } : {}),
        ...(applicantName !== undefined ? { applicantName: String(applicantName).trim() } : {}),
        ...(mobile !== undefined ? { mobile: String(mobile).trim() } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(courseId !== undefined ? { courseId } : {}),
        ...(batchId !== undefined ? { batchId: batchId || null } : {}),
        ...(feePlan !== undefined ? { feePlan: Number(feePlan) } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(nextFollowUpDate !== undefined
          ? { nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null }
          : {}),
        ...(assignedToId !== undefined ? { assignedToId: assignedToId || null } : {}),
        ...(assignedTo !== undefined ? { assignedTo: assignedTo || null } : {}),
        ...(note !== undefined ? { note: note || null } : {}),
        ...(demoDate !== undefined ? { demoDate: demoDate ? new Date(demoDate) : null } : {}),
        ...(demoStatus !== undefined ? { demoStatus: demoStatus || null } : {}),
        ...(demoFeedback !== undefined ? { demoFeedback: demoFeedback || null } : {}),
        ...(lostReason !== undefined ? { lostReason: lostReason || null } : {}),
        ...(lostNotes !== undefined ? { lostNotes: lostNotes || null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(studentId !== existing.studentId ? { studentId } : {}),
      },
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        assignedCounsellor: { select: { id: true, name: true, roleType: true } },
        followUps: { orderBy: { createdAt: "desc" } },
      },
    });
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: isNewEnrollment ? "ADMISSION_ENROLLED" : "ADMISSION_UPDATED",
    entityType: "Admission",
    entityId: admission.id,
    metadata: {
      applicantName: admission.applicantName,
      status: admission.status,
      stage: admission.stage,
      studentId: admission.studentId,
    },
  });

  return NextResponse.json(admission);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("admissions:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.admission.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId },
  });
  if (!existing) return NextResponse.json({ error: "Admission not found" }, { status: 404 });

  if (existing.studentId) {
    return NextResponse.json(
      { error: "Can't delete an admission that has already been enrolled as a student" },
      { status: 409 }
    );
  }

  await prisma.admission.delete({ where: { id: params.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "ADMISSION_DELETED",
    entityType: "Admission",
    entityId: params.id,
    metadata: { applicantName: existing.applicantName },
  });

  return NextResponse.json({ ok: true });
}