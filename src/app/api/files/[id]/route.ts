import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { getStorageProvider } from "@/lib/storage";
import { logAudit, actorFromSession } from "@/lib/audit";

// Streams a single file back to the browser. Tenant-safe: the lookup is
// scoped to the caller's instituteId, so one institute can never fetch
// another institute's file even by guessing/knowing its id.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const asset = await prisma.fileAsset.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!asset) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await getStorageProvider().read(asset.storageKey);
  } catch {
    return NextResponse.json({ error: "File is missing from storage" }, { status: 410 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.fileName)}"`,
      "Content-Length": String(asset.sizeBytes),
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requirePermission("files:write");
  if ("error" in ctx) return ctx.error;

  const asset = await prisma.fileAsset.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });
  if (!asset) return NextResponse.json({ error: "File not found" }, { status: 404 });

  await getStorageProvider().delete(asset.storageKey);
  await prisma.fileAsset.delete({ where: { id: asset.id } });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "FILE_DELETE",
    entityType: "FileAsset",
    entityId: asset.id,
    metadata: { fileName: asset.fileName, category: asset.category },
  });

  return NextResponse.json({ ok: true });
}
