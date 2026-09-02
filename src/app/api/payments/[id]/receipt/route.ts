import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstitute } from "@/lib/tenant";
import { getStorageProvider } from "@/lib/storage";
import { createAndPersistPaymentReceipt } from "@/lib/receipt-generator";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const payment = await prisma.payment.findFirst({
    where: { id: params.id, instituteId: ctx.instituteId },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  let fileAssetId = payment.receiptFileId;

  if (!fileAssetId) {
    // Generate receipt on-demand
    const created = await createAndPersistPaymentReceipt(payment.id);
    if (created) {
      fileAssetId = created.fileId;
    }
  }

  if (!fileAssetId) {
    return NextResponse.json({ error: "Could not generate receipt PDF" }, { status: 500 });
  }

  const asset = await prisma.fileAsset.findFirst({
    where: { id: fileAssetId, instituteId: ctx.instituteId },
  });

  if (!asset) {
    return NextResponse.json({ error: "Receipt file asset not found" }, { status: 404 });
  }

  try {
    const buffer = await getStorageProvider().read(asset.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(asset.fileName)}"`,
        "Content-Length": String(asset.sizeBytes),
      },
    });
  } catch (err) {
    console.error("Failed to read receipt file:", err);
    return NextResponse.json({ error: "Failed to read receipt file from storage" }, { status: 500 });
  }
}
