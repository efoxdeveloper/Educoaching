import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const batches = await prisma.batch.findMany({
    where: { instituteId: ctx.instituteId, branchId: ctx.branchId },
    include: {
      course: true,
      branch: true,
      branches: true,
      students: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(batches);
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    name,
    courseId,
    branchId,
    branchIds,
    isAllBranches,
    timing,
    capacity,
    branchCapacities,
    branchTimings,
    status,
  } = body;

  if (!name || !courseId || !timing) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({ where: { id: courseId, instituteId: ctx.instituteId } });
  if (!course) return NextResponse.json({ error: "Invalid course" }, { status: 400 });

  // Branch isolation: batches are always created for the caller's active branch
  if (branchId && branchId !== ctx.branchId) {
    return NextResponse.json({ error: "Branch mismatch: cannot create batch for a different branch" }, { status: 403 });
  }
  if (Array.isArray(branchIds) && branchIds.length > 0 && !branchIds.includes(ctx.branchId as string)) {
    return NextResponse.json({ error: "Branch mismatch: batch must include your active branch" }, { status: 403 });
  }
  let validBranchIds: string[] = [ctx.branchId as string];
  // Verify the active branch exists
  const activeBranch = await prisma.branch.findFirst({ where: { id: ctx.branchId as string, instituteId: ctx.instituteId } });
  if (!activeBranch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
  const primaryBranchId = ctx.branchId;

  // Calculate total capacity from branchCapacities if present and multiple branches allocated
  let totalCapacity = capacity ? Number(capacity) : 40;
  if (branchCapacities && typeof branchCapacities === "object") {
    const sum = Object.values(branchCapacities).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    if (sum > 0) {
      totalCapacity = sum;
    }
  }

  const batch = await prisma.batch.create({
    data: {
      instituteId: ctx.instituteId,
      name,
      courseId,
      branchId: primaryBranchId,
      isAllBranches: Boolean(isAllBranches),
      timing,
      capacity: totalCapacity,
      branchCapacities: branchCapacities && typeof branchCapacities === "object" ? branchCapacities : undefined,
      branchTimings: branchTimings && typeof branchTimings === "object" ? branchTimings : undefined,
      status: status || "Active",
      branches: validBranchIds.length > 0 ? { connect: validBranchIds.map((id) => ({ id })) } : undefined,
    },
    include: { course: true, branch: true, branches: true },
  });

  return NextResponse.json(batch, { status: 201 });
}