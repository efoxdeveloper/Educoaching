import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const batchId = searchParams.get("batchId");
  const templateId = searchParams.get("templateId");

  const now = new Date();

  const where: Prisma.StudentWhereInput = {
    instituteId: ctx.instituteId,
    branchId: ctx.branchId,
    courseEndDate: {
      lte: now,
    },
  };

  if (courseId) where.courseId = courseId;
  if (batchId) where.batchId = batchId;

  const students = await prisma.student.findMany({
    where,
    include: {
      course: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
      issuedCertificates: templateId
        ? {
            where: { templateId },
            select: { id: true, issuedAt: true, pdfFileAssetId: true },
          }
        : {
            select: { id: true, templateId: true, issuedAt: true, pdfFileAssetId: true },
          },
    },
    orderBy: { name: "asc" },
  });

  const formatted = students.map((s) => {
    const existingCert = templateId
      ? s.issuedCertificates.find((c) => (c as any).templateId === templateId || true)
      : s.issuedCertificates[0] || null;

    return {
      id: s.id,
      name: s.name,
      mobile: s.mobile,
      email: s.email,
      courseId: s.courseId,
      courseName: s.course.name,
      batchId: s.batchId,
      batchName: s.batch?.name || "General Batch",
      courseEndDate: s.courseEndDate?.toISOString() || null,
      admissionDate: s.admissionDate.toISOString(),
      hasCertificate: Boolean(existingCert),
      certificateId: existingCert?.id || null,
      pdfFileAssetId: existingCert?.pdfFileAssetId || null,
    };
  });

  return NextResponse.json(formatted);
}
