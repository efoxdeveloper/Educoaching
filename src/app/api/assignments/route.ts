import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");
  const type = searchParams.get("type");
  const subject = searchParams.get("subject");

  const where: Prisma.AssignmentWhereInput = { instituteId: ctx.instituteId };

  if (batchId) where.batchId = batchId;
  if (type) where.type = type;
  if (subject) where.subject = subject;

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { name: true } },
          _count: { select: { students: true } },
        },
      },
      _count: {
        select: { submissions: true },
      },
      submissions: {
        select: {
          status: true,
          marksObtained: true,
        },
      },
    },
    orderBy: { dueDate: "desc" },
  });

  const enriched = assignments.map((a) => {
    const evaluatedCount = a.submissions.filter((s) => s.status === "EVALUATED").length;
    return {
      id: a.id,
      title: a.title,
      subject: a.subject,
      type: a.type,
      description: a.description,
      attachmentUrl: a.attachmentUrl,
      dueDate: a.dueDate,
      totalMarks: a.totalMarks,
      batchId: a.batchId,
      batchName: a.batch.name,
      courseName: a.batch.course?.name || "General",
      totalStudents: a.batch._count.students,
      submittedCount: a.submissions.length,
      evaluatedCount,
      createdAt: a.createdAt,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("assignments:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const {
    title,
    subject,
    batchId,
    courseId,
    type = "HOMEWORK",
    description,
    attachmentUrl,
    dueDate,
    totalMarks = 100,
  } = body;

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!subject || !String(subject).trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!batchId) {
    return NextResponse.json({ error: "Batch is required" }, { status: 400 });
  }
  if (!dueDate) {
    return NextResponse.json({ error: "Due date is required" }, { status: 400 });
  }

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId: ctx.instituteId },
  });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      instituteId: ctx.instituteId,
      batchId,
      courseId: courseId || batch.courseId,
      title: String(title).trim(),
      subject: String(subject).trim(),
      type: String(type).toUpperCase(),
      description: description ? String(description).trim() : null,
      attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : null,
      dueDate: new Date(dueDate),
      totalMarks: Number(totalMarks) || 100,
    },
    include: {
      batch: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "ASSIGNMENT_CREATED",
    entityType: "Assignment",
    entityId: assignment.id,
    metadata: { title: assignment.title, type: assignment.type, batchId: assignment.batchId },
  });

  return NextResponse.json(assignment, { status: 201 });
}
