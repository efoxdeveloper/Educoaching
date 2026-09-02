import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";
import { generateAndIssueCertificate } from "@/lib/certificate-generator";

export async function POST(req: Request) {
  const ctx = await requirePermission("certificates:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const { templateId, studentIds, forceRegenerate } = body as {
    templateId?: string;
    studentIds?: string[];
    forceRegenerate?: boolean;
  };

  if (!templateId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json(
      { error: "Template ID and at least one student ID are required." },
      { status: 400 }
    );
  }

  // Validate template belongs to tenant
  const template = await prisma.certificateTemplate.findFirst({
    where: { id: templateId, instituteId: ctx.instituteId },
  });

  if (!template) {
    return NextResponse.json({ error: "Certificate template not found." }, { status: 404 });
  }

  const now = new Date();

  // Find eligible students in tenant whose courseEndDate has passed
  const eligibleStudents = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      instituteId: ctx.instituteId,
      courseEndDate: {
        lte: now,
      },
    },
    select: { id: true, name: true, courseEndDate: true },
  });

  if (eligibleStudents.length === 0) {
    return NextResponse.json(
      {
        error:
          "None of the selected students are eligible for a certificate. Eligibility requires the student's Course End Date to be on or before today.",
      },
      { status: 400 }
    );
  }

  const results: Array<{
    studentId: string;
    studentName: string;
    issuedId: string;
    fileId: string;
    downloadUrl: string;
  }> = [];

  for (const student of eligibleStudents) {
    try {
      const res = await generateAndIssueCertificate({
        instituteId: ctx.instituteId,
        templateId: template.id,
        studentId: student.id,
        forceRegenerate: Boolean(forceRegenerate),
      });

      results.push({
        studentId: student.id,
        studentName: student.name,
        issuedId: res.issuedId,
        fileId: res.fileId,
        downloadUrl: res.downloadUrl,
      });
    } catch (err) {
      console.error(`[certificates/generate] Error generating certificate for ${student.name}:`, err);
    }
  }

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "CERTIFICATES_GENERATED",
    entityType: "CertificateTemplate",
    entityId: template.id,
    metadata: {
      templateName: template.name,
      requestedCount: studentIds.length,
      eligibleCount: eligibleStudents.length,
      generatedCount: results.length,
    },
  });

  return NextResponse.json({
    success: true,
    totalRequested: studentIds.length,
    eligibleCount: eligibleStudents.length,
    generatedCount: results.length,
    certificates: results,
  });
}
