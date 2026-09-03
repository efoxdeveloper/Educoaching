import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { batchId } = await req.json();
  if (!batchId) return NextResponse.json({ error: "Missing batchId" }, { status: 400 });

  const [faculty, batch] = await Promise.all([
    prisma.faculty.findFirst({ where: { id: params.id, instituteId: ctx.instituteId, branchId: ctx.branchId as string } }),
    prisma.batch.findFirst({ where: { id: batchId, instituteId: ctx.instituteId, branchId: ctx.branchId as string } }),
  ]);
  if (!faculty || !batch) return NextResponse.json({ error: "Faculty or batch not found for this branch" }, { status: 404 });

  const link = await prisma.batchFaculty.upsert({
    where: { batchId_facultyId: { batchId, facultyId: params.id } },
    update: {},
    create: { batchId, facultyId: params.id, instituteId: ctx.instituteId },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { batchId } = await req.json();
  if (!batchId) return NextResponse.json({ error: "Missing batchId" }, { status: 400 });

  await prisma.batchFaculty.deleteMany({ where: { batchId, facultyId: params.id, instituteId: ctx.instituteId } });

  return NextResponse.json({ ok: true });
}