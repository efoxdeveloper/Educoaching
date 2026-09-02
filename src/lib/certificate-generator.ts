import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, buildStorageKey } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export interface CertificateData {
  instituteId: string;
  instituteName: string;
  templateId: string;
  templateTitle: string;
  templateBodyText: string;
  studentId: string;
  studentName: string;
  courseName: string;
  completionDate: Date;
  admissionDate?: Date;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  logoBuffer?: Buffer | null;
  signatureBuffer?: Buffer | null;
  certificateId?: string;
}

/**
 * Replaces placeholders in bodyText with actual dynamic student and institute values.
 */
export function substitutePlaceholders(
  templateText: string,
  variables: {
    studentName: string;
    courseName: string;
    completionDate: string;
    instituteName: string;
    admissionDate?: string;
    certificateId?: string;
  }
): string {
  let result = templateText;
  result = result.replace(/\{studentName\}/gi, variables.studentName);
  result = result.replace(/\{courseName\}/gi, variables.courseName);
  result = result.replace(/\{completionDate\}/gi, variables.completionDate);
  result = result.replace(/\{instituteName\}/gi, variables.instituteName);
  if (variables.admissionDate) {
    result = result.replace(/\{admissionDate\}/gi, variables.admissionDate);
  }
  if (variables.certificateId) {
    result = result.replace(/\{certificateId\}/gi, variables.certificateId);
  }
  return result;
}

/**
 * Generates an A4 Landscape Certificate PDF buffer.
 */
