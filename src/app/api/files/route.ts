import { NextResponse } from "next/server";
import { FileCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInstitute, requirePermission } from "@/lib/tenant";
import { buildStorageKey, getStorageProvider, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/storage";
import { logAudit, actorFromSession } from "@/lib/audit";

// List files for the current institute, optionally scoped to one entity
// (e.g. ?relatedType=Student&relatedId=abc123) and/or one category
// (e.g. ?category=INSTITUTE_LOGO). Reading is intentionally ungated, same
// as every other GET in this app - only mutations are permission-checked.
export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(req.url);
  const relatedType = searchParams.get("relatedType");
  const relatedId = searchParams.get("relatedId");
  const category = searchParams.get("category");

  const files = await prisma.fileAsset.findMany({
    where: {
      instituteId: ctx.instituteId,
      ...(relatedType ? { relatedType } : {}),
      ...(relatedId ? { relatedId } : {}),
      ...(category && Object.values(FileCategory).includes(category as FileCategory)
        ? { category: category as FileCategory }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
}

// Uploads a file via multipart/form-data: fields are `file`, `category`
// (one of FileCategory), and optionally `relatedType` + `relatedId` to
// attach it to a specific entity (e.g. a Student's admission document).
export async function POST(req: Request) {
  const ctx = await requirePermission("files:write");
  if ("error" in ctx) return ctx.error;

  const form = await req.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "OTHER");
  const relatedType = form.get("relatedType") ? String(form.get("relatedType")) : null;
  const relatedId = form.get("relatedId") ? String(form.get("relatedId")) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!Object.values(FileCategory).includes(category as FileCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = buildStorageKey(ctx.instituteId, category, file.name);

  await getStorageProvider().save(storageKey, buffer);

  const asset = await prisma.fileAsset.create({
    data: {
      instituteId: ctx.instituteId,
      uploadedByUserId: actorFromSession(ctx.session).userId,
      category: category as FileCategory,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      relatedType,
      relatedId,
    },
  });

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "FILE_UPLOAD",
    entityType: "FileAsset",
    entityId: asset.id,
    metadata: { fileName: asset.fileName, category: asset.category, sizeBytes: asset.sizeBytes, relatedType, relatedId },
  });

  return NextResponse.json(asset, { status: 201 });
}