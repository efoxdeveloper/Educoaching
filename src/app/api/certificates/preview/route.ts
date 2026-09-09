import { NextResponse } from "next/server";
import { requireInstitute } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { generateCertificatePdfBuffer } from "@/lib/certificate-generator";

export async function POST(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const {
    title,
    bodyText,
    signatoryName,
    signatoryTitle,
    logoFileAssetId,
    style,
  } = body as {
    title?: string;
    bodyText?: string;
    signatoryName?: string | null;
    signatoryTitle?: string | null;
    logoFileAssetId?: string | null;
    style?: string | null;
  };

  // Load institute for name
  const institute = await prisma.institute.findUnique({
    where: { id: ctx.instituteId },
    select: { name: true },
  });

  let logoBuffer: Buffer | null = null;
  if (logoFileAssetId) {
    const asset = await prisma.fileAsset.findFirst({
      where: { id: logoFileAssetId, instituteId: ctx.instituteId },
    });
    if (asset) {
      try {
        logoBuffer = await getStorageProvider().read(asset.storageKey);
      } catch {}
    }
  }
  if (!logoBuffer) {
    const instLogo = await prisma.fileAsset.findFirst({
      where: { instituteId: ctx.instituteId, category: "INSTITUTE_LOGO" },
      orderBy: { createdAt: "desc" },
    });
    if (instLogo) {
      try {
        logoBuffer = await getStorageProvider().read(instLogo.storageKey);
      } catch {}
    }
  }

  const dummyData = {
    instituteId: ctx.instituteId,
    instituteName: institute?.name || "Vidyalaya Institute",
    templateId: "preview",
    templateTitle: title || "Certificate of Completion",
    templateBodyText:
      bodyText ||
      "This is to certify that {studentName} has successfully completed the course {courseName} on {completionDate} at {instituteName}.",
    studentId: "preview-student",
    studentName: "Aarav Sharma",
    courseName: "Full Stack Web Development",
    completionDate: new Date(),
    admissionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    signatoryName: signatoryName || "Authorized Signatory",
    signatoryTitle: signatoryTitle || "Director / Academic Head",
    logoBuffer,
    style: style || "classic-blue",
    certificateId: "CERT-DEMO01",
  };

  try {
    const pdfBuffer = await generateCertificatePdfBuffer(dummyData as any);
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="preview.pdf"',
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (e) {
    console.error("preview generate failed", e);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
