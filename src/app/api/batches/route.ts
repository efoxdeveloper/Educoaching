import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const batches = await prisma.batch.findMany({
    where: { instituteId: ctx.instituteId, branchId: ctx.branchId as string },
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

  // Multi-branch creation: create SEPARATE Batch rows per selected branch (copy-on-create, then independent)
  if (Array.isArray(branchIds) && branchIds.length > 0) {
    const verified = await prisma.branch.findMany({
      where: { id: { in: branchIds }, instituteId: ctx.instituteId },
      select: { id: true },
    });
    const verifiedIds = verified.map((b) => b.id);
    if (verifiedIds.length !== branchIds.length) {
      return NextResponse.json({ error: "One or more branches are invalid" }, { status: 400 });
    }
    // Only OWNER/ADMIN at Main Branch may create for multiple branches; others must target their own branch only
    const roleUpper = String((ctx as any).role || "").toUpperCase();
    const isPrivileged = roleUpper === "OWNER" || roleUpper === "ADMIN" || roleUpper === "PLATFORM_ADMIN";
    if (!isPrivileged && (verifiedIds.length !== 1 || verifiedIds[0] !== ctx.branchId)) {
      return NextResponse.json({ error: "Branch mismatch: cannot create batch for a different branch" }, { status: 403 });
    }
    // Create independent batch per branch (no shared BatchBranches join)
    const batches = await Promise.all(
      verifiedIds.map((bid) => {
        const perBranchCapacity =
          branchCapacities && typeof branchCapacities === "object" && (branchCapacities as any)[bid] != null
            ? Number((branchCapacities as any)[bid])
            : capacity ? Number(capacity) : 40;
        const perBranchTiming =
          branchTimings && typeof branchTimings === "object" && (branchTimings as any)[bid] != null
            ? String((branchTimings as any)[bid])
            : String(timing);
        return prisma.batch.create({
          data: {
            instituteId: ctx.instituteId,
            name: String(name).trim(),
            courseId,
            branchId: bid,
            timing: perBranchTiming,
            capacity: perBranchCapacity,
            status: status || "Active",
            isAllBranches: false,
          },
          include: { course: true, branch: true, branches: true },
        });
      })
    );
    return NextResponse.json(batches.length === 1 ? batches[0] : batches, { status: 201 });
  }

  // Single-branch path: always scoped to resolved branchId, never trust client branchId alone
  if (branchId && branchId !== ctx.branchId) {
    const roleUpper = String((ctx as any).role || "").toUpperCase();
    const isPrivileged = roleUpper === "OWNER" || roleUpper === "ADMIN" || roleUpper === "PLATFORM_ADMIN";
    if (!isPrivileged) {
      return NextResponse.json({ error: "Branch mismatch: cannot create batch for a different branch" }, { status: 403 });
    }
    // For privileged, verify requested branch belongs to institute
    const target = await prisma.branch.findFirst({ where: { id: branchId, instituteId: ctx.instituteId } });
    if (!target) return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    const perBranchCapacity = capacity ? Number(capacity) : 40;
    const batch = await prisma.batch.create({
      data: {
        instituteId: ctx.instituteId,
        name: String(name).trim(),
        courseId,
        branchId,
        timing: String(timing),
        capacity: perBranchCapacity,
        status: status || "Active",
        isAllBranches: false,
      },
      include: { course: true, branch: true, branches: true },
    });
    return NextResponse.json(batch, { status: 201 });
  }

  // Default: create for the caller's active branch (never use client's branchId)
  const activeBranch = await prisma.branch.findFirst({ where: { id: ctx.branchId as string, instituteId: ctx.instituteId } });
  if (!activeBranch) return NextResponse.json({ error: "Branch not found" }, { status: 400 });
  const batch = await prisma.batch.create({
    data: {
      instituteId: ctx.instituteId,
      name: String(name).trim(),
      courseId,
      branchId: ctx.branchId as string,
      timing: String(timing),
      capacity: capacity ? Number(capacity) : 40,
      status: status || "Active",
      isAllBranches: false,
    },
    include: { course: true, branch: true, branches: true },
  });

  return NextResponse.json(batch, { status: 201 });
}