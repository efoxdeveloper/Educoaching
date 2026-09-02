import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const batchId = searchParams.get("batchId");
  const subject = searchParams.get("subject");
  const fileType = searchParams.get("fileType");
  const search = searchParams.get("search");

  const where: Prisma.StudyMaterialWhereInput = { instituteId: ctx.instituteId };

  if (courseId) where.courseId = courseId;
  if (batchId) where.batchId = batchId;
  if (subject) where.subject = subject;
  if (fileType) where.fileType = fileType;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { topic: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const materials = await prisma.studyMaterial.findMany({
    where,
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(materials);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("studyMaterials:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    title,
    subject,
    topic,
    courseId,
    batchId,
    fileType = "PDF",
    fileUrl,
    description,
    fileSizeBytes,
  } = body;

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!subject || !String(subject).trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!fileUrl || !String(fileUrl).trim()) {
    return NextResponse.json({ error: "File URL is required" }, { status: 400 });
  }

  const material = await prisma.studyMaterial.create({
    data: {
      instituteId: ctx.instituteId,
      title: String(title).trim(),
      subject: String(subject).trim(),
      topic: topic ? String(topic).trim() : null,
      courseId: courseId || null,
      batchId: batchId || null,
      fileType: String(fileType).toUpperCase(),
      fileUrl: String(fileUrl).trim(),
      description: description ? String(description).trim() : null,
      fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : null,
      uploadedByUserId: ctx.session?.user?.id || null,
    },
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "STUDY_MATERIAL_UPLOADED",
    entityType: "StudyMaterial",
    entityId: material.id,
    metadata: { title: material.title, subject: material.subject, fileType: material.fileType },
  });

  return NextResponse.json(material, { status: 201 });
}
