import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const batches = await prisma.batch.findMany({
    where: { instituteId: ctx.instituteId },
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

  let validBranchIds: string[] = [];
  if (Array.isArray(branchIds) && branchIds.length > 0) {
    const verified = await prisma.branch.findMany({
      where: { id: { in: branchIds }, instituteId: ctx.instituteId },
      select: { id: true },
    });
    validBranchIds = verified.map((b) => b.id);
  } else if (branchId) {
    const singleBranch = await prisma.branch.findFirst({ where: { id: branchId, instituteId: ctx.instituteId } });
    if (singleBranch) validBranchIds = [singleBranch.id];
  }

  const primaryBranchId = validBranchIds[0] || branchId || null;

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