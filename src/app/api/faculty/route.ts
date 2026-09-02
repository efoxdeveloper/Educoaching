import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") || undefined;
  const roleType = searchParams.get("roleType") || undefined;
  const branchId = searchParams.get("branchId") || undefined;

  const [staff, permRows] = await Promise.all([
    prisma.faculty.findMany({
      where: {
        instituteId: ctx.instituteId,
        ...(department && department !== "ALL" ? { department } : {}),
        ...(roleType && roleType !== "ALL" ? { roleType } : {}),
        ...(branchId && branchId !== "ALL"
          ? {
              OR: [
                { branchId },
                { isAllBranches: true },
                { branches: { some: { id: branchId } } },
              ],
            }
          : {}),
      },
      include: {
        branch: { select: { id: true, name: true, city: true } },
        branches: { select: { id: true, name: true, city: true } },
        batches: { include: { batch: { include: { course: true } } } },
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRawUnsafe<Array<{ id: string; permissions: string[] | null }>>(
      `SELECT id, permissions FROM "Faculty" WHERE "instituteId" = $1`,
      ctx.instituteId
    ).catch(() => []),
  ]);

  const permMap = new Map((permRows || []).map((p) => [p.id, p.permissions || []]));
  const combined = staff.map((s) => ({
    ...s,
    permissions: permMap.get(s.id) || [],
  }));

  return NextResponse.json(combined);
}

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    name,
    email,
    mobile,
    subject,
    subjects,
    qualification,
    experienceYears,
    bio,
    status = "ACTIVE",
    roleType = "FACULTY",
    department = "ACADEMIC",
    designation,
    monthlySalary,
    branchId,
    branchIds,
    isAllBranches,
    hasSystemAccess = false,
    password,
    batchIds,
    permissions,
  } = body;

  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Staff member name is required" }, { status: 400 });
  }

  // Only allow assigning batches that belong to this institute.
  let validBatchIds: string[] = [];
  if (Array.isArray(batchIds) && batchIds.length > 0) {
    const owned = await prisma.batch.findMany({
      where: { id: { in: batchIds }, instituteId: ctx.instituteId },
      select: { id: true },
    });
    validBatchIds = owned.map((b) => b.id);
  }

  // Multi-branch verification
  let validBranchIds: string[] = [];
  if (Array.isArray(branchIds) && branchIds.length > 0) {
    const ownedBranches = await prisma.branch.findMany({
      where: { id: { in: branchIds }, instituteId: ctx.instituteId },
      select: { id: true },
    });
    validBranchIds = ownedBranches.map((b) => b.id);
  } else if (branchId) {
    const singleBranch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId: ctx.instituteId },
    });
    if (singleBranch) validBranchIds = [singleBranch.id];
  }

  const primaryBranchId = validBranchIds[0] || branchId || null;

  // Process subjects
  let subjectList: string[] = [];
  if (Array.isArray(subjects) && subjects.length > 0) {
    subjectList = subjects.map((s) => String(s).trim()).filter(Boolean);
  } else if (subject && String(subject).trim()) {
    subjectList = String(subject)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const formattedSubject = subjectList.length > 0 ? subjectList.join(", ") : (subject ? String(subject).trim() : null);

  let createdUserId: string | null = null;

  // If system login access is requested (e.g. for Faculty, Technicians, Counsellors, Accountants)
  if (hasSystemAccess && email && String(email).trim()) {
    const cleanEmail = String(email).trim().toLowerCase();
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      createdUserId = existingUser.id;
    } else if (password && String(password).trim().length >= 6) {
      const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
      const assignedRole =
        roleType === "FACULTY" || roleType === "DOUBT_FACULTY"
          ? "FACULTY"
          : roleType === "COUNSELLOR"
          ? "COUNSELLOR"
          : roleType === "ACCOUNTANT"
          ? "ACCOUNTANT"
          : roleType === "TECHNICIAN"
          ? "TECHNICIAN"
          : "STAFF";

      const newUser = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: assignedRole,
          instituteId: ctx.instituteId,
          branchId: primaryBranchId,
        },
      });
      createdUserId = newUser.id;
    }
  }

  const staff = await prisma.faculty.create({
    data: {
      instituteId: ctx.instituteId,
      name: String(name).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      mobile: mobile ? String(mobile).trim() : null,
      subject: formattedSubject,
      subjects: subjectList,
      qualification: qualification ? String(qualification).trim() : null,
      experienceYears: experienceYears ? Number(experienceYears) : null,
      bio: bio ? String(bio).trim() : null,
      status: status || "ACTIVE",
      roleType: roleType || "FACULTY",
      department: department || "ACADEMIC",
      designation: designation ? String(designation).trim() : null,
      monthlySalary: monthlySalary !== undefined && monthlySalary !== null && monthlySalary !== "" ? Number(monthlySalary) : null,
      branchId: primaryBranchId,
      isAllBranches: Boolean(isAllBranches),
      hasSystemAccess: Boolean(hasSystemAccess),
      userId: createdUserId,
      branches: validBranchIds.length > 0 ? { connect: validBranchIds.map((id) => ({ id })) } : undefined,
      batches:
        validBatchIds.length > 0
          ? { create: validBatchIds.map((batchId) => ({ batchId, instituteId: ctx.instituteId })) }
          : undefined,
    },
    include: {
      branch: { select: { id: true, name: true, city: true } },
      branches: { select: { id: true, name: true, city: true } },
      batches: { include: { batch: { include: { course: true } } } },
      user: { select: { id: true, email: true, role: true } },
      _count: { select: { reviews: true } },
    },
  });

  let savedPermissions: string[] = [];
  if (Array.isArray(permissions) && permissions.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Faculty" SET permissions = $1 WHERE id = $2`,
      permissions,
      staff.id
    ).catch(() => {});
    savedPermissions = permissions;
  }

  return NextResponse.json({ ...staff, permissions: savedPermissions }, { status: 201 });
}