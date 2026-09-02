import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET() {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const templates = await prisma.certificateTemplate.findMany({
    where: { instituteId: ctx.instituteId },
    include: {
      _count: { select: { issuedCertificates: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const ctx = await requirePermission("certificates:write");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const {
    name,
    title,
    bodyText,
    logoFileAssetId,
    signatureFileAssetId,
    signatoryName,
    signatoryTitle,
  } = body as {
    name?: string;
    title?: string;
    bodyText?: string;
    logoFileAssetId?: string;
    signatureFileAssetId?: string;
    signatoryName?: string;
    signatoryTitle?: string;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  const template = await prisma.certificateTemplate.create({
    data: {
      instituteId: ctx.instituteId,
      name: name.trim(),
      title: title?.trim() || "Certificate of Completion",
      bodyText:
        bodyText?.trim() ||
        "This is to certify that {studentName} has successfully completed the course {courseName} on {completionDate} at {instituteName}.",
      logoFileAssetId: logoFileAssetId || null,
      signatureFileAssetId: signatureFileAssetId || null,
      signatoryName: signatoryName?.trim() || "Authorized Signatory",
      signatoryTitle: signatoryTitle?.trim() || "Director / Academic Head",
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "CERTIFICATE_TEMPLATE_CREATED",
    entityType: "CertificateTemplate",
    entityId: template.id,
    metadata: { name: template.name },
  });

  return NextResponse.json(template, { status: 201 });
}
