import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("certificates:write");
  if ("error" in ctx) return ctx.error;

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("certificates:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.certificateTemplate.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    name,
    title,
    bodyText,
    logoFileAssetId,
    signatureFileAssetId,
    signatoryName,
    signatoryTitle,
  } = body;

  const updated = await prisma.certificateTemplate.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(bodyText !== undefined ? { bodyText: String(bodyText).trim() } : {}),
      ...(logoFileAssetId !== undefined ? { logoFileAssetId: logoFileAssetId || null } : {}),
      ...(signatureFileAssetId !== undefined ? { signatureFileAssetId: signatureFileAssetId || null } : {}),
      ...(signatoryName !== undefined ? { signatoryName: signatoryName ? String(signatoryName).trim() : null } : {}),
      ...(signatoryTitle !== undefined ? { signatoryTitle: signatoryTitle ? String(signatoryTitle).trim() : null } : {}),
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "CERTIFICATE_TEMPLATE_UPDATED",
    entityType: "CertificateTemplate",
    entityId: updated.id,
    metadata: { name: updated.name },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("certificates:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.certificateTemplate.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.certificateTemplate.delete({
    where: { id: params.id },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "CERTIFICATE_TEMPLATE_DELETED",
    entityType: "CertificateTemplate",
    entityId: params.id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
