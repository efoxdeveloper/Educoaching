import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, buildStorageKey } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

export type CertificateFieldPosition = {
  key: string; // e.g. studentName, courseName, completionDate, certificateId, customText
  x: number;
  y: number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  color?: string;
  customText?: string;
};

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
  backgroundImageBuffer?: Buffer | null;
  fieldPositions?: CertificateFieldPosition[] | null;
  style?: string | null;
  certificateId?: string;
}

function getStylePalette(style?: string | null) {
  switch (style) {
    case "elegant-gold":
      return {
        primary: "#92400E",
        secondary: "#D97706",
        lightBorder: "#FDE68A",
        corner: "#B45309",
        titleColor: "#92400E",
        instituteColor: "#78350F",
      };
    case "minimal-grey":
      return {
        primary: "#334155",
        secondary: "#64748B",
        lightBorder: "#E2E8F0",
        corner: "#475569",
        titleColor: "#334155",
        instituteColor: "#475569",
      };
    case "classic-blue":
    default:
      return {
        primary: "#1E3A8A",
        secondary: "#D97706",
        lightBorder: "#CBD5E1",
        corner: "#1E3A8A",
        titleColor: "#D97706",
        instituteColor: "#1E3A8A",
      };
  }
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

      // If custom background image provided, use it as full-bleed instead of programmatic layout
      if (data.backgroundImageBuffer && data.backgroundImageBuffer.length > 0) {
        try {
          doc.image(data.backgroundImageBuffer, 0, 0, { width, height });
        } catch {
          // ignore invalid background
        }
        // Overlay fieldPositions on top of background
        const fieldValues: Record<string, string> = {
          studentName: data.studentName,
          courseName: data.courseName,
          completionDate: formatDate(data.completionDate),
          instituteName: data.instituteName,
          admissionDate: data.admissionDate ? formatDate(data.admissionDate) : "",
          certificateId: data.certificateId ? data.certificateId.slice(-10).toUpperCase() : "",
          certificateTitle: data.templateTitle,
          signatoryName: data.signatoryName || "Authorized Signatory",
          signatoryTitle: data.signatoryTitle || "Director / Academic Head",
        };
        const positions = data.fieldPositions && Array.isArray(data.fieldPositions) && data.fieldPositions.length > 0
          ? data.fieldPositions
          : [
              { key: "studentName", x: width / 2 - 150, y: height / 2 - 20, fontSize: 26, align: "center" as const },
              { key: "courseName", x: width / 2 - 150, y: height / 2 + 20, fontSize: 12, align: "center" as const },
              { key: "completionDate", x: 60, y: height - 80, fontSize: 9.5, align: "left" as const },
              { key: "certificateId", x: 60, y: height - 65, fontSize: 8.5, align: "left" as const },
            ];

        for (const fp of positions) {
          let text = fieldValues[fp.key] ?? fp.customText ?? "";
          // For generic bodyText field, substitute placeholders
          if (fp.key === "bodyText" || fp.key === "customText") {
            text = fp.customText ? substitutePlaceholders(fp.customText, {
              studentName: data.studentName,
              courseName: data.courseName,
              completionDate: formatDate(data.completionDate),
              instituteName: data.instituteName,
              admissionDate: data.admissionDate ? formatDate(data.admissionDate) : undefined,
              certificateId: data.certificateId,
            }) : text;
          }
          if (!text) continue;
          const fontSize = fp.fontSize || 12;
          const align = fp.align || "left";
          const color = fp.color || "#0F172A";
          try {
            doc.fontSize(fontSize).font("Helvetica-Bold").fillColor(color).text(text, fp.x, fp.y, { width: 300, align, lineBreak: false });
          } catch {}
        }

        // If signature buffer exists, place near signatory if not covered by fieldPositions
        const hasSigField = positions.some((p) => p.key === "signature");
        if (!hasSigField && data.signatureBuffer && data.signatureBuffer.length > 0) {
          try {
            doc.image(data.signatureBuffer, width - 240, height - 110, { width: 140, height: 40, fit: [140, 40] });
          } catch {}
        }
      } else {
        const palette = getStylePalette(data.style);
        // Outer & Inner Decorative Borders — style-aware
        doc.rect(20, 20, width - 40, height - 40).lineWidth(3).strokeColor(palette.primary).stroke();
        doc.rect(28, 28, width - 56, height - 56).lineWidth(1).strokeColor(palette.secondary).stroke();
        doc.rect(34, 34, width - 68, height - 68).lineWidth(0.5).strokeColor(palette.lightBorder).stroke();

        // Corner Accents
        const drawCorner = (x: number, y: number) => {
          doc.rect(x, y, 16, 16).fill(palette.corner);
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
          .fillColor(palette.instituteColor)
          .text(data.instituteName.toUpperCase(), 50, currentY, { align: "center", width: width - 100 });

        currentY += 32;

        // Certificate Title
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .fillColor(palette.titleColor)
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
          .strokeColor(palette.secondary)
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
          .fillColor(palette.primary)
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
      }

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
    // Auto-regenerate if template was edited after certificate was issued
    const templateForCheck = await prisma.certificateTemplate.findFirst({
      where: { id: templateId, instituteId },
    });
    if (templateForCheck) {
      const tmplUpdatedAt = (templateForCheck as any).updatedAt ? new Date((templateForCheck as any).updatedAt) : null;
      const issuedTimeRaw =
        (existingIssued as any).updatedAt || (existingIssued as any).createdAt || (existingIssued as any).issuedAt;
      const issuedTime = issuedTimeRaw ? new Date(issuedTimeRaw) : null;
      const shouldAutoRegenerate = tmplUpdatedAt && issuedTime && tmplUpdatedAt > issuedTime;
      if (!shouldAutoRegenerate) {
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
      // else template updated after issuance → fall through to regenerate
    } else {
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
  if ((template as any).signatureFileAssetId) {
    const sigAsset = await prisma.fileAsset.findFirst({
      where: { id: (template as any).signatureFileAssetId, instituteId },
    });
    if (sigAsset) {
      try {
        signatureBuffer = await storage.read(sigAsset.storageKey);
      } catch {}
    }
  }

  // Load background image buffer if available
  let backgroundImageBuffer: Buffer | null = null;
  if ((template as any).backgroundImageAssetId) {
    const bgAsset = await prisma.fileAsset.findFirst({
      where: { id: (template as any).backgroundImageAssetId, instituteId },
    });
    if (bgAsset) {
      try {
        backgroundImageBuffer = await storage.read(bgAsset.storageKey);
      } catch {}
    }
  }

  const fieldPositions = (template as any).fieldPositions as CertificateFieldPosition[] | null;

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
    backgroundImageBuffer,
    fieldPositions,
    style: (template as any).style || "classic-blue",
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
