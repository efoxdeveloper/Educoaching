import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { CourseFeeType } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("courses:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.course.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const body = await req.json();
  const {
    name,
    fee,
    feeType,
    description,
    duration,
    startDate,
    targetExam,
    eligibility,
    isAllBranches,
    branchIds,
    academicYear,
  } = body;

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }

  let feeNumber: number | undefined;
  if (fee !== undefined) {
    feeNumber = Number(fee);
    if (Number.isNaN(feeNumber) || feeNumber < 0) {
      return NextResponse.json({ error: "Fee must be a valid non-negative number" }, { status: 400 });
    }
  }

  let validFeeType: CourseFeeType | undefined;
  if (feeType !== undefined) {
    validFeeType = Object.values(CourseFeeType).includes(feeType)
      ? (feeType as CourseFeeType)
      : undefined;
  }

  let branchUpdate;
  if (isAllBranches === true) {
    branchUpdate = { set: [] }; // clear specific links if available to all
  } else if (Array.isArray(branchIds)) {
    const validBranches = await prisma.branch.findMany({
      where: { id: { in: branchIds }, instituteId: ctx.instituteId },
      select: { id: true },
    });
    branchUpdate = { set: validBranches.map((b) => ({ id: b.id })) };
  }

  let courseStartDateUpdate: Date | null | undefined = undefined;
  let courseEndDateUpdate: Date | null | undefined = undefined;

  if (startDate !== undefined) {
    courseStartDateUpdate = startDate ? new Date(startDate) : null;
  }

  const effectiveStartDate = courseStartDateUpdate !== undefined ? courseStartDateUpdate : existing.startDate;
  const effectiveDuration = duration !== undefined ? duration : existing.duration;

  if (effectiveStartDate && effectiveDuration) {
    const { calculateCourseEndDate } = await import("@/lib/course-duration");
    courseEndDateUpdate = calculateCourseEndDate(effectiveStartDate, effectiveDuration);
  } else if (effectiveStartDate === null) {
    courseEndDateUpdate = null;
  }

  const course = await prisma.course.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(feeNumber !== undefined ? { fee: feeNumber } : {}),
      ...(validFeeType !== undefined ? { feeType: validFeeType } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(duration !== undefined ? { duration: duration ? String(duration).trim() : null } : {}),
      ...(courseStartDateUpdate !== undefined ? { startDate: courseStartDateUpdate } : {}),
      ...(courseEndDateUpdate !== undefined ? { endDate: courseEndDateUpdate } : {}),
      ...(targetExam !== undefined ? { targetExam: targetExam ? String(targetExam).trim() : null } : {}),
      ...(eligibility !== undefined ? { eligibility: eligibility ? String(eligibility).trim() : null } : {}),
      ...(academicYear !== undefined ? { academicYear: academicYear ? String(academicYear).trim() : null } : {}),
      ...(isAllBranches !== undefined ? { isAllBranches: Boolean(isAllBranches) } : {}),
      ...(branchUpdate !== undefined ? { branches: branchUpdate } : {}),
    },
    include: {
      branches: { select: { id: true, name: true, city: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "COURSE_UPDATED",
    entityType: "Course",
    entityId: course.id,
    metadata: { name: course.name, fee: course.fee.toString(), feeType: course.feeType },
  });

  return NextResponse.json(course);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("courses:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.course.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  try {
    await prisma.course.delete({ where: { id: params.id } });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete a course that has batches or students enrolled. Remove them first." },
        { status: 409 }
      );
    }
    throw err;
  }

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "COURSE_DELETED",
    entityType: "Course",
    entityId: params.id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}