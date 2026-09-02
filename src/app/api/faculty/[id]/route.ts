import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const [faculty, permRows] = await Promise.all([
    prisma.faculty.findFirst({
      where: { id: params.id, instituteId: ctx.instituteId },
      include: {
        branch: { select: { id: true, name: true, city: true } },
        branches: { select: { id: true, name: true, city: true } },
        batches: { include: { batch: { include: { course: true } } } },
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.$queryRawUnsafe<Array<{ permissions: string[] | null }>>(
      `SELECT permissions FROM "Faculty" WHERE id = $1`,
      params.id
    ).catch(() => []),
  ]);

  if (!faculty) return NextResponse.json({ error: "Faculty not found" }, { status: 404 });

  const permissions = permRows[0]?.permissions || [];
  return NextResponse.json({ ...faculty, permissions });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("faculty:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.faculty.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) return NextResponse.json({ error: "Faculty not found" }, { status: 404 });

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
    status,
    roleType,
    department,
    designation,
    monthlySalary,
    branchId,
    branchIds,
    isAllBranches,
    hasSystemAccess,
  } = body;

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }

  // Multi-branch update handling
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

  // Multi-subject update handling
  let subjectData: any = undefined;
  let subjectsArrayData: string[] | undefined = undefined;

  if (subjects !== undefined && Array.isArray(subjects)) {
    subjectsArrayData = subjects.map((s) => String(s).trim()).filter(Boolean);
    subjectData = subjectsArrayData.length > 0 ? subjectsArrayData.join(", ") : null;
  } else if (subject !== undefined) {
    subjectData = subject ? String(subject).trim() : null;
    subjectsArrayData = subjectData
      ? (subjectData as string).split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
  }

  const faculty = await prisma.faculty.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(mobile !== undefined ? { mobile: mobile || null } : {}),
      ...(subjectData !== undefined ? { subject: subjectData } : {}),
      ...(subjectsArrayData !== undefined ? { subjects: subjectsArrayData } : {}),
      ...(qualification !== undefined ? { qualification: qualification || null } : {}),
      ...(experienceYears !== undefined
        ? { experienceYears: experienceYears === "" || experienceYears === null ? null : Number(experienceYears) }
        : {}),
      ...(bio !== undefined ? { bio: bio || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(roleType !== undefined ? { roleType } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(designation !== undefined ? { designation: designation || null } : {}),
      ...(monthlySalary !== undefined
        ? { monthlySalary: monthlySalary === "" || monthlySalary === null ? null : Number(monthlySalary) }
        : {}),
      ...(primaryBranchId !== undefined ? { branchId: primaryBranchId } : {}),
      ...(isAllBranches !== undefined ? { isAllBranches: Boolean(isAllBranches) } : {}),
      ...(branchConnectData !== undefined ? { branches: branchConnectData } : {}),
      ...(hasSystemAccess !== undefined ? { hasSystemAccess: Boolean(hasSystemAccess) } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, city: true } },
      branches: { select: { id: true, name: true, city: true } },
      batches: { include: { batch: { include: { course: true } } } },
      user: { select: { id: true, email: true, role: true } },
      _count: { select: { reviews: true } },
    },
  });

  if (body.permissions !== undefined && Array.isArray(body.permissions)) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Faculty" SET permissions = $1 WHERE id = $2`,
      body.permissions,
      params.id
    ).catch(() => {});
  }

  // If roleType changed and faculty has associated user, sync the system role
  if (roleType && faculty.userId) {
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

    await prisma.user.update({
      where: { id: faculty.userId },
      data: { role: assignedRole as any },
    }).catch(() => {});
  }

  const updatedPermRows = await prisma.$queryRawUnsafe<Array<{ permissions: string[] | null }>>(
    `SELECT permissions FROM "Faculty" WHERE id = $1`,
    params.id
  ).catch(() => []);
  const currentPermissions = updatedPermRows[0]?.permissions || [];

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "FACULTY_UPDATED",
    entityType: "Faculty",
    entityId: faculty.id,
    metadata: { name: faculty.name },
  });

  return NextResponse.json({ ...faculty, permissions: currentPermissions });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("faculty:delete");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.faculty.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) return NextResponse.json({ error: "Faculty not found" }, { status: 404 });

  // Batch assignments reference this faculty by id - clear them first so
  // the delete doesn't fail on the foreign key.
  await prisma.batchFaculty.deleteMany({ where: { facultyId: params.id, instituteId: ctx.instituteId } });
  await prisma.faculty.delete({ where: { id: params.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "FACULTY_DELETED",
    entityType: "Faculty",
    entityId: params.id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}