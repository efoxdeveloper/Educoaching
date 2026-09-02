import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const batch = await prisma.batch.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: {
      course: true,
      branch: true,
      branches: true,
      students: true,
    },
  });

  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("courses:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.batch.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
    include: { course: true, branches: true },
  });

  if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const body = await req.json();
  const {
    name,
    timing,
    capacity,
    branchCapacities,
    branchTimings,
    status,
    startDate,
    endDate,
    branchId,
    branchIds,
    isAllBranches,
  } = body;

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Batch name cannot be empty" }, { status: 400 });
  }

  // Handle multi-branch updates
  let branchConnectData: any = undefined;
  let primaryBranchId: string | null | undefined = undefined;

  if (branchIds !== undefined) {
    if (Array.isArray(branchIds) && branchIds.length > 0) {
      const owned = await prisma.branch.findMany({
        where: { id: { in: branchIds }, instituteId: ctx.instituteId },
        select: { id: true },
      });
      const validIds = owned.map((b) => b.id);
      branchConnectData = { set: validIds.map((id) => ({ id })) };
      primaryBranchId = validIds[0] || null;
    } else {
      branchConnectData = { set: [] };
      primaryBranchId = null;
    }
  } else if (branchId !== undefined) {
    primaryBranchId = branchId || null;
  }

  // Calculate total capacity if branchCapacities is provided
  let computedCapacity: number | undefined = capacity !== undefined ? Math.max(1, Number(capacity) || 40) : undefined;
  if (branchCapacities !== undefined && branchCapacities && typeof branchCapacities === "object") {
    const sum = Object.values(branchCapacities).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    if (sum > 0) {
      computedCapacity = sum;
    }
  }

  // Automatically compute end date if startDate is updated and batch/course duration is known
  let batchStartDateUpdate: Date | null | undefined = undefined;
  let batchEndDateUpdate: Date | null | undefined = undefined;

  if (startDate !== undefined) {
    batchStartDateUpdate = startDate ? new Date(startDate) : null;
  }

  if (endDate !== undefined) {
    batchEndDateUpdate = endDate ? new Date(endDate) : null;
  } else if (batchStartDateUpdate && existing.course.duration) {
    const { calculateCourseEndDate } = await import("@/lib/course-duration");
    batchEndDateUpdate = calculateCourseEndDate(batchStartDateUpdate, existing.course.duration);
  }

  const updated = await prisma.batch.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(timing !== undefined ? { timing: String(timing).trim() } : {}),
      ...(computedCapacity !== undefined ? { capacity: computedCapacity } : {}),
      ...(branchCapacities !== undefined ? { branchCapacities } : {}),
      ...(branchTimings !== undefined ? { branchTimings } : {}),
      ...(status !== undefined ? { status: String(status).trim() } : {}),
      ...(batchStartDateUpdate !== undefined ? { startDate: batchStartDateUpdate } : {}),
      ...(batchEndDateUpdate !== undefined ? { endDate: batchEndDateUpdate } : {}),
      ...(primaryBranchId !== undefined ? { branchId: primaryBranchId } : {}),
      ...(isAllBranches !== undefined ? { isAllBranches: Boolean(isAllBranches) } : {}),
      ...(branchConnectData !== undefined ? { branches: branchConnectData } : {}),
    },
    include: {
      course: true,
      branch: true,
      branches: true,
      students: true,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BATCH_UPDATED",
    entityType: "Batch",
    entityId: updated.id,
    metadata: {
      name: updated.name,
      timing: updated.timing,
      status: updated.status,
      isAllBranches: updated.isAllBranches,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("courses:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.batch.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  await prisma.batchFaculty.deleteMany({ where: { batchId: params.id, instituteId: ctx.instituteId } });
  await prisma.batch.delete({ where: { id: params.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BATCH_DELETED",
    entityType: "Batch",
    entityId: params.id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
