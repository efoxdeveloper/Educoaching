import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { CourseFeeType } from "@prisma/client";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const courses = await prisma.course.findMany({
    where: { instituteId: ctx.instituteId },
    include: {
      branches: { select: { id: true, name: true, city: true } },
      _count: { select: { batches: true, students: true, subjects: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("courses:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    name,
    fee,
    feeType = "ONE_TIME",
    description,
    duration,
    startDate,
    targetExam,
    eligibility,
    isAllBranches = true,
    branchIds = [],
  } = body;

  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Course name is required" }, { status: 400 });
  }

  const feeNumber = Number(fee);
  if (fee === undefined || fee === null || Number.isNaN(feeNumber) || feeNumber < 0) {
    return NextResponse.json({ error: "A valid fee is required" }, { status: 400 });
  }

  const validFeeType = Object.values(CourseFeeType).includes(feeType)
    ? (feeType as CourseFeeType)
    : CourseFeeType.ONE_TIME;

  const existing = await prisma.course.findFirst({
    where: { instituteId: ctx.instituteId, name: String(name).trim() },
  });
  if (existing) {
    return NextResponse.json({ error: "A course with this name already exists" }, { status: 409 });
  }

  // Filter branchIds to only those belonging to this institute
  let validBranchIds: string[] = [];
  if (!isAllBranches && Array.isArray(branchIds) && branchIds.length > 0) {
    const instituteBranches = await prisma.branch.findMany({
      where: { id: { in: branchIds }, instituteId: ctx.instituteId },
      select: { id: true },
    });
    validBranchIds = instituteBranches.map((b) => b.id);
  }

  let courseStartDate: Date | null = null;
  let courseEndDate: Date | null = null;
  if (startDate) {
    courseStartDate = new Date(startDate);
    const { calculateCourseEndDate } = await import("@/lib/course-duration");
    courseEndDate = calculateCourseEndDate(courseStartDate, duration || "1 Year");
  }

  const course = await prisma.course.create({
    data: {
      instituteId: ctx.instituteId,
      name: String(name).trim(),
      fee: feeNumber,
      feeType: validFeeType,
      description: description ? String(description).trim() : null,
      duration: duration ? String(duration).trim() : null,
      startDate: courseStartDate,
      endDate: courseEndDate,
      targetExam: targetExam ? String(targetExam).trim() : null,
      eligibility: eligibility ? String(eligibility).trim() : null,
      isAllBranches: Boolean(isAllBranches),
      branches: !isAllBranches && validBranchIds.length > 0
        ? { connect: validBranchIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      branches: { select: { id: true, name: true, city: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "COURSE_CREATED",
    entityType: "Course",
    entityId: course.id,
    metadata: {
      name: course.name,
      fee: course.fee.toString(),
      feeType: course.feeType,
      isAllBranches: course.isAllBranches,
      branchCount: course.branches.length,
    },
  });

  return NextResponse.json(course, { status: 201 });
}