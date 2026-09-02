import { NextResponse } from "next/server";
import { AdmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(req: Request) {
  const ctx = await requirePermission("admissions:read");
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const stage = searchParams.get("stage") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const source = searchParams.get("source") || undefined;
  const branchId = searchParams.get("branchId") || undefined;
  const todayOnly = searchParams.get("todayFollowUps") === "true";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const admissions = await prisma.admission.findMany({
    where: {
      instituteId: ctx.instituteId,
      ...(status ? { status: status as AdmissionStatus } : {}),
      ...(stage ? { stage } : {}),
      ...(priority ? { priority } : {}),
      ...(source ? { source } : {}),
      ...(branchId ? { branchId } : {}),
      ...(todayOnly
        ? {
            nextFollowUpDate: {
              gte: todayStart,
              lte: todayEnd,
            },
          }
        : {}),
    },
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
      followUps: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ nextFollowUpDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(admissions);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("admissions:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    branchId,
    applicantName,
    mobile,
    email,
    courseId,
    batchId,
    feePlan,
    source,
    stage,
    priority,
    nextFollowUpDate,
    assignedTo,
    assignedToId,
    note,
    photoUrl,
  } = body;

  if (!applicantName || !String(applicantName).trim()) {
    return NextResponse.json({ error: "Applicant name is required" }, { status: 400 });
  }
  if (!mobile || !String(mobile).trim()) {
    return NextResponse.json({ error: "Mobile is required" }, { status: 400 });
  }
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, instituteId: ctx.instituteId },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const finalFeePlan =
    feePlan !== undefined && feePlan !== null && !isNaN(Number(feePlan))
      ? Number(feePlan)
      : Number(course.fee);

  if (batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, instituteId: ctx.instituteId },
    });
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId: ctx.instituteId },
    });
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  let resolvedAssignedTo = assignedTo || null;
  if (assignedToId) {
    const staff = await prisma.faculty.findFirst({
      where: { id: assignedToId, instituteId: ctx.instituteId },
      select: { name: true },
    });
    if (staff) {
      resolvedAssignedTo = staff.name;
    }
  }

  const admission = await prisma.admission.create({
    data: {
      instituteId: ctx.instituteId,
      branchId: branchId || null,
      applicantName: String(applicantName).trim(),
      mobile: String(mobile).trim(),
      email: email ? String(email).trim() : null,
      courseId,
      batchId: batchId || null,
      feePlan: finalFeePlan,
      source: source || "WALK_IN",
      stage: stage || "NEW",
      priority: priority || "WARM",
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      assignedTo: resolvedAssignedTo,
      assignedToId: assignedToId || null,
      note: note || null,
      photoUrl: photoUrl ? String(photoUrl).trim() : null,
    },
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      assignedCounsellor: { select: { id: true, name: true, roleType: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "ADMISSION_CREATED",
    entityType: "Admission",
    entityId: admission.id,
    metadata: { applicantName: admission.applicantName, courseId, source: admission.source },
  });

  return NextResponse.json(admission, { status: 201 });
}