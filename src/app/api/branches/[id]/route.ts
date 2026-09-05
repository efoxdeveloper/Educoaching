import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("branches:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.branch.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const body = await req.json();
  const { name, city, state, address, contact, guidePhone, inChargeName, status, isMainBranch } = body;

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }
  if (inChargeName !== undefined && !String(inChargeName).trim()) {
    return NextResponse.json({ error: "Branch Owner Name can't be empty" }, { status: 400 });
  }

  if (isMainBranch === true) {
    await prisma.branch.updateMany({
      where: { instituteId: ctx.instituteId, id: { not: params.id } },
      data: { isMainBranch: false },
    });
  }

  const branch = await prisma.branch.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(city !== undefined ? { city: city ? String(city).trim() : null } : {}),
      ...(state !== undefined ? { state: state ? String(state).trim() : null } : {}),
      ...(address !== undefined ? { address: address ? String(address).trim() : null } : {}),
      ...(contact !== undefined ? { contact: contact ? String(contact).trim() : null } : {}),
      ...(guidePhone !== undefined ? { guidePhone: guidePhone ? String(guidePhone).trim() : null } : {}),
      ...(inChargeName !== undefined ? { inChargeName: inChargeName ? String(inChargeName).trim() : null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(isMainBranch !== undefined ? { isMainBranch: Boolean(isMainBranch) } : {}),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BRANCH_UPDATED",
    entityType: "Branch",
    entityId: branch.id,
    metadata: { name: branch.name, city: branch.city, state: branch.state, isMainBranch: branch.isMainBranch },
  });

  return NextResponse.json(branch);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("branches:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.branch.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!existing) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  if (existing.isMainBranch) {
    return NextResponse.json(
      { error: "Cannot delete the Main Branch / Head Office. Reassign another branch as Main Branch first." },
      { status: 400 }
    );
  }

  // Safety checks: check if students, batches, or admissions are attached
  const [studentCount, batchCount, admissionCount] = await Promise.all([
    prisma.student.count({ where: { branchId: params.id } }),
    prisma.batch.count({ where: { branchId: params.id } }),
    prisma.admission.count({ where: { branchId: params.id } }),
  ]);

  if (studentCount > 0 || batchCount > 0 || admissionCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete branch with active records: ${studentCount} students, ${batchCount} batches, ${admissionCount} admissions. Reassign or remove them first.`,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.branch.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete branch due to existing database dependencies." },
      { status: 409 }
    );
  }

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "BRANCH_DELETED",
    entityType: "Branch",
    entityId: params.id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}