export async function generateCertificatePdfBuffer(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Landscape A4 dimensions: 841.89 x 595.28 points
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      const width = 841.89;
      const height = 595.28;

      // Outer & Inner Decorative Borders
      doc.rect(20, 20, width - 40, height - 40).lineWidth(3).strokeColor("#1E3A8A").stroke();
      doc.rect(28, 28, width - 56, height - 56).lineWidth(1).strokeColor("#D97706").stroke();
      doc.rect(34, 34, width - 68, height - 68).lineWidth(0.5).strokeColor("#CBD5E1").stroke();

      // Corner Accents
      const drawCorner = (x: number, y: number) => {
        doc.rect(x, y, 16, 16).fill("#1E3A8A");
      };
      drawCorner(28, 28);
      drawCorner(width - 44, 28);
      drawCorner(28, height - 44);
      drawCorner(width - 44, height - 44);

      let currentY = 50;

      // Optional Institute Logo
      if (data.logoBuffer && data.logoBuffer.length > 0) {
        try {
          doc.image(data.logoBuffer, width / 2 - 35, currentY, { width: 70, height: 45, fit: [70, 45], align: "center" });
          currentY += 52;
        } catch {
          // Fall back if image format invalid
          currentY += 10;
        }
      } else {
        currentY += 15;
      }

      // Institute Name
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#1E3A8A")
        .text(data.instituteName.toUpperCase(), 50, currentY, { align: "center", width: width - 100 });

      currentY += 32;

      // Certificate Title
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#D97706")
        .text(data.templateTitle.toUpperCase(), 50, currentY, { align: "center", width: width - 100 });

      currentY += 28;

      // Subtitle presentation line
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#475569")
        .text("PROUDLY PRESENTED TO", 50, currentY, { align: "center", width: width - 100 });

      currentY += 20;

      // Student Name Banner
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .fillColor("#0F172A")
        .text(data.studentName, 50, currentY, { align: "center", width: width - 100 });

      currentY += 36;

      // Decorative Line Under Student Name
      doc
        .moveTo(width / 2 - 120, currentY)
        .lineTo(width / 2 + 120, currentY)
        .lineWidth(1.5)
        .strokeColor("#D97706")
        .stroke();

      currentY += 18;

      // Dynamic Substituted Body Text
      const formattedBody = substitutePlaceholders(data.templateBodyText, {
        studentName: data.studentName,
        courseName: data.courseName,
        completionDate: formatDate(data.completionDate),
        instituteName: data.instituteName,
        admissionDate: data.admissionDate ? formatDate(data.admissionDate) : undefined,
        certificateId: data.certificateId,
      });

      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#334155")
        .text(formattedBody, 90, currentY, {
          align: "center",
          width: width - 180,
          lineGap: 6,
        });

      // Bottom Section: Left (Date & Certificate ID), Right (Signature)
      const bottomY = height - 125;

      // Left: Date & ID
      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#1E3A8A")
        .text(`Date of Issue: ${formatDate(data.completionDate)}`, 60, bottomY + 35);

      if (data.certificateId) {
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#64748B")
          .text(`Certificate No: ${data.certificateId.slice(-10).toUpperCase()}`, 60, bottomY + 50);
      }

      // Right: Signatory Box
      const sigX = width - 260;

      if (data.signatureBuffer && data.signatureBuffer.length > 0) {
        try {
          doc.image(data.signatureBuffer, sigX + 20, bottomY, { width: 140, height: 40, fit: [140, 40], align: "center" });
        } catch {
          // Ignore invalid image
        }
      }

      doc
        .moveTo(sigX, bottomY + 45)
        .lineTo(sigX + 190, bottomY + 45)
        .lineWidth(1)
        .strokeColor("#94A3B8")
        .stroke();

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#0F172A")
        .text(data.signatoryName || "Authorized Signatory", sigX, bottomY + 50, { width: 190, align: "center" })
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor("#64748B")
        .text(data.signatoryTitle || "Director / Academic Head", sigX, bottomY + 63, { width: 190, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates and stores a certificate in FileAsset and records CertificateIssued.
 * Upserts CertificateIssued so re-generating updates rather than creating duplicate entries.
 */
export async function generateAndIssueCertificate({
  instituteId,
  templateId,
  studentId,
  forceRegenerate = false,
}: {
  instituteId: string;
  templateId: string;
  studentId: string;
  forceRegenerate?: boolean;
}): Promise<{ issuedId: string; fileId: string; storageKey: string; downloadUrl: string }> {
  // Check if student already has certificate for this template
  const existingIssued = await prisma.certificateIssued.findUnique({
    where: {
      studentId_templateId: {
        studentId,
        templateId,
      },
    },
  });

  if (existingIssued && !forceRegenerate) {
    const file = await prisma.fileAsset.findUnique({ where: { id: existingIssued.pdfFileAssetId } });
    if (file) {
      return {
        issuedId: existingIssued.id,
        fileId: file.id,
        storageKey: file.storageKey,
        downloadUrl: `/api/files/${file.id}`,
      };
    }
  }

  // Load student, template, and institute
  const [student, template, institute] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: { course: true, batch: true },
    }),
    prisma.certificateTemplate.findFirst({
      where: { id: templateId, instituteId },
    }),
    prisma.institute.findUnique({
      where: { id: instituteId },
    }),
  ]);

  if (!student) throw new Error("Student not found");
  if (!template) throw new Error("Certificate template not found");
  if (!institute) throw new Error("Institute not found");

  // Load logo buffer if available
  let logoBuffer: Buffer | null = null;
  const logoAssetId = template.logoFileAssetId;
  const storage = getStorageProvider();

  if (logoAssetId) {
    const asset = await prisma.fileAsset.findFirst({ where: { id: logoAssetId, instituteId } });
    if (asset) {
      try {
        logoBuffer = await storage.read(asset.storageKey);
      } catch {}
    }
  }

  if (!logoBuffer) {
    // Fall back to institute logo
    const instLogoAsset = await prisma.fileAsset.findFirst({
      where: { instituteId, category: "INSTITUTE_LOGO" },
      orderBy: { createdAt: "desc" },
    });
    if (instLogoAsset) {
      try {
        logoBuffer = await storage.read(instLogoAsset.storageKey);
      } catch {}
    }
  }

  // Load signature buffer if available
  let signatureBuffer: Buffer | null = null;
  if (template.signatureFileAssetId) {
    const sigAsset = await prisma.fileAsset.findFirst({
      where: { id: template.signatureFileAssetId, instituteId },
    });
    if (sigAsset) {
      try {
        signatureBuffer = await storage.read(sigAsset.storageKey);
      } catch {}
    }
  }

  const completionDate = student.courseEndDate ? new Date(student.courseEndDate) : new Date();

  const pdfBuffer = await generateCertificatePdfBuffer({
    instituteId,
    instituteName: institute.name,
    templateId: template.id,
    templateTitle: template.title || "Certificate of Completion",
    templateBodyText: template.bodyText,
    studentId: student.id,
    studentName: student.name,
    courseName: student.course.name,
    completionDate,
    admissionDate: student.admissionDate,
    signatoryName: template.signatoryName,
    signatoryTitle: template.signatoryTitle,
    logoBuffer,
    signatureBuffer,
    certificateId: existingIssued?.id || `CERT-${Date.now()}`,
  });

  const fileName = `Certificate-${student.name.replace(/[^a-zA-Z0-9]/g, "_")}-${template.id.slice(-6).toUpperCase()}.pdf`;
  const storageKey = buildStorageKey(instituteId, "CERTIFICATE", fileName);

  await storage.save(storageKey, pdfBuffer);

  const fileAsset = await prisma.fileAsset.create({
    data: {
      instituteId,
      category: "CERTIFICATE",
      fileName,
      mimeType: "application/pdf",
      sizeBytes: pdfBuffer.length,
      storageKey,
      relatedType: "CertificateTemplate",
      relatedId: template.id,
    },
  });

  const issued = await prisma.certificateIssued.upsert({
    where: {
      studentId_templateId: {
        studentId: student.id,
        templateId: template.id,
      },
    },
    update: {
      issuedAt: new Date(),
      pdfFileAssetId: fileAsset.id,
    },
    create: {
      instituteId,
      studentId: student.id,
      templateId: template.id,
      issuedAt: new Date(),
      pdfFileAssetId: fileAsset.id,
    },
  });

  return {
    issuedId: issued.id,
    fileId: fileAsset.id,
    storageKey,
    downloadUrl: `/api/files/${fileAsset.id}`,
  };
}
