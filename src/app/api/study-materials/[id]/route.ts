import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePermission("studyMaterials:write");
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.studyMaterial.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Study material not found" }, { status: 404 });
  }

  await prisma.studyMaterial.delete({
    where: { id: params.id },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "STUDY_MATERIAL_DELETED",
    entityType: "StudyMaterial",
    entityId: params.id,
    metadata: { title: existing.title, subject: existing.subject },
  });

  return NextResponse.json({ success: true });
}